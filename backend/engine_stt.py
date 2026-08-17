"""
TZMICHA ENGINE — Own STT
Whisper — runs 100% local, zero API cost
Supports: Telugu, Hindi, English
"""
import whisper
import tempfile
import os

_model = None
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")

def _load():
    global _model
    if _model is None:
        print(f"Loading Whisper {WHISPER_MODEL} model...")
        _model = whisper.load_model(WHISPER_MODEL)
        print("Whisper ready.")
    return _model

def transcribe(audio_bytes: bytes, language: str = None) -> str:
    model = _load()
    # .webm suffix so ffmpeg auto-converts browser MediaRecorder audio
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(audio_bytes)
        tmp = f.name
    try:
        opts = {"fp16": False}
        if language:
            opts["language"] = language
        result = model.transcribe(tmp, **opts)
        return result["text"].strip()
    finally:
        os.unlink(tmp)

def transcribe_file(path: str, language: str = None) -> str:
    model = _load()
    opts = {"fp16": False}
    if language:
        opts["language"] = language
    result = model.transcribe(path, **opts)
    return result["text"].strip()

def detect_language(audio_bytes: bytes) -> str:
    model = _load()
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(audio_bytes)
        tmp = f.name
    try:
        result = model.transcribe(tmp, fp16=False)
        return result.get("language", "en")
    finally:
        os.unlink(tmp)
