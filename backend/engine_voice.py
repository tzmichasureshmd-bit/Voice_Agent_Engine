"""
TZMICHA ENGINE — Full Voice Pipeline
STT (Whisper) → AI (Groq) → TTS (Edge TTS)
Telugu / Hindi / Indian English / British English / Kannada — all free.

All language/voice mappings come from lang_config.py.
"""
import logging

import engine_stt as stt
import engine_tts as tts
from groq import Groq
from config import GROQ_API_KEY, AI_MODEL
from lang_config import (
    resolve_language,
    get_ai_instruction,
    ORCHESTRATOR_TO_CODE,
)

log = logging.getLogger(__name__)
groq = Groq(api_key=GROQ_API_KEY)


def process_voice_turn(
    audio_bytes: bytes,
    conversation_history: list,
    system_prompt: str,
    language: str = "en",
    gender: str = "female",
    auto_detect_language: bool = True,
    pace: float | None = None,
) -> dict:
    """
    Full pipeline: audio → text → AI → audio.
    Returns: { user_text, ai_text, audio_bytes, language }
    """
    # Step 1: STT — detect or use provided language
    if auto_detect_language:
        raw_detected = stt.detect_language(audio_bytes)
        detected_lang = resolve_language(raw_detected)
        log.info("[PIPELINE] STT auto-detected: %s → canonical: %s", raw_detected, detected_lang)
    else:
        detected_lang = resolve_language(language)
        log.info("[PIPELINE] STT using provided language: %s", detected_lang)

    user_text = stt.transcribe(audio_bytes, language=detected_lang)
    if not user_text:
        return {"error": "Could not transcribe audio"}

    # Step 2: AI — inject language instruction from central config
    lang_instruction = get_ai_instruction(detected_lang)
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

    # Step 3: TTS — speak in detected language with correct voice
    audio_out = tts.synthesize(ai_text, language=detected_lang, gender=gender, pace=pace)

    return {
        "user_text":   user_text,
        "ai_text":     ai_text,
        "audio_bytes": audio_out,
        "language":    detected_lang,
    }


def text_to_speech(
    text: str,
    language: str = "en",
    gender: str = "female",
    pace: float | None = None,
) -> bytes:
    return tts.synthesize(text, language=language, gender=gender, pace=pace)


def speech_to_text(audio_bytes: bytes, language: str | None = None) -> str:
    return stt.transcribe(audio_bytes, language=language)


def orchestrator_lang_to_tts_lang(orchestrator_lang: str) -> str:
    """
    Convert orchestrator session language string (e.g. 'telugu', 'english')
    to a canonical TTS language code (e.g. 'te', 'en').
    """
    return ORCHESTRATOR_TO_CODE.get(orchestrator_lang.lower(), "en")
