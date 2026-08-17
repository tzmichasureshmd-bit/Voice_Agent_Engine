"""
Text-to-Speech — YOUR OWN CLONED VOICE via ElevenLabs
Fallback: gTTS (Google, free, needs internet)
"""

import os
import requests

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")   # paste in .env
YOUR_VOICE_ID      = os.getenv("ELEVENLABS_VOICE_ID", "")  # paste in .env


def speak_text(text: str, save_to_file: str = "output.mp3") -> str:
    """Speak using YOUR cloned ElevenLabs voice."""
    if not ELEVENLABS_API_KEY or not YOUR_VOICE_ID:
        return speak_text_gtts(text, save_to_file)

    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{YOUR_VOICE_ID}"
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.85}
        }
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()

        filepath = f"./data/{save_to_file}"
        os.makedirs("./data", exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(response.content)
        return filepath

    except Exception as e:
        print(f"[ElevenLabs Error: {e}] — falling back to gTTS")
        return speak_text_gtts(text, save_to_file)


def speak_text_gtts(text: str, filename: str = "output.mp3") -> str:
    """Fallback: Google TTS (free, needs internet)."""
    try:
        from gtts import gTTS
        filepath = f"./data/{filename}"
        os.makedirs("./data", exist_ok=True)
        gTTS(text=text, lang="en", slow=False).save(filepath)
        return filepath
    except Exception as e:
        return f"[gTTS Error: {str(e)}]"
