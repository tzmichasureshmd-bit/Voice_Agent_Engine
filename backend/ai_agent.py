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



def analyze_sentiment(conversation_history: list) -> dict:
    analysis_prompt = """Analyze this sales call. Respond ONLY in this JSON format, nothing else:
{"sentiment": "positive/negative/neutral", "score": 1-10, "category": "hot/warm/cold", "summary": "one line summary"}

Scoring guide:
- 8-10 (hot): Asked about pricing, showed clear interest, wanted demo/meeting
- 5-7 (warm): Listened but didn't commit, said "maybe", asked to send info
- 1-4 (cold): Said not interested, was rude, hung up, asked not to call"""

    messages = conversation_history + [{"role": "user", "content": analysis_prompt}]

    try:
        response = client.chat.completions.create(
            model=FAST_MODEL,
            messages=[{"role": "system", "content": "You analyze sales calls. Respond ONLY in valid JSON."}] + messages,
            temperature=0.2,
            max_tokens=80
        )
        text = response.choices[0].message.content.strip()
        if "```" in text:
            text = text.split("```")[1].replace("json", "").strip()
        return json.loads(text)
    except Exception as e:
        return {"sentiment": "neutral", "score": 5, "category": "warm", "summary": f"Analysis failed: {str(e)}"}


def generate_opening(lead_name: str, product_info: str, ai_name: str = "Alex", company_name: str = "") -> str:
    company_part = f"from {company_name}" if company_name else ""
    return f"Hi {lead_name}! Myself {ai_name} {company_part} — is this a right time to talk for 2 minutes?"
