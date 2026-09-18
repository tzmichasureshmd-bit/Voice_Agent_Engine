# TZMICHA AI Voice Engine — Team Guide

---

## 📌 Why This Document Exists & What It's For

**Who should read this:** Everyone on the team — developers, testers, marketing, sales, designers, new joiners.

**Why it exists:** When someone new joins, they shouldn't have to ask 10 questions just to understand what we built and what their job is. This is the starting point for everyone. Read this first, then go to the document that matches your role.

**What it covers:** What we built, who does what, which document to read for your role, current product status, full QA test checklist, and how we work together as a team.

**When to read it:** First day on the team. When someone new joins and you need to onboard them quickly.

---

## What We Built

TZMICHA AI Voice Engine is an AI-powered calling platform built for Indian businesses. It makes outbound and inbound phone calls automatically, speaks in Telugu, Hindi, Kannada, and English, qualifies leads, and tells the business which leads are worth following up on.

Think of it like this: a real estate company gets 200 leads a day from property portals. They can't call all of them. Our AI calls every single one within 60 seconds, has a real conversation in Telugu or Hindi, figures out who's serious, and scores them Hot, Warm, or Cold. The sales team only talks to the Hot leads. Everyone else gets followed up automatically.

That's the product. It's live. It works. We're adding real payments and real phone calls, and then we go to market.

---

## The Team — Who Does What

| Role | Responsibility |
|---|---|
| Founder / Product Owner | Vision, priorities, customer conversations, final decisions |
| Backend Developer | `backend/` folder — FastAPI, database, AI, TTS, STT, billing, real calls |
| Frontend Developer | `data/frontend/dashboard/src/` — React UI, all components, styling |
| QA / Tester | Tests every feature before it reaches customers, reports bugs clearly |
| Marketing / Sales | Demos, outreach, objection handling, converting trials to paid |
| DevOps | Deployment, server, domain, SSL, CI/CD |

---

## Documents — Which One Is For You

We have five documents. Here's exactly which one you need.

---

### 📄 README.md
**For:** Everyone, especially new joiners and external people seeing the project for the first time.

**Why it exists:** The first thing anyone reads. Gives a quick overview of what the product is, how to set it up locally, and the basic API endpoints. If someone asks "what is this project?" — send them this.

**Read it when:** You join the team. You want to run the app for the first time. You're sharing the project with someone new.

---

### 📄 DOCUMENTATION.md
**For:** Developers, testers, DevOps.

**Why it exists:** Every technical detail about how the system works — architecture diagrams, all backend modules explained, all frontend components, full API reference, voice engine internals, authentication flow, deployment steps, and a log of every bug we've fixed and why. If you're building something new or debugging something broken, this is where you look first.

**Read it when:** Setting up the project. Debugging an issue. Building a new feature. Deploying to production.

---

### 📄 MARKET_PLAN.md
**For:** Marketing team, sales team, founder.

**Why it exists:** The complete go-to-market strategy. Pricing, target industries, where to find clients, exact sales scripts, objection handling, revenue projections, and the roadmap for future features. Marketing doesn't need to understand the code — they need to understand the customer's pain and how our product solves it.

**Read it when:** Before any sales call or demo. When planning outreach. When deciding which industry to target. When someone asks "how much does it cost?"

---

### 📄 TEAM.md (this document)
**For:** Everyone, on day one.

**Why it exists:** So new team members can get up to speed without asking 10 questions. One document that tells you everything you need to know to start contributing.

**Read it when:** First day on the team. When someone new joins and you need to onboard them quickly.

---

## Current Product Status

### ✅ Fully Working — Ready to Show Customers
- AI Voice Engine — 5 languages, 10 voices (male + female per language)
- Auto Mix — detects language per sentence, switches voice with zero gaps
- Lead management — add, score, filter Hot/Warm/Cold
- Call Simulator — full AI conversation demo without a real phone
- AI Employees — configurable agents with custom scripts, goals, languages
- Campaigns — bulk calling with lead assignment
- Analytics and Sales Monitor with real charts
- Team management with role-based permissions
- Knowledge Base, Appointments, WhatsApp summaries
- Super Admin panel — all clients, all calls, all revenue
- Full billing UI with plan cards and usage tracking
- API key system for developer access
- Dark and light theme
- Complete technical documentation
- Complete market plan

### 🔧 Being Added Right Now (1 day of work)
- Razorpay real payments — UI and backend ready, just need live keys
- Twilio real phone calls — backend webhook code exists, just need account setup

