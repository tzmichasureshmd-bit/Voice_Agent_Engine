TZMICHA VOICE AGENT ENGINE
Complete Technical Documentation
Built by TZMICHA IT Solutions
Version 1.0.0
==========================================================


OVERVIEW
--------
TZMICHA Voice Agent Engine is a production-ready, enterprise-grade
AI-powered outbound calling and lead generation platform. It enables
businesses to deploy intelligent AI voice agents that conduct real,
human-like phone conversations, qualify leads in real time, and
automatically categorize them as Hot, Warm, or Cold without any
human involvement.

The platform is fully self-hosted. 100 percent your own data.
No third-party calling fees. Supports English, Hindi, and Telugu.


==========================================================
SYSTEM-LEVEL INSTALLATIONS (installed on your machine)
==========================================================

These were installed directly on the operating system during
development and are required to run the platform.

Python 3.11.9
    The core runtime for all backend services.
    Download: https://www.python.org/downloads/

Node.js v24.19.0
    Required to run the React frontend dashboard.
    Download: https://nodejs.org/

npm (comes with Node.js)
    Package manager for all frontend dependencies.

Git
    Version control. Used to manage and push code to GitHub.
    Download: https://git-scm.com/

Rust (installed via rustup)
    Required as a build dependency for certain Python packages
    including tokenizers and sentence-transformers.
    Some Whisper and ML packages compile Rust extensions.
    Download: https://rustup.rs/

Ollama (optional, for local LLM)
    Allows running LLaMA3 and other models fully offline.
    Used when Groq API is not available or for private deployments.
    Download: https://ollama.com/

Microsoft Edge TTS (edge-tts Python package)
    Uses Microsoft Azure neural voices via Edge browser protocol.
    No API key required. Completely free.
    Installed via: pip install edge-tts

OpenAI Whisper (local STT)
    Runs speech-to-text entirely on your machine.
    No API key required. Completely free.
    Requires PyTorch to be installed.
    Installed via: pip install openai-whisper

PyTorch + Torchaudio
    Deep learning framework required by Whisper for audio processing.
    Installed via: pip install torch torchaudio

Pillow (PIL)
    Python image processing library.
    Used to convert and resize brand logo into proper PNG icons
    for PWA (favicon 32x32, icon-192, icon-512).
    Installed via: pip install Pillow

Docker Desktop
    Used to containerize and deploy the full platform.
    Download: https://www.docker.com/products/docker-desktop/

ngrok
    Used during development to expose local server to the internet
    for testing webhooks and external API callbacks.
    Download: https://ngrok.com/


==========================================================
BACKEND PYTHON PACKAGES (backend/requirements.txt)
==========================================================

fastapi                 REST API framework. Powers all endpoints.
uvicorn[standard]       ASGI server to run FastAPI.
groq                    Groq SDK for LLaMA3 AI responses.
sqlalchemy              ORM for database models and queries.
psycopg2-binary         PostgreSQL driver for production database.
pydantic                Data validation and settings management.
python-multipart        File upload support for API endpoints.
aiofiles                Async file reading and writing.
python-dotenv           Loads environment variables from .env files.
httpx                   Async HTTP client for external API calls.
websockets              WebSocket support for real-time communication.
beautifulsoup4          HTML parsing utility.
firebase-admin          Firebase Admin SDK for auth verification.
openai-whisper          Local speech-to-text engine (runs offline).
torch                   PyTorch deep learning framework for Whisper.
torchaudio              Audio processing library for PyTorch.
numpy less than 2       Numerical computing. Pinned below v2 for
                        compatibility with Whisper and torch.
edge-tts                Microsoft Edge neural TTS (free, no key).


==========================================================
ENTERPRISE PLATFORM PACKAGES (tzmicha_platform/requirements.txt)
==========================================================

