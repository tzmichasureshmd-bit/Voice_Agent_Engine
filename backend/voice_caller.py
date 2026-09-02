"""
TZMICHA — Real Phone Calls (Exotel + Plivo)
Outgoing + Incoming → AI handles → scores → transfers HOT leads to human

Pipeline per turn:
  Exotel records customer → POST to /speech →
  Whisper STT → Orchestrator AI (memory+workflow+language+enhancer) →
  Edge TTS → MP3 served via /voice/audio/{call_id} →
  ExoML <Play> (human Indian voice, not robot)
"""
import os, httpx, asyncio, time, uuid
from pathlib import Path
from config import SERVER_PUBLIC_URL

# ── Exotel Config ──────────────────────────────────────────────
EXOTEL_SID       = os.getenv("EXOTEL_SID",       "tzmicha1")
EXOTEL_API_KEY   = os.getenv("EXOTEL_API_KEY",   "")
EXOTEL_API_TOKEN = os.getenv("EXOTEL_API_TOKEN",  "")
EXOTEL_CALLER_ID = os.getenv("EXOTEL_CALLER_ID",  "09513886363")

# Plivo (fallback)
PLIVO_AUTH_ID     = os.getenv("PLIVO_AUTH_ID",    "")
PLIVO_AUTH_TOKEN  = os.getenv("PLIVO_AUTH_TOKEN", "")
PLIVO_FROM_NUMBER = os.getenv("PLIVO_FROM_NUMBER","")

def _run_async(coro):
    """Safely run async from sync context — works inside or outside event loop"""
    try:
        loop = asyncio.get_running_loop()
        # Already inside event loop (FastAPI) — use thread executor
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, coro)
            return future.result(timeout=15)
    except RuntimeError:
        # No event loop running — safe to use asyncio.run
        return asyncio.run(coro)
AUDIO_DIR = Path(__file__).parent / "audio_cache"
AUDIO_DIR.mkdir(exist_ok=True)

# ── In-memory call store ───────────────────────────────────────
active_voice_calls: dict = {}

# ── Services (lazy init) ───────────────────────────────────────
_memory_svc   = None
_language_svc = None
_enhancer_svc = None
_workflow_svc = None

def _get_services():
    global _memory_svc, _language_svc, _enhancer_svc, _workflow_svc
    if _memory_svc is None:
        from services.memory_service   import MemoryService
        from services.language_service import LanguageService
        from services.voice_enhancer   import VoiceEnhancer
        from services.workflow_service import WorkflowService
        _memory_svc   = MemoryService()
        _language_svc = LanguageService()
        _enhancer_svc = VoiceEnhancer()
        _workflow_svc = WorkflowService()
    return _memory_svc, _language_svc, _enhancer_svc, _workflow_svc


# ── Phone formatters ───────────────────────────────────────────
def fmt_phone(phone: str) -> str:
    p = phone.strip().replace(" ", "").replace("-", "")
    if p.startswith("+91"): return "0" + p[3:]
    if p.startswith("91") and len(p) == 12: return "0" + p[2:]
    if not p.startswith("0") and len(p) == 10: return "0" + p
    return p

def fmt_phone_plivo(phone: str) -> str:
    p = phone.strip().replace(" ", "").replace("-", "")
    if p.startswith("+91"): return p
    if p.startswith("91") and len(p) == 12: return "+" + p
    if p.startswith("0") and len(p) == 11: return "+91" + p[1:]
    if len(p) == 10: return "+91" + p
    return p


# ══════════════════════════════════════════════════════════════
# EDGE TTS — generate mp3, save to audio_cache, return serve URL
# ══════════════════════════════════════════════════════════════
async def _tts_to_url(text: str, language: str = "en") -> str:
    """
    Synthesize text → Edge TTS mp3 → save to audio_cache →
    return public URL Exotel can <Play>
    """
    try:
        import engine_tts
        # map orchestrator lang names → engine_tts lang codes
        lang_map = {"telugu": "te", "hindi": "hi", "english": "en", "te": "te", "hi": "hi", "en": "en"}
        lang = lang_map.get(language, "en")
        audio_bytes = await engine_tts.synthesize_async(text, language=lang)
        filename = f"{uuid.uuid4().hex}.mp3"
        filepath = AUDIO_DIR / filename
        filepath.write_bytes(audio_bytes)
        return f"{SERVER_PUBLIC_URL}/voice/audio/{filename}"
    except Exception as e:
        print(f"[TTS] failed: {e}")
        return ""


