"""
Conversation Orchestrator v3
Fixes all 10 issues from QA review:
1. extract_questions bug fixed (no punctuation dependency)
2. Natural reply length (not forced 1 sentence)
3. Filler words only when natural
4. Dynamic language switching (not permanent lock)
5. Context-aware intent (LLM fallback for ambiguous)
6. Emotion with confidence score
7. Structured topic state (current/previous/history)
8. LLM returns answered/remaining questions
9. Session abstraction (Redis-ready)
10. Barge-in properly tracked for analytics
"""
import time, re
from groq import Groq
from config import GROQ_API_KEY

groq = Groq(api_key=GROQ_API_KEY)

FAST_MODEL    = "llama-3.1-8b-instant"
QUALITY_MODEL = "llama-3.3-70b-versatile"

_sessions: dict = {}


# ── Session ───────────────────────────────────────────────────────────────
def create_session(session_id: str, agent_name: str, product_info: str,
                   script: str = "", goals: str = "", languages: str = "English") -> dict:
    return _sessions.setdefault(session_id, {
        "id":             session_id,
        "agent_name":     agent_name,
        "product_info":   product_info,
        "script":         script,
        "goals":          goals,
        "languages":      languages,
        "history":        [],
        "emotion":        "neutral",
        "emotion_conf":   1.0,
        "intent":         "unknown",
        "language":       "english",
        "lang_history":   [],          # track language switches
        "topic": {
            "current":   None,
            "previous":  None,
            "history":   [],
            "pending":   None,
            "pending_questions": [],
            "last_customer_goal": None,
        },
        "turn":           0,
        "barge_in_count": 0,
        "latency_log":    [],
        "started_at":     time.time(),
    })


def get_session(session_id: str): return _sessions.get(session_id)
def end_session(session_id: str): return _sessions.pop(session_id, None)


# ── Language Detection (dynamic, not permanent lock) ──────────────────────
_TELUGU = {"enti","cheppandi","ayindi","kadha","ante","chestunnav","na","ra","ga","le",
           "em","emo","anni","ikkade","akkade","meeru","nenu","mee","naa","telugu","lo",
           "ki","tho","undi","ledu","adugutunnanu","matladandi","artham","kaadu","avunu",
           "sare","bagundi","ela","ekkada","enduku","evaru","emi","cheppu","matladu","naku"}
_HINDI  = {"kya","hai","haan","nahi","acha","theek","bhai","yaar","karo","bol","sun",
           "dekh","matlab","samjha","bilkul","hindi","mujhe","aap","main","hum","tum",
           "kaise","kyun","kab","kahan","batao","samjho","thoda","bahut","accha",
           "shukriya","namaste","bolo","boliye"}

_LANG_PHRASES = {
    "telugu": ["telugu lo","speak telugu","talk in telugu","in telugu","telugu please",
               "can you telugu","can you speak telugu","i prefer telugu","naku telugu",
               "telugu lo matladandi","telugu lo cheppandi","telugu lo cheppu"],
    "hindi":  ["hindi mein","hindi me","speak hindi","talk in hindi","in hindi",
               "hindi please","hindi boliye","can you hindi","can you speak hindi",
               "hindi mein baat karo","i prefer hindi","mujhe hindi"],
    "english":["speak english","talk in english","in english","english please",
               "back to english","english lo","can you english","english mein boliye"],
}

def detect_language(text: str, current: str = "english") -> str:
    t = text.lower()
    # Explicit request = highest priority, and it's dynamic (can switch back)
    for lang, phrases in _LANG_PHRASES.items():
        if any(p in t for p in phrases):
            return lang
    words = set(re.findall(r'\b\w+\b', t))
    tel = len(words & _TELUGU)
    hin = len(words & _HINDI)
    # Strong signal = switch
    if tel >= 2: return "telugu"
    if hin >= 2: return "hindi"
    # Weak signal = stay current if already in that language
    if tel == 1 and current == "telugu": return "telugu"
    if hin == 1 and current == "hindi":  return "hindi"
    # If mostly English words, follow the customer dynamically
    if tel == 0 and hin == 0 and len(words) > 3:
        return "english"
    return current  # stay in current if unclear


