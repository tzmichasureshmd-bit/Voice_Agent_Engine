# 🚀 AI Call Filtration + Lead Generation System

AI-powered outbound calling system that talks like a human, qualifies leads, and categorizes them as Hot/Warm/Cold.

## 🎯 Features

- ✅ AI Voice Agent (talks like real human)
- ✅ Real-time conversation with leads
- ✅ Sentiment Analysis (positive/negative/neutral)
- ✅ Lead Scoring (1-10)
- ✅ Lead Categorization (Hot 🔥 / Warm 🌤️ / Cold ❄️)
- ✅ Call Simulator (test without real phone)
- ✅ REST API (FastAPI)
- ✅ Campaign Management
- ✅ Dashboard Stats

## 📁 Project Structure

```
AI-CALLING-FLOW/
├── backend/
│   ├── main.py              → FastAPI server (all APIs)
│   ├── ai_agent.py          → AI brain (Groq + LLaMA 3)
│   ├── speech_to_text.py    → STT (Whisper - free)
│   ├── text_to_speech.py    → TTS (pyttsx3 - free)
│   ├── lead_scorer.py       → Lead scoring logic
│   ├── call_simulator.py    → Terminal-based call demo
│   ├── database.py          → SQLite database models
│   ├── config.py            → Configuration
│   ├── .env                 → API keys (secret)
│   └── requirements.txt     → Python dependencies
├── frontend/                → React dashboard (coming soon)
├── data/
│   └── leads.csv            → Sample leads data
└── README.md
```

## 🛠️ Setup Instructions

### Step 1: Get FREE Groq API Key
1. Go to https://console.groq.com
2. Sign up (FREE)
3. Create an API key
4. Paste it in `backend/.env` file

### Step 2: Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 3: Run the API Server
```bash
cd backend
python main.py
```
Server starts at: http://localhost:8000
API Docs at: http://localhost:8000/docs

### Step 4: Run Call Simulator (Terminal Demo)
```bash
cd backend
python call_simulator.py
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Home / Health check |
| GET | `/docs` | Swagger API documentation |
| POST | `/leads` | Add a new lead |
| GET | `/leads` | Get all leads |
| GET | `/leads/{id}` | Get specific lead |
| GET | `/leads/category/{hot/warm/cold}` | Filter leads by category |
| POST | `/call/start` | Start AI call with a lead |
| POST | `/call/respond` | Send message, get AI reply |
| POST | `/call/end` | End call, get analysis |
| GET | `/calls` | Get all call logs |
| POST | `/campaigns` | Create campaign |
| GET | `/campaigns` | Get all campaigns |
| GET | `/dashboard/stats` | Get dashboard statistics |

## 💰 Cost


- Development: ₹0 (FREE)
- Running (Demo): ₹0 (FREE - Groq free tier)
- Running (Production): ₹6,500-₹18,000/month

## 🔄 Upgrade Path

| Current (Free) | Upgrade To | When |
|----------------|-----------|------|
| Groq (free LLM) | Amazon Bedrock / GPT-4 | When need better quality |
| pyttsx3 (robotic) | ElevenLabs / Amazon Polly | When need human voice |
| Whisper (local) | Amazon Transcribe / Deepgram | When need real-time STT |
| Call Simulator | Twilio / Amazon Connect | When making real calls |
| SQLite | PostgreSQL | When scaling up |

## 🚀 Next Steps

1. Get Groq API key and test the demo
2. Add React frontend dashboard
3. Integrate real telephony (Twilio/Exotel)
4. Deploy to cloud (AWS/Oracle free tier)
