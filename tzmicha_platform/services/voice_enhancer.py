"""
TZMICHA AI OS - Natural Voice Enhancer
Makes AI speech sound HUMAN, not robotic.

Adds:
- Natural fillers ("Hmm...", "So...", "Right...")
- Thinking pauses ("Let me check...", "One moment...")
- Breath-like micro-pauses between sentences
- Speed matching (if customer is slow, AI slows down)
- Emotion in responses (excitement, empathy, concern)
"""

import re
import random
from typing import Optional


class VoiceEnhancer:
    """
    Post-processes AI text responses to sound more human when spoken.
    
    This runs AFTER the LLM generates text but BEFORE TTS converts to audio.
    Adds natural speech patterns that make the AI sound alive.
    """

    def __init__(self):
        # Natural fillers - sprinkled occasionally
        self.fillers = {
            "start": [
                "So, ", "Well, ", "Right, ", "Okay so, ", "Hmm, ",
                "Ah, ", "You know, ", "Actually, ",
            ],
            "mid": [
                ", you know, ", ", basically, ", ", right, ",
                "... ", ", hmm, ", ", actually, ",
            ],
            "thinking": [
                "Let me think... ", "Hmm, let me see... ",
                "One moment... ", "Let me check that... ",
                "Good question... ", "So basically... ",
            ],
        }

        # Transition phrases (when returning to topic)
        self.transitions = {
            "return_to_topic": [
                "Anyway, as I was saying, ",
                "Coming back to what we were discussing, ",
                "So, regarding that, ",
                "Right, so about that, ",
            ],
            "acknowledge_interrupt": [
                "Sure, ", "Of course! ", "Absolutely, ",
                "Oh right, ", "Good point, ", "Ah yes, ",
            ],
            "empathy": [
                "I understand, ", "That makes sense, ",
                "I hear you, ", "Totally get it, ",
            ],
        }

        # SSML pause markers (for TTS providers that support it)
        self.pause_markers = {
            "short": "<break time='200ms'/>",
            "medium": "<break time='500ms'/>",
            "long": "<break time='800ms'/>",
            "breath": "<break time='300ms'/>",
        }

        self._filler_probability = 0.25  # 25% chance of adding a filler
        self._use_ssml = False  # Set True for SSML-compatible TTS

    def enhance(
        self,
        text: str,
        context: Optional[str] = None,
        emotion: Optional[str] = None,
        is_returning_to_topic: bool = False,
        is_after_interruption: bool = False,
        customer_speed: str = "normal",
    ) -> str:
        """
        Enhance AI response text to sound more natural when spoken.
        
        Args:
            text: Raw LLM response
            context: Conversation context (to determine appropriate tone)
            emotion: Detected emotion to convey (excited, empathetic, neutral)
            is_returning_to_topic: True if AI is resuming a previous topic
            is_after_interruption: True if customer just interrupted
            customer_speed: "slow", "normal", "fast" - AI mirrors their pace
        """
        if not text:
            return text

        # Clean up any existing artifacts
        text = self._clean_text(text)

        # Handle interruption acknowledgment
        if is_after_interruption:
            text = self._add_interruption_response(text)

        # Handle topic return
        elif is_returning_to_topic:
            text = self._add_topic_return(text)

        # Add occasional fillers (don't overdo it)
        if random.random() < self._filler_probability:
            text = self._add_filler(text)

        # Add natural pauses between sentences
        text = self._add_natural_pauses(text)

        # Adjust for customer speed
        if customer_speed == "slow":
            text = self._add_extra_pauses(text)

        # Add emotional markers
        if emotion:
            text = self._add_emotion(text, emotion)

        return text.strip()

    def enhance_for_tts(self, text: str, provider: str = "elevenlabs") -> str:
        """
        Provider-specific enhancements.
        Some TTS providers support SSML or special markers.
        """
        if provider == "elevenlabs":
            # ElevenLabs handles pauses naturally from punctuation
            # Add ellipsis for thinking pauses
            text = text.replace("[PAUSE]", "...")
            text = text.replace("[BREATH]", ". ")
            
        elif provider == "deepgram":
            # Deepgram Aura uses natural pausing from punctuation
            text = text.replace("[PAUSE]", "... ")
            text = text.replace("[BREATH]", ". ")

        elif provider == "piper":
            # Piper uses SSML
            text = text.replace("[PAUSE]", " ")
            text = text.replace("[BREATH]", " ")

        return text

    # ===== Private Methods =====

    def _clean_text(self, text: str) -> str:
        """Remove artifacts from LLM output"""
        # Remove action descriptions like *smiles* or (pauses)
        text = re.sub(r'\*[^*]+\*', '', text)
        text = re.sub(r'\([^)]+\)', '', text)
        # Remove markdown
        text = re.sub(r'[*_`#]', '', text)
        # Clean extra spaces
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def _add_filler(self, text: str) -> str:
        """Add a natural filler at the start"""
        # Don't add filler if text already starts with one
        if any(text.startswith(f.strip()) for f in self.fillers["start"]):
            return text

        filler = random.choice(self.fillers["start"])
        # Lowercase the first letter of the original text
        if text and text[0].isupper():
            text = text[0].lower() + text[1:]
        return filler + text

    def _add_interruption_response(self, text: str) -> str:
        """Add natural acknowledgment after being interrupted"""
        ack = random.choice(self.transitions["acknowledge_interrupt"])
        return ack + text

    def _add_topic_return(self, text: str) -> str:
        """Add natural transition when returning to a topic"""
        transition = random.choice(self.transitions["return_to_topic"])
        return transition + text

    def _add_natural_pauses(self, text: str) -> str:
        """Add micro-pauses between sentences for natural rhythm"""
        # Already natural if sentences end with period
        # Add slight pause after commas in long sentences
        sentences = text.split('. ')
        if len(sentences) > 1:
            text = '. '.join(sentences)
        return text

    def _add_extra_pauses(self, text: str) -> str:
        """For slow-speaking customers, add more pauses"""
        # Add ellipsis at natural break points
        text = text.replace(", ", ",... ")
        return text

    def _add_emotion(self, text: str, emotion: str) -> str:
        """Add emotional markers to text"""
        if emotion == "excited":
            # Add exclamation where appropriate
            if text.endswith('.'):
                text = text[:-1] + '!'
        elif emotion == "empathetic":
            if not any(text.startswith(e) for e in self.transitions["empathy"]):
                prefix = random.choice(self.transitions["empathy"])
                text = prefix + text
        elif emotion == "concerned":
            text = "Oh, " + text if not text.startswith("Oh") else text

        return text

    # ===== Thinking Responses =====

    def get_thinking_response(self) -> str:
        """
        Get a natural 'thinking' filler.
        Used when AI needs a moment to process (e.g., RAG lookup).
        This plays while the actual response is being generated.
        """
        return random.choice(self.fillers["thinking"])

    def get_greeting_filler(self, time_of_day: str = "day") -> str:
        """Natural time-appropriate greeting prefix"""
        greetings = {
            "morning": ["Good morning! ", "Morning! ", "Hey, good morning! "],
            "afternoon": ["Good afternoon! ", "Hey! ", "Hi there! "],
            "evening": ["Good evening! ", "Hey, good evening! ", "Hi! "],
            "day": ["Hey! ", "Hi! ", "Hello! ", "Hi there! "],
        }
        options = greetings.get(time_of_day, greetings["day"])
        return random.choice(options)
