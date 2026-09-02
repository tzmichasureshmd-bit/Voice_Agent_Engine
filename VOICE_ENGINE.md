# TZMICHA AI VOICE ENGINE — Complete Technical & QA Documentation

> **Version:** 2.1
> **Last Updated:** September 01, 2026
> **Product:** AI Voice Calling SaaS Platform + Sales Monitoring
> **Company:** TZMICHA IT Solutions
> **Live URL:** https://voice.tzmicha.com
> **API Docs:** https://voice.tzmicha.com/docs
> **GitHub:** tzmichasureshmd-bit/Voice_Agent_Engine

---

## TABLE OF CONTENTS

1. [What This Product Is](#1-what-this-product-is)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Every Page / Screen (Full List)](#3-every-page--screen)
4. [URL Routing (Clean Slugs)](#4-url-routing)
5. [Theme System (Light + Dark)](#5-theme-system)
6. [Sales Monitor (CALLOS-style)](#6-sales-monitor)
7. [Backend API Endpoints](#7-backend-api-endpoints)
8. [Database Schema](#8-database-schema)
9. [AI + Voice Engine](#9-ai--voice-engine)
10. [Database Connection (Supabase) — Fixed](#10-database-connection-supabase)
11. [Environment Variables](#11-environment-variables)
12. [How to Run](#12-how-to-run)
13. [QA Test Checklist (Every Page)](#13-qa-test-checklist)
14. [Known Issues & Pending](#14-known-issues--pending)

> **Note:** This file is the **application/technical documentation** only. For daily work updates and progress logs, see `DAILY_PROGRESS.md`.

---

## 1. WHAT THIS PRODUCT IS

TZMICHA AI Voice Engine is a **multi-tenant SaaS platform** with two sides:

**A) AI Voice Engine (core)** — The AI itself makes and receives real phone calls, talks to leads in Telugu/Hindi/English, qualifies them, scores them Hot/Warm/Cold, and auto-transfers hot leads to human agents.

**B) Sales Monitor (CALLOS-style dashboard)** — A monitoring command centre showing call tracking, pipeline, team leaderboard, and call performance insights, powered by the AI's own call data.

> **Note on CALLOS:** CALLOS (callos.in) is a *separate* sales-call monitoring tool for *human* telecallers (it needs a mobile app to read a person's phone call logs). Our "Sales Monitor" page borrows the CALLOS dashboard *layout/widgets* but is powered by our own AI call data — it is web-only and does NOT monitor human phone calls. Monitoring real human phone calls would require a separate mobile app (future scope).

---

## 2. ARCHITECTURE & TECH STACK

### Backend
| Component | Technology |
|-----------|-----------|
| Framework | FastAPI (Python 3.11) |
| AI Model | Groq Cloud — LLaMA 3.1 8B Instant (fast) + LLaMA 3.3 70B (quality) |
| STT | OpenAI Whisper (local, free) — model "small" |
| TTS | Microsoft Edge TTS (free, Indian voices) |
| Database | SQLAlchemy ORM → Supabase PostgreSQL 17 (prod) / SQLite (local fallback) |
| Telephony | Exotel (primary, India) + Plivo (fallback) |
| Payments | Razorpay (India) + Stripe (international) |
| Email | SMTP (Brevo/Gmail) |
| Auth | Firebase Admin (Google) + email/password (SHA-256) |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 19 + Vite 8 |
| Styling | Inline styles + CSS variables (theme) + Tailwind 4 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Animations | Framer Motion 12 |
| HTTP | Axios (with x-client-id interceptor) |
| Auth | Firebase SDK (Google OAuth) |
| PWA | vite-plugin-pwa (installable, offline) |
| Routing | Custom History API slug routing (see section 4) |

### Infrastructure
| Component | Value |
|-----------|-------|
| Hosting | Hostinger VPS (200.97.174.56) |
| Domain | voice.tzmicha.com |
| CI/CD | GitHub Actions → SSH deploy |
| Containers | Docker + docker-compose |
| DB (prod) | Supabase PostgreSQL, region ap-northeast-1 (Tokyo) |

---

## 3. EVERY PAGE / SCREEN

### Primary Navigation (top nav pill — always visible)
| # | Page | Component | URL | What It Does |
|---|------|-----------|-----|--------------|
| 1 | Overview | Dashboard.jsx | `/home` | KPIs, conversation performance, lead pipeline, recent activity |
| 2 | Sales Monitor | SalesMonitor.jsx | `/monitor` | CALLOS-style: opportunities, pipeline, leaderboard, call insights |
| 3 | Assistants | AIEmployees.jsx | `/assistants` | Create/manage AI agents, live test calls |
| 4 | Leads | Leads.jsx | `/leads` | Add/import leads, CSV upload, view by category |
| 5 | Voice Lab | VoiceLab.jsx | `/voice` | TTS/STT testing, grammar fix, humanize, live agent |
| 6 | Simulator | CallSimulator.jsx | `/simulator` | Browser-based AI call simulation with mic |
| 7 | Activity | CallLogs.jsx | `/activity` | Call logs, intelligence, live calls, transfers |

### More Menu (··· dropdown)
| Page | Component | URL | What It Does |
|------|-----------|-----|--------------|
| Campaigns | Campaigns.jsx | `/campaigns` | Create/run bulk calling campaigns |
| Team | Team.jsx | `/team` | Manage members, roles, page permissions |
| Knowledge | KnowledgeBase.jsx | `/knowledge` | Upload FAQs/docs for AI context |
| Billing | Billing.jsx | `/billing` | Wallet, plans, invoices, spend caps |
| Integrations | Integrations.jsx | `/integrations` | Connect CRM & tools |
| API Keys | APIPage.jsx | `/api` | Generate developer API keys (tzm_live_xxx) |
| Admin | ClientAdmin.jsx | `/admin` | Client's own team & usage management |
| Settings | Settings.jsx | `/settings` | AI engine, calling, notifications, WhatsApp config |
| Profile | Profile.jsx | `/profile` | Account & AI settings |
| WhatsApp | WhatsAppPage.jsx | `/whatsapp` | Broadcast, templates, auto-summary |
| SMS | SMSPage.jsx | `/sms` | Compose SMS, provider setup |

### Super Admin (accessed via Admin button on login page)
| Section | Component | What It Does |
|---------|-----------|--------------|
| Overview | superadmin/Overview.jsx | KPIs, plan breakdown, recent clients |
| Companies | superadmin/Companies.jsx | All clients, plan change, ban, detail |
| Revenue | superadmin/Revenue.jsx | MRR/ARR, revenue by plan |
| Paid Clients | superadmin/PaidClients.jsx | Paying clients by plan |
| Payments | superadmin/PaymentsView.jsx | All payment orders |
| Platform Stats | superadmin/PlatformStats.jsx | Platform-wide KPIs |
| All Calls | superadmin/AllCalls.jsx | Every call across platform |
| All Leads | superadmin/AllLeads.jsx | Every lead across platform |
| Campaigns | superadmin/CampaignsView.jsx | All campaigns |
| AI Agents | superadmin/AIAgents.jsx | All AI employees |
| Call Analytics | superadmin/CallAnalytics.jsx | Calls by client, ranked |

### Shell / Support Components
| Component | Role |
|-----------|------|
| AppShell.jsx | Top nav pill, More menu, theme toggle, layout |
| Login.jsx | Email/Google login + register + admin access |
| Sidebar.jsx | (legacy) permission-based sidebar |
| TopNav.jsx | (support) top bar |
| AdminPanel.jsx | Super admin container |
| billing/WalletCard.jsx | Wallet balance + add money modal |
| billing/CurrencyPicker.jsx | Multi-currency selector |
| billing/currency.js | Currency formatting helper |

### Placeholder Pages (coming soon)
Call Flows, Web Dialer, Live Calls, Incoming Bot, Website Widget, Workflows — all render a "coming soon" placeholder.

---

## 4. URL ROUTING

The app uses a **clean slug ↔ internal tab id map** (in `App.jsx`) with the browser History API. Each page has its own friendly URL. Back/forward buttons work. Loading `/` redirects to `/home`.

| Clean URL | Internal Tab |
|-----------|-------------|
| `/home` | dashboard |
| `/monitor` | monitor |
| `/assistants` | ai-employees |
| `/leads` | leads |
| `/voice` | voicelab |
| `/simulator` | calls |
| `/activity` | logs |
| `/campaigns` | campaigns |
| `/team` | team |
| `/profile` | profile |
| `/knowledge` | knowledge |
| `/appointments` | appointments |
| `/billing` | billing |
| `/whatsapp` | whatsapp |
| `/sms` | sms |
| `/integrations` | integrations |
| `/api` | api |
| `/admin` | clientadmin |
| `/settings` | settings |

> **Production note:** nginx must have SPA fallback (`try_files $uri /index.html;`) so directly opening or refreshing `/voice`, `/monitor`, etc. serves the app instead of 404. Vite dev server handles this automatically.

---

## 5. THEME SYSTEM

### How It Works
- `ThemeContext.jsx` stores theme in `localStorage` and sets `data-theme="light|dark"` on `<html>`.
- Dark mode is the default and base design.
- `light.css` provides light-mode overrides via `[data-theme="light"]` selectors.
- Toggle via the sun/moon icon in the top nav.

### Two theming approaches used
1. **CSS variables (preferred)** — Pages use `var(--bg-card)`, `var(--text-primary)`, `var(--border)`, etc. These auto-switch with theme. Best practice.
2. **light.css global overrides** — For pages that still hardcode dark hexes, `light.css` catches those hex values via attribute selectors and remaps them to light equivalents.

### Theme CSS variables (light values)
| Variable | Light value | Purpose |
|----------|------------|---------|
| --bg-primary | #f7fffe | Page background |
| --bg-card | #ffffff | Card background |
| --bg-input | #f0fffe | Input/inner background |
| --border | #c8f0ec | Borders |
| --text-primary | #0a1a18 | Main text |
| --text-secondary | #2a5a54 | Secondary text |
| --text-muted | #5a8a84 | Muted text |
| --text-dim | #9acac4 | Dim text |
| --accent / --accent-light | #40e0d0 / #20c8b8 | Turquoise accent |

### Pages fully converted to CSS variables (this session)
- APIPage.jsx ✅ (was fully broken in light mode — now fixed)
- WhatsAppPage.jsx ✅
- SMSPage.jsx ✅
- VoiceLab.jsx (tab bar + panel) ✅
- superadmin/shared.jsx (card, table header, table row → fixes all superadmin sub-pages) ✅
- Dashboard.jsx, SalesMonitor.jsx ✅ (built with variables from the start)

### Pages covered by light.css overrides
Leads, CallLogs, Campaigns, Team, Profile, Billing (+ WalletCard, CurrencyPicker), Appointments, KnowledgeBase, Integrations, Settings, ClientAdmin, all superadmin sub-pages, VoiceLab live-agent panel. All hardcoded hex values used (`#0e0e1a`, `#0a0a14`, `#1e1e30`, `#f0f0f8`, `#55556a`, `#33334a`, `#1a1a2e`, `#c0c0d8`, `#2b3447`, `#181f2d`, `#29223c`, `#9999b3`, `#a78bfa`, `#c4b5fd`) have light-mode overrides.

**Result: every page renders correctly in both light and dark mode.**

---

## 6. SALES MONITOR

A dedicated page (`SalesMonitor.jsx`, URL `/monitor`) recreating the CALLOS dashboard layout, powered by the app's own `/calls` and `/team` data.

**Widgets:**
- **KPI row** — Total Calls, Connected %, Talk Time, Hot Leads
- **Top Opportunities – This Week** — 2+/3+/5+ connect buckets, Avg Talk Time, Hot Leads list
- **Opportunities Pipeline** — ranked table (Lead, Connects, Talk Time, Last Contact, Score)
- **Top Performer – This Week** — Calls, Connected %, Talk Time, Missed
- **Team Leaderboard** — ranked agents (Rank, Agent, Calls, Connected, Talk Time, Missed)
- **Call Performance Insights** — Daily Call Metrics (line), Call Outcome Breakdown (bar: incoming/outgoing/missed), Duration Distribution (donut)

All widgets have clean empty states. Fully theme-aware.

---

## 7. BACKEND API ENDPOINTS

### Auth
`POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `POST /auth/team-login`, `GET/PUT /auth/profile`, `POST /auth/forgot-password`, `POST /auth/reset-password`

### Leads
`POST /leads`, `GET /leads`, `GET /leads/{id}`, `GET /leads/category/{category}`, `POST /leads/upload-csv`

### Call Simulator
`POST /call/start`, `POST /call/respond`, `POST /call/end`

### Real Voice Calls
`POST /voice/call`, `POST /voice/end`, `GET /voice/status/{id}`, `GET /voice/active`, `POST /voice/transfer`, Exotel webhooks (`/voice/exotel/answer|incoming|speech|status`), Plivo webhooks, `GET /voice/audio/{file}`

### AI Agent / Sessions
`POST /agent/respond`, `POST /agent/session/start|turn|end`

### AI Employees
`POST/GET /ai-employees`, `PUT/DELETE /ai-employees/{id}`

### Knowledge / Campaigns / Appointments
`POST/GET/DELETE /knowledge`, `POST /knowledge/search`, `POST/GET /campaigns`, `POST /campaigns/{id}/run|assign-leads`, `POST/GET /appointments`, `PUT/DELETE /appointments/{id}`

### Dashboard / Logs / Export
`GET /calls`, `GET /dashboard/stats`, `GET /notifications`, `GET /export/leads`, `GET /export/calls`, `POST /calls/{id}/whatsapp-summary`

### Team
`POST /team/add`, `GET /team`, `PUT /team/{id}/role|permissions|toggle`, `DELETE /team/{id}`

### API Keys / Usage
`POST/GET /api-keys`, `DELETE /api-keys/{id}`, `PUT /api-keys/{id}/toggle`, `GET /usage`

### Billing / Payments
`GET /payment/plans`, `POST /payment/create-order|verify`, `GET /billing/wallet|plans|spend-caps|auto-recharge|invoices`, `POST /billing/wallet/add-money|plans/switch|spend-caps|auto-recharge|invoices`, `GET /billing/invoices/{id}/pdf`, `POST /billing/webhook/stripe`

### Voice Lab
`POST /voicelab/tts/tzmicha`, `POST /voicelab/stt/tzmicha`, `POST /voicelab/fix-grammar`, `POST /voicelab/humanize`

### AI URL Analyzer
`POST /ai/analyze-url`

### Super Admin (x-admin-key header)
`GET /admin/clients`, `GET /admin/clients/{id}/detail`, `PUT /admin/clients/{id}/plan|toggle|reset-password`, `GET /admin/stats|calls|leads|campaigns|ai-employees|payments`

---

## 8. DATABASE SCHEMA

15 SQLAlchemy models:

| Table | Purpose |
|-------|---------|
| clients | Client companies (login, plan, product info) |
| users | Team members (role, permissions) |
| leads | Leads (score, category, status) |
| call_logs | Call records + intelligence (intent, emotion, signals, objections) |
| campaigns | Calling campaigns |
| ai_employees | AI agents (name, voice, script, goals) |
| knowledge_base | Client knowledge articles |
| api_keys | Developer API keys (tzm_live_xxx) |
| usage_logs | Per-call usage tracking |
| razorpay_orders | Payment orders |
| appointments | Callbacks/demos/follow-ups |
| wallets | Prepaid balance per client |
| billing_settings | Spend caps + auto-recharge |
| invoices | Generated invoices |

(Full column details in the codebase `backend/database.py`.)

---

## 9. AI + VOICE ENGINE

- **AI Brain:** Groq LLaMA 3.1 8B Instant (real-time), 3.3 70B (analysis)
- **STT:** Whisper local (Telugu/Hindi/English + more), free
- **TTS:** Edge TTS Indian neural voices (Shruti/Swara/Neerja etc.), +20% pace
- **Orchestrator:** session state, dynamic language switching, emotion/intent detection, topic tracking, latency logging
- **Lead scoring:** 8-10 Hot, 5-7 Warm, 1-4 Cold
- **Call intelligence (per call):** sentiment, score, category, summary, intent, emotion, buying_signals, objections, recommended_action, follow_up_urgency, key_topics
- **Auto-transfer:** score ≥ 7 or intent "interested" → transfer to human agent

---

## 10. DATABASE CONNECTION (SUPABASE)

**Status: FIXED (Sep 01).** The DB was failing with `tenant/user not found`.

**Root cause:** two wrong values in `backend/.env`:
1. Wrong region — was `aws-0-ap-south-1` (Mumbai), correct is `aws-0-ap-northeast-1` (Tokyo)
2. Old password

**Fix:** updated `DATABASE_URL` to the correct **Session Pooler** connection (IPv4, port 5432, ap-northeast-1, current password).

**Verified working:** PostgreSQL 17.6 connects, `init_db()` runs, 8 clients present, full FastAPI app boots with status "running".

**Pooler note:**
- Session Pooler (port 5432) = IPv4, persistent connections — best for this long-running FastAPI server. **In use.**
- Transaction Pooler (port 6543) = IPv4, serverless/short-lived.
- Direct (`db.xxx.supabase.co`) = IPv6-only (needs paid IPv4 add-on).

---

## 11. ENVIRONMENT VARIABLES

`backend/.env` keys:
- `GROQ_API_KEY` (required — AI)
- `DATABASE_URL` (Supabase session pooler)
- `EXOTEL_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, `EXOTEL_CALLER_ID`, `HUMAN_AGENT_NUMBER` (real calls)
- `SERVER_PUBLIC_URL` (ngrok/domain for webhooks)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (payments)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (intl payments)
- `SMTP_HOST/PORT/USER/PASSWORD/FROM_NAME/FROM_EMAIL` (email)
- `FIREBASE_PROJECT_ID` (Google login)
- `WHISPER_MODEL` (STT model size, default "small")
- `ADMIN_KEY` (super admin, default superadmin123)

---

## 12. HOW TO RUN

**Backend** (Terminal 1):
```powershell
cd "c:\Users\danie\Desktop\AI- VOICE-ENGINE\backend"
python main.py
```
→ http://localhost:8000 (docs at /docs)

**Frontend** (Terminal 2):
```powershell
cd "c:\Users\danie\Desktop\AI- VOICE-ENGINE\data\frontend\dashboard"
npm run dev
```
→ http://localhost:5173

**Login:** suresh@tzmicha.com / Tzmicha@123 (pro plan with data)

---

## 13. QA TEST CHECKLIST

### Theme (test EVERY page in both light + dark)
Toggle the sun/moon icon and verify each page reads clearly:

| Page | Light mode | Dark mode |
|------|-----------|-----------|
| Overview (/home) | ☐ | ☐ |
| Sales Monitor (/monitor) | ☐ | ☐ |
| Assistants (/assistants) | ☐ | ☐ |
| Leads (/leads) | ☐ | ☐ |
| Voice Lab (/voice) | ☐ | ☐ |
| Simulator (/simulator) | ☐ | ☐ |
| Activity (/activity) | ☐ | ☐ |
| Campaigns (/campaigns) | ☐ | ☐ |
| Team (/team) | ☐ | ☐ |
| Knowledge (/knowledge) | ☐ | ☐ |
| Billing (/billing) | ☐ | ☐ |
| Integrations (/integrations) | ☐ | ☐ |
| API Keys (/api) | ☐ | ☐ |
| Admin (/admin) | ☐ | ☐ |
| Settings (/settings) | ☐ | ☐ |
| Profile (/profile) | ☐ | ☐ |
| WhatsApp (/whatsapp) | ☐ | ☐ |
| SMS (/sms) | ☐ | ☐ |
| Super Admin (all sections) | ☐ | ☐ |

### URL Routing
- ☐ Clicking each nav item updates the URL to its clean slug
- ☐ Browser back/forward works
- ☐ `/` redirects to `/home`
- ☐ Bookmarking `/monitor` and refreshing works (dev)

### Core Flows
- ☐ Register → login → logout
- ☐ Google login
- ☐ Add lead → start simulator → chat → end → see analysis
- ☐ Create AI employee → live test
- ☐ Sales Monitor shows real call data
- ☐ Generate API key → copy → revoke
- ☐ Billing: wallet balance, add money, switch plan
- ☐ Super admin: view clients, change plan, stats

---

## 14. KNOWN ISSUES & PENDING

### Pending (external keys — placeholders in .env)
| Item | Needs |
|------|-------|
| Live payments | Real RAZORPAY_KEY_ID/SECRET |
| Email notifications | Real SMTP_USER/PASSWORD (Brevo) |
| Real phone calls | SERVER_PUBLIC_URL (ngrok) + Exotel passthrough config |
| razorpay package | `pip install razorpay` on local machine (installed on server) |

### Technical recommendations
- Replace SHA-256 password hashing with bcrypt
- Use JWT instead of raw client_id header
- Add rate limiting
- Restrict CORS to frontend domain in production
- Move password reset codes to DB/Redis (currently in-memory)
- Rotate all API keys exposed in docs
- Ensure nginx SPA fallback for clean URL routing in production

### Future scope
- Real human-agent call monitoring = separate **mobile app** (reads phone call logs) — not part of the web engine
- Call Flows, Web Dialer, Live Calls, Incoming Bot, Website Widget, Workflows (placeholders)
- Redis session store, Backblaze B2 recording storage

---

*Application/technical documentation. For work progress & daily logs, see DAILY_PROGRESS.md.*