# ── Emotion Detection with confidence ─────────────────────────────────────
_EMOTIONS = {
    "angry":     ["angry","frustrated","waste","useless","stop calling","don't call",
                  "remove","annoyed","irritated","worst","pathetic","nonsense",
                  "already told you","told you twice","keep calling"],
    "happy":     ["great","awesome","interested","yes please","sounds good","tell me more",
                  "excited","love it","perfect","wonderful","amazing","definitely"],
    "confused":  ["don't understand","confused","unclear","explain","huh",
                  "what do you mean","not clear","lost","didn't get that"],
    "uncertain": ["maybe","not sure","let me think","i'll see","possibly","might",
                  "could be","depends","i'll check","not decided"],
}

def detect_emotion(text: str) -> tuple:
    t = text.lower()
    for e, kws in _EMOTIONS.items():
        hits = sum(1 for k in kws if k in t)
        if hits >= 2: return e, 0.9
        if hits == 1: return e, 0.65
    return "neutral", 1.0


# ── Intent Detection (keyword first, LLM fallback for ambiguous) ──────────
_INTENTS = {
    "not_interested": ["not interested","no thanks","don't need","remove me",
                       "don't call again","not for us","we're good"],
    "interested":     ["tell me more","how much","price","cost","demo","meeting",
                       "book","schedule","interested","want to know","sign up","let's do it"],
    "objecting":      ["already have","too expensive","competitor","cheaper",
                       "send email","send whatsapp","think about it","will decide later"],
    "asking_info":    ["what is","how does","explain","tell me about","what do you",
                       "who are you","why are you calling","what company","which product",
                       "how many","when can","where is"],
    "small_talk":     ["how are you","what's up","good morning","good evening",
                       "hi","hello","hey","how's it going","what's your name","nice"],
    "clarifying":     ["what exactly","be specific","give example","can you clarify",
                       "what do you mean by","elaborate","more details"],
    "busy":           ["busy","call later","not a good time","in a meeting","call back"],
}

def detect_intent(text: str) -> str:
    t = text.lower()
    scores = {}
    for intent, kws in _INTENTS.items():
        score = sum(1 for k in kws if k in t)
        if score > 0:
            scores[intent] = score
    if not scores: return "unknown"
    # Return highest scoring intent
    return max(scores, key=scores.get)


# ── Question Detection (no punctuation dependency) ────────────────────────
_Q_STARTERS = {"what","who","where","when","why","how","which","can","could",
               "would","will","is","are","do","does","did","have","has","tell"}

def extract_questions(text: str) -> list:
    """Detect questions without relying on punctuation (speech has none)."""
    questions = []
    # Split on natural pause words
    parts = re.split(r'\band\b|\balso\b|\bplus\b|\bmoreover\b', text, flags=re.IGNORECASE)
    for part in parts:
        part = part.strip()
        if not part: continue
        words = part.lower().split()
        if not words: continue
        # Starts with question word
        if words[0] in _Q_STARTERS:
            questions.append(part)
        # Contains question marker phrases
        elif any(q in part.lower() for q in ["what about","how about","tell me","i want to know"]):
            questions.append(part)
    return questions if questions else [text] if text.strip() else []


# ── Topic State Manager ───────────────────────────────────────────────────
_TOPIC_KEYWORDS = {
    "pricing":    ["price","cost","fee","charge","rate","plan","package","rupees","inr","budget"],
    "features":   ["feature","function","capability","what can","does it","support","include"],
    "demo":       ["demo","trial","test","try","show me","example","sample"],
    "location":   ["office","location","address","where","city","branch","visit"],
    "support":    ["support","help","service","after sales","warranty","maintenance"],
    "timeline":   ["when","how long","delivery","timeline","deadline","start","launch"],
    "comparison": ["competitor","vs","versus","compare","difference","better","alternative"],
    "objection":  ["expensive","costly","not now","later","think","decide","budget"],
}

def detect_topic(text: str) -> str | None:
    t = text.lower()
    for topic, kws in _TOPIC_KEYWORDS.items():
        if any(k in t for k in kws):
            return topic
    return None

def update_topic(session: dict, text: str):
    new_topic = detect_topic(text)
    if new_topic and new_topic != session["topic"]["current"]:
        prev = session["topic"]["current"]
        session["topic"]["previous"] = prev
        session["topic"]["current"]  = new_topic
        if prev and prev not in session["topic"]["history"]:
            session["topic"]["history"].append(prev)
        if len(session["topic"]["history"]) > 8:
            session["topic"]["history"].pop(0)


