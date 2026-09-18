"""
Language Demo - shows sample AI agent conversations in all 5 supported languages.
Run: python demo_languages.py
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

DEMOS = [
    {
        "lang": "Telugu 🇮🇳 (Tenglish)",
        "voice": "te-IN-ShrutiNeural",
        "lines": [
            ("🤖 AI Agent", "హాయ్! నేను ప్రియ ని, TZMICHA Technologies నుండి call చేస్తున్నాను. మీరు ఎలా ఉన్నారు?"),
            ("👤 Lead",     "Bagundi, cheppandi enti vishayam?"),
            ("🤖 AI Agent", "మీ business కోసం AI-powered CRM software గురించి చెప్పాలని ఉంది. Sales 40% వరకు increase అవుతుంది!"),
            ("👤 Lead",     "Fee entha undi?"),
            ("🤖 AI Agent", "Fee అంటే yearly ₹1,20,000 ఉంటుంది. Demo చూస్తారా?"),
        ],
    },
    {
        "lang": "Hindi 🇮🇳 (Hinglish)",
        "voice": "hi-IN-SwaraNeural",
        "lines": [
            ("🤖 AI Agent", "Namaste! Main Priya bol rahi hoon, TZMICHA Technologies se. Aap kaise hain?"),
            ("👤 Lead",     "Theek hoon. Kya baat karni thi?"),
            ("🤖 AI Agent", "Aapke business ke liye AI CRM software ke baare mein baat karni thi. Sales 40% tak badh sakti hai!"),
            ("👤 Lead",     "Kitna paisa lagega?"),
            ("🤖 AI Agent", "Yearly ₹1,20,000 hai. Ek free demo dekhna chahenge?"),
        ],
    },
    {
        "lang": "Indian English 🇮🇳",
        "voice": "en-IN-NeerjaExpressiveNeural",
        "lines": [
            ("🤖 AI Agent", "Hey! This is Priya from TZMICHA Technologies. How are you doing today?"),
            ("👤 Lead",     "I'm good. What's this about?"),
            ("🤖 AI Agent", "We have an AI-powered CRM that can boost your sales by 40%. Takes 5 minutes to show you!"),
            ("👤 Lead",     "What's the cost?"),
            ("🤖 AI Agent", "It's ₹1,20,000 per year. Want a free demo first?"),
        ],
    },
    {
        "lang": "British English 🇬🇧",
        "voice": "en-GB-SoniaNeural",
        "lines": [
            ("🤖 AI Agent", "Good day! I'm Priya from TZMICHA Technologies. I hope I'm not catching you at a bad time?"),
            ("👤 Lead",     "Not at all. What can I do for you?"),
            ("🤖 AI Agent", "We've developed an AI CRM solution that's helped businesses increase sales by 40%. Quite remarkable results!"),
            ("👤 Lead",     "How much does it cost?"),
            ("🤖 AI Agent", "It's £1,200 annually. Shall I arrange a complimentary demonstration?"),
        ],
    },
    {
        "lang": "Kannada 🇮🇳 (Kanglish)",
        "voice": "kn-IN-SapnaNeural",
        "lines": [
            ("🤖 AI Agent", "Namaskara! Nanu Priya, TZMICHA Technologies ninda call madtidini. Neevu hege iddira?"),
            ("👤 Lead",     "Chennagide. Enu vishaya?"),
            ("🤖 AI Agent", "Nimma business ge AI CRM software bagge helbekittu. Sales 40% varegu jaasthi aaguttade!"),
            ("👤 Lead",     "Bele eshtu?"),
            ("🤖 AI Agent", "Yearly ₹1,20,000 ide. Free demo nodtira?"),
        ],
    },
]

LEAD_SCORES = {
    "hot":  ("🔥 HOT",  10, "Very interested, asked about pricing, wants demo"),
    "warm": ("🌤️ WARM",  6, "Engaged but needs follow-up"),
    "cold": ("❄️ COLD",  2, "Not interested, hung up early"),
}

def print_separator(char="=", width=60):
    print(char * width)

def run_demo():
    print_separator()
    print("   🚀 AI CALL FILTRATION — LANGUAGE DEMO")
    print("   Supported: Telugu | Hindi | English | British | Kannada")
    print_separator()

    for i, demo in enumerate(DEMOS, 1):
        input(f"\n  ▶  Press Enter to see Demo {i}/5 — {demo['lang']} ...")
        print()
        print_separator("─")
        print(f"  🌐 Language : {demo['lang']}")
        print(f"  🎙️  Voice    : {demo['voice']}")
        print_separator("─")
        for speaker, line in demo["lines"]:
            print(f"\n  {speaker}:")
            print(f"    \"{line}\"")

        # Show mock analysis after each call
        import random
        cat = random.choice(["hot", "warm", "cold"])
        label, score, summary = LEAD_SCORES[cat]
        print(f"\n  📊 Analysis:")
        print(f"    Category : {label}")
        print(f"    Score    : {score}/10")
        print(f"    Summary  : {summary}")
        print_separator("─")

    print("\n")
    print_separator()
    print("  ✅ DEMO COMPLETE")
    print()
    print("  Language auto-detection works on:")
    print("    • Telugu script (తెలుగు) or words like 'bagundi', 'cheppandi'")
    print("    • Hindi script (हिंदी) or words like 'kya', 'haan', 'theek'")
    print("    • Kannada script (ಕನ್ನಡ) or words like 'howdu', 'sari'")
    print("    • Everything else → Indian English")
    print()
    print("  To run the REAL AI call simulator:")
    print("    cd backend && python call_simulator.py")
    print_separator()

if __name__ == "__main__":
    run_demo()
