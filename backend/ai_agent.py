from groq import Groq
from config import GROQ_API_KEY, AI_TEMPERATURE
import json

# Singleton — reuse connection, no cold start
client = Groq(api_key=GROQ_API_KEY)
FAST_MODEL = "llama-3.1-8b-instant"


SYSTEM_PROMPT = """You are a friendly AI sales caller on a live phone call. Sound like a real human.

RULES:
- Answer every question fully and clearly
- Keep replies to 2-3 sentences max
- Ask ONE follow-up question at the end
- Sound warm, natural, conversational — never robotic
- Use natural fillers: "Sure!", "Got it!", "Absolutely!"
- If busy: "No worries! When would be a good time to talk?"
- If not interested: "Totally fine! Thanks for your time, have a great day!"
- If they say bye: "Thank you! Have a great day. Goodbye!"
- NEVER cut off mid-answer
- LANGUAGE: {lang_instruction}

PRODUCT: {product_info}"""


LANG_INSTRUCTIONS = {
    "te": "Respond in Telugu. Telugu-English mix (Tenglish) is natural and fine.",
    "hi": "Respond in Hindi. Hindi-English mix (Hinglish) is natural and fine.",
    "en": "Respond in Indian English. Warm and natural tone.",
}


def get_ai_response(conversation_history: list, product_info: str = "General product/service", language: str = "en") -> str:
    lang_instruction = LANG_INSTRUCTIONS.get(language, LANG_INSTRUCTIONS["en"])
    system_msg = SYSTEM_PROMPT.format(product_info=product_info, lang_instruction=lang_instruction)
    messages = [{"role": "system", "content": system_msg}] + conversation_history
    try:
        response = client.chat.completions.create(
            model=FAST_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=120,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return "Got it! Tell me more about what you're looking for?"



def analyze_sentiment(conversation_history: list, summary_lang: str = "auto") -> dict:
    # Determine summary language
    if summary_lang == "en":
        lang_note = "Generate the summary in English only."
    elif summary_lang == "te":
        lang_note = "Generate the summary in Telugu (Telugu-English mix is fine)."
    elif summary_lang == "hi":
        lang_note = "Generate the summary in Hindi (Hindi-English mix is fine)."
    else:  # auto — detect from conversation
        user_texts = ' '.join(m['content'] for m in conversation_history[-6:] if m.get('role') == 'user')
        has_telugu = any('\u0c00' <= c <= '\u0c7f' for c in user_texts)
        has_hindi  = any('\u0900' <= c <= '\u097f' for c in user_texts)
        if has_telugu:
            lang_note = "Generate the summary in Telugu (Telugu-English mix is fine)."
        elif has_hindi:
            lang_note = "Generate the summary in Hindi (Hindi-English mix is fine)."
        else:
            lang_note = "Generate the summary in English."

    analysis_prompt = f"""Analyze this sales call deeply. Respond ONLY in this exact JSON format, nothing else:
{{
  "sentiment": "positive/negative/neutral",
  "score": 1-10,
  "category": "hot/warm/cold",
  "summary": "2-3 line summary",
  "detected_language": "en/te/hi/other",
  "intent": "one word: interested/not_interested/callback/price_inquiry/demo_request/complaint/wrong_number",
  "emotion": "one word: excited/positive/neutral/hesitant/frustrated/angry",
  "buying_signals": ["signal1", "signal2"],
  "objections": ["objection1", "objection2"],
  "recommended_action": "one clear action sentence",
  "follow_up_urgency": "immediate/within_24h/this_week/low_priority",
  "key_topics": ["topic1", "topic2", "topic3"]
}}

Scoring:
- 8-10 (hot): Asked pricing, wanted demo/meeting, clear interest, decision maker
- 5-7 (warm): Listened, said maybe, asked to send info, needs follow-up
- 1-4 (cold): Not interested, rude, hung up, wrong number

Buying signals examples: "Asked about pricing", "Requested demo", "Mentioned timeline", "Asked about features"
Objections examples: "Price too high", "Not the right time", "Need to consult team", "Already have solution"

Summary language rule: {lang_note}"""

    messages = conversation_history + [{"role": "user", "content": analysis_prompt}]
    try:
        response = client.chat.completions.create(
            model=FAST_MODEL,
            messages=[{"role": "system", "content": "You are an expert sales call analyst. Respond ONLY in valid JSON. Be specific and actionable."}] + messages,
            temperature=0.2,
            max_tokens=400
        )
        text = response.choices[0].message.content.strip()
        if "```" in text:
            text = text.split("```")[1].replace("json", "").strip()
        result = json.loads(text)
        # Ensure all fields exist with defaults
        result.setdefault("buying_signals", [])
        result.setdefault("objections", [])
        result.setdefault("recommended_action", "Follow up with the lead")
        result.setdefault("follow_up_urgency", "this_week")
        result.setdefault("intent", "interested")
        result.setdefault("emotion", "neutral")
        result.setdefault("key_topics", [])
        result.setdefault("detected_language", "en")
        return result
    except Exception as e:
        return {
            "sentiment": "neutral", "score": 5, "category": "warm",
            "summary": f"Analysis failed: {str(e)}",
            "detected_language": "en", "intent": "interested", "emotion": "neutral",
            "buying_signals": [], "objections": [],
            "recommended_action": "Follow up with the lead",
            "follow_up_urgency": "this_week", "key_topics": []
        }


def generate_opening(lead_name: str, product_info: str, ai_name: str = "Alex", company_name: str = "") -> str:
    company_part = f"from {company_name}" if company_name else ""
    return f"Hi {lead_name}! Myself {ai_name} {company_part} — is this a right time to talk for 2 minutes?"
