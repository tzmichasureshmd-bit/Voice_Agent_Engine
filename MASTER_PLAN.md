# TZMICHA AI CALLING PLATFORM — MASTER PLAN

---

## DECISION LOCKED

```
PHASE 1 — RIGHT NOW
→ Complete Third Party Stack (Stack A)
→ Finish the app
→ Deploy live on voice.tzmicha.com
→ Get clients
→ Make money

PHASE 2 — LATER (Month 2-3)
→ Build TZMICHA-ENGINE (Stack B)
→ Own Whisper + LLaMA + XTTS
→ Replace third party
→ Save ₹20,000+/month
```

---

## PHASE 1 — THIRD PARTY STACK (Stack A)

### Tech Stack
```
Telephony  →  Plivo / Exotel
STT        →  Deepgram Nova 2
LLM        →  Groq + LLaMA 3 (FREE)
TTS        →  Sarvam AI (Telugu/Hindi)
           →  ElevenLabs (English)
DB         →  SQLite → Supabase
Auth       →  Firebase (Google + Email)
Frontend   →  React + Vite
Backend    →  FastAPI
Deploy     →  Hostinger KNM2 + Docker
Payments   →  Razorpay
```

### Cost Per Call
```
Plivo/Exotel (2 min)  →  ₹1.80
Deepgram STT          →  ₹0.12
Groq LLM              →  ₹0.00 (free)
Sarvam TTS            →  ₹0.08
ElevenLabs TTS        →  ₹0.50
──────────────────────────────
Total per call        →  ₹2.50
```

### Monthly Cost
| Calls/Day | API Cost | Server | Total |
|---|---|---|---|
| 100 | ₹7,500 | ₹2,000 | ₹9,500 |
| 500 | ₹37,500 | ₹2,000 | ₹39,500 |
| 1000 | ₹75,000 | ₹2,000 | ₹77,000 |
| 5000 | ₹3,75,000 | ₹4,000 | ₹3,79,000 |

### Pending Work to Complete
```
1. Deploy on KNM2 (manual pull)
2. Fix AI Employee Test Call button
3. Save AI Employees to DB (not localStorage)
4. Campaign bulk run feature
5. Knowledge Base page (RAG + Qdrant)
6. Billing page (Razorpay)
7. Auto deploy (GitHub Actions)
8. Forgot password flow
9. Notifications system
10. WhatsApp follow-up after call
```

### Timeline
```
Week 1  →  Deploy + fix blockers
Week 2  →  Knowledge Base + Campaigns
Week 3  →  Billing + Notifications
Week 4  →  Testing + first clients
```

---

## PHASE 2 — OWN ENGINE (Stack B)

> Build after Phase 1 is live and earning

### TZMICHA-ENGINE Stack
```
Telephony  →  Plivo WebSocket
STT        →  Whisper Large v3 (own)
VAD        →  Silero VAD (listen fully)
LLM        →  LLaMA 3 8B Q4 (own)
TTS        →  XTTS v2 (own + voice clone)
Lang       →  Auto detect Telugu/Hindi/English
DB         →  PostgreSQL (own)
Auth       →  Own JWT
Server     →  RTX 3050 Laptop + KNM2
```

### Cost Per Call (Own Model)
```
Plivo (2 min)   →  ₹1.80
Whisper STT     →  ₹0.00 (own)
LLaMA 3 LLM     →  ₹0.00 (own)
XTTS v2 TTS     →  ₹0.00 (own)
──────────────────────────────
Total per call  →  ₹1.80 ONLY
```

### Monthly Cost (Own Model)
| Calls/Day | Plivo | Server | Total |
|---|---|---|---|
| 100 | ₹5,400 | ₹2,800 | ₹8,200 |
| 500 | ₹27,000 | ₹2,800 | ₹29,800 |
| 1000 | ₹54,000 | ₹2,800 | ₹56,800 |
| 5000 | ₹2,70,000 | ₹8,000 | ₹2,78,000 |

