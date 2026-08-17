"""
TZMICHA — Real Phone Calls (Exotel)
Outgoing + Incoming → AI handles first → scores lead → transfers to human if HOT
"""
import os, httpx, asyncio, json, time
from config import SERVER_PUBLIC_URL

# ── Exotel Config ──────────────────────────────────────────────
EXOTEL_SID       = os.getenv("EXOTEL_SID",       "tzmicha1")
EXOTEL_API_KEY   = os.getenv("EXOTEL_API_KEY",   "")
EXOTEL_API_TOKEN = os.getenv("EXOTEL_API_TOKEN",  "")
EXOTEL_CALLER_ID = os.getenv("EXOTEL_CALLER_ID",  "09513886363")
EXOTEL_APP_ID    = os.getenv("EXOTEL_APP_ID",     "")

# Plivo (fallback / alternative)
PLIVO_AUTH_ID    = os.getenv("PLIVO_AUTH_ID",    "")
PLIVO_AUTH_TOKEN = os.getenv("PLIVO_AUTH_TOKEN", "")
PLIVO_FROM_NUMBER= os.getenv("PLIVO_FROM_NUMBER","")

# ── In-memory call store ───────────────────────────────────────
active_voice_calls: dict = {}   # call_id → call_data
# call_data keys:
#   lead_id, client_id, opening_message, transcript[], status,
#   session_id (orchestrator), direction (inbound/outbound),
#   transfer_requested, human_number, started_at


# ── Phone formatter ────────────────────────────────────────────
def fmt_phone(phone: str) -> str:
    """Normalize to 0XXXXXXXXXX for Exotel"""
    p = phone.strip().replace(" ", "").replace("-", "")
    if p.startswith("+91"): return "0" + p[3:]
    if p.startswith("91") and len(p) == 12: return "0" + p[2:]
    if not p.startswith("0") and len(p) == 10: return "0" + p
    return p

def fmt_phone_plivo(phone: str) -> str:
    """Normalize to +91XXXXXXXXXX for Plivo"""
    p = phone.strip().replace(" ", "").replace("-", "")
    if p.startswith("+91"): return p
    if p.startswith("91") and len(p) == 12: return "+" + p
    if p.startswith("0") and len(p) == 11: return "+91" + p[1:]
    if len(p) == 10: return "+91" + p
    return p


# ══════════════════════════════════════════════════════════════
# OUTGOING CALL
# ══════════════════════════════════════════════════════════════
def make_outgoing_call(phone_number: str, lead_id: int, client_id: int,
                       opening_message: str, human_transfer_number: str = "") -> dict:
    """
    Dial lead → AI handles conversation → score → transfer if HOT
    Uses Exotel if credentials set, else Plivo, else demo mode.
    """
    call_id = f"out_{client_id}_{lead_id}_{int(time.time())}"
    active_voice_calls[call_id] = {
        "lead_id":            lead_id,
        "client_id":          client_id,
        "opening_message":    opening_message,
        "transcript":         [],
        "status":             "initiating",
        "direction":          "outbound",
        "transfer_requested": False,
        "human_number":       human_transfer_number or EXOTEL_CALLER_ID,
        "started_at":         time.time(),
        "session_id":         None,
    }

    # ── Try Exotel first ──
    if EXOTEL_API_KEY and EXOTEL_API_TOKEN:
        return _exotel_call(call_id, phone_number)

    # ── Try Plivo ──
    if PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN:
        return _plivo_call(call_id, phone_number)

    # ── Demo mode ──
    active_voice_calls[call_id]["status"] = "demo"
    return {
        "call_id":   call_id,
        "status":    "demo_mode",
        "message":   "No telephony credentials. Add EXOTEL_API_KEY or PLIVO_AUTH_ID to .env",
        "phone":     phone_number,
    }