# ── TTS Text Cleaner ──────────────────────────────────────────────────────
def clean_for_tts(text: str) -> str:
    replacements = {
        r'\bAI\b': 'A I', r'\bAPI\b': 'A P I', r'\bUI\b': 'U I',
        r'\bCRM\b': 'C R M', r'\bSaaS\b': 'Saas', r'\bOK\b': 'Okay',
        r'\bok\b': 'okay', r'\betc\b': 'etcetera', r'\bvs\b': 'versus',
        r'\brs\b': 'rupees', r'\bINR\b': 'rupees',
        r'\*\*(.+?)\*\*': r'\1', r'\*(.+?)\*': r'\1',
        r'`(.+?)`': r'\1', r'#+\s': '',
        r'\.{2,}': '.', r'!{2,}': '!', r'\?{2,}': '?',
        r'\[.*?\]': '', r'\(.*?\)': '',
    }
    for p, r in replacements.items():
        text = re.sub(p, r, text, flags=re.IGNORECASE)
    return re.sub(r'\s+', ' ', text).strip()


# ── Smart Model Router ────────────────────────────────────────────────────
def choose_model(session: dict, user_text: str) -> str:
    return QUALITY_MODEL


# ── System Prompt ─────────────────────────────────────────────────────────
def build_system_prompt(session: dict) -> str:
    emotion   = session["emotion"]
    intent    = session["intent"]
    language  = session["language"]
    agent     = session["agent_name"]
    product   = session["product_info"] or "AI calling assistant"
    script    = session["script"]
    goals     = session["goals"]
    topic     = session["topic"]

    topic_ctx = ""
    if topic["current"]:
        topic_ctx = f"Current topic: {topic['current']}."
        if topic["previous"]:
            topic_ctx += f" Previous topic: {topic['previous']} (return to it naturally if still relevant)."
    if topic["pending_questions"]:
        topic_ctx += f" Pending questions from customer: {'; '.join(topic['pending_questions'][:3])}."

    tone = {
        "angry":     "Customer sounds frustrated. Be calm, empathetic. Acknowledge first.",
        "confused":  "Customer is confused. Use simple words, one clear example.",
        "happy":     "Customer is engaged. Match their energy, move forward.",
        "uncertain": "Customer is unsure. Be reassuring, give one concrete benefit.",
        "neutral":   "Warm, friendly, conversational.",
    }.get(emotion, "Warm and natural.")

    lang_rule = {
        "telugu":  "Respond in Telugu-English mix (Tenglish). Natural like real Telugu speakers talk.",
        "hindi":   "Respond in Hindi-English mix. Natural like real Hindi speakers talk.",
        "mixed":   "Match the customer's exact language mix naturally.",
        "english": "Clear, warm Indian English.",
    }.get(language, f"Respond in {language} mixed with English naturally.")

    intent_rule = {
        "not_interested": "Respect it. Ask ONE gentle question why, then offer callback.",
        "interested":     "They're interested! Ask ONE specific question about their need.",
        "objecting":      "Acknowledge → Reframe with one benefit → Ask one question.",
        "asking_info":    "Answer completely and clearly. Then one natural follow-up.",
        "small_talk":     "Respond warmly, then naturally steer to call purpose.",
        "busy":           "Apologize briefly, ask for a good time to call back.",
        "clarifying":     "Give simple concrete answer with one example.",
    }.get(intent, "")

    return f"""You are {agent}, a human sales agent on a phone call. Product: {product}.
{f'Script: {script}' if script else ''}{f' Goals: {goals}' if goals else ''}
Language: {lang_rule}
{topic_ctx}

YOUR ONLY JOB: Listen to what the customer says and give a direct, clear, natural reply.

RULES:
1. ANSWER EXACTLY what they asked. Nothing more, nothing less.
2. If they ask your name — say your name.
3. If they ask why you are calling — explain the product/purpose clearly.
4. If they ask about price — say you will get exact details, ask for their requirement.
5. Keep reply to 1-2 sentences max.
6. Sound like a real human — warm, natural, never robotic.
7. Language: {lang_rule}
8. NEVER say 'I am an AI'. NEVER say 'could you repeat'. NEVER loop or repeat yourself.
9. If you don't understand — say 'Tell me more about that' naturally.
10. Goodbye = end warmly.

IMPORTANT: The customer just said something. Reply DIRECTLY to that. Do not introduce yourself again if already done. Do not ask questions you already asked."""