fastapi 0.115.0                 Core API framework.
uvicorn[standard] 0.30.0        Production ASGI server.
pydantic 2.9.0                  Data models and validation.
pydantic-settings 2.5.0         Settings management from env vars.
python-multipart 0.0.9          Multipart form data handling.
python-dotenv 1.0.1             Environment variable loader.
httpx 0.27.0                    Async HTTP client.
websockets 13.0                 WebSocket protocol support.
sqlalchemy[asyncio] 2.0.35      Async ORM for PostgreSQL.
asyncpg 0.30.0                  High-performance async PostgreSQL driver.
alembic 1.13.0                  Database migration management.
redis 5.2.0                     Redis client for caching and sessions.
qdrant-client 1.12.0            Vector database client for RAG search.
sentence-transformers 3.3.0     Embedding models for knowledge base.
                                (Requires Rust for compilation)
PyMuPDF 1.24.0                  PDF reading for knowledge base uploads.
pdfplumber 0.11.0               Advanced PDF text extraction.
groq 0.11.0                     Groq LLaMA3 LLM provider.
openai 1.50.0                   OpenAI GPT provider (optional).
anthropic 0.34.0                Anthropic Claude provider (optional).
deepgram-sdk 3.6.0              Deepgram STT and TTS provider.
elevenlabs 1.9.0                ElevenLabs ultra-realistic TTS.
twilio 9.3.0                    Twilio SDK for real phone calls.
aiofiles 24.1.0                 Async file I/O.


==========================================================
FRONTEND NPM PACKAGES (data/frontend/dashboard/package.json)
==========================================================

PRODUCTION DEPENDENCIES

react 19.2.6                    Core UI library.
react-dom 19.2.6                React DOM renderer.
react-router-dom 7.15.1         Client-side routing.
tailwindcss 4.3.0               Utility-first CSS framework.
@tailwindcss/vite 4.3.0         Tailwind Vite plugin integration.
framer-motion 12.40.0           Animation library for smooth UI.
lucide-react 1.16.0             Icon library (clean SVG icons).
react-icons 5.6.0               Extended icon library.
recharts 3.8.1                  Chart library for analytics dashboard.
axios 1.16.1                    HTTP client for API calls.
firebase 12.17.1                Firebase Auth (Google OAuth + email).

DEV DEPENDENCIES

vite 8.0.12                     Frontend build tool and dev server.
@vitejs/plugin-react 6.0.1      React support for Vite.
vite-plugin-pwa 1.3.0           PWA manifest and service worker.
eslint 10.3.0                   JavaScript linter.
eslint-plugin-react-hooks 7.1.1 React hooks linting rules.
eslint-plugin-react-refresh 0.5.2 Fast refresh linting.
@eslint/js 10.0.1               ESLint JS config.
@types/react 19.2.14            TypeScript types for React.
@types/react-dom 19.2.3         TypeScript types for React DOM.
globals 17.6.0                  Global variable definitions for ESLint.


==========================================================
AI MODELS AND SERVICES USED
==========================================================

Groq LLaMA3 (llama3-8b-8192 or llama3-70b-8192)
    Primary AI brain for all conversations.
    Free tier available at https://console.groq.com
    Sub-second response time. No GPU required.

OpenAI Whisper (base or small model)
    Speech-to-text engine running fully locally.
    No API key. No cost. Works offline.
    Model downloads automatically on first run.

Microsoft Edge TTS
    Neural text-to-speech using Azure voices.
    Voices used: en-US-JennyNeural, hi-IN-SwaraNeural,
    te-IN-ShrutiNeural
    No API key. No cost. Completely free.

Ollama (optional)
    Run LLaMA3, Mistral, Phi3 locally with no internet.
    Used for fully offline or air-gapped deployments.

ElevenLabs (optional upgrade)
    Ultra-realistic human voice synthesis.
    Requires paid API key for production use.

Deepgram (optional upgrade)
    Real-time streaming STT and TTS.
    Requires API key.

Firebase Authentication
    Handles Google OAuth and email/password login.
    Free tier supports up to 10,000 users/month.


==========================================================
INFRASTRUCTURE AND DEPLOYMENT TOOLS
==========================================================

Docker
    Containerizes backend and frontend for consistent deployment.
    Files: Dockerfile, deploy/backend.Dockerfile,
    deploy/frontend.Dockerfile

