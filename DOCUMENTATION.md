# TZMICHA AI Voice Engine — Technical Documentation

---

## 📌 Why This Document Exists & What It's For

**Who should read this:** Developers, testers, DevOps. Not required for marketing or sales.

**Why it exists:** This is the single source of truth for everything technical about this project. Architecture, every backend module, every frontend component, full API reference, voice engine internals, authentication, deployment, and a log of every bug we've fixed and why. If you're building something new, debugging something broken, or handing this project off to someone else — this is the document they need.

**What it covers:** System architecture, project structure, environment setup, all backend modules, all frontend components, complete API reference, TTS/STT engine details, Auto Mix multilingual playback, AI agent and orchestrator, authentication, multi-tenant isolation, billing, real voice calls, deployment, bug fix log, and upgrade path.

**When to read it:** Setting up the project for the first time. Debugging an issue. Building a new feature. Deploying to production. Onboarding a new developer.

---

*This is the real documentation. Written by the people who built it, for the people who'll maintain it, extend it, or hand it off to someone else. If you're reading this, you're either setting it up for the first time, debugging something, or trying to understand how a piece of it works. All three cases are covered here.*

> Stack: FastAPI + React/Vite · Database: Supabase PostgreSQL · TTS: Microsoft Edge TTS · STT: Whisper Large v3 · LLM: Groq

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
5. [Backend — All Modules](#5-backend--all-modules)
6. [Frontend — All Components](#6-frontend--all-components)
7. [API Reference](#7-api-reference)
8. [Voice Engine — TTS](#8-voice-engine--tts)
9. [Voice Engine — STT](#9-voice-engine--stt)
10. [Auto Mix — Multilingual Playback](#10-auto-mix--multilingual-playback)
11. [AI Agent & Orchestrator](#11-ai-agent--orchestrator)
12. [Authentication](#12-authentication)
13. [Multi-Tenant Architecture](#13-multi-tenant-architecture)
14. [Billing & Plans](#14-billing--plans)
15. [Real Voice Calls — Exotel/Plivo](#15-real-voice-calls--exotelplivo)
16. [Deployment](#16-deployment)
17. [Known Issues & Fixes Log](#17-known-issues--fixes-log)
18. [Upgrade Path](#18-upgrade-path)

---

## 1. Project Overview

This is a full SaaS platform for AI-powered voice calling. Not a demo, not a prototype — a real multi-tenant product that businesses can sign up for, pay for, and use to run outbound and inbound AI calls in Telugu, Hindi, English, and Kannada.

Here's what it actually does:

A business signs up, creates an AI Employee, uploads their leads, and runs a campaign. The AI calls each lead, speaks in their language, qualifies them based on the conversation, and scores them Hot, Warm, or Cold. The business only talks to the Hot leads. Everyone else gets followed up automatically.

There's also a Voice Lab where you can type any text, pick a language and gender, and hear it spoken back. You can test all 10 voices, adjust the speed, and download the audio. The Auto Mix feature detects which language each sentence is in and switches voices automatically — so a message that mixes Telugu and English sounds natural instead of robotic.

The whole thing runs on free or near-free infrastructure during development. Edge TTS is free. Whisper runs locally. Groq has a generous free tier. Supabase has a free PostgreSQL tier. The only costs in production are Razorpay's 2% transaction fee and whatever telephony provider you use for real calls.

**What's built:**
- 5 languages with 2 voices each (10 voices total)
- Auto Mix multilingual playback with zero gaps between segments
- Real-time barge-in — user can interrupt the AI mid-sentence
- Lead scoring from 1–10 with Hot/Warm/Cold categorization
- Full multi-tenant isolation — 50 clients on one server, none can see each other
- SaaS billing with 5 plans from Free to Enterprise

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                 │
│              http://localhost:5173                       │
│  Login → Dashboard → VoiceLab → AI Employees → Billing  │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (axios)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                      │
│              http://localhost:8000                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ main.py  │  │engine_tts│  │engine_stt│  │orch-   │  │
│  │ (routes) │  │(Edge TTS)│  │(Whisper) │  │estrator│  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ai_agent  │  │lang_conf │  │voice_    │              │
│  │(Groq LLM)│  │(voices)  │  │caller    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────────┬────────────────────────────────┘
                         │ SQLAlchemy ORM
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Supabase PostgreSQL (cloud)                    │
│   Tables: clients, users, leads, call_logs,             │
│           campaigns, ai_employees, knowledge_base,       │
│           api_keys, wallets, appointments                │
└─────────────────────────────────────────────────────────┘
```

**External Services:**
| Service | Purpose | Cost |
|---|---|---|
| Microsoft Edge TTS | Text-to-Speech (5 langs, 10 voices) | Free |
| Groq API | LLM (LLaMA / Compound) | Free tier |
| OpenAI Whisper (local) | Speech-to-Text | Free |
| Supabase | PostgreSQL database | Free tier |
| Firebase | Google OAuth | Free tier |
| Razorpay | Payment processing | 2% per transaction |
| Exotel | Real phone calls (India) | Pay per call |
| Plivo | Real phone calls (fallback) | Pay per call |

---

## 3. Project Structure

```
AI-VOICE-ENGINE/
├── backend/
│   ├── main.py                → FastAPI app — all API routes (1900+ lines)
│   ├── engine_tts.py          → Edge TTS synthesis (text → MP3 bytes)
│   ├── engine_stt.py          → Whisper STT (audio → transcript)
│   ├── engine_voice.py        → Voice utilities
│   ├── lang_config.py         → SINGLE SOURCE OF TRUTH for all voice/language mappings
│   ├── ai_agent.py            → Groq LLM integration, sentiment analysis
│   ├── orchestrator.py        → Session-based conversation manager
│   ├── voice_caller.py        → Exotel/Plivo real call integration
│   ├── database.py            → SQLAlchemy models (all DB tables)
│   ├── config.py              → App config, env vars, pace_to_rate()
│   ├── billing_routes.py      → Razorpay billing router
│   ├── email_service.py       → SMTP email notifications
│   ├── lead_scorer.py         → Keyword-based lead scoring
│   ├── call_simulator.py      → Terminal-based call demo
│   ├── speech_to_text.py      → Legacy STT wrapper
│   ├── text_to_speech.py      → Legacy TTS wrapper
│   ├── requirements.txt       → Python dependencies
│   ├── .env                   → API keys and secrets (never commit)
│   ├── serviceAccountKey.json → Firebase service account (never commit)
│   ├── audio_cache/           → Cached TTS MP3 files for Exotel <Play>
│   ├── core/
│   │   ├── __init__.py
│   │   └── models.py          → Pydantic request/response models
│   └── services/
│       ├── conversation_service.py
│       ├── knowledge_service.py
│       ├── language_service.py
│       ├── memory_service.py
│       ├── voice_call_service.py
│       ├── voice_enhancer.py
│       └── workflow_service.py
│
├── data/frontend/dashboard/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceLab.jsx        → TTS / STT / Live Agent tabs
│   │   │   ├── Dashboard.jsx       → Stats overview
│   │   │   ├── Leads.jsx           → Lead management table
│   │   │   ├── CallLogs.jsx        → Call history + analysis
│   │   │   ├── CallSimulator.jsx   → AI chat simulator
│   │   │   ├── AIEmployees.jsx     → Agent management
│   │   │   ├── Campaigns.jsx       → Campaign management
│   │   │   ├── KnowledgeBase.jsx   → Content management
│   │   │   ├── Billing.jsx         → Plans + Razorpay checkout
│   │   │   ├── APIPage.jsx         → API key management
│   │   │   ├── Team.jsx            → Team member management
│   │   │   ├── Appointments.jsx    → Scheduling
│   │   │   ├── Login.jsx           → Auth (email + Google)
│   │   │   ├── AppShell.jsx        → Main layout wrapper
│   │   │   ├── Sidebar.jsx         → Navigation sidebar
│   │   │   ├── TopNav.jsx          → Top navigation bar
│   │   │   ├── Settings.jsx        → App settings
│   │   │   ├── Profile.jsx         → User profile
│   │   │   ├── AdminPanel.jsx      → Super admin entry
│   │   │   ├── ClientAdmin.jsx     → Client-level admin
│   │   │   └── superadmin/         → Super admin sub-pages
│   │   │       ├── Overview.jsx
│   │   │       ├── Companies.jsx
│   │   │       ├── AllCalls.jsx
│   │   │       ├── AllLeads.jsx
│   │   │       ├── Revenue.jsx
│   │   │       ├── PaymentsView.jsx
│   │   │       ├── AIAgents.jsx
│   │   │       ├── CampaignsView.jsx
│   │   │       ├── CallAnalytics.jsx
│   │   │       ├── PaidClients.jsx
│   │   │       ├── PlatformStats.jsx
│   │   │       └── shared.jsx
│   │   ├── api.js              → Axios instance with auth headers
│   │   ├── App.jsx             → Route definitions
│   │   ├── App.css             → Global styles
│   │   ├── index.css           → Base CSS variables (dark theme)
│   │   ├── light.css           → Light theme overrides
│   │   ├── theme.css           → Theme tokens
│   │   ├── ThemeContext.jsx    → Dark/Light theme context
│   │   ├── firebase.js         → Firebase app init
│   │   └── main.jsx            → React entry point
│   ├── public/
│   │   ├── manifest.webmanifest → PWA manifest
│   │   ├── favicon.png
│   │   └── icons/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── deploy/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── docker-compose.prod.yml
│   ├── nginx-frontend.conf
│   └── .env.production
│
├── START.bat                   → Launches both servers (backend + frontend)
├── docker-compose.yml          → Local Docker setup
├── DOCUMENTATION.md            → This file
└── README.md                   → Quick start guide
```

---

## 4. Environment Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Step 1 — Clone & Install Backend
```bash
cd backend
pip install -r requirements.txt
```

### Step 2 — Configure `.env`
```env
# backend/.env

# Database — Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.PROJECT_ID:PASSWORD@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres

# Groq LLM
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Admin
ADMIN_KEY=superadmin123

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password

# Razorpay (optional)
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx

# Exotel (optional — real calls)
EXOTEL_SID=xxx
EXOTEL_TOKEN=xxx
EXOTEL_FROM=0XXXXXXXXXX

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://voice.tzmicha.com
```

### Step 3 — Firebase Setup
1. Go to https://console.firebase.google.com
2. Create project `tzmicha-ai-voice`
3. Enable Google sign-in under Authentication
4. Add authorized domains: `localhost`, `voice.tzmicha.com`
5. Download `serviceAccountKey.json` → place in `backend/`
6. Copy Firebase config → update `data/frontend/dashboard/src/firebase.js`

### Step 4 — Install Frontend
```bash
cd data/frontend/dashboard
npm install
```

### Step 5 — Run (Development)
```bash
# Option A: Use START.bat (Windows — launches both)
START.bat

# Option B: Manual
# Terminal 1
cd backend && python main.py

# Terminal 2
cd data/frontend/dashboard && npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

---

## 5. Backend — All Modules

### `main.py`
This is the entire backend in one file — about 1900 lines. All the routes live here. It's big, but it's organized by feature area and easy to navigate.

One thing that burned us early on: **middleware order matters**. CORS must be registered before GZip. If you flip them, error responses (500s) come back without CORS headers and the frontend gets an opaque network error with no useful message. The fix is one line swap, but it took a while to figure out why errors were invisible.

```python
app.add_middleware(CORSMiddleware, ...)   # always first
app.add_middleware(GZipMiddleware, ...)   # always second
```

Every protected route goes through `get_current_client()`. It checks for either an `x-client-id` header (dashboard users) or an `x-api-key` header (developer API access). If neither is present or valid, it raises a 401. This is the single enforcement point for all authentication.

```
Request → get_current_client()
  → x-client-id header → dashboard session
  → x-api-key header   → developer API
  → neither            → 401
```

---

### `lang_config.py`
This file is the most important file in the backend after `main.py`. It's the single source of truth for every voice name, language code, and STT hint in the system. If you ever need to add a new language or change a voice, this is the only file you touch. Nothing else should ever hardcode a voice name.

**Voice mapping table:**
| Language | Code | Female Voice | Male Voice |
|---|---|---|---|
| Telugu | `te` | `te-IN-ShrutiNeural` | `te-IN-MohanNeural` |
| Hindi | `hi` | `hi-IN-SwaraNeural` | `hi-IN-MadhurNeural` |
| Indian English | `en` | `en-IN-NeerjaNeural` | `en-IN-PrabhatNeural` |
| British English | `en-GB` | `en-GB-SoniaNeural` | `en-GB-RyanNeural` |
| Kannada | `kn` | `kn-IN-SapnaNeural` | `kn-IN-GaganNeural` |

**Key functions:**
```python
get_voice(language, gender)     # returns Edge TTS voice name
resolve_language(code)          # normalizes any code → canonical key
get_whisper_lang(language)      # returns Whisper language hint
pace_to_rate(pace)              # converts 0.5–2.0 float → "+20%" string
get_supported_languages()       # returns list for frontend
```

---

### `engine_tts.py`
This is the voice engine. Everything that turns text into audio goes through here. It wraps Microsoft Edge TTS, which is free and surprisingly good — especially for Indian languages.

The most important thing to know: Edge TTS has a ~490 character limit per request. If you send more than that, it either fails silently or cuts off. The frontend handles chunking for long text, but if you're calling the backend directly, you need to chunk yourself.

The `_preprocess_text()` function is what makes the speech sound natural. It adds double spaces after commas (micro-pause), triple spaces after sentence endings (longer pause), and converts dashes to comma pauses. Without this, the AI sounds like it's reading a list. With it, it sounds like it's actually talking.

**Public API:**
```python
synthesize(text, language, gender, pace)              # blocking
synthesize_async(text, language, gender, pace)        # async (use in FastAPI routes)
synthesize_to_file(text, output_path, language, ...)  # saves MP3 to disk
```

**Text preprocessing (`_preprocess_text`):**
- Normalizes whitespace and newlines
- Adds micro-pauses after `,` (double space)
- Adds longer pauses after `.?!` (triple space)
- Converts dashes/em-dashes to comma pauses
- Makes speech sound more natural/human

**Edge TTS limit:** ~490 characters per request. Long text must be chunked before calling.

---

### `engine_stt.py`
Wraps OpenAI Whisper for local speech-to-text.

```python
transcribe(audio_bytes, language=None)   # returns transcript string
detect_language(audio_bytes)             # returns detected language code
```

---

### `orchestrator.py`
This is what makes the Live Agent tab work. It keeps track of the full conversation — every turn, every emotion detected, every language switch. When the user says something, the orchestrator sends the full history to Groq, gets a reply, detects the emotion and intent, and returns everything in one response.

The session is stored in memory (a Python dict). This means if the backend restarts, active sessions are lost. For production at scale, you'd want to move this to Redis. For now it works fine.

```python
create_session(session_id, agent_name, product_info, script, goals, languages)
process_turn(session_id, user_text, stt_ms, barge_in)   # returns reply + emotion + intent + latency
get_session_summary(session_id)
end_session(session_id)
```

Each session maintains:
- Full conversation history
- Language detection state
- Emotion + intent tracking
- Latency metrics (STT ms, LLM ms, total ms)

---

### `ai_agent.py`
This is the AI brain. It talks to Groq's API and handles three things: generating replies during conversations, analyzing sentiment after calls, and generating opening greetings.

We use two different models depending on the task. The fast model (`groq/compound-mini`) is used for live conversation turns where speed matters — you want a reply in under a second. The smart model (`groq/compound`) is used for sentiment analysis after the call, where quality matters more than speed.

```python
get_ai_response(history, product_info)          # returns AI reply string
analyze_sentiment(history, summary_lang)        # returns {sentiment, score, category, summary, ...}
generate_opening(name, product_info, ai_name)   # returns greeting string
```

**Models used:**
- `FAST_MODEL` = `groq/compound-mini` (fast responses, live agent)
- `SMART_MODEL` = `groq/compound` (deep analysis, sentiment)

---

### `voice_caller.py`
This handles real phone calls — the kind where an actual phone rings and a real person picks up. It integrates with Exotel (primary) and Plivo (fallback).

The way it works: when a call is triggered, the backend calls Exotel's API to dial the lead's number. When the lead picks up, Exotel hits our webhook. We respond with ExoML (Exotel's XML format) that tells it to play an audio file. That audio file is a pre-generated Edge TTS MP3 stored in `audio_cache/`. The lead speaks, Exotel records it and posts it to our speech webhook. We transcribe with Whisper, generate a reply with Groq, synthesize the reply with Edge TTS, and the loop continues.

When the AI detects a HOT lead (score ≥ 8), it can transfer the call to a human agent's number.

```python
make_outgoing_call(phone_number, lead_id, client_id, opening_message, human_transfer_number)
generate_exoml_answer(call_id)      # ExoML XML for Exotel answer webhook
generate_exoml_incoming(from_number, client_id)
process_speech_turn(call_id, recording_url, digits)
end_voice_call(call_id)
```

**Call flow:**
```
Dashboard triggers call
  → Exotel dials lead
  → Lead picks up → /voice/exotel/answer/{call_id}
  → AI speaks opening (Edge TTS MP3 served via /voice/audio/{file})
  → Lead speaks → Exotel records → posts to /voice/exotel/speech/{call_id}
  → Whisper transcribes → Groq replies → Edge TTS generates response
  → Loop until call ends or HOT lead → transfer to human
  → /voice/exotel/status/{call_id} → save call log
```

---

### `database.py`
SQLAlchemy ORM models. Auto-detects SQLite (dev) vs PostgreSQL (prod).

**Tables:**
| Model | Key Fields |
|---|---|
| `Client` | id, company_name, email, password, plan, total_calls |
| `User` | id, client_id, name, email, role, permissions |
| `Lead` | id, client_id, name, phone, score, category, status |
| `CallLog` | id, client_id, lead_id, transcript, sentiment, lead_score, category, intent, emotion |
| `Campaign` | id, client_id, name, script, total_calls |
| `AIEmployee` | id, client_id, name, role, voice, languages, gender, script, goals |
| `KnowledgeBase` | id, client_id, title, content, category |
| `APIKey` | id, client_id, key, calls_used, calls_limit, is_active |
| `Wallet` | id, client_id, balance |
| `Appointment` | id, client_id, lead_name, date, time, status |
| `RazorpayOrder` | id, client_id, order_id, plan, amount_inr, status |

---

### `config.py`
```python
HOST = "0.0.0.0"
PORT = 8000
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
AI_MODEL = "groq/compound-mini"
FAST_MODEL = "groq/compound-mini"
SMART_MODEL = "groq/compound"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/leads.db")
```

---

### `billing_routes.py`
Separate FastAPI router for billing endpoints. Included in main.py via `app.include_router(billing_router)`.

---

### `email_service.py`
SMTP email notifications:
- `send_welcome(email, name, company)` — on registration
- `send_hot_lead_alert(email, lead_name, score, summary, action)` — when HOT lead detected
- `send_call_summary(email, lead_name, category, score, summary, duration)` — after each call
- `send_campaign_complete(email, campaign_name, total, hot, warm, cold)` — campaign done

---

## 6. Frontend — All Components

### `api.js`
Axios instance. Automatically attaches auth headers to every request.
```javascript
// Headers sent on every request:
'x-client-id': localStorage.getItem('client_id')
```

### `App.jsx`
React Router route definitions. Protected routes check `localStorage.client_id`.

### `ThemeContext.jsx`
Dark/Light theme toggle. Persisted in `localStorage`. Applies CSS class to `<body>`.

### `VoiceLab.jsx`
The most complex component. Three tabs:

**Tab 1 — Text → Speech (TTS)**
- Language selector (6 options including Auto Mix)
- Gender selector (Female / Male) — authoritative, never overridden
- Pace slider (0.5× to 2.0×) with live color + emoji feedback
- Text input (2000 char limit, shows chunk count)
- Fix Grammar + Humanize AI buttons
- Speak / Stop button
- Download button
- Web Audio API for Auto Mix gapless playback

**Tab 2 — Speech → Text (STT)**
- MediaRecorder → Whisper Large v3 transcription
- Browser VAD for silence detection
- Send to TTS button

**Tab 3 — Live Agent**
- Full duplex voice conversation
- Barge-in detection (user can interrupt AI mid-speech)
- Emotion + intent display
- Turn latency metrics
- AI Employee selector

**Key refs:**
```javascript
audioRef       // HTMLAudioElement for single-language playback
mixCtxRef      // Web Audio AudioContext for Auto Mix (closed on stop)
genderRef      // Always current gender — used in all TTS calls
selectedVoiceRef  // Always current voice — avoids stale closures
paceRef        // Always current pace
```

**Gender rule (critical):**
- `genderRef.current` is the ONLY source for the `speaker` field in every TTS API call
- Language detection in Auto Mix changes `language` only — never `speaker`
- `download()` uses `genderRef.current` (not `voice.id`)
- Gender change clears `audioBlob` cache immediately

### `Login.jsx`
- Email + password login
- Google OAuth via Firebase
- Super Admin key entry (`superadmin123`)
- Stores `client_id` in localStorage on success

### `AppShell.jsx`
Main layout: Sidebar + TopNav + page content. Handles route rendering.

### `Sidebar.jsx`
Navigation links. Highlights active route. Collapses on mobile.

### `Dashboard.jsx`
Stats cards: total leads, hot/warm/cold counts, total calls, conversion rate.

### `Leads.jsx`
Table with search, filter by category, add lead form, CSV upload.

### `CallLogs.jsx`
Call history table. Expandable rows show full transcript, sentiment, buying signals, objections, recommended action.

### `AIEmployees.jsx`
Create/edit AI agents. Fields: name, role, language, gender, voice, script, goals, greeting, company info.

### `Campaigns.jsx`
Create campaigns, assign leads, run campaigns (triggers bulk AI calls).

### `KnowledgeBase.jsx`
Add/search/delete knowledge articles. Used by AI agent for context.

### `Billing.jsx`
Plan cards (Free/Starter/Growth/Pro/Enterprise). Razorpay checkout integration. Usage meter.

### `APIPage.jsx`
Create/revoke API keys. Shows key preview (first 12 + last 4 chars). Usage counter.

### `AdminPanel.jsx` + `superadmin/`
Super admin dashboard. Accessible only with `superadmin123` key.
- Overview: platform stats, MRR, ARR
- Companies: all clients, plan management, activate/deactivate
- All Calls: platform-wide call logs
- All Leads: platform-wide leads
- Revenue: payment history, total revenue
- AI Agents: all employees across all clients


---

## 7. API Reference

All endpoints require `x-client-id` header (from login) OR `x-api-key` header (developer access).

### Authentication
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/auth/register` | `{company_name, email, password, ...}` | Register new client |
| POST | `/auth/login` | `{email, password}` | Email/password login |
| POST | `/auth/google` | `{id_token}` | Google OAuth login |
| POST | `/auth/team-login` | `{email, password}` | Team member login |
| GET | `/auth/profile` | — | Get current client profile |
| PUT | `/auth/profile` | `{product_info, ai_name, ...}` | Update profile |
| POST | `/auth/forgot-password` | `{email}` | Request reset code |
| POST | `/auth/reset-password` | `{email, new_password, reset_code}` | Reset password |

### Leads
| Method | Endpoint | Description |
|---|---|---|
| POST | `/leads` | Add a lead |
| GET | `/leads` | Get all leads |
| GET | `/leads/{id}` | Get single lead |
| GET | `/leads/category/{hot\|warm\|cold}` | Filter by category |
| POST | `/leads/upload-csv` | Bulk upload via CSV |

### Call Simulator
| Method | Endpoint | Description |
|---|---|---|
| POST | `/call/start` | Start AI call with lead |
| POST | `/call/respond` | Send message, get AI reply |
| POST | `/call/end` | End call, get full analysis |
| GET | `/calls` | Get all call logs |

### Voice Lab
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/voicelab/tts/tzmicha` | `{text, language, speaker, pace}` | Generate speech (MP3) |
| POST | `/voicelab/stt/tzmicha` | `file` (multipart) | Transcribe audio |
| GET | `/voicelab/languages` | — | Get supported languages |
| POST | `/voicelab/fix-grammar` | `{text}` | AI grammar fix |
| POST | `/voicelab/humanize` | `{text}` | AI humanize text |

**TTS Request fields:**
```json
{
  "text": "Hello, how are you?",
  "language": "te",
  "speaker": "female",
  "pace": 1.2
}
```
- `language`: `te` | `hi` | `en` | `en-GB` | `kn`
- `speaker`: `female` | `male` (anything else defaults to `female`)
- `pace`: `0.5` to `2.0` (1.0 = normal speed)

### AI Employees
| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai-employees` | Create AI employee |
| GET | `/ai-employees` | List all employees |
| PUT | `/ai-employees/{id}` | Update employee |
| DELETE | `/ai-employees/{id}` | Delete employee |

### Agent Sessions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/agent/session/start` | Start voice session |
| POST | `/agent/session/turn` | Process one turn |
| POST | `/agent/session/end` | End session + get summary |
| POST | `/agent/respond` | Simple single-turn response |

### Campaigns
| Method | Endpoint | Description |
|---|---|---|
| POST | `/campaigns` | Create campaign |
| GET | `/campaigns` | List campaigns |
| POST | `/campaigns/{id}/run` | Run campaign (bulk calls) |
| POST | `/campaigns/{id}/assign-leads` | Assign leads to campaign |

### Real Voice Calls
| Method | Endpoint | Description |
|---|---|---|
| POST | `/voice/call` | Initiate outbound call |
| GET/POST | `/voice/exotel/answer/{call_id}` | Exotel answer webhook |
| POST | `/voice/exotel/incoming` | Exotel incoming webhook |
| POST | `/voice/exotel/speech/{call_id}` | Exotel speech webhook |
| POST | `/voice/exotel/status/{call_id}` | Exotel status webhook |
| POST | `/voice/end` | End active call |
| GET | `/voice/status/{call_id}` | Get call status |
| GET | `/voice/active` | List active calls |
| POST | `/voice/transfer` | Transfer to human |

### Billing
| Method | Endpoint | Description |
|---|---|---|
| GET | `/payment/plans` | Get all plans + pricing |
| POST | `/payment/create-order` | Create Razorpay order |
| POST | `/payment/verify` | Verify payment + upgrade plan |
| GET | `/usage` | Get usage stats |

### API Keys
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api-keys` | Create API key |
| GET | `/api-keys` | List API keys |
| DELETE | `/api-keys/{id}` | Revoke key |
| PUT | `/api-keys/{id}/toggle` | Enable/disable key |

### Knowledge Base
| Method | Endpoint | Description |
|---|---|---|
| POST | `/knowledge` | Add article |
| GET | `/knowledge` | List articles |
| DELETE | `/knowledge/{id}` | Delete article |
| POST | `/knowledge/search` | Search articles |

### Appointments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/appointments` | Create appointment |
| GET | `/appointments` | List appointments |
| PUT | `/appointments/{id}/status` | Update status |
| DELETE | `/appointments/{id}` | Delete |

### Super Admin (requires `x-admin-key: superadmin123`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/clients` | All clients |
| GET | `/admin/clients/{id}/detail` | Client deep detail |
| PUT | `/admin/clients/{id}/plan` | Change plan |
| PUT | `/admin/clients/{id}/toggle` | Activate/deactivate |
| GET | `/admin/stats` | Platform stats |
| GET | `/admin/calls` | All calls |
| GET | `/admin/leads` | All leads |
| GET | `/admin/campaigns` | All campaigns |
| GET | `/admin/ai-employees` | All AI employees |
| GET | `/admin/payments` | All payments |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/stats` | Client dashboard stats |
| GET | `/notifications` | Recent notifications |

---

## 8. Voice Engine — TTS

### How it works
1. Frontend sends `POST /voicelab/tts/tzmicha` with `{text, language, speaker, pace}`
2. Backend normalizes `speaker` → `gender` (`"female"` or `"male"`)
3. `get_voice(language, gender)` from `lang_config.py` returns the exact Edge TTS voice name
4. `_preprocess_text(text)` adds natural pause cues
5. `edge_tts.Communicate(text, voice, rate=rate)` streams MP3 bytes
6. Returns `StreamingResponse` with `audio/mpeg` content type

### Voice selection rule
```
language + gender → voice name (from lang_config.py LANGUAGES dict)

te + female → te-IN-ShrutiNeural
te + male   → te-IN-MohanNeural
hi + female → hi-IN-SwaraNeural
hi + male   → hi-IN-MadhurNeural
en + female → en-IN-NeerjaNeural
en + male   → en-IN-PrabhatNeural
en-GB + female → en-GB-SoniaNeural
en-GB + male   → en-GB-RyanNeural
kn + female → kn-IN-SapnaNeural
kn + male   → kn-IN-GaganNeural
```

### Pace / Rate conversion
```python
pace_to_rate(1.0)  → "+0%"    (normal)
pace_to_rate(1.2)  → "+20%"   (20% faster)
pace_to_rate(0.8)  → "-20%"   (20% slower)
pace_to_rate(2.0)  → "+100%"  (double speed)
```

### Long text chunking
Edge TTS has a ~490 character limit per request. The frontend splits long text by sentence boundaries and sends multiple requests, playing them sequentially.

---

## 9. Voice Engine — STT

### How it works
1. Frontend records audio via `MediaRecorder` (WebM format)
2. Sends to `POST /voicelab/stt/tzmicha` as multipart form
3. Backend calls `engine_stt.transcribe(audio_bytes, language)`
4. Whisper Large v3 transcribes locally (no API cost)
5. Returns `{transcript, detected_language}`

### Language detection
Whisper auto-detects language. The `detected_language` field in the response can be used to hint the TTS language for playback.

---

## 10. Auto Mix — Multilingual Playback

Auto Mix detects the language of each sentence and uses the correct voice, while keeping the user's selected gender throughout.

### Script detection (Unicode ranges)
```javascript
Telugu:  \u0C00-\u0C7F  (>30% of chars → 'te')
Hindi:   \u0900-\u097F  (>30% of chars → 'hi')
Kannada: \u0C80-\u0CFF  (>30% of chars → 'kn')
Default: 'en'
```

### Auto Mix flow
```
1. splitByScript(text) → [{lang: 'te', text: '...'}, {lang: 'en', text: '...'}, ...]
2. Fetch all segments in PARALLEL (Promise.all)
   → Each request: {text, language: seg.lang, speaker: genderRef.current, pace}
   → Gender is ALWAYS from genderRef — language detection never changes gender
3. Web Audio API:
   → new AudioContext()
   → decodeAudioData() for each segment
   → trimSilence() — removes leading/trailing silence (threshold: 0.01)
   → createBufferSource() for each trimmed segment
   → Schedule all sources at exact timestamps (back-to-back, zero gap)
   → src.playbackRate.value = paceRef.current
4. On stop: mixCtxRef.current.close() → kills all scheduled sources instantly
```

### Why Web Audio API (not HTML Audio elements)?
- HTML Audio elements have gaps between tracks (buffering, event loop delays)
- Web Audio API schedules audio at sample-accurate timestamps
- All segments are pre-fetched and decoded before playback starts
- Result: seamless, gapless multilingual speech

---

## 11. AI Agent & Orchestrator

### Session lifecycle
```
POST /agent/session/start
  → create_session() stores: agent_name, product_info, script, goals, languages
  → returns session_id + greeting text

POST /agent/session/turn (repeat for each user message)
  → process_turn(session_id, user_text)
  → Groq LLM generates reply
  → Detects emotion (angry/happy/confused/uncertain/neutral)
  → Detects intent (greeting/objection/interest/closing/...)
  → Detects language (telugu/hindi/english/kannada)
  → Returns {tts_reply, emotion, intent, language, latency}

POST /agent/session/end
  → get_session_summary() → full history + latency report
  → analyze_sentiment() → lead score + category
```

### Barge-in system
```
Agent speaks → Web Audio plays TTS
  → Background SpeechRecognition starts (600ms delay to avoid self-trigger)
  → User speaks → SpeechRecognition fires onresult
  → bargeInRef = true → interruptAI() → audio.pause()
  → agentListen() starts immediately
  → User's message processed → new AI reply
```

---

## 12. Authentication

### Login flow
```
Email/Password:
  POST /auth/login → {client_id, company_name, ...}
  → store client_id in localStorage
  → all subsequent requests: x-client-id: {client_id}

Google OAuth:
  Firebase signInWithPopup()
  → get Firebase ID token
  → POST /auth/google {id_token}
  → Backend verifies with Firebase Admin SDK
  → Auto-creates client if first login
  → returns client_id

Team Login:
  POST /auth/team-login → {client_id, role, permissions}
  → same localStorage storage
```

### Password hashing
- New passwords: bcrypt (via `bcrypt` library)
- Legacy passwords: SHA-256 (auto-upgraded to bcrypt on next login)
- Never store plain text passwords

### Super Admin
- Header: `x-admin-key: superadmin123`
- Set `ADMIN_KEY` in `.env` for production (change from default!)
- Bypasses client isolation — sees all data

---

## 13. Multi-Tenant Architecture

Every database query is filtered by `client_id`. The `get_current_client()` dependency enforces this.

```python
# Every query pattern:
db.query(Lead).filter(Lead.client_id == client.id).all()
db.query(CallLog).filter(CallLog.client_id == client.id).all()
```

**Client isolation guarantees:**
- Client A cannot see Client B's leads, calls, employees, or campaigns
- API keys are scoped to a single client
- Team members inherit their client's isolation

---

## 14. Billing & Plans

| Plan | Price (₹/month) | Calls/month | API Keys |
|---|---|---|---|
| Free | ₹0 | 50 | 1 |
| Starter | ₹5,000 | 500 | 2 |
| Growth | ₹15,000 | 2,000 | 5 |
| Pro | ₹30,000 | 5,000 | 10 |
| Enterprise | ₹75,000 | 15,000 | Unlimited |

### Enforcement
`check_call_limit(client, db)` is called before every AI call. Counts calls in the current calendar month. Raises HTTP 429 if limit exceeded.

### Razorpay flow
```
POST /payment/create-order {plan}
  → creates Razorpay order (or demo order if no keys)
  → returns order_id, amount, key_id

Frontend: Razorpay checkout popup
  → on success: POST /payment/verify {order_id, payment_id, signature}
  → verifies HMAC signature
  → upgrades client.plan in DB
```

---

## 15. Real Voice Calls — Exotel/Plivo

### Setup (Exotel)
1. Get Exotel account at https://exotel.com
2. Add credentials to `.env`: `EXOTEL_SID`, `EXOTEL_TOKEN`, `EXOTEL_FROM`
3. In Exotel dashboard, set webhook URLs:
   - Answer: `https://your-domain.com/voice/exotel/answer/{call_id}`
   - Speech: `https://your-domain.com/voice/exotel/speech/{call_id}`
   - Status: `https://your-domain.com/voice/exotel/status/{call_id}`
4. For incoming calls: Passthrough → `https://your-domain.com/voice/exotel/incoming`

### Audio serving
Edge TTS generates MP3 files → saved to `backend/audio_cache/` → served via `GET /voice/audio/{filename}` → Exotel `<Play>` tag fetches the URL.

### HOT lead transfer
When AI detects a HOT lead (score ≥ 8), it can transfer the call to a human agent number configured in the call request.

---

## 16. Deployment

### Docker (recommended)
```bash
# Build and run
docker-compose -f deploy/docker-compose.prod.yml up -d

# Backend: port 8000
# Frontend: port 80 (nginx)
```

### Manual (VPS/Cloud)
```bash
# Backend
cd backend
pip install -r requirements.txt
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Frontend
cd data/frontend/dashboard
npm run build
# Serve dist/ with nginx
```

### Nginx config (frontend)
```nginx
server {
    listen 80;
    server_name voice.tzmicha.com;
    root /var/www/dashboard/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ { proxy_pass http://localhost:8000/; }
}
```

### Environment variables for production
```env
DATABASE_URL=postgresql://...supabase...
GROQ_API_KEY=gsk_...
ADMIN_KEY=<strong-random-key>   # CHANGE THIS
ALLOWED_ORIGINS=https://voice.tzmicha.com
```

### GitHub Actions CI/CD
`.github/workflows/deploy.yml` — auto-deploys on push to `main`.

---

## 17. Known Issues & Fixes Log

*Every bug that bit us, documented so it never bites anyone else.*

### Fix 1 — CORS errors on 500 responses
This one was confusing because the frontend was getting network errors with no useful message. Turned out GZipMiddleware was registered before CORSMiddleware. When the backend threw a 500, the error response went through GZip first and came out without CORS headers. The browser blocked it entirely.

Fix: always register CORS before GZip. One line swap.
```python
app.add_middleware(CORSMiddleware, ...)  # first
app.add_middleware(GZipMiddleware, ...)  # second
```

---

### Fix 2 — Auto Mix gaps between segments
When we first built Auto Mix, we played each language segment using sequential HTML Audio elements. There were 200–500ms gaps between segments — you could clearly hear the pause when the language switched. It sounded broken.

The fix was switching to the Web Audio API entirely. All segments are fetched in parallel, decoded, silence-trimmed, and scheduled at exact sample-accurate timestamps. The result is seamless — you can't hear the switch at all.

---

### Fix 3 — Gender selection ignored in download
The download button was always generating female audio regardless of what gender was selected. The bug was subtle: `download()` was sending `speaker: voice.id` where `voice.id` is the language code (`"te"`, `"en-GB"`, etc.), not the gender. The backend received `"te"` as the speaker value, didn't recognize it as `"male"` or `"female"`, and defaulted to female.

Fix: changed to `speaker: genderRef.current` which always holds the actual selected gender.

---

### Fix 4 — Gender change didn't clear audio cache
After fixing the download bug, we noticed another issue: if you generated female audio, then switched to male, the old female audio was still cached in `audioBlob`. Clicking download would give you the female audio even though male was selected.

Fix: added `gender` to the `useEffect` dependency array that clears the audio cache. Now any change to gender, voice, or pace clears the cache immediately.

---

### Fix 5 — Kannada not detected in Auto Mix
Auto Mix was only detecting Telugu and Hindi by Unicode range. Kannada text was falling through to the English voice, which sounded completely wrong.

Fix: added Kannada Unicode range `\u0C80-\u0CFF` to the detection logic. Now Kannada text correctly routes to the Kannada voice.

---

### Fix 6 — Groq model names changed
Groq removed `llama-3.1-8b-instant` from their free tier without much warning. The backend was throwing errors on every AI call.

Fix: updated to `groq/compound-mini` for fast calls and `groq/compound` for smart analysis. Both are on the current free tier.

---

### Fix 7 — Supabase project migration
The original Supabase project went into a paused state (free tier projects pause after inactivity). All database connections were failing.

Fix: created a new Supabase project and updated `DATABASE_URL`. One thing to note: use the session pooler port `5432`, not the direct connection port `6543`. The pooler handles connection limits much better for a web app.

---

## 18. Upgrade Path

| Current (Free/Dev) | Upgrade To | When |
|---|---|---|
| Edge TTS (free, robotic) | ElevenLabs / Amazon Polly | When need ultra-human voice |
| Whisper local | Amazon Transcribe / Deepgram | When need real-time streaming STT |
| Groq free tier | Amazon Bedrock / GPT-4o | When need better quality or higher limits |
| Call Simulator | Exotel / Twilio | When making real phone calls |
| Supabase free | Supabase Pro / AWS RDS | When scaling beyond free tier limits |
| SQLite fallback | PostgreSQL only | Remove SQLite fallback in production |
| Single server | AWS ECS / Kubernetes | When handling 100+ concurrent calls |

---

## Quick Reference

### Start development
```bash
START.bat
```

### Test TTS via curl
```bash
curl -X POST http://localhost:8000/voicelab/tts/tzmicha \
  -H "x-client-id: 1" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello! How are you?","language":"en","speaker":"female","pace":1.2}' \
  --output test.mp3
```

### Test STT via curl
```bash
curl -X POST http://localhost:8000/voicelab/stt/tzmicha \
  -H "x-client-id: 1" \
  -F "file=@audio.webm"
```

### Default credentials
- Client login: `danievens78@gmail.com`
- Super Admin key: `superadmin123` (change in production via `ADMIN_KEY` env var)

### API Docs (Swagger)
http://localhost:8000/docs

---

---

*TZMICHA AI Voice Engine v2.0*
*If something isn't documented here and you figure it out, add it. Future you will thank present you.*
