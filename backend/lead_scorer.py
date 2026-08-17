"""
Lead Scoring Module
- Analyzes conversation sentiment
- Scores leads from 1-10
- Categorizes: Hot / Warm / Cold
"""
from config import HOT_LEAD_SCORE, WARM_LEAD_SCORE

# Keywords that indicate interest level
POSITIVE_KEYWORDS = [
    "interested", "tell me more", "sounds good", "pricing", "cost",
    "schedule", "meeting", "demo", "sign up", "yes", "sure",
    "definitely", "love to", "great", "perfect", "send details",
    "when can", "how soon", "let's do it", "I need this"
]

NEGATIVE_KEYWORDS = [
    "not interested", "no thanks", "don't call", "busy",
    "remove my number", "stop calling", "already have",
    "not looking", "waste of time", "hang up", "bye",
    "don't need", "too expensive", "no budget", "never"
]


def score_lead_from_keywords(conversation_text: str) -> dict:
    """Quick scoring based on keywords (backup if AI analysis fails)"""
    text_lower = conversation_text.lower()

    positive_count = sum(1 for kw in POSITIVE_KEYWORDS if kw in text_lower)
    negative_count = sum(1 for kw in NEGATIVE_KEYWORDS if kw in text_lower)

    # Calculate score (1-10)
    if positive_count > negative_count:
        score = min(10, 5 + positive_count)
    elif negative_count > positive_count:
        score = max(1, 5 - negative_count)
    else:
        score = 5

    # Determine category
    if score >= HOT_LEAD_SCORE:
        category = "hot"
        sentiment = "positive"
    elif score >= WARM_LEAD_SCORE:
        category = "warm"
        sentiment = "neutral"
    else:
        category = "cold"
        sentiment = "negative"

    return {
        "score": score,
        "category": category,
        "sentiment": sentiment,
        "positive_signals": positive_count,
        "negative_signals": negative_count
    }


def get_lead_recommendation(category: str) -> str:
    """Get action recommendation based on lead category"""
    recommendations = {
        "hot": "🔥 HOT LEAD - Transfer to sales team immediately! Schedule follow-up within 24 hours.",
        "warm": "🌤️ WARM LEAD - Send product info via email. Follow up in 2-3 days.",
        "cold": "❄️ COLD LEAD - Add to nurture list. Try again after 30 days or drop."
    }
    return recommendations.get(category, "Unknown category")