docker-compose
    Orchestrates multi-container local development stack.
    File: docker-compose.yml

docker-compose production
    Full production stack with nginx reverse proxy.
    File: deploy/docker-compose.prod.yml

nginx
    Serves the React frontend as static files in production.
    Handles SSL termination and reverse proxy to FastAPI.
    File: deploy/nginx-frontend.conf

GitHub Actions CI/CD
    Automated deployment pipeline on every push to main.
    File: .github/workflows/deploy.yml

ngrok
    Exposes local development server to the internet.
    Used for testing Twilio webhooks and external callbacks.


==========================================================
DATABASE ARCHITECTURE
==========================================================

Development Stack
    SQLite          Zero-config local database.
                    File: backend/data/leads.db

Production Stack
    PostgreSQL      Primary relational database.
                    Managed via SQLAlchemy async ORM + asyncpg.
                    Migrations via Alembic.

    Qdrant          Vector database for RAG knowledge base.
                    Stores document embeddings for AI context.

    Redis           In-memory cache for sessions and rate limiting.


==========================================================
ENVIRONMENT VARIABLES REQUIRED
==========================================================

Create a file named .env in the backend folder with these values:

GROQ_API_KEY            Your Groq API key from console.groq.com
FIREBASE_PROJECT_ID     Your Firebase project ID
SECRET_KEY              Random secret for JWT signing
DATABASE_URL            SQLite or PostgreSQL connection string

For production (tzmicha_platform), copy .env.example and fill in:

LLM_PROVIDER            groq or openai or anthropic or ollama
STT_PROVIDER            whisper or deepgram or openai
TTS_PROVIDER            edge or elevenlabs or deepgram
GROQ_API_KEY            Groq API key
OPENAI_API_KEY          OpenAI API key (optional)
ANTHROPIC_API_KEY       Anthropic API key (optional)
ELEVENLABS_API_KEY      ElevenLabs API key (optional)
DEEPGRAM_API_KEY        Deepgram API key (optional)
DATABASE_URL            PostgreSQL connection string
REDIS_URL               Redis connection string
QDRANT_URL              Qdrant vector DB URL


==========================================================
WHAT YOU DO NOT NEED TO INSTALL SEPARATELY
==========================================================

These are handled automatically by pip or npm install:

All Python packages listed in requirements.txt
All Node packages listed in package.json
Whisper model files (auto-downloaded on first run)
PyTorch CPU version (installed via pip)
Tailwind CSS (bundled via Vite plugin)
PWA service worker (auto-generated by vite-plugin-pwa)


==========================================================
WHAT MUST BE INSTALLED MANUALLY ON THE MACHINE
==========================================================

Python 3.11 or higher
Node.js 18 or higher
Rust (via rustup) — needed for sentence-transformers compilation
Docker Desktop — needed for containerized deployment
Git — needed for version control
Ollama — only if you want fully offline local LLM


==========================================================
BUILT BY
==========================================================

TZMICHA IT Solutions
Dream. Build. Automate. Grow.
https://github.com/tzmichasureshmd-bit/Voice_Agent_Engine


==========================================================
TEST ACCOUNTS & LOGIN CREDENTIALS
Last updated: August 2026
==========================================================

LIVE URL:  https://voice.tzmicha.com
API DOCS:  https://voice.tzmicha.com/docs

----------------------------------------------------------
COMPANY ACCOUNTS (Client Admin Login)
----------------------------------------------------------

| Company               | Email                  | Password      | Client ID | Plan    |
|-----------------------|------------------------|---------------|-----------|---------|
| DANI EVENS (owner)    | danievens78@gmail.com  | Voice@123     | 1         | free    |
| TZMICHA IT Solutions  | suresh@tzmicha.com     | Tzmicha@123   | 5         | pro     |
| TZMICHA Constructions | dani@tzmicha.com       | Tzmicha@123   | 6         | growth  |
| TZMICHA Matrimony     | priya@tzmicha.com      | Tzmicha@123   | 7         | starter |

