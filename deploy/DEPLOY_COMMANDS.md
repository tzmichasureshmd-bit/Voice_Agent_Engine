# DEPLOYMENT COMMANDS — voice.tzmicha.com
# Paste these in Hostinger Terminal one by one

---

## STEP 1: Create project directory
```bash
mkdir -p /opt/voice-ai && cd /opt/voice-ai
```

## STEP 2: Clone your code (or upload)
```bash
git clone https://github.com/tzmichasureshmd-bit/Voice_Agent_Engine.git . || echo "Already exists"
```

If git clone doesn't work (private repo), use this instead:
```bash
# We'll upload via Hostinger File Manager instead
```

## STEP 3: Create .env file
```bash
cat > /opt/voice-ai/deploy/.env << 'EOF'
GROQ_API_KEY=your_groq_key_here
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
SERVER_PUBLIC_URL=https://voice.tzmicha.com
EOF
```

## STEP 4: Build and start containers
```bash
cd /opt/voice-ai/deploy
docker compose -f docker-compose.prod.yml up -d --build
```

## STEP 5: Check they're running
```bash
docker ps
```

## STEP 6: Test backend
```bash
curl http://localhost:8000/
```

Should show: {"message":"AI Caller SaaS Platform","version":"2.0","status":"running"}

## STEP 7: Point domain voice.tzmicha.com → VPS IP
In Hostinger DNS Manager:
- Add A record: voice → YOUR_VPS_IP

## STEP 8: Setup SSL with Traefik (already running on your VPS)
Since you have Traefik running, add labels to docker-compose or configure in Traefik.

---

## QUICK CHECK:
- Backend: https://voice.tzmicha.com/api/ 
- Frontend: https://voice.tzmicha.com
- API Docs: https://voice.tzmicha.com/docs
