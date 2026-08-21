import os
from dotenv import load_dotenv
load_dotenv()

# Groq API (FREE - get key from https://console.groq.com)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# AI Model Settings
AI_MODEL      = "llama-3.1-8b-instant"   # fast model for all AI calls
FAST_MODEL    = "llama-3.1-8b-instant"   # real-time responses
SMART_MODEL   = "llama3-70b-8192"        # use only for deep analysis if needed
AI_TEMPERATURE = 0.7


# Exotel (Real Phone Calls - India)
EXOTEL_SID        = os.getenv("EXOTEL_SID", "")
EXOTEL_API_KEY    = os.getenv("EXOTEL_API_KEY", "")
EXOTEL_API_TOKEN  = os.getenv("EXOTEL_API_TOKEN", "")
EXOTEL_CALLER_ID  = os.getenv("EXOTEL_CALLER_ID", "")
HUMAN_AGENT_NUMBER = os.getenv("HUMAN_AGENT_NUMBER", EXOTEL_CALLER_ID)

# Server Public URL (ngrok for local dev)
SERVER_PUBLIC_URL = os.getenv("SERVER_PUBLIC_URL", "http://localhost:8000")

# Lead Scoring
HOT_LEAD_SCORE  = 7
WARM_LEAD_SCORE = 4
COLD_LEAD_SCORE = 0

# Database — Supabase in prod, SQLite fallback for local dev
_raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./data/leads.db")
if _raw_db_url.startswith("postgres://"):
    _raw_db_url = _raw_db_url.replace("postgres://", "postgresql://", 1)
# If password contains literal '%40' (URL-encoded @), decode it first then re-encode properly
if _raw_db_url.startswith("postgresql://"):
    from urllib.parse import urlparse, quote_plus, unquote
    # unquote handles %40 → @ so urlparse can split correctly
    parsed = urlparse(unquote(_raw_db_url))
    # Re-encode password so SQLAlchemy gets a clean URL
    _raw_db_url = (
        f"postgresql://{parsed.username}:{quote_plus(parsed.password or '')}"
        f"@{parsed.hostname}:{parsed.port or 5432}{parsed.path}"
        f"?sslmode=require"
    )
DATABASE_URL = _raw_db_url

# Branding
COMPANY_NAME = os.getenv("COMPANY_NAME", "TZMICHA")
AI_AGENT_NAME = os.getenv("AI_AGENT_NAME", "Misha")

# Server
HOST = "0.0.0.0"
PORT = 8000