----------------------------------------------------------
TEAM MEMBER LOGINS (use /auth/team-login endpoint)
----------------------------------------------------------

TZMICHA IT Solutions (client_id: 5)
| Name         | Email                  | Password    | Role    | Pages Allowed                          |
|--------------|------------------------|-------------|---------|----------------------------------------|
| Ravi Kumar   | ravi.it@tzmicha.com    | Tzmicha@123 | manager | dashboard, leads, calls, logs, ai-emp  |
| Kavitha Rao  | kavitha.it@tzmicha.com | Tzmicha@123 | agent   | dashboard, leads, calls                |

TZMICHA Constructions (client_id: 6)
| Name          | Email                              | Password    | Role    | Pages Allowed                    |
|---------------|------------------------------------|-------------|---------|----------------------------------|
| Venkat Reddy  | venkat@tzmichaconstructions.com    | Tzmicha@123 | manager | dashboard, leads, calls, logs    |
| Lakshmi Devi  | lakshmi@tzmichaconstructions.com   | Tzmicha@123 | agent   | dashboard, leads, calls          |

TZMICHA Matrimony (client_id: 7)
| Name          | Email                        | Password    | Role    | Pages Allowed                 |
|---------------|------------------------------|-------------|---------|-------------------------------|
| Srinivas Rao  | srini@tzmichamatrimony.com   | Tzmicha@123 | manager | dashboard, leads, calls, logs |

----------------------------------------------------------
SUPER ADMIN (access via Admin button on login page)
----------------------------------------------------------

| Key       | Value          |
|-----------|----------------|
| Admin Key | superadmin123  |
| Header    | x-admin-key    |

----------------------------------------------------------
AI EMPLOYEES
----------------------------------------------------------

| Company          | Agent Name | Role                  | Languages              | Voice  | Status |
|------------------|------------|-----------------------|------------------------|--------|--------|
| IT Solutions     | Misha      | Sales Agent           | Telugu, English, Hindi | suhani | active |
| Constructions    | Swetha     | Property Consultant   | Telugu, English        | suhani | active |
| Matrimony        | Ananya     | Matchmaking Consultant| Telugu, English        | suhani | active |

----------------------------------------------------------
TEST LEADS DATA
----------------------------------------------------------

TZMICHA IT Solutions (client_id: 5)
| Name          | Phone      | Category | Score | Status    | Notes                              |
|---------------|------------|----------|-------|-----------|------------------------------------|
| Ramesh Babu   | 9876501234 | hot      | 8     | qualified | CRM + mobile app. Budget 5L.       |
| Deepa Nair    | 9876504567 | hot      | 9     | qualified | Telemedicine app. Budget 8L.       |
| Anita Krishnan| 9876502345 | warm     | 6     | called    | E-commerce platform. 3 vendors.    |
| Kiran Reddy   | 9876505678 | warm     | 5     | called    | LMS platform inquiry.              |
| Mohan Das     | 9876503456 | cold     | 0     | new       | —                                  |

TZMICHA Constructions (client_id: 6)
| Name          | Phone      | Category | Score | Status    | Notes                              |
|---------------|------------|----------|-------|-----------|------------------------------------|
| Rajesh Kumar  | 9765401234 | hot      | 9     | qualified | 2BHK Gachibowli. Budget 55L.       |
| Sunita Sharma | 9765402345 | hot      | 7     | called    | 3BHK family of 4. Budget 70L.      |
| Arun Verma    | 9765405678 | hot      | 8     | qualified | NRI villa investor. Budget 1.2Cr.  |
| Vikram Singh  | 9765403456 | warm     | 5     | called    | First home buyer. Budget 45L.      |
| Pooja Iyer    | 9765406789 | warm     | 4     | called    | Comparing 3 projects.              |
| Meena Patel   | 9765404567 | cold     | 0     | new       | —                                  |
| Suresh Babu   | 9765407890 | cold     | 0     | new       | —                                  |