### Hardware Requirements
```
Laptop (RTX 3050 4GB + 16GB RAM + 512 SSD)
├── Whisper Large v3  →  3GB VRAM  ✅
├── XTTS v2           →  2GB VRAM  ✅ (shared)
├── LLaMA 3 8B Q4     →  8GB RAM   ✅
└── Silero VAD        →  0.1GB     ✅

KNM2 VPS (8GB RAM + 100GB SSD)
├── Frontend (React)  ✅
├── Backend (FastAPI) ✅
└── Database          ✅
```

### Software to Install
```
NVIDIA CUDA Toolkit 12.1
cuDNN 8.9
Python 3.11
FFmpeg
Ollama
Git
Cloudflare Tunnel

Python packages:
- torch (CUDA)
- openai-whisper
- TTS (coqui XTTS v2)
- silero-vad
- ollama
- fastapi
- uvicorn
- websockets
- pyaudio
- pydub
```

### Models to Download
```
Whisper Large v3   →  3GB   (STT)
LLaMA 3 8B Q4      →  4.7GB (LLM)
XTTS v2            →  2GB   (TTS)
Silero VAD         →  0.1GB (VAD)
Total              →  ~10GB
```

### Call Flow
```
Customer speaks
      ↓
Silero VAD records
      ↓ (1.5 sec silence = done)
Whisper STT → text (0.3 sec)
      ↓
Language detect (Telugu/Hindi/English)
      ↓
LLaMA 3 → response (1.5 sec)
      ↓
XTTS v2 → audio (0.5 sec)
      ↓
Customer hears reply
Total delay: 2.3 sec ✅
```

### Build Timeline
```
Week 1  →  Whisper STT + VAD
Week 2  →  LLaMA 3 LLM
Week 3  →  XTTS v2 + voice cloning
Week 4  →  Integration + Plivo + live
Total   →  28 days
Cost    →  ₹0 to build
```

### GitHub Repos
```
Repo 1: github.com/tzmichasureshmd-bit/AI_OS
        → Current app (Stack A)

Repo 2: github.com/tzmichasureshmd-bit/TZMICHA-ENGINE
        → Own model (Stack B) — create later
```

---

## COST COMPARISON — STACK A vs STACK B

| | Third Party | Own Model |
|---|---|---|
| Build time | 0 (ready) | 28 days |
| Build cost | ₹0 | ₹0 |
| Per call | ₹2.50 | ₹1.80 |
| Monthly fixed | ₹2,000 | ₹2,800 |
| 1000 calls/day | ₹77,000 | ₹56,800 |
| Telugu | ✅ | ✅ |
| Hindi | ✅ | ✅ |
| English | ✅ | ✅ |
| Voice clone | ❌ | ✅ |
| Data privacy | ❌ | ✅ 100% |
| Control | ❌ | ✅ 100% |

---

## PROFIT PROJECTIONS

### Using Own Model (Phase 2)
| Clients | Revenue | Cost | Profit |
|---|---|---|---|
| 5 | ₹25,000 | ₹11,800 | ₹13,200 |
| 10 | ₹75,000 | ₹38,800 | ₹36,200 |
| 20 | ₹1,50,000 | ₹74,800 | ₹75,200 |
| 50 | ₹3,75,000 | ₹1,82,800 | ₹1,92,200 |

---

## CLIENT PRICING PLANS

| Plan | Calls/Month | Price | Your Cost | Profit |
|---|---|---|---|---|
| Starter | 500 | ₹5,000 | ₹900 | ₹4,100 |
| Growth | 2,000 | ₹15,000 | ₹3,600 | ₹11,400 |
| Pro | 5,000 | ₹30,000 | ₹9,000 | ₹21,000 |
| Enterprise | 15,000 | ₹75,000 | ₹27,000 | ₹48,000 |

---

## SWITCH TRIGGER

```
When to switch Stack A → Stack B:

Calls/day > 430     →  Own model cheaper
Clients > 10        →  Build own model
Revenue > ₹75,000   →  Worth the 28 days
```

---

## NOTES

```
- Exotel/Plivo phone cost NEVER goes zero
- Groq LLM is FREE — keep it even in own model
- RTX 3050 handles 3-5 simultaneous calls
- For 6+ simultaneous → upgrade GPU VPS
- Cloudflare tunnel = free laptop → internet
- This document = reference for all future decisions
```

---

*Last updated: 2025*
*Status: Phase 1 in progress*
