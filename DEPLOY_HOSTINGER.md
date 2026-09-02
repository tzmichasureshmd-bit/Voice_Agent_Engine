# 🚀 DEPLOY TO HOSTINGER — Step by Step

## Your Setup
- Hostinger VPS with Docker Manager
- voice-backend container (port 8000)
- voice-frontend container (port 80)

---

## STEP 1 — Push code to GitHub

On your PC, open terminal in the project folder:

```bash
git add .
git commit -m "production build - orchestrator + new agent"
git push origin main
```

---

## STEP 2 — SSH into Hostinger VPS

In Hostinger → OS & Panel → Terminal  (or use SSH)

```bash
ssh root@YOUR_VPS_IP
```

---

## STEP 3 — Pull latest code on VPS

```bash
cd /opt/voice-ai          # or wherever your project lives on VPS
git pull origin main
```

If first time:
```bash
mkdir -p /opt/voice-ai
cd /opt/voice-ai
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

---

## STEP 4 — Create .env file on VPS

```bash
nano /opt/voice-ai/.env
```

Paste this (fill in your OWN values — never commit real keys):
```
GROQ_API_KEY=your_groq_key_here
SARVAM_API_KEY=your_sarvam_key_here
DEEPGRAM_API_KEY=your_deepgram_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
EXOTEL_SID=your_exotel_sid
EXOTEL_CALLER_ID=your_caller_id
FIREBASE_PROJECT_ID=your_firebase_project_id
DATABASE_URL=postgresql://user:password@host:5432/postgres
SERVER_PUBLIC_URL=https://voice.tzmicha.com
```

Save: Ctrl+X → Y → Enter

---

## STEP 5 — Build & Deploy via Hostinger Docker Manager

### Option A — Via Hostinger UI (easiest)
1. Go to Hostinger → Docker Manager
2. Click your existing app → **.yaml editor**
3. Paste the contents of `docker-compose.yml` from your project
4. Click **Deploy**

### Option B — Via SSH terminal
```bash
cd /opt/voice-ai
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## STEP 6 — Check containers are running

```bash
docker ps
```

You should see:
```
voice-backend    Up    0.0.0.0:8000->8000/tcp
voice-frontend   Up    0.0.0.0:80->80/tcp
```

---

## STEP 7 — Test it

```bash
# Backend health check
curl http://localhost:8000/

# Should return:
# {"message":"AI Caller SaaS Platform","version":"2.0","status":"running"}
```

Open browser: **http://YOUR_VPS_IP** → should see the dashboard

---

## STEP 8 — Point domain (if not done)

In Hostinger → DNS Manager → Add A record:
```
Type: A
Name: voice  (or @ for root)
Value: YOUR_VPS_IP
TTL: 300
```

Wait 5-10 mins → visit **https://voice.tzmicha.com**

---

## LOGS (if something breaks)

```bash
# Backend logs
docker logs voice-backend --tail 50

# Frontend logs  
docker logs voice-frontend --tail 20

# Live logs
docker logs voice-backend -f
```

---

## QUICK REDEPLOY (after code changes)

```bash
cd /opt/voice-ai
git pull
docker compose build --no-cache voice-backend
docker compose up -d
```

Frontend only changed:
```bash
docker compose build --no-cache voice-frontend
docker compose up -d voice-frontend
```

---

## WHAT'S NEW IN THIS DEPLOY
- ✅ Conversation Orchestrator (emotion, intent, language, topic tracking)
- ✅ Chunked TTS (first sentence plays faster)
- ✅ True barge-in (interrupt AI mid-sentence)
- ✅ Latency monitoring per turn
- ✅ Full conversation history (18 turns)
- ✅ Dynamic AI tone based on customer emotion