TZMICHA Matrimony (client_id: 7)
| Name          | Phone      | Category | Score | Status    | Notes                              |
|---------------|------------|----------|-------|-----------|------------------------------------|
| Prasad Rao    | 9654301234 | hot      | 8     | qualified | SW engineer 28yr. Parents ready.   |
| Divya Lakshmi | 9654302345 | warm     | 6     | called    | Doctor 26yr. Wants free trial.     |
| Ravi Teja     | 9654303456 | warm     | 5     | called    | MBA 30yr Bangalore.                |
| Sravani Devi  | 9654304567 | cold     | 0     | new       | —                                  |

----------------------------------------------------------
CAMPAIGNS
----------------------------------------------------------

| Company          | Campaign Name                  | Calls | Hot | Warm | Cold |
|------------------|-------------------------------|-------|-----|------|------|
| IT Solutions     | IT Services Q3 2026           | 23    | 8   | 10   | 5    |
| Constructions    | Hyderabad Apartments Aug 2026 | 45    | 12  | 18   | 15   |
| Constructions    | Villa Launch Campaign         | 18    | 5   | 7    | 6    |
| Matrimony        | Premium Membership Drive      | 15    | 4   | 6    | 5    |

----------------------------------------------------------
WALLET BALANCES
----------------------------------------------------------

| Company          | Balance  |
|------------------|----------|
| IT Solutions     | ₹8,750   |
| Constructions    | ₹15,000  |
| Matrimony        | ₹3,200   |

----------------------------------------------------------
UPCOMING APPOINTMENTS
----------------------------------------------------------

| Company          | Lead Name     | Date       | Time     | Type     | Notes                        |
|------------------|---------------|------------|----------|----------|------------------------------|
| Constructions    | Rajesh Kumar  | 2026-08-24 | 10:00 AM | Site Visit| Gachibowli 2BHK corner flat |
| Constructions    | Sunita Sharma | 2026-08-25 | 3:00 PM  | Site Visit| 3BHK Kondapur with husband  |
| IT Solutions     | Deepa Nair    | 2026-08-23 | 11:00 AM | Contract | Telemedicine app signing     |
| Matrimony        | Prasad Rao    | 2026-08-24 | 6:00 PM  | Callback | Profile review with parents  |

----------------------------------------------------------
INFRASTRUCTURE
----------------------------------------------------------

| Item              | Value                                    |
|-------------------|------------------------------------------|
| VPS IP            | 200.97.174.56                            |
| Domain            | voice.tzmicha.com                        |
| VPS Provider      | Hostinger KNM2                           |
| Backend Port      | 8000 (internal)                          |
| Database          | Supabase PostgreSQL (ap-northeast-1)     |
| DB Host           | aws-0-ap-northeast-1.pooler.supabase.com |
| DB Port           | 5432 (session pooler)                    |
| DB Name           | postgres                                 |
| DB User           | postgres.leilfjvhupybkdwtujgf            |
| Firebase Project  | tzmicha-ai-voice                         |
| GitHub Repo       | tzmichasureshmd-bit/Voice_Agent_Engine   |

----------------------------------------------------------
API KEYS (rotate these after testing)
----------------------------------------------------------

| Service   | Key                                                              |
|-----------|------------------------------------------------------------------|
| Groq      | (stored in backend/.env — not committed)                         |
| Brevo SMTP| (stored in backend/.env — not committed)                         |
| Exotel SID| tzmicha1                                                         |
| Exotel Key| (stored in backend/.env — not committed)                         |
| Caller ID | 09513886363                                                      |

==========================================================
HOW TO TEST THE PLATFORM
==========================================================

1. Open https://voice.tzmicha.com
2. Login with any company account above
3. Go to Leads — see pre-loaded leads
4. Go to AI Employees — see Misha/Swetha/Ananya
5. Go to Simulator — pick a lead, start AI call
6. Go to Call Activity — see call logs with intelligence
7. Go to Campaigns — see active campaigns
8. Go to Appointments — see upcoming meetings
9. Go to Billing — see wallet balance
10. Click Admin button on login → enter superadmin123 → see all companies

==========================================================
