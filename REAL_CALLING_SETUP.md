# Real Phone Calling — Setup Guide

## What You Need (5 minutes)

### Step 1: Create Twilio Account
1. Go to → https://www.twilio.com/try-twilio
2. Sign up (email + phone verification)
3. You get **$15 free credit** (~100 test calls)

### Step 2: Get Your Credentials
After signup, go to Twilio Console (https://console.twilio.com):
- **Account SID** → shown on dashboard (starts with AC...)
- **Auth Token** → click "Show" on dashboard
- **Phone Number** → Twilio gives you one free trial number

### Step 3: Install ngrok (exposes localhost to internet)
1. Go to → https://ngrok.com/download
2. Download for Windows
3. Extract and run: `ngrok http 8000`
4. Copy the HTTPS URL it gives you (like https://abc123.ngrok.io)

### Step 4: Give these to Kiro:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
NGROK_URL=https://xxxxx.ngrok.io
MD_PHONE_NUMBER=+91xxxxxxxxxx (number to call)
```

Then AI will call your MD's phone. That's it.
