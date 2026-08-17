"""
TZMICHA ENGINE — Full Voice Pipeline
STT (Whisper) → AI (Groq) → TTS (Edge TTS)
Telugu / Hindi / Indian English — all free.
"""
import engine_stt as stt
import engine_tts as tts
from groq import Groq
from config import GROQ_API_KEY, AI_MODEL

groq = Groq(api_key=GROQ_API_KEY)

# Maps Whisper language codes → our lang codes
_LANG_MAP = {
    "te": "te", "hi": "hi",
    "en": "en", "english": "en",
    "telugu": "te", "hindi": "hi",
}

LANG_PROMPTS = {
    "te": "Respond in Telugu. Telugu-English mix (Tenglish) is fine.",
    "hi": "Respond in Hindi. Hindi-English mix (Hinglish) is fine.",
    "en": "Respond in Indian English. Keep it natural and warm.",
}


def process_voice_turn(
    audio_bytes: bytes,
    conversation_history: list,
    system_prompt: str,
    language: str = "en",
    gender: str = "female",
    auto_detect_language: bool = True,
) -> dict:
    """
    Full pipeline: audio → text → AI → audio
    Returns: { user_text, ai_text, audio_bytes, language }
    """
    # Step 1: STT
    detected_lang = language
    if auto_detect_language:
        detected_lang = stt.detect_language(audio_bytes)
        detected_lang = _LANG_MAP.get(detected_lang, "en")

    user_text = stt.transcribe(audio_bytes, language=detected_lang if detected_lang != "en" else None)
    if not user_text:
        return {"error": "Could not transcribe audio"}

    # Step 2: AI — inject language instruction into system prompt
    lang_instruction = LANG_PROMPTS.get(detected_lang, LANG_PROMPTS["en"])
    full_prompt = f"{system_prompt}\n\nLANGUAGE: {lang_instruction}"

    conversation_history.append({"role": "user", "content": user_text})
    messages = [{"role": "system", "content": full_prompt}] + conversation_history[-20:]
    response = groq.chat.completions.create(
        model=AI_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=120,
    )
    ai_text = response.choices[0].message.content.strip()
    conversation_history.append({"role": "assistant", "content": ai_text})

    # Step 3: TTS — speak in detected language with Indian voice
    audio_out = tts.synthesize(ai_text, language=detected_lang, gender=gender)

    return {
        "user_text": user_text,
        "ai_text": ai_text,
        "audio_bytes": audio_out,
        "language": detected_lang,
    }


def text_to_speech(text: str, language: str = "en", gender: str = "female") -> bytes:
    return tts.synthesize(text, language=language, gender=gender)


def speech_to_text(audio_bytes: bytes, language: str = None) -> str:
    return stt.transcribe(audio_bytes, language=language)