def _exotel_call(call_id: str, phone_number: str) -> dict:
    phone = fmt_phone(phone_number)
    exoml_url = f"{SERVER_PUBLIC_URL}/voice/exotel/answer/{call_id}"
    status_url = f"{SERVER_PUBLIC_URL}/voice/exotel/status/{call_id}"
    url = f"https://{EXOTEL_API_KEY}:{EXOTEL_API_TOKEN}@api.exotel.com/v1/Accounts/{EXOTEL_SID}/Calls/connect.json"
    try:
        resp = httpx.post(url, data={
            "From":           phone,
            "CallerId":       EXOTEL_CALLER_ID,
            "Url":            exoml_url,
            "StatusCallback": status_url,
            "TimeLimit":      300,
            "TimeOut":        30,
        }, timeout=15.0)
        if resp.status_code in (200, 201):
            data = resp.json()
            sid  = data.get("Call", {}).get("Sid", "")
            active_voice_calls[call_id]["exotel_sid"] = sid
            active_voice_calls[call_id]["status"]     = "ringing"
            return {"call_id": call_id, "exotel_sid": sid, "status": "ringing", "phone": phone}
        active_voice_calls.pop(call_id, None)
        return {"error": f"Exotel {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        active_voice_calls.pop(call_id, None)
        return {"error": str(e)[:120]}


def _plivo_call(call_id: str, phone_number: str) -> dict:
    phone      = fmt_phone_plivo(phone_number)
    answer_url = f"{SERVER_PUBLIC_URL}/voice/plivo/answer/{call_id}"
    hangup_url = f"{SERVER_PUBLIC_URL}/voice/plivo/status/{call_id}"
    url = f"https://api.plivo.com/v1/Account/{PLIVO_AUTH_ID}/Call/"
    try:
        resp = httpx.post(url, auth=(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN), json={
            "from":           PLIVO_FROM_NUMBER,
            "to":             phone,
            "answer_url":     answer_url,
            "answer_method":  "GET",
            "hangup_url":     hangup_url,
            "hangup_method":  "POST",
            "time_limit":     300,
            "record":         True,
        }, timeout=15.0)
        if resp.status_code in (200, 201, 202):
            uuid = resp.json().get("request_uuid", "")
            active_voice_calls[call_id]["plivo_uuid"] = uuid
            active_voice_calls[call_id]["status"]     = "ringing"
            return {"call_id": call_id, "plivo_uuid": uuid, "status": "ringing", "phone": phone}
        active_voice_calls.pop(call_id, None)
        return {"error": f"Plivo {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        active_voice_calls.pop(call_id, None)
        return {"error": str(e)[:120]}


# ══════════════════════════════════════════════════════════════
# EXOML — What plays when call connects (Outgoing)
# ══════════════════════════════════════════════════════════════
def generate_exoml_answer(call_id: str) -> str:
    """
    ExoML for outgoing call:
    1. AI speaks opening
    2. Records customer reply
    3. Posts to /voice/exotel/speech/{call_id} for AI processing
    4. Loops
    """
    call = active_voice_calls.get(call_id, {})
    msg  = call.get("opening_message", "Hello! How can I help you today?")
    speech_url = f"{SERVER_PUBLIC_URL}/voice/exotel/speech/{call_id}"

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en">{_xml_safe(msg)}</Say>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""


# ══════════════════════════════════════════════════════════════
# EXOML — Incoming call handler
# ══════════════════════════════════════════════════════════════
def generate_exoml_incoming(from_number: str, client_id: int = 1) -> tuple[str, str]:
    """
    When someone calls your Exotel number → AI picks up.
    Returns (call_id, exoml_xml)
    """
    call_id = f"in_{client_id}_{int(time.time())}"
    greeting = "Hello! Thank you for calling. I'm your AI assistant. How can I help you today?"
    active_voice_calls[call_id] = {
        "lead_id":            None,
        "client_id":          client_id,
        "opening_message":    greeting,
        "transcript":         [],
        "status":             "active",
        "direction":          "inbound",
        "caller_number":      from_number,
        "transfer_requested": False,
        "human_number":       EXOTEL_CALLER_ID,
        "started_at":         time.time(),
        "session_id":         None,
    }
    speech_url = f"{SERVER_PUBLIC_URL}/voice/exotel/speech/{call_id}"
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en">{_xml_safe(greeting)}</Say>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""
    return call_id, xml


# ══════════════════════════════════════════════════════════════
# SPEECH TURN — AI processes recording, returns next ExoML
# ══════════════════════════════════════════════════════════════
async def process_speech_turn(call_id: str, recording_url: str,
                               digits: str = "") -> str:
    """
    Called by Exotel after each customer speech recording.
    Downloads audio → Whisper STT → Orchestrator AI → Edge TTS → ExoML
    Returns ExoML XML string.
    """
    call = active_voice_calls.get(call_id)
    if not call:
        return _exoml_hangup("Thank you for calling. Goodbye!")

    # ── Download recording from Exotel ──
    audio_bytes = b""
    if recording_url:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                r = await client.get(recording_url,
                    auth=(EXOTEL_API_KEY, EXOTEL_API_TOKEN))
                audio_bytes = r.content
        except Exception:
            pass

    # ── STT ──
    user_text = ""
    if audio_bytes:
        try:
            import engine_stt
            user_text = engine_stt.transcribe(audio_bytes)
        except Exception:
            pass

    # Fallback: digits pressed (IVR)
    if not user_text and digits:
        user_text = f"pressed {digits}"

    if not user_text:
        # Ask again
        speech_url = f"{SERVER_PUBLIC_URL}/voice/exotel/speech/{call_id}"
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en">Sorry, I didn't catch that. Could you please repeat?</Say>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""

    # ── Log transcript ──
    call["transcript"].append({"role": "user", "content": user_text})
    # Save recording URL for playback
    if recording_url and not call.get("recording_url"):
        call["recording_url"] = recording_url

    # ── Check end-of-call keywords ──
    end_words = ["bye", "goodbye", "stop", "end call", "disconnect", "no thanks", "not interested"]
    if any(w in user_text.lower() for w in end_words):
        call["status"] = "completed"
        return _exoml_hangup("Thank you for your time. Have a wonderful day. Goodbye!")

    # ── Orchestrator AI ──
    session_id = call.get("session_id")
    if not session_id:
        # Create session on first turn
        import uuid
        from orchestrator import create_session
        session_id = str(uuid.uuid4())
        call["session_id"] = session_id
        create_session(
            session_id,
            agent_name   = "Swetha",
            product_info = call.get("product_info", "AI calling assistant"),
            script       = call.get("script", ""),
            goals        = call.get("goals", "Qualify the lead"),
            languages    = "Telugu, Hindi, English",
        )

    from orchestrator import process_turn
    result   = process_turn(session_id, user_text)
    ai_reply = result.get("tts_reply") or result.get("reply") or "Tell me more!"
    emotion  = result.get("emotion", "neutral")
    intent   = result.get("intent", "unknown")

    call["transcript"].append({"role": "assistant", "content": ai_reply})
    call["emotion"] = emotion
    call["intent"]  = intent

    # ── Score & decide transfer ──
    score = _quick_score(call["transcript"])
    call["score"] = score

    # HOT lead (score ≥ 7) or explicitly interested → transfer to human
    if score >= 7 or intent == "interested":
        call["transfer_requested"] = True
        call["status"]             = "transfer_pending"
        human_number = call.get("human_number") or EXOTEL_CALLER_ID
        transfer_msg = (
            f"{ai_reply} "
            "You sound very interested! Let me connect you with our specialist right away."
        )
        return _exoml_transfer(transfer_msg, human_number)

    # ── Continue conversation ──
    speech_url = f"{SERVER_PUBLIC_URL}/voice/exotel/speech/{call_id}"
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en">{_xml_safe(ai_reply)}</Say>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""


# ══════════════════════════════════════════════════════════════
# PLIVO XML — same logic for Plivo users
# ══════════════════════════════════════════════════════════════
def generate_plivo_xml(call_id: str) -> str:
    call = active_voice_calls.get(call_id, {})
    msg  = call.get("opening_message", "Hello! How can I help you today?")
    speech_url = f"{SERVER_PUBLIC_URL}/voice/plivo/speech/{call_id}"
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="WOMAN" language="en-IN">{_xml_safe(msg)}</Speak>
  <Record action="{speech_url}" maxLength="15" recordSession="false" redirect="true"/>
</Response>"""


# ══════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════
def _quick_score(transcript: list) -> int:
    """Fast keyword-based score 0-10 from transcript"""
    text = " ".join(m.get("content", "") for m in transcript if m.get("role") == "user").lower()
    hot_words  = ["interested", "yes", "tell me more", "how much", "price", "demo",
                  "book", "schedule", "sign up", "let's do it", "definitely", "sure"]
    cold_words = ["not interested", "no thanks", "remove", "don't call", "busy",
                  "already have", "not now", "later"]
    score = 5
    for w in hot_words:
        if w in text: score += 1
    for w in cold_words:
        if w in text: score -= 2
    return max(0, min(10, score))


def _xml_safe(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))


def _exoml_hangup(msg: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en">{_xml_safe(msg)}</Say>
  <Hangup/>
</Response>"""


def _exoml_transfer(msg: str, number: str) -> str:
    """Transfer call to human agent"""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en">{_xml_safe(msg)}</Say>
  <Dial callerId="{EXOTEL_CALLER_ID}">
    <Number>{fmt_phone(number)}</Number>
  </Dial>
</Response>"""


# ══════════════════════════════════════════════════════════════
# CALL CONTROL
# ══════════════════════════════════════════════════════════════
def end_voice_call(call_id: str) -> dict:
    if call_id not in active_voice_calls:
        return {"error": "Call not found"}
    active_voice_calls[call_id]["status"] = "completed"
    return {"status": "completed", "transcript": active_voice_calls[call_id]["transcript"]}


def get_call_status(call_id: str) -> dict:
    if call_id not in active_voice_calls:
        return {"error": "Call not found"}
    d = active_voice_calls[call_id]
    return {
        "call_id":            call_id,
        "status":             d["status"],
        "direction":          d.get("direction", "outbound"),
        "transcript_turns":   len(d["transcript"]),
        "score":              d.get("score", 0),
        "transfer_requested": d.get("transfer_requested", False),
        "emotion":            d.get("emotion", "neutral"),
        "intent":             d.get("intent", "unknown"),
    }


def request_human_transfer(call_id: str, human_number: str) -> dict:
    """Dashboard agent manually requests transfer for an active call"""
    if call_id not in active_voice_calls:
        return {"error": "Call not found"}
    active_voice_calls[call_id]["transfer_requested"] = True
    active_voice_calls[call_id]["human_number"]       = human_number
    active_voice_calls[call_id]["status"]             = "transfer_pending"
    return {"status": "transfer_pending", "human_number": human_number}