# ══════════════════════════════════════════════════════════════
# OUTGOING CALL
# ══════════════════════════════════════════════════════════════
def make_outgoing_call(phone_number: str, lead_id: int, client_id: int,
                       opening_message: str, human_transfer_number: str = "") -> dict:
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
        "language":           "english",
        "product_info":       "",
        "script":             "",
        "goals":              "",
    }

    if EXOTEL_API_KEY and EXOTEL_API_TOKEN:
        return _exotel_call(call_id, phone_number)
    if PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN:
        return _plivo_call(call_id, phone_number)

    active_voice_calls[call_id]["status"] = "demo"
    return {"call_id": call_id, "status": "demo_mode",
            "message": "No telephony credentials. Add EXOTEL_API_KEY or PLIVO_AUTH_ID to .env",
            "phone": phone_number}


def _exotel_call(call_id: str, phone_number: str) -> dict:
    phone      = fmt_phone(phone_number)
    exoml_url  = f"{SERVER_PUBLIC_URL}/voice/exotel/answer/{call_id}"
    status_url = f"{SERVER_PUBLIC_URL}/voice/exotel/status/{call_id}"
    url = f"https://{EXOTEL_API_KEY}:{EXOTEL_API_TOKEN}@api.exotel.com/v1/Accounts/{EXOTEL_SID}/Calls/connect.json"
    try:
        resp = httpx.post(url, data={
            "From": phone, "CallerId": EXOTEL_CALLER_ID,
            "Url": exoml_url, "StatusCallback": status_url,
            "TimeLimit": 300, "TimeOut": 30,
        }, timeout=15.0)
        if resp.status_code in (200, 201):
            sid = resp.json().get("Call", {}).get("Sid", "")
            active_voice_calls[call_id].update({"exotel_sid": sid, "status": "ringing"})
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
            "from": PLIVO_FROM_NUMBER, "to": phone,
            "answer_url": answer_url, "answer_method": "GET",
            "hangup_url": hangup_url, "hangup_method": "POST",
            "time_limit": 300, "record": True,
        }, timeout=15.0)
        if resp.status_code in (200, 201, 202):
            uid = resp.json().get("request_uuid", "")
            active_voice_calls[call_id].update({"plivo_uuid": uid, "status": "ringing"})
            return {"call_id": call_id, "plivo_uuid": uid, "status": "ringing", "phone": phone}
        active_voice_calls.pop(call_id, None)
        return {"error": f"Plivo {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        active_voice_calls.pop(call_id, None)
        return {"error": str(e)[:120]}


# ══════════════════════════════════════════════════════════════
# EXOML — Outgoing: AI speaks opening via Edge TTS
# ══════════════════════════════════════════════════════════════
def generate_exoml_answer(call_id: str) -> str:
    call       = active_voice_calls.get(call_id, {})
    msg        = call.get("opening_message", "Hello! How can I help you today?")
    speech_url = f"{SERVER_PUBLIC_URL}/voice/exotel/speech/{call_id}"

    audio_url = _run_async(_tts_to_url(msg, call.get("language", "english"))) if msg else ""

    if audio_url:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>{audio_url}</Play>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en">{_xml_safe(msg)}</Say>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""


# ══════════════════════════════════════════════════════════════
# EXOML — Incoming: AI picks up with Edge TTS
# ══════════════════════════════════════════════════════════════
def generate_exoml_incoming(from_number: str, client_id: int = 1) -> tuple[str, str]:
    call_id  = f"in_{client_id}_{int(time.time())}"
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
        "language":           "english",
        "product_info":       "",
        "script":             "",
        "goals":              "",
    }
    speech_url = f"{SERVER_PUBLIC_URL}/voice/exotel/speech/{call_id}"
    audio_url  = _run_async(_tts_to_url(greeting, "english"))

    if audio_url:
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>{audio_url}</Play>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""
    else:
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en">{_xml_safe(greeting)}</Say>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""
    return call_id, xml


