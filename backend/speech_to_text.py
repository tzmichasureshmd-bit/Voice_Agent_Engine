"""
Speech-to-Text Module
- Uses OpenAI Whisper (FREE, runs locally)
- For demo: we simulate with text input
- For production: will process real audio from calls
"""
import os


def transcribe_audio(audio_file_path: str) -> str:
    """Convert audio file to text using Whisper"""
    try:
        import whisper
        model = whisper.load_model("base")  # Options: tiny, base, small, medium, large
        result = model.transcribe(audio_file_path)
        return result["text"]
    except ImportError:
        return "[Whisper not installed - using text simulation mode]"
    except Exception as e:
        return f"[STT Error: {str(e)}]"


def simulate_human_response(text: str) -> str:
    """For demo/testing - simulate what a human would say on call"""
    return text  # In demo mode, we type what the human says


# Pre-built responses for demo simulation
DEMO_RESPONSES = {
    "interested": [
        "Yeah sure, tell me more about it",
        "That sounds interesting, what's the pricing?",
        "I've been looking for something like this actually",
        "Can you send me more details?",
        "When can we schedule a meeting?"
    ],
    "not_interested": [
        "No thanks, I'm not interested",
        "I'm busy right now, don't call again",
        "We already have a solution for this",
        "Not looking for anything right now",
        "Please remove my number from your list"
    ],
    "neutral": [
        "Hmm, I'm not sure about this",
        "Let me think about it",
        "What exactly does it do?",
        "How is this different from others?",
        "I'll need to discuss with my team"
    ]
}