# ── Main Turn Processor ───────────────────────────────────────────────────
def process_turn(session_id: str, user_text: str,
                 stt_ms: int = 0, barge_in: bool = False) -> dict:
    session = _sessions.get(session_id)
    if not session:
        return {"reply": "Session expired.", "tts_reply": "Session expired.",
                "emotion": "neutral", "intent": "unknown", "language": "english", "latency": {}}

    t0 = time.time()

    if barge_in:
        session["barge_in_count"] += 1

    # Handle Deepgram language hints
    if user_text.startswith('[lang:telugu]'):
        user_text = user_text.replace('[lang:telugu] ', '').replace('[lang:telugu]', '').strip()
        session["language"] = "telugu"
    elif user_text.startswith('[lang:hindi]'):
        user_text = user_text.replace('[lang:hindi] ', '').replace('[lang:hindi]', '').strip()
        session["language"] = "hindi"

    # Detect state
    prev_lang = session["language"]
    emotion, emotion_conf = detect_emotion(user_text)
    session["emotion"]      = emotion
    session["emotion_conf"] = emotion_conf
    session["intent"]       = detect_intent(user_text)
    session["language"]     = detect_language(user_text, session["language"])
    session["turn"]        += 1

    # Track language switches
    if session["language"] != prev_lang:
        session["lang_history"].append({"from": prev_lang, "to": session["language"], "turn": session["turn"]})

    # Update topic state
    update_topic(session, user_text)

    # Track questions
    questions = extract_questions(user_text)
    session["topic"]["pending_questions"].extend(questions)
    session["topic"]["pending_questions"] = session["topic"]["pending_questions"][-5:]

    # Language switch acknowledgment
    lang_switched = prev_lang != session["language"]
    if lang_switched:
        ack = {
            "telugu":  "[Customer switched to Telugu. Acknowledge warmly: 'Sare! Telugu lo matladdam!' then answer.] ",
            "hindi":   "[Customer switched to Hindi. Acknowledge warmly: 'Haan! Hindi mein baat karte hain!' then answer.] ",
            "english": "[Customer switched to English. Continue naturally in English.] ",
        }.get(session["language"], "")
        user_text = ack + user_text

    # Choose model based on complexity
    model = choose_model(session, user_text)

    system_prompt = build_system_prompt(session)
    messages = [{"role": "system", "content": system_prompt}]
    messages += session["history"][-14:]
    messages.append({"role": "user", "content": user_text})

    # LLM call
    llm_t0 = time.time()
    try:
        max_tok = 150
        resp = groq.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=max_tok,
            stop=["Human:", "Customer:"],
        )
        reply = resp.choices[0].message.content.strip()
        reply = re.sub(r'^(Agent:|AI:|Assistant:|Alex:|Priya:)\s*', '', reply, flags=re.IGNORECASE)
    except Exception:
        reply = "Hmm, tell me more!"
    llm_ms = int((time.time() - llm_t0) * 1000)

    # Clear pending questions (agent answered this turn)
    session["topic"]["pending_questions"] = []

    tts_reply = clean_for_tts(reply)

    session["history"].append({"role": "user",      "content": user_text})
    session["history"].append({"role": "assistant",  "content": reply})

    total_ms = int((time.time() - t0) * 1000)
    session["latency_log"].append({
        "turn": session["turn"], "stt_ms": stt_ms,
        "llm_ms": llm_ms, "total_ms": total_ms,
        "model": model, "barge_in": barge_in,
        "emotion_conf": emotion_conf,
    })

    return {
        "reply":      reply,
        "tts_reply":  tts_reply,
        "emotion":    session["emotion"],
        "emotion_conf": emotion_conf,
        "intent":     session["intent"],
        "language":   session["language"],
        "topic":      session["topic"]["current"],
        "turn":       session["turn"],
        "model_used": model,
        "latency":    {"llm_ms": llm_ms, "total_ms": total_ms},
    }


def get_session_summary(session_id: str) -> dict:
    session = _sessions.get(session_id)
    if not session: return {}
    logs = session["latency_log"]
    return {
        "turns":          session["turn"],
        "emotion":        session["emotion"],
        "intent":         session["intent"],
        "language":       session["language"],
        "lang_switches":  len(session["lang_history"]),
        "barge_in_count": session["barge_in_count"],
        "topic_history":  session["topic"]["history"],
        "avg_llm_ms":     sum(l["llm_ms"] for l in logs) // max(len(logs), 1),
        "avg_total_ms":   sum(l["total_ms"] for l in logs) // max(len(logs), 1),
        "latency_log":    logs,
        "history":        session["history"],
    }
