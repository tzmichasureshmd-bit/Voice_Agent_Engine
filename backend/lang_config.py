"""
TZMICHA ENGINE — Central Language Configuration
Single source of truth for all language/voice/STT/AI settings.
All other modules import from here — never duplicate mappings.
"""

# ── Language registry ──────────────────────────────────────────────────────
# Each entry is the authoritative definition for one supported language.
LANGUAGES: dict[str, dict] = {
    "te": {
        "code":                  "te",
        "name":                  "Telugu",
        "locale":                "te-IN",
        "supported":             True,
        "default_female_voice":  "te-IN-ShrutiNeural",
        "default_male_voice":    "te-IN-MohanNeural",
        "tts_voices": {
            "female": "te-IN-ShrutiNeural",
            "male":   "te-IN-MohanNeural",
        },
        "whisper_language":      "te",
        "ai_response_instruction": (
            "Respond naturally in Telugu. "
            "Telugu-English mixed speech (Tenglish) is natural and preferred. "
            "Use English only for unavoidable technical terms, names, URLs, or numbers. "
            "Do NOT respond in pure English unless the customer explicitly asks."
        ),
        "fallback_language":     "en",
        "detection_words": {
            "enti","cheppandi","ayindi","kadha","ante","chestunnav","na","ra","ga","le",
            "em","emo","anni","ikkade","akkade","meeru","nenu","mee","naa","telugu","lo",
            "ki","tho","undi","ledu","adugutunnanu","matladandi","artham","kaadu","avunu",
            "sare","bagundi","ela","ekkada","enduku","evaru","emi","cheppu","matladu","naku",
        },
        "switch_phrases": [
            "telugu lo","speak telugu","talk in telugu","in telugu","telugu please",
            "can you speak telugu","i prefer telugu","naku telugu",
            "telugu lo matladandi","telugu lo cheppandi","telugu lo cheppu",
        ],
        "switch_ack": "Sare! Telugu lo matladdam! ",
        "goodbye":    "Sare! Mee tho matladataniki chala happy ga undi. Take care!",
        "flag":       "🇮🇳",
    },

    "hi": {
        "code":                  "hi",
        "name":                  "Hindi",
        "locale":                "hi-IN",
        "supported":             True,
        "default_female_voice":  "hi-IN-SwaraNeural",
        "default_male_voice":    "hi-IN-MadhurNeural",
        "tts_voices": {
            "female": "hi-IN-SwaraNeural",
            "male":   "hi-IN-MadhurNeural",
        },
        "whisper_language":      "hi",
        "ai_response_instruction": (
            "Respond naturally in Hindi. "
            "Hindi-English mixed speech (Hinglish) is natural and preferred. "
            "Use English only for technical terms, names, or when the customer uses English. "
            "Do NOT respond in pure English unless the customer explicitly asks."
        ),
        "fallback_language":     "en",
        "detection_words": {
            "kya","hai","haan","nahi","acha","theek","bhai","yaar","karo","bol","sun",
            "dekh","matlab","samjha","bilkul","hindi","mujhe","aap","main","hum","tum",
            "kaise","kyun","kab","kahan","batao","samjho","thoda","bahut","accha",
            "shukriya","namaste","bolo","boliye",
        },
        "switch_phrases": [
            "hindi mein","hindi me","speak hindi","talk in hindi","in hindi",
            "hindi please","hindi boliye","can you speak hindi",
            "hindi mein baat karo","i prefer hindi","mujhe hindi",
        ],
        "switch_ack": "Haan! Hindi mein baat karte hain! ",
        "goodbye":    "Bahut accha! Aapse baat karke bahut accha laga. Take care!",
        "flag":       "🇮🇳",
    },

    "en": {
        "code":                  "en",
        "name":                  "Indian English",
        "locale":                "en-IN",
        "supported":             True,
        "default_female_voice":  "en-IN-NeerjaNeural",
        "default_male_voice":    "en-IN-PrabhatNeural",
        "tts_voices": {
            "female": "en-IN-NeerjaNeural",
            "male":   "en-IN-PrabhatNeural",
        },
        "whisper_language":      "en",
        "ai_response_instruction": (
            "Respond in clear, warm Indian English. "
            "Use Indian context for currency (₹/rupees), locations, and business references. "
            "Keep it natural and conversational."
        ),
        "fallback_language":     "en",
        "detection_words": set(),
        "switch_phrases": [
            "speak english","talk in english","in english","english please",
            "back to english","english lo","can you speak english",
        ],
        "switch_ack": "",
        "goodbye":    "It was great talking to you! Have a wonderful day. Take care!",
        "flag":       "🇮🇳",
    },

    "en-GB": {
        "code":                  "en-GB",
        "name":                  "British English",
        "locale":                "en-GB",
        "supported":             True,
        "default_female_voice":  "en-GB-SoniaNeural",
        "default_male_voice":    "en-GB-RyanNeural",
        "tts_voices": {
            "female": "en-GB-SoniaNeural",
            "male":   "en-GB-RyanNeural",
        },
        "whisper_language":      "en",   # Whisper uses 'en' for all English variants
        "ai_response_instruction": (
            "Respond in British English. "
            "Use British spelling (colour, favour, realise) and phrasing. "
            "Keep it professional, warm, and natural."
        ),
        "fallback_language":     "en",
        "detection_words": set(),
        "switch_phrases": [
            "british english","speak british","in british","british please",
            "british english please","use british english",
        ],
        "switch_ack": "",
        "goodbye":    "It was lovely speaking with you! Have a wonderful day. Goodbye!",
        "flag":       "🇬🇧",
    },

    "kn": {
        "code":                  "kn",
        "name":                  "Kannada",
        "locale":                "kn-IN",
        "supported":             True,
        "default_female_voice":  "kn-IN-SapnaNeural",
        "default_male_voice":    "kn-IN-GaganNeural",
        "tts_voices": {
            "female": "kn-IN-SapnaNeural",
            "male":   "kn-IN-GaganNeural",
        },
        "whisper_language":      "kn",
        "ai_response_instruction": (
            "Respond naturally in Kannada. "
            "Kannada-English mixed speech is natural and preferred. "
            "Use English only for unavoidable technical terms, names, or numbers. "
            "Do NOT respond in pure English unless the customer explicitly asks."
        ),
        "fallback_language":     "en",
        "detection_words": {
            "kannada","namaskara","hegiddira","chennagide","illa","illi","avaru",
            "nanu","nimma","mane","beku","beda","heli","kelsa","madona","sari",
            "howdu","illa","enu","yenu","yaake","hege","yelli","yaavaga",
        },
        "switch_phrases": [
            "kannada lo","speak kannada","talk in kannada","in kannada","kannada please",
            "can you speak kannada","i prefer kannada","kannada mein",
        ],
        "switch_ack": "Sari! Kannada alli maatanadi! ",
        "goodbye":    "Dhanyavadagalu! Nimma jote maatanadi tumba khushi aayitu. Take care!",
        "flag":       "🇮🇳",
    },
}

