"""
TZMICHA AI OS - Language Detection Service
Detects language from text/audio, supports mid-conversation switching.
Handles: English, Hindi, Telugu, and mixed-language (code-switching).
"""

import re
from typing import Optional


# Unicode ranges for script detection
DEVANAGARI_RANGE = re.compile(r'[\u0900-\u097F]')  # Hindi
TELUGU_RANGE = re.compile(r'[\u0C00-\u0C7F]')      # Telugu
LATIN_RANGE = re.compile(r'[a-zA-Z]')               # English

# Common Hindi words written in Latin script (transliteration)
HINDI_LATIN_WORDS = {
    "kya", "hai", "aap", "mein", "hum", "yeh", "woh", "kaise", "kyun",
    "nahi", "haan", "ji", "acha", "theek", "kitna", "kab", "kahan",
    "kaun", "bhai", "didi", "sir", "madam", "batao", "bolo", "suno",
    "dekho", "chalo", "ruko", "bilkul", "zaroor", "bohot", "bahut",
    "accha", "thik", "paisa", "rupees", "lakh", "crore", "abhi",
}

# Common Telugu words written in Latin script
TELUGU_LATIN_WORDS = {
    "entha", "enti", "ela", "enduku", "ikkada", "akkada", "meeru",
    "nenu", "memu", "vaallu", "idi", "adi", "bagundi", "cheppandi",
    "randi", "vellu", "raandi", "avunu", "kaadu", "ledhu", "undi",
    "chesaru", "cheyandi", "cheppu", "anna", "akka", "bava",
    "emiti", "enni", "epudu", "ekkada", "evaru",
}


class LanguageService:
    """
    Multi-language detection and switching service.
    
    Handles:
    - Script-based detection (Devanagari, Telugu, Latin)
    - Transliteration detection (Hindi/Telugu in Latin script)
    - Mixed-language detection (code-switching)
    - Smooth language transitions mid-conversation
    """

    def __init__(self):
        self.current_language = "en"
        self._language_history: list[str] = []

    async def detect(self, text: str) -> str:
        """
        Detect language from text.
        Handles native scripts AND transliterated text.
        """
        if not text or not text.strip():
            return self.current_language

        text_clean = text.strip().lower()
        
        # Check for native scripts first (most reliable)
        telugu_chars = len(TELUGU_RANGE.findall(text))
        hindi_chars = len(DEVANAGARI_RANGE.findall(text))
        latin_chars = len(LATIN_RANGE.findall(text))
        total_chars = max(telugu_chars + hindi_chars + latin_chars, 1)

        # If mostly Telugu script
        if telugu_chars / total_chars > 0.3:
            return self._update_language("te")

        # If mostly Hindi/Devanagari script
        if hindi_chars / total_chars > 0.3:
            return self._update_language("hi")

        # For Latin script, check transliteration
        words = set(re.findall(r'\b\w+\b', text_clean))
        
        telugu_matches = words & TELUGU_LATIN_WORDS
        hindi_matches = words & HINDI_LATIN_WORDS

        # If significant Telugu transliteration detected
        if len(telugu_matches) >= 2 or (len(telugu_matches) >= 1 and len(words) <= 5):
            return self._update_language("te")

        # If significant Hindi transliteration detected
        if len(hindi_matches) >= 2 or (len(hindi_matches) >= 1 and len(words) <= 5):
            return self._update_language("hi")

        # Default to English if Latin script dominant
        if latin_chars / total_chars > 0.5:
            return self._update_language("en")

        # Fall back to current language
        return self.current_language

    async def detect_from_audio(self, audio_bytes: bytes) -> str:
        """
        Detect language from audio.
        This delegates to the STT provider's language detection.
        For now, returns current language. Override with provider-specific implementation.
        """
        # This will be enhanced when integrated with STT provider
        return self.current_language

    def detect_mixed_language(self, text: str) -> dict:
        """
        Detect if text contains multiple languages (code-switching).
        Returns breakdown of languages found.
        
        Example: "Hello, fee entha?" -> {"en": "Hello", "te": "fee entha?"}
        """
        words = text.split()
        segments = {"en": [], "hi": [], "te": []}
        
        for word in words:
            word_lower = word.lower().strip(".,!?")
            
            if TELUGU_RANGE.search(word):
                segments["te"].append(word)
            elif DEVANAGARI_RANGE.search(word):
                segments["hi"].append(word)
            elif word_lower in TELUGU_LATIN_WORDS:
                segments["te"].append(word)
            elif word_lower in HINDI_LATIN_WORDS:
                segments["hi"].append(word)
            else:
                segments["en"].append(word)

        return {k: " ".join(v) for k, v in segments.items() if v}

    def get_response_language(self, detected_language: str) -> str:
        """
        Determine what language the AI should respond in.
        If customer switches language, AI follows.
        """
        self.current_language = detected_language
        return detected_language

    def get_language_instruction(self) -> str:
        """
        Get language instruction for the LLM system prompt.
        Tells the AI what language to use and how to handle switching.
        """
        lang_map = {
            "en": "English",
            "hi": "Hindi (Hinglish is acceptable)",
            "te": "Telugu (Tenglish/Telugu-English mix is acceptable)",
        }

        current = lang_map.get(self.current_language, "English")
        
        return (
            f"LANGUAGE: Respond in {current}. "
            f"If the customer switches language mid-conversation, "
            f"immediately switch to match their language. "
            f"Mixed language (code-switching) is natural and acceptable. "
            f"For Hindi/Telugu, you can use transliterated text (Latin script)."
        )

    def _update_language(self, language: str) -> str:
        """Update current language and track history"""
        if language != self.current_language:
            self._language_history.append(self.current_language)
        self.current_language = language
        return language
