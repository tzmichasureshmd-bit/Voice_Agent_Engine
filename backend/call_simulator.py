"""
Call Simulator
- Auto detects language from every customer message
- Switches Telugu / Hindi / English automatically mid-call
- AI responds + speaks in the same language customer used
"""
import re
import time
import os
import tempfile
from ai_agent import get_ai_response, analyze_sentiment, generate_opening
from lead_scorer import score_lead_from_keywords, get_lead_recommendation
from engine_tts import synthesize_to_file

# ── Language Detection ──────────────────────────────────────────────
TELUGU_SCRIPT   = re.compile(r'[\u0C00-\u0C7F]')
DEVANAGARI      = re.compile(r'[\u0900-\u097F]')

TELUGU_WORDS = {"cheppandi","entha","enti","ela","meeru","nenu","bagundi","avunu",
                "kaadu","ledhu","undi","randi","anna","akka","emiti","epudu",
                "cheyandi","cheppu","yendhulku","cheysaru","gurinche","chesthara",
                "telugu","maku","mee","maa","ikkada","akkada","evaru"}

HINDI_WORDS  = {"kya","hai","aap","mein","hum","nahi","haan","ji","acha","theek",
                "kitna","kab","kahan","kaun","bhai","batao","bolo","suno","chalo",
                "bilkul","zaroor","bohot","bahut","paisa","rupees","abhi","boliye"}

def detect_language(text: str) -> str:
    """Detect language from customer message — Telugu / Hindi / English"""
    t = text.strip()
    if TELUGU_SCRIPT.search(t):
        return "te"
    if DEVANAGARI.search(t):
        return "hi"
    words = set(re.findall(r'\b\w+\b', t.lower()))
    if words & TELUGU_WORDS:
        return "te"
    if words & HINDI_WORDS:
        return "hi"
    return "en"

LANG_LABEL = {"te": "Telugu 🇮🇳", "hi": "Hindi 🇮🇳", "en": "English 🇬🇧"}

# ── TTS ─────────────────────────────────────────────────────────────
def speak_text(text: str, language: str = "en"):
    try:
        tmp = tempfile.mktemp(suffix=".mp3")
        synthesize_to_file(text, tmp, language=language)
        os.startfile(tmp)
        time.sleep(0.5)
    except Exception as e:
        print(f"[TTS error] {e}")

# ── AI response with language injection ─────────────────────────────
LANG_INSTRUCTIONS = {
    "te": "Respond ONLY in Telugu. Telugu-English mix (Tenglish) is natural and fine.",
    "hi": "Respond ONLY in Hindi. Hindi-English mix (Hinglish) is natural and fine.",
    "en": "Respond in Indian English. Warm and natural tone.",
}

def get_ai_response_lang(history: list, product_info: str, language: str) -> str:
    from ai_agent import client as groq_client, FAST_MODEL, SYSTEM_PROMPT
    lang_instr = LANG_INSTRUCTIONS.get(language, LANG_INSTRUCTIONS["en"])
    system_msg = SYSTEM_PROMPT.format(product_info=product_info, lang_instruction=lang_instr)
    messages = [{"role": "system", "content": system_msg}] + history
    try:
        resp = groq_client.chat.completions.create(
            model=FAST_MODEL, messages=messages, temperature=0.7, max_tokens=120
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return "Got it! Tell me more about what you're looking for?"


# ── Main Simulator ───────────────────────────────────────────────────
def simulate_call(lead_name: str, phone: str, product_info: str, use_voice: bool = False):
    print("\n" + "=" * 60)
    print(f"📞 CALLING: {lead_name} ({phone})")
    print(f"📦 Product: {product_info}")
    print("=" * 60)
    print("\n🔔 Ringing...")
    time.sleep(1)
    print("✅ Call Connected!\n")
    print("-" * 40)
    print("Type your responses as the LEAD (human)")
    print("Type 'hangup' to end the call")
    print("-" * 40 + "\n")

    conversation_history = []
    current_language = "en"

    opening = generate_opening(lead_name, product_info)
    print(f"🤖 AI Agent: {opening}\n")
    conversation_history.append({"role": "assistant", "content": opening})
    if use_voice:
        speak_text(opening, language=current_language)

    turn_count = 0

    while turn_count < 10:
        human_input = input(f"👤 {lead_name}: ").strip()

        if human_input.lower() in ['hangup', 'bye', 'end', 'quit']:
            print("\n📴 Call Ended by lead")
            break
        if not human_input:
            continue

        # ✅ AUTO DETECT language from what customer typed
        detected = detect_language(human_input)
        if detected != current_language:
            current_language = detected
            print(f"   🌐 Language switched → {LANG_LABEL[current_language]}")

        conversation_history.append({"role": "user", "content": human_input})

        # AI responds in detected language
        ai_response = get_ai_response_lang(conversation_history, product_info, current_language)
        print(f"\n🤖 AI Agent [{LANG_LABEL[current_language]}]: {ai_response}\n")
        conversation_history.append({"role": "assistant", "content": ai_response})

        if use_voice:
            speak_text(ai_response, language=current_language)

        turn_count += 1

        end_signals = ["thank you for your time", "have a great day", "goodbye", "talk soon",
                       "ధన్యవాదాలు", "శుభాకాంక్షలు", "धन्यवाद", "अलविदा"]
        if any(s in ai_response.lower() for s in end_signals):
            print("\n📴 Call Ended by AI Agent")
            break

    # Post-call analysis
    print("\n" + "=" * 60)
    print("📊 POST-CALL ANALYSIS")
    print("=" * 60)
    analysis = analyze_sentiment(conversation_history)
    print(f"\n🎯 Sentiment : {analysis.get('sentiment', 'unknown')}")
    print(f"📈 Lead Score: {analysis.get('score', 0)}/10")
    print(f"🏷️  Category  : {analysis.get('category', 'unknown')}")
    print(f"📝 Summary   : {analysis.get('summary', 'N/A')}")
    print(f"\n💡 Recommendation: {get_lead_recommendation(analysis.get('category', 'cold'))}")
    print("=" * 60)

    return {"lead_name": lead_name, "phone": phone,
            "conversation": conversation_history, "analysis": analysis}


def run_demo():
    print("\n" + "🚀" * 20)
    print("\n   AI CALL FILTRATION + LEAD GENERATION SYSTEM")
    print("   ============================================")
    print("   Auto Language: Telugu / Hindi / English\n")
    print("🚀" * 20)

    lead_name = input("\n📋 Enter lead name (or press Enter for 'Rahul Sharma'): ").strip() or "Rahul Sharma"
    phone     = input("📱 Enter phone number (or press Enter for demo): ").strip() or "+91-9876543210"
    product   = input("📦 Product/service to pitch? (or press Enter for default): ").strip()
    if not product:
        product = "AI-powered CRM software that helps businesses manage leads and increase sales by 40%"

    voice = input("🔊 Enable voice? (yes/no): ").strip().lower() in ["yes", "y"]

    simulate_call(lead_name, phone, product, use_voice=voice)

    if input("\n\n🔄 Run another call? (yes/no): ").strip().lower() in ["yes", "y"]:
        run_demo()


if __name__ == "__main__":
    run_demo()
