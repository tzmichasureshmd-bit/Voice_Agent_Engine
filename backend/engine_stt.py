"""
TZMICHA ENGINE — STT via Whisper (local, zero cost)
Supports: Telugu (te), Hindi (hi), English (en/en-IN/en-GB), Kannada (kn).

Language hints come from lang_config.py — do not duplicate mappings here.

NOTE: Default model is 'base'. For better Indian-language accuracy set
      WHISPER_MODEL=small in your .env file (recommended for production).
      Do NOT change to 'large' without a GPU — it will be too slow for calls.
"""
import logging
import os
import tempfile

import whisper

from lang_config import get_whisper_lang, resolve_language

log = logging.getLogger(__name__)

_model = None
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")


def _load():
    global _model
    if _model is None:
        log.info("[STT] Loading Whisper model: %s", WHISPER_MODEL)
        _model = whisper.load_model(WHISPER_MODEL)
        log.info("[STT] Whisper ready (model=%s)", WHISPER_MODEL)
    return _model


def transcribe(
    audio_bytes: bytes,
    language: str | None = None,
    fmt: str = "webm",
) -> str:
    """
    Transcribe audio bytes to text.

    Args:
        audio_bytes: Raw audio data.
        language:    Language code/locale hint (e.g. 'te', 'te-IN', 'hi', 'en-GB').
                     Pass None for automatic detection.
        fmt:         Audio format — 'webm' for browser MediaRecorder,
                     'mp3' for Exotel/Plivo recordings.

    Returns:
        Transcribed text string (may be empty if audio is silent/noise).
    """
    model = _load()
    whisper_lang = _resolve_whisper_lang(language)

    with tempfile.NamedTemporaryFile(suffix=f".{fmt}", delete=False) as f:
        f.write(audio_bytes)
        tmp = f.name
    try:
        opts: dict = {"fp16": False}
        if whisper_lang:
            opts["language"] = whisper_lang
            log.debug("[STT] transcribe hint=%s fmt=%s bytes=%d", whisper_lang, fmt, len(audio_bytes))
        else:
            log.debug("[STT] transcribe auto-detect fmt=%s bytes=%d", fmt, len(audio_bytes))
        result = model.transcribe(tmp, **opts)
        text = result["text"].strip()
        log.debug("[STT] transcript=%r detected_lang=%s", text[:60], result.get("language"))
        return text
    finally:
        os.unlink(tmp)


def transcribe_file(path: str, language: str | None = None) -> str:
    """Transcribe an audio file on disk."""
    model = _load()
    whisper_lang = _resolve_whisper_lang(language)
    opts: dict = {"fp16": False}
    if whisper_lang:
        opts["language"] = whisper_lang
    result = model.transcribe(path, **opts)
    return result["text"].strip()


def detect_language(audio_bytes: bytes, fmt: str = "webm") -> str:
    """
    Detect the language of audio bytes.
    Returns a Whisper language code (e.g. 'te', 'hi', 'en', 'kn').
    Falls back to 'en' on any error.
    """
    model = _load()
    with tempfile.NamedTemporaryFile(suffix=f".{fmt}", delete=False) as f:
        f.write(audio_bytes)
        tmp = f.name
    try:
        result = model.transcribe(tmp, fp16=False)
        detected = result.get("language", "en")
        log.debug("[STT] detect_language → %s", detected)
        return detected
    except Exception as exc:
        log.warning("[STT] detect_language failed: %s", exc)
        return "en"
    finally:
        os.unlink(tmp)


# ── Internal ───────────────────────────────────────────────────────────────

def _resolve_whisper_lang(language: str | None) -> str | None:
    """
    Convert any language code/locale to a Whisper language hint.
    Returns None for auto-detection.
    """
    if not language:
        return None
    canonical = resolve_language(language)
    hint = get_whisper_lang(canonical)
    return hint  # may be None if canonical not in map (triggers auto-detect)
