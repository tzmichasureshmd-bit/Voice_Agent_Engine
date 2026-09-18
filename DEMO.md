# 🚀 TZMICHA AI Voice Agent — Live Demo

> AI that calls your leads, talks like a human, and scores them automatically.

---

## 🎯 What It Does

```
Customer gets a call
       ↓
AI talks naturally (Telugu / Hindi / English)
       ↓
AI detects interest level in real-time
       ↓
Lead scored: Hot 🔥 / Warm 🌤️ / Cold ❄️
       ↓
Report saved. Zero human effort.
```

---

## 🌐 Language Demo — Sample Conversations

### Telugu 🇮🇳 (Tenglish)
```
🤖 AI  : హాయ్! నేను ప్రియ ని, TZMICHA Technologies నుండి call చేస్తున్నాను.
👤 Lead: Bagundi, cheppandi enti vishayam?
🤖 AI  : మీ business కోసం AI CRM software గురించి చెప్పాలని ఉంది.
         Sales 40% వరకు increase అవుతుంది!
👤 Lead: Fee entha undi?
🤖 AI  : Fee అంటే yearly ₹1,20,000 ఉంటుంది. Demo చూస్తారా?

📊 Result → 🔥 HOT  |  Score: 9/10
```

### Hindi 🇮🇳 (Hinglish)
```
🤖 AI  : Namaste! Main Priya bol rahi hoon, TZMICHA Technologies se.
👤 Lead: Theek hoon. Kya baat karni thi?
🤖 AI  : Aapke business ke liye AI CRM software ke baare mein baat karni thi.
         Sales 40% tak badh sakti hai!
👤 Lead: Kitna paisa lagega?
🤖 AI  : Yearly ₹1,20,000 hai. Ek free demo dekhna chahenge?

📊 Result → 🌤️ WARM  |  Score: 6/10
```

### Indian English 🇮🇳
```
🤖 AI  : Hey! This is Priya from TZMICHA Technologies. How are you doing?
👤 Lead: I'm good. What's this about?
🤖 AI  : We have an AI-powered CRM that can boost your sales by 40%.
         Takes 5 minutes to show you!
👤 Lead: What's the cost?
🤖 AI  : It's ₹1,20,000 per year. Want a free demo first?

📊 Result → 🔥 HOT  |  Score: 10/10
```

### Kannada 🇮🇳 (Kanglish)
```
🤖 AI  : Namaskara! Nanu Priya, TZMICHA Technologies ninda call madtidini.
👤 Lead: Chennagide. Enu vishaya?
🤖 AI  : Nimma business ge AI CRM software bagge helbekittu.
         Sales 40% varegu jaasthi aaguttade!
👤 Lead: Bele eshtu?
🤖 AI  : Yearly ₹1,20,000 ide. Free demo nodtira?

📊 Result → 🌤️ WARM  |  Score: 6/10
```

---

## 🔄 Auto Language Detection

The AI **automatically detects** what language the customer speaks — no setup needed.

| Customer says...              | AI switches to... |
|-------------------------------|-------------------|
| `"Bagundi, cheppandi"`        | Telugu 🇮🇳         |
| `"Haan, theek hai"`           | Hindi 🇮🇳           |
| `"Yes, tell me more"`         | English 🇮🇳         |
| `"Howdu, heli"`               | Kannada 🇮🇳         |
| Telugu script: `"ఎంత ఉంటుంది?"` | Telugu 🇮🇳         |

Customer can **switch language mid-call** — AI follows instantly.

---

## 📊 Lead Scoring System

| Category | Score | Meaning                        | Action              |
|----------|-------|--------------------------------|---------------------|
| 🔥 HOT   | 8–10  | Asked price, wants demo        | Call back today     |
| 🌤️ WARM  | 4–7   | Interested, needs follow-up    | Follow up in 2 days |
| ❄️ COLD  | 0–3   | Not interested / hung up       | Archive             |

---

## 💰 Cost Per Call

| Component     | Provider          | Cost     |
|---------------|-------------------|----------|
| Phone call    | Exotel / Plivo    | ₹1.80    |
| AI brain      | Groq LLaMA 3      | ₹0.00 ✅ |
| Voice (TTS)   | Edge TTS          | ₹0.00 ✅ |
| Speech (STT)  | Whisper (local)   | ₹0.00 ✅ |
| **Total**     |                   | **₹1.80**|

---

## 📦 Client Plans

| Plan       | Calls/Month | Price      | Your Profit |
|------------|-------------|------------|-------------|
| Starter    | 500         | ₹5,000     | ₹4,100      |
| Growth     | 2,000       | ₹15,000    | ₹11,400     |
| Pro        | 5,000       | ₹30,000    | ₹21,000     |
| Enterprise | 15,000      | ₹75,000    | ₹48,000     |

---

## 🛠️ Run the Demo Yourself

```bash
# Language showcase (no API key needed)
python -X utf8 demo_languages.py

# Real AI call simulator (needs Groq API key)
cd backend
python call_simulator.py
```

---

## 🔌 API Endpoints

```
POST /call/start       → Start AI call with a lead
POST /call/respond     → Send message, get AI reply
POST /call/end         → End call, get full analysis
GET  /leads            → All leads with scores
GET  /dashboard/stats  → Live stats
GET  /docs             → Swagger UI
```

---

## 🚀 Tech Stack

```
LLM        →  Groq + LLaMA 3 (free, sub-second)
TTS        →  Microsoft Edge Neural Voices (free)
STT        →  OpenAI Whisper (local, free)
Languages  →  Telugu / Hindi / English / Kannada / British
Backend    →  FastAPI + Python
Database   →  SQLite → PostgreSQL (production)
Deploy     →  Docker + Hostinger VPS
```

---

*Built by TZMICHA IT Solutions — Dream. Build. Automate. Grow.*
*Live: https://voice.tzmicha.com*
