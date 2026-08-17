"""
TZMICHA ENGINE — TTS via Microsoft Edge TTS
Free, no API key, Indian voices for Telugu / Hindi / English
"""
import asyncio
import io
import edge_tts

# Best Indian voices per language
VOICES = {
    "te":    "te-IN-ShrutiNeural",   # Telugu female
    "hi":    "hi-IN-SwaraNeural",    # Hindi female
    "en":    "en-IN-NeerjaNeural",   # Indian English female
    "en-IN": "en-IN-NeerjaNeural",
    "ta":    "ta-IN-PallaviNeural",  # Tamil female
    "kn":    "kn-IN-SapnaNeural",    # Kannada female
    "mr":    "mr-IN-AarohiNeural",   # Marathi female
    "bn":    "bn-IN-TanishaaNeural", # Bengali female
    "gu":    "gu-IN-DhwaniNeural",   # Gujarati female
}

# Male alternates if needed
VOICES_MALE = {
    "te":    "te-IN-MohanNeural",
    "hi":    "hi-IN-MadhurNeural",
    "en":    "en-IN-PrabhatNeural",
    "en-IN": "en-IN-PrabhatNeural",
    "ta":    "ta-IN-ValluvarNeural",
    "kn":    "kn-IN-GaganNeural",
    "mr":    "mr-IN-ManoharNeural",
    "bn":    "bn-IN-BashkarNeural",
    "gu":    "gu-IN-NiranjanNeural",
}


def synthesize(text: str, language: str = "en", gender: str = "female") -> bytes:
    """Synthesize text → WAV bytes. Blocking wrapper around async edge_tts."""
    voice = (VOICES_MALE if gender == "male" else VOICES).get(language, VOICES["en"])
    return asyncio.run(_synthesize_async(text, voice))


async def synthesize_async(text: str, language: str = "en", gender: str = "female") -> bytes:
    """Async version for use inside async contexts."""
    voice = (VOICES_MALE if gender == "male" else VOICES).get(language, VOICES["en"])
    return await _synthesize_async(text, voice)


# Speed: +20% = natural human calling pace (not slow, not rushed)
SPEED = "+20%"


async def _synthesize_async(text: str, voice: str) -> bytes:
    buf = io.BytesIO()
    communicate = edge_tts.Communicate(text, voice, rate=SPEED)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    return buf.getvalue()


def synthesize_to_file(text: str, output_path: str, language: str = "en", gender: str = "female"):
    voice = (VOICES_MALE if gender == "male" else VOICES).get(language, VOICES["en"])
    asyncio.run(_save_to_file(text, voice, output_path))


async def _save_to_file(text: str, voice: str, output_path: str):
    communicate = edge_tts.Communicate(text, voice, rate=SPEED)
    await communicate.save(output_path)