### 📋 Planned After First Revenue
- Live call monitoring
- SMS sending (MSG91)
- Slack notifications for hot leads
- Google Sheets export
- Web dialer (call from browser)
- Call recording and playback
- Website widget
- Call flows visual builder
- Mobile app (iOS + Android)
- White label

---

## QA Test Checklist

Go through this before every release. If anything fails, report it before the build goes live.

### Authentication
- [ ] Register new account with email + password
- [ ] Login with that account
- [ ] Login with Google OAuth
- [ ] Login with wrong password — error shown, no crash
- [ ] Super Admin login with key `superadmin123`
- [ ] Logout — clears session, redirects to login

### Dashboard
- [ ] Stats cards load correctly
- [ ] Charts show data when calls exist
- [ ] Charts show empty state when no calls yet
- [ ] Time period filter (7d / 14d / 30d) works

### Leads
- [ ] Add a lead manually
- [ ] Upload leads via CSV
- [ ] Filter by Hot / Warm / Cold
- [ ] Search by name

### Call Simulator
- [ ] Start a call with a lead
- [ ] Send a message, get AI reply
- [ ] End call, see analysis (score, sentiment, summary)
- [ ] Call log appears in Activity after ending

### Voice Lab — TTS (test all 10 combinations)
- [ ] Telugu Female
- [ ] Telugu Male
- [ ] Hindi Female
- [ ] Hindi Male
- [ ] Indian English Female
- [ ] Indian English Male
- [ ] British English Female
- [ ] British English Male
- [ ] Kannada Female
- [ ] Kannada Male
- [ ] Auto Mix with Telugu + English text
- [ ] Auto Mix with Hindi + English text
- [ ] Pace slider changes speed live during playback
- [ ] Stop button stops playback immediately
- [ ] Download button downloads correct gender audio
- [ ] Switch Female → Male → generate → verify male voice used (not cached female)
- [ ] Text over 490 chars plays without gaps between chunks
- [ ] Fix Grammar button works
- [ ] Humanize button works

### Voice Lab — STT
- [ ] Record audio → transcription appears
- [ ] Send to TTS button switches tab with transcript

### Voice Lab — Live Agent
- [ ] Start a session
- [ ] Speak → AI responds
- [ ] Emotion and intent display updates
- [ ] Latency metrics show
- [ ] End call stops session

### AI Employees
- [ ] Create a new AI employee
- [ ] Edit name, script, language, gender
- [ ] Delete an employee

### Campaigns
- [ ] Create a campaign
- [ ] Assign leads
- [ ] Run campaign

### Settings
- [ ] Change a setting and save
- [ ] Refresh page — settings still there (saved to backend, not just localStorage)
- [ ] Groq model dropdown shows current working models

### Analytics
- [ ] Page loads with charts
- [ ] 14-day trend chart shows data
- [ ] Sentiment pie chart shows data
- [ ] Lead pipeline chart shows data

### Team Management
- [ ] Add a team member with specific permissions
- [ ] Login as that member — can only see allowed pages
- [ ] Deactivate member — cannot login

### Super Admin
- [ ] Login with admin key
- [ ] See all clients
- [ ] Change a client's plan
- [ ] See all calls across all clients
- [ ] See revenue stats

### Billing
- [ ] Page loads with plan cards
- [ ] Current plan highlighted
- [ ] Usage meter shows correct numbers
- [ ] Wallet balance loads

---

## How We Work Together

**Reporting bugs:** Be specific. What page. What you did. What you expected. What actually happened. Screenshot if possible. "The voice lab is broken" is not a bug report. "Voice Lab → Telugu Male → Speak → audio plays in female voice" is a bug report.

**New features:** All requests go to the founder first. We build what customers ask for, not what sounds cool. If a client asks for something three times, it goes into the next sprint.

**Deployments:** Backend changes need a server restart. Frontend hot-reloads in development. In production, frontend needs `npm run build` then redeploy.

**Secrets:** Never commit `.env` files. Never share API keys in chat messages. If you accidentally commit a key, rotate it immediately.

**Getting unblocked:** If you're stuck for more than 30 minutes, ask. Don't sit stuck. Someone on the team has probably hit the same issue before.

---

## Quick Access

| What | Where |
|---|---|
| Run the app | `START.bat` |
| Backend API docs | http://localhost:8000/docs |
| Frontend | http://localhost:5173 |
| Test login | `danievens78@gmail.com` |
| Super Admin key | `superadmin123` |
| Technical docs | `DOCUMENTATION.md` |
| Market plan | `MARKET_PLAN.md` |
| Quick start | `README.md` |

---

*TZMICHA AI Voice Engine*
*If you're reading this on your first day — welcome. The product is built. Now we go sell it.*