# ── Locale aliases → canonical code ───────────────────────────────────────
# Maps any incoming locale/code variant to the canonical key in LANGUAGES.
LOCALE_ALIASES: dict[str, str] = {
    # Telugu
    "te":       "te",
    "te-IN":    "te",
    "telugu":   "te",
    # Hindi
    "hi":       "hi",
    "hi-IN":    "hi",
    "hindi":    "hi",
    # Indian English
    "en":       "en",
    "en-IN":    "en",
    "english":  "en",
    "indian english": "en",
    # British English
    "en-GB":    "en-GB",
    "en-gb":    "en-GB",
    "british":  "en-GB",
    "british english": "en-GB",
    # Kannada
    "kn":       "kn",
    "kn-IN":    "kn",
    "kannada":  "kn",
}

# ── Whisper language hint map ──────────────────────────────────────────────
# Maps canonical code → Whisper language string.
# en-GB uses 'en' because Whisper has no GB variant.
WHISPER_LANG_MAP: dict[str, str] = {
    lang_code: cfg["whisper_language"]
    for lang_code, cfg in LANGUAGES.items()
}

# ── Orchestrator internal names → canonical codes ─────────────────────────
# The orchestrator stores language as a lowercase word ("telugu", "english").
# This maps those back to canonical codes for TTS.
ORCHESTRATOR_TO_CODE: dict[str, str] = {
    "telugu":          "te",
    "hindi":           "hi",
    "english":         "en",
    "british english": "en-GB",
    "kannada":         "kn",
    "mixed":           "te",   # mixed defaults to Telugu voice
}

# ── TTS speed validation ───────────────────────────────────────────────────
DEFAULT_SPEED_RATE = "+0%"   # natural human calling pace — 1.0x is most natural
MIN_PACE = 0.5
MAX_PACE = 2.0

def pace_to_rate(pace: float) -> str:
    """
    Convert a frontend pace multiplier (0.5–2.0) to an Edge TTS rate string.
    Edge TTS rate is a percentage relative to normal: "+20%" means 20% faster.
    pace=1.0 → "+0%", pace=1.2 → "+20%", pace=0.8 → "-20%"
    """
    pace = max(MIN_PACE, min(MAX_PACE, float(pace)))
    pct = round((pace - 1.0) * 100)
    return f"+{pct}%" if pct >= 0 else f"{pct}%"


# ── Public helpers ─────────────────────────────────────────────────────────

def resolve_language(code: str) -> str:
    """
    Resolve any language code/name/locale to a canonical key.
    Returns 'en' (Indian English) as safe fallback.
    """
    if not code:
        return "en"
    normalized = code.strip().lower()
    # Direct match first
    if normalized in LANGUAGES:
        return normalized
    # Alias lookup (case-insensitive)
    return LOCALE_ALIASES.get(normalized, LOCALE_ALIASES.get(code.strip(), "en"))


def get_voice(language: str, gender: str = "female") -> str:
    """
    Return the correct Edge TTS voice name for a language + gender.
    Falls back to Indian English female on any invalid input.
    """
    lang = resolve_language(language)
    cfg  = LANGUAGES.get(lang, LANGUAGES["en"])
    g    = gender.lower() if gender else "female"
    if g not in ("male", "female"):
        g = "female"
    return cfg["tts_voices"].get(g, cfg["default_female_voice"])


def get_whisper_lang(language: str) -> str | None:
    """
    Return the Whisper language hint for a given language code.
    Returns None for auto-detection (when language is unknown).
    """
    lang = resolve_language(language)
    return WHISPER_LANG_MAP.get(lang)


def get_ai_instruction(language: str) -> str:
    """Return the AI system-prompt language instruction for a language."""
    lang = resolve_language(language)
    return LANGUAGES.get(lang, LANGUAGES["en"])["ai_response_instruction"]


def get_supported_languages() -> list[dict]:
    """Return list of supported languages for API/frontend consumption."""
    return [
        {
            "code":    code,
            "name":    cfg["name"],
            "locale":  cfg["locale"],
            "flag":    cfg["flag"],
            "voices": {
                "female": cfg["tts_voices"]["female"],
                "male":   cfg["tts_voices"]["male"],
            },
        }
        for code, cfg in LANGUAGES.items()
        if cfg["supported"]
    ]