# ══════════════════════════════════════════════════════════════
# SPEECH TURN — full pipeline per customer turn
# Whisper STT → memory+language+workflow+enhancer → Groq AI → Edge TTS → ExoML
# ══════════════════════════════════════════════════════════════
async def process_speech_turn(call_id: str, recording_url: str, digits: str = "") -> str:
    call = active_voice_calls.get(call_id)
    if not call:
        return _exoml_hangup("Thank you for calling. Goodbye!")

    memory, language_svc, enhancer, workflow = _get_services()

    # ── 1. Download recording from Exotel ──
    audio_bytes = b""
    if recording_url:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                r = await client.get(recording_url,
                    auth=(EXOTEL_API_KEY, EXOTEL_API_TOKEN))
                audio_bytes = r.content
        except Exception as e:
            print(f"[STT] download failed: {e}")

    # ── 2. Whisper STT (Exotel sends mp3) ──
    user_text = ""
    if audio_bytes:
        try:
            import engine_stt
            result = engine_stt.transcribe(audio_bytes, fmt="mp3")
            user_text = result.strip()
        except Exception as e:
            print(f"[STT] transcribe failed: {e}")

    if not user_text and digits:
        user_text = f"pressed {digits}"

    if not user_text:
        speech_url = f"{SERVER_PUBLIC_URL}/voice/exotel/speech/{call_id}"
        sorry_audio = await _tts_to_url("Sorry, I didn't catch that. Could you please repeat?", call.get("language", "english"))
        if sorry_audio:
            return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>{sorry_audio}</Play>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en">Sorry, I didn't catch that. Could you please repeat?</Say>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""

    # ── 3. Language detection (LanguageService) ──
    detected_lang = await language_svc.detect(user_text)
    call["language"] = detected_lang  # te / hi / en

    # ── 4. Log transcript ──
    call["transcript"].append({"role": "user", "content": user_text})
    if recording_url and not call.get("recording_url"):
        call["recording_url"] = recording_url

    # ── 5. End-of-call detection ──
    end_words = ["bye", "goodbye", "stop", "end call", "disconnect", "no thanks", "not interested"]
    if any(w in user_text.lower() for w in end_words):
        call["status"] = "completed"
        farewell = "Thank you for your time. Have a wonderful day. Goodbye!"
        audio_url = await _tts_to_url(farewell, detected_lang)
        return _exoml_hangup_audio(farewell, audio_url)

    # ── 6. Orchestrator AI (memory + workflow + language aware) ──
    session_id = call.get("session_id")
    if not session_id:
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
    lang_out = result.get("language", detected_lang)

    # ── 7. Voice Enhancer (human-sounding fillers, topic return) ──
    ai_reply = enhancer.enhance(
        ai_reply,
        emotion=emotion,
        is_after_interruption=False,
    )

    call["transcript"].append({"role": "assistant", "content": ai_reply})
    call["emotion"] = emotion
    call["intent"]  = intent

    # ── 8. Lead scoring ──
    score = _quick_score(call["transcript"])
    call["score"] = score

    # ── 9. HOT lead → transfer to human ──
    if score >= 7 or intent == "interested":
        call["transfer_requested"] = True
        call["status"]             = "transfer_pending"
        human_number = call.get("human_number") or EXOTEL_CALLER_ID
        transfer_msg = ai_reply + " You sound very interested! Let me connect you with our specialist right away."
        audio_url = await _tts_to_url(transfer_msg, lang_out)
        return _exoml_transfer_audio(transfer_msg, audio_url, human_number)

    # ── 10. Edge TTS → ExoML <Play> ──
    speech_url = f"{SERVER_PUBLIC_URL}/voice/exotel/speech/{call_id}"
    audio_url  = await _tts_to_url(ai_reply, lang_out)

    if audio_url:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>{audio_url}</Play>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""

    # Fallback to Say if TTS fails
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en">{_xml_safe(ai_reply)}</Say>
  <Record action="{speech_url}" method="POST" maxLength="15" finishOnKey="#" playBeep="false" transcribe="false"/>
</Response>"""


# ══════════════════════════════════════════════════════════════
# PLIVO XML
# ══════════════════════════════════════════════════════════════
def generate_plivo_xml(call_id: str) -> str:
    call       = active_voice_calls.get(call_id, {})
    msg        = call.get("opening_message", "Hello! How can I help you today?")
    speech_url = f"{SERVER_PUBLIC_URL}/voice/plivo/speech/{call_id}"
    audio_url  = _run_async(_tts_to_url(msg, call.get("language", "english")))
    if audio_url:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>{audio_url}</Play>
  <Record action="{speech_url}" maxLength="15" recordSession="false" redirect="true"/>
</Response>"""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="WOMAN" language="en-IN">{_xml_safe(msg)}</Speak>
  <Record action="{speech_url}" maxLength="15" recordSession="false" redirect="true"/>
</Response>"""


# ══════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════
def _quick_score(transcript: list) -> int:
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


def _exoml_hangup_audio(msg: str, audio_url: str) -> str:
    if audio_url:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>{audio_url}</Play>
  <Hangup/>
</Response>"""
    return _exoml_hangup(msg)


def _exoml_transfer_audio(msg: str, audio_url: str, number: str) -> str:
    play_tag = f"<Play>{audio_url}</Play>" if audio_url else f"<Say voice='female' language='en'>{_xml_safe(msg)}</Say>"
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  {play_tag}
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
        "language":           d.get("language", "english"),
    }


def request_human_transfer(call_id: str, human_number: str) -> dict:
    if call_id not in active_voice_calls:
        return {"error": "Call not found"}
    active_voice_calls[call_id].update({
        "transfer_requested": True,
        "human_number":       human_number,
        "status":             "transfer_pending",
    })
    return {"status": "transfer_pending", "human_number": human_number}
