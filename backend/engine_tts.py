"""
TZMICHA ENGINE — TTS via Microsoft Edge TTS
Free, no API key. Voices: Telugu / Hindi / Indian English / British English / Kannada.

All voice mappings come from lang_config.py — do not duplicate them here.
"""
import asyncio
import io
import logging
import re

import edge_tts

from lang_config import get_voice, pace_to_rate, DEFAULT_SPEED_RATE, resolve_language

log = logging.getLogger(__name__)


# ── Natural text preprocessing ─────────────────────────────────────────────

def _preprocess_text(text: str) -> str:
    """
    Make Edge TTS sound more human-like by adding natural pause cues.
    Works across Telugu, Hindi, English, Kannada scripts.
    """
    t = text.strip()

    # Normalize whitespace / newlines
    t = re.sub(r'\r\n|\r', '\n', t)
    t = re.sub(r'\n+', ' ', t)
    t = re.sub(r' {2,}', ' ', t)

    # Ensure space after sentence-ending punctuation before next word
    t = re.sub(r'([.!?])([^\s\d"\'\)\]\}])', r'\1 \2', t)

    # Natural micro-pause after commas (double space = slight breath)
    t = re.sub(r',\s+', ',  ', t)

    # Slightly longer pause after full stops, question marks, exclamations
    t = re.sub(r'\.\s+', '.   ', t)
    t = re.sub(r'\?\s+', '?   ', t)
    t = re.sub(r'!\s+',  '!   ', t)

    # Dash / em-dash → natural pause
    t = re.sub(r'\s*[-–—]\s*', ',  ', t)

    # Ellipsis → longer pause
    t = re.sub(r'\.\.\.',  '...  ', t)

    # Collapse any over-spacing we may have created
    t = re.sub(r' {5,}', '    ', t)

    return t


# ── Public API ─────────────────────────────────────────────────────────────

def synthesize(
    text: str,
    language: str = "en",
    gender: str = "female",
    pace: float | None = None,
) -> bytes:
    """
    Blocking TTS synthesis.
    Returns MP3 bytes. Raises RuntimeError on failure.
    """
    voice = get_voice(language, gender)
    rate  = pace_to_rate(pace) if pace is not None else DEFAULT_SPEED_RATE
    log.info("[TTS] lang=%s gender=%s voice=%s rate=%s chars=%d",
             resolve_language(language), gender, voice, rate, len(text))
    return asyncio.run(_synthesize_async(_preprocess_text(text), voice, rate))


async def synthesize_async(
    text: str,
    language: str = "en",
    gender: str = "female",
    pace: float | None = None,
) -> bytes:
    """
    Async TTS synthesis for use inside async contexts (FastAPI routes, voice_caller).
    Returns MP3 bytes. Raises RuntimeError on failure.
    """
    voice = get_voice(language, gender)
    rate  = pace_to_rate(pace) if pace is not None else DEFAULT_SPEED_RATE
    log.info("[TTS] lang=%s gender=%s voice=%s rate=%s chars=%d",
             resolve_language(language), gender, voice, rate, len(text))
    return await _synthesize_async(_preprocess_text(text), voice, rate)


def synthesize_to_file(
    text: str,
    output_path: str,
    language: str = "en",
    gender: str = "female",
    pace: float | None = None,
) -> None:
    """Save TTS audio directly to a file (MP3)."""
    voice = get_voice(language, gender)
    rate  = pace_to_rate(pace) if pace is not None else DEFAULT_SPEED_RATE
    asyncio.run(_save_to_file(_preprocess_text(text), voice, rate, output_path))


# ── Internal helpers ───────────────────────────────────────────────────────

async def _synthesize_async(text: str, voice: str, rate: str) -> bytes:
    """Core Edge TTS call. Returns MP3 bytes or raises RuntimeError."""
    if not text or not text.strip():
        raise ValueError("TTS text cannot be empty")
    buf = io.BytesIO()
    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
    except Exception as exc:
        raise RuntimeError(f"Edge TTS failed for voice={voice}: {exc}") from exc
    audio = buf.getvalue()
    if not audio:
        raise RuntimeError(f"Edge TTS returned empty audio for voice={voice}")
    return audio


async def _save_to_file(text: str, voice: str, rate: str, output_path: str) -> None:
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(output_path)
