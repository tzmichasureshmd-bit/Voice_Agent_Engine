import sys
import os
sys.stdout.reconfigure(encoding='utf-8')

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Header, Request
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import hashlib, json, time

from database import init_db, get_db, Client, User, Lead, CallLog, Campaign
try:
    from ai_agent import get_ai_response, analyze_sentiment, generate_opening
except Exception as _ai_err:
    print(f"WARNING: ai_agent load failed: {_ai_err}")
    def get_ai_response(h, p): return "I'll get back to you shortly."
    def analyze_sentiment(h, **kw): return {"sentiment": "neutral", "score": 5, "category": "warm", "summary": ""}
    def generate_opening(n, p, **kw): return f"Hi {n}, how are you today?"
from lead_scorer import score_lead_from_keywords, get_lead_recommendation
try:
    from voice_caller import (
        make_outgoing_call, generate_exoml_answer, generate_exoml_incoming,
        process_speech_turn, generate_plivo_xml,
        active_voice_calls, end_voice_call, get_call_status, request_human_transfer,
        # legacy Plivo compat
        make_outgoing_call as make_plivo_call,
    )
    VOICE_ENABLED = True
except ImportError:
    VOICE_ENABLED = False
    active_voice_calls = {}
from config import HOST, PORT
from billing_routes import router as billing_router
from email_service import send_welcome, send_hot_lead_alert, send_call_summary, send_campaign_complete


@asynccontextmanager
async def lifespan(app):
    try:
        init_db()
    except Exception as e:
        print(f"WARNING: DB init failed: {e} — app will start anyway")
    yield

app = FastAPI(title="AI Caller - SaaS Platform", version="2.0", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(billing_router)


# ===== HELPERS =====

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_current_client(client_id: str = Header(None, alias="x-client-id"), db: Session = Depends(get_db)):
    if not client_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    client = db.query(Client).filter(Client.id == int(client_id)).first()
    if not client:
        raise HTTPException(status_code=401, detail="Invalid client")
    return client


# ===== SCHEMAS =====

class ClientRegister(BaseModel):
    company_name: str
    industry: str
    contact_name: str
    email: str
    phone: str
    password: str
    product_info: str
    ai_name: Optional[str] = "Misha"

class ClientLogin(BaseModel):
    email: str
    password: str

class ClientUpdate(BaseModel):
    product_info: Optional[str] = None
    ai_script: Optional[str] = None
    ai_name: Optional[str] = None
    ai_tone: Optional[str] = None

class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    company: Optional[str] = None

class CallRequest(BaseModel):
    lead_id: int

class ChatMessage(BaseModel):
    message: str

class CampaignCreate(BaseModel):
    name: str
    script: str
    product_info: str


# ===== AUTH ENDPOINTS =====

@app.get("/")
def home():
    return {"message": "AI Caller SaaS Platform", "version": "2.0", "status": "running"}

@app.post("/auth/register")
def register(data: ClientRegister, db: Session = Depends(get_db)):
    existing = db.query(Client).filter(Client.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    client = Client(
        company_name=data.company_name,
        industry=data.industry,
        contact_name=data.contact_name,
        email=data.email,
        phone=data.phone,
        password=hash_password(data.password),
        product_info=data.product_info,
        ai_name=data.ai_name or "Misha"
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    # Send welcome email
    try: send_welcome(client.email, client.contact_name, client.company_name)
    except: pass
    return {"message": "Registration successful", "client_id": client.id, "company": client.company_name}

# Firebase Admin init (once) — optional, skip if key file missing
try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth
    if not firebase_admin._apps:
        _sa_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        if os.path.exists(_sa_path):
            firebase_admin.initialize_app(credentials.Certificate(_sa_path))
            print("[Firebase] Initialized OK — Google login enabled")
        else:
            print(f"WARNING: serviceAccountKey.json not found at {_sa_path} — Google login disabled")
    else:
        print("[Firebase] Already initialized")
except Exception as e:
    print(f"WARNING: Firebase init failed: {e} — Google login disabled")

class GoogleAuthRequest(BaseModel):
    id_token: str

@app.post("/auth/google")
def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        import firebase_admin
        from firebase_admin import auth as firebase_auth
        if not firebase_admin._apps:
            raise HTTPException(status_code=503, detail="Google login not configured on this server")
        decoded = firebase_auth.verify_id_token(data.id_token)
        email = decoded.get("email", "")
        name  = decoded.get("name", "") or email.split("@")[0]
        if not email:
            raise HTTPException(status_code=400, detail="No email from Google")
    except Exception as e:
        err_msg = str(e)
        print(f"[Google Auth] Token verify failed: {err_msg}")
        if not firebase_admin._apps:
            raise HTTPException(status_code=503, detail="Google login not configured — serviceAccountKey.json missing on server")
        if "app_not_found" in err_msg or "project" in err_msg.lower():
            raise HTTPException(status_code=401, detail="Firebase project mismatch — serviceAccountKey.json must match project 'tzmicha-ai-voice'")
        if "expired" in err_msg.lower():
            raise HTTPException(status_code=401, detail="Google token expired — please try again")
        raise HTTPException(status_code=401, detail=f"Google auth failed: {err_msg[:120]}")
    client = db.query(Client).filter(Client.email == email).first()
    if not client:
        client = Client(
            company_name=name, industry="other", contact_name=name,
            email=email, phone="",
            password=hash_password(email + "google_oauth"),
            product_info="", ai_name="Misha"
        )
        db.add(client)
        db.commit()
        db.refresh(client)
    return {"client_id": client.id, "company_name": client.company_name, "contact_name": client.contact_name, "industry": client.industry, "product_info": client.product_info, "ai_name": client.ai_name}

@app.post("/auth/login")
def login(data: ClientLogin, db: Session = Depends(get_db)):
    try:
        client = db.query(Client).filter(Client.email == data.email, Client.password == hash_password(data.password)).first()
        if not client:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return {"client_id": client.id, "company_name": client.company_name, "contact_name": client.contact_name, "industry": client.industry, "product_info": client.product_info, "ai_name": client.ai_name}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[login] DB error: {e}")
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)[:120]}")

@app.post("/auth/team-login")
def team_login(data: ClientLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email, User.password == hash_password(data.password)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    client = db.query(Client).filter(Client.id == user.client_id).first()
    return {"client_id": user.client_id, "company_name": client.company_name if client else "", "contact_name": user.name, "role": user.role, "permissions": user.permissions, "industry": client.industry if client else "", "product_info": client.product_info if client else ""}

@app.get("/auth/profile")
def get_profile(client: Client = Depends(get_current_client)):
    return {"id": client.id, "company_name": client.company_name, "industry": client.industry, "contact_name": client.contact_name, "email": client.email, "product_info": client.product_info, "ai_name": client.ai_name, "ai_tone": client.ai_tone, "plan": client.plan, "total_calls": client.total_calls}

@app.put("/auth/profile")
def update_profile(data: ClientUpdate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    if data.product_info: client.product_info = data.product_info
    if data.ai_script: client.ai_script = data.ai_script
    if data.ai_name: client.ai_name = data.ai_name
    if data.ai_tone: client.ai_tone = data.ai_tone
    db.commit()
    return {"message": "Profile updated"}


# ===== LEADS (Client-Isolated) =====

@app.post("/leads")
def add_lead(lead: LeadCreate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    new_lead = Lead(client_id=client.id, name=lead.name, phone=lead.phone, email=lead.email, company=lead.company)
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return {"message": f"Lead '{lead.name}' added", "id": new_lead.id}

@app.get("/leads")
def get_leads(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    leads = db.query(Lead).filter(Lead.client_id == client.id).all()
    return {"total": len(leads), "leads": leads}

@app.get("/leads/category/{category}")
def get_leads_by_category(category: str, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    leads = db.query(Lead).filter(Lead.client_id == client.id, Lead.category == category).all()
    return {"category": category, "total": len(leads), "leads": leads}

@app.get("/leads/{lead_id}")
def get_lead(lead_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.client_id == client.id).first()
    if not lead: raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@app.post("/leads/upload-csv")
async def upload_csv(file: UploadFile = File(...), client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    import csv, io
    content = await file.read()
    text = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(text))
    count = 0
    for row in reader:
        lead = Lead(client_id=client.id, name=row.get('name', '').strip(), phone=row.get('phone', '').strip(), email=row.get('email', '').strip() or None, company=row.get('company', '').strip() or None)
        if lead.name and lead.phone:
            db.add(lead)
            count += 1
    db.commit()
    return {"message": f"{count} leads uploaded", "count": count}


# ===== CALL SIMULATOR (Client-Isolated) =====

active_conversations = {}

@app.post("/call/start")
def start_call(request: CallRequest, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    check_call_limit(client, db)  # enforce plan limits
    lead = db.query(Lead).filter(Lead.id == request.lead_id, Lead.client_id == client.id).first()
    if not lead: raise HTTPException(status_code=404, detail="Lead not found")

    product_info = client.product_info or "General product"
    opening = generate_opening(lead.name, product_info, ai_name=client.ai_name or "Misha", company_name=client.company_name or "")

    conversation_id = f"call_{client.id}_{lead.id}_{int(datetime.now().timestamp())}"
    active_conversations[conversation_id] = {
        "client_id": client.id,
        "lead_id": lead.id,
        "lead_name": lead.name,
        "product_info": product_info,
        "history": [{"role": "assistant", "content": opening}],
        "started_at": datetime.now().isoformat()
    }

    lead.status = "called"
    db.commit()
    return {"conversation_id": conversation_id, "ai_message": opening, "lead_name": lead.name}

@app.post("/call/respond")
def respond_to_call(conversation_id: str, msg: ChatMessage, client: Client = Depends(get_current_client)):
    if conversation_id not in active_conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = active_conversations[conversation_id]
    conv["history"].append({"role": "user", "content": msg.message})
    ai_response = get_ai_response(conv["history"], conv["product_info"])
    conv["history"].append({"role": "assistant", "content": ai_response})
    return {"ai_message": ai_response, "turn": len(conv["history"]) // 2}

@app.post("/call/end")
def end_call(conversation_id: str, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    if conversation_id not in active_conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = active_conversations[conversation_id]
    analysis = analyze_sentiment(conv["history"], summary_lang=conv.get("summary_lang", "en"))

    call_log = CallLog(
        client_id=client.id, lead_id=conv["lead_id"], lead_name=conv["lead_name"],
        phone="simulated", duration_seconds=len(conv["history"]) * 15,
        transcript=json.dumps(conv["history"]),
        sentiment=analysis.get("sentiment", "neutral"),
        lead_score=analysis.get("score", 5),
        category=analysis.get("category", "warm"),
        summary=analysis.get("summary", ""),
        call_status="completed",
        intent=analysis.get("intent", ""),
        emotion=analysis.get("emotion", ""),
        buying_signals=json.dumps(analysis.get("buying_signals", [])),
        objections=json.dumps(analysis.get("objections", [])),
        recommended_action=analysis.get("recommended_action", ""),
        follow_up_urgency=analysis.get("follow_up_urgency", "this_week"),
        key_topics=json.dumps(analysis.get("key_topics", [])),
        direction="outbound",
    )
    db.add(call_log)

    lead = db.query(Lead).filter(Lead.id == conv["lead_id"]).first()
    if lead:
        lead.score = analysis.get("score", 5)
        lead.category = analysis.get("category", "warm")
        lead.status = "qualified"
        lead.notes = analysis.get("summary", "")

    client.total_calls += 1
    db.commit()
    del active_conversations[conversation_id]
    # Send email notifications
    try:
        notif_email = os.getenv('SMTP_USER', '')
        if notif_email:
            if analysis.get('category') == 'hot':
                send_hot_lead_alert(notif_email, conv['lead_name'], analysis.get('score',0), analysis.get('summary',''), analysis.get('recommended_action','Follow up immediately'))
            else:
                send_call_summary(notif_email, conv['lead_name'], analysis.get('category','warm'), analysis.get('score',0), analysis.get('summary',''), len(conv['history'])*15)
    except: pass
    return {"status": "call_ended", "analysis": analysis, "recommendation": get_lead_recommendation(analysis.get("category", "cold"))}


# ===== CALL LOGS =====

@app.get("/calls")
def get_calls(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    calls = db.query(CallLog).filter(CallLog.client_id == client.id).order_by(CallLog.created_at.desc()).all()
    result = []
    for c in calls:
        try: buying_signals = json.loads(getattr(c, 'buying_signals', None) or '[]')
        except: buying_signals = []
        try: objections = json.loads(getattr(c, 'objections', None) or '[]')
        except: objections = []
        try: key_topics = json.loads(getattr(c, 'key_topics', None) or '[]')
        except: key_topics = []
        result.append({
            "id": c.id, "lead_id": c.lead_id, "lead_name": c.lead_name,
            "phone": c.phone, "duration_seconds": c.duration_seconds,
            "sentiment": c.sentiment, "lead_score": c.lead_score,
            "category": c.category, "summary": c.summary,
            "call_status": c.call_status, "recording_url": c.recording_url,
            "direction": getattr(c, 'direction', 'outbound') or 'outbound',
            "intent": getattr(c, 'intent', '') or '',
            "emotion": getattr(c, 'emotion', '') or '',
            "buying_signals": buying_signals,
            "objections": objections,
            "recommended_action": getattr(c, 'recommended_action', '') or '',
            "follow_up_urgency": getattr(c, 'follow_up_urgency', 'this_week') or 'this_week',
            "key_topics": key_topics,
            "created_at": str(c.created_at),
        })
    return {"total": len(result), "calls": result}


# ===== CAMPAIGNS =====

@app.post("/campaigns")
def create_campaign(campaign: CampaignCreate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    new_campaign = Campaign(client_id=client.id, name=campaign.name, script=campaign.script, product_info=campaign.product_info)
    db.add(new_campaign)
    db.commit()
    return {"message": f"Campaign '{campaign.name}' created", "id": new_campaign.id}

@app.get("/campaigns")
def get_campaigns(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).filter(Campaign.client_id == client.id).all()
    return {"total": len(campaigns), "campaigns": campaigns}


# ===== DASHBOARD =====

@app.get("/dashboard/stats")
def get_stats(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    total_leads = db.query(Lead).filter(Lead.client_id == client.id).count()
    hot = db.query(Lead).filter(Lead.client_id == client.id, Lead.category == "hot").count()
    warm = db.query(Lead).filter(Lead.client_id == client.id, Lead.category == "warm").count()
    cold = db.query(Lead).filter(Lead.client_id == client.id, Lead.category == "cold").count()
    total_calls = db.query(CallLog).filter(CallLog.client_id == client.id).count()
    return {"total_leads": total_leads, "hot_leads": hot, "warm_leads": warm, "cold_leads": cold, "total_calls": total_calls, "conversion_rate": f"{(hot / max(total_leads, 1)) * 100:.1f}%"}


# ===== EXPORT =====

@app.get("/export/leads")
def export_leads(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    import csv, io
    leads = db.query(Lead).filter(Lead.client_id == client.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Name', 'Phone', 'Email', 'Company', 'Score', 'Category', 'Status'])
    for l in leads:
        writer.writerow([l.name, l.phone, l.email or '', l.company or '', l.score, l.category, l.status])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=leads_export.csv"})

@app.get("/export/calls")
def export_calls(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    import csv, io
    calls = db.query(CallLog).filter(CallLog.client_id == client.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Lead Name', 'Duration(s)', 'Sentiment', 'Score', 'Category', 'Summary'])
    for c in calls:
        writer.writerow([c.lead_name, c.duration_seconds, c.sentiment, c.lead_score, c.category, c.summary or ''])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=calls_export.csv"})


# ===== TEAM MANAGEMENT (Client Admin) =====

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "agent"  # admin, manager, agent
    permissions: str = "dashboard,leads,calls"  # comma-separated pages

@app.post("/team/add")
def add_team_member(user: UserCreate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    """Client admin adds team member"""
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    if user.role not in ['admin', 'manager', 'agent']:
        raise HTTPException(status_code=400, detail="Role must be admin, manager, or agent")
    new_user = User(client_id=client.id, name=user.name, email=user.email, password=hash_password(user.password), role=user.role, permissions=user.permissions)
    db.add(new_user)
    db.commit()
    return {"message": f"{user.name} added as {user.role}", "id": new_user.id}

@app.get("/team")
def get_team(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    """Get all team members"""
    users = db.query(User).filter(User.client_id == client.id).all()
    return {"total": len(users), "team": [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "permissions": u.permissions, "is_active": u.is_active} for u in users]}

@app.put("/team/{user_id}/role")
def change_role(user_id: int, role: str, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    """Change team member role"""
    user = db.query(User).filter(User.id == user_id, User.client_id == client.id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if role not in ['admin', 'manager', 'agent']: raise HTTPException(status_code=400, detail="Invalid role")
    user.role = role
    db.commit()
    return {"message": f"{user.name} role changed to {role}"}

@app.put("/team/{user_id}/permissions")
def update_permissions(user_id: int, permissions: str, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    """Update which pages a user can access"""
    user = db.query(User).filter(User.id == user_id, User.client_id == client.id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.permissions = permissions
    db.commit()
    return {"message": f"{user.name} permissions updated"}

@app.put("/team/{user_id}/toggle")
def toggle_user(user_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    """Activate/Deactivate team member"""
    user = db.query(User).filter(User.id == user_id, User.client_id == client.id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"{user.name} {'activated' if user.is_active else 'deactivated'}"}

@app.delete("/team/{user_id}")
def remove_user(user_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    """Remove team member"""
    user = db.query(User).filter(User.id == user_id, User.client_id == client.id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"{user.name} removed"}


# ===== SUPER ADMIN =====

@app.get("/admin/clients")
def get_all_clients(admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db)):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"):
        raise HTTPException(status_code=403, detail="Admin access only")
    clients = db.query(Client).all()
    # Count actual call logs per client — don't trust stored counter
    call_counts = {}
    for c in clients:
        call_counts[c.id] = db.query(CallLog).filter(CallLog.client_id == c.id).count()
    team_counts = {}
    for c in clients:
        team_counts[c.id] = db.query(User).filter(User.client_id == c.id).count()
    return {"total": len(clients), "clients": [{
        "id": c.id,
        "company": c.company_name,
        "industry": c.industry,
        "contact_name": c.contact_name,
        "email": c.email,
        "phone": c.phone,
        "plan": c.plan,
        "total_calls": call_counts.get(c.id, 0),
        "team_count": team_counts.get(c.id, 0),
        "is_active": c.is_active,
        "created": str(c.created_at)
    } for c in clients]}

@app.put("/admin/clients/{client_id}/plan")
def change_plan(client_id: int, plan: str, admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db)):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"): raise HTTPException(status_code=403, detail="Admin access only")
    if plan not in ['free', 'starter', 'growth', 'pro', 'enterprise']: raise HTTPException(status_code=400, detail="Invalid plan")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client: raise HTTPException(status_code=404, detail="Client not found")
    client.plan = plan
    db.commit()
    return {"message": f"{client.company_name} plan changed to {plan}"}

@app.put("/admin/clients/{client_id}/toggle")
def toggle_client(client_id: int, admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db)):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"): raise HTTPException(status_code=403, detail="Admin access only")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client: raise HTTPException(status_code=404, detail="Client not found")
    client.is_active = not client.is_active
    db.commit()
    return {"message": f"{client.company_name} {'activated' if client.is_active else 'deactivated'}"}

@app.put("/admin/clients/{client_id}/reset-password")
def admin_reset_password(client_id: int, new_password: str, admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db)):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"): raise HTTPException(status_code=403, detail="Admin access only")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client: raise HTTPException(status_code=404, detail="Client not found")
    client.password = hash_password(new_password)
    db.commit()
    return {"message": f"Password reset for {client.company_name}"}

@app.get("/admin/stats")
def admin_stats(admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db)):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"): raise HTTPException(status_code=403, detail="Admin access only")
    clients = db.query(Client).all()
    total_calls = db.query(CallLog).count()
    total_leads = db.query(Lead).count()
    hot  = db.query(Lead).filter(Lead.category == "hot").count()
    warm = db.query(Lead).filter(Lead.category == "warm").count()
    cold = db.query(Lead).filter(Lead.category == "cold").count()
    plan_prices = {"free":0,"starter":5000,"growth":15000,"pro":30000,"enterprise":75000}
    mrr = sum(plan_prices.get(c.plan,0) for c in clients if c.is_active)
    return {
        "total_clients": len(clients),
        "active_clients": sum(1 for c in clients if c.is_active),
        "paid_clients": sum(1 for c in clients if c.plan != "free" and c.is_active),
        "mrr": mrr,
        "arr": mrr * 12,
        "total_calls": total_calls,
        "total_leads": total_leads,
        "hot_leads": hot,
        "warm_leads": warm,
        "cold_leads": cold,
        "plan_breakdown": {p: sum(1 for c in clients if c.plan == p) for p in plan_prices},
    }

@app.get("/admin/calls")
def admin_all_calls(admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db), limit: int = 100):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"): raise HTTPException(status_code=403, detail="Admin access only")
    calls = db.query(CallLog).order_by(CallLog.created_at.desc()).limit(limit).all()
    clients_map = {c.id: c.company_name for c in db.query(Client).all()}
    return {"total": len(calls), "calls": [{
        "id": c.id, "client_id": c.client_id,
        "company": clients_map.get(c.client_id, "Unknown"),
        "lead_name": c.lead_name, "phone": c.phone,
        "duration_seconds": c.duration_seconds,
        "sentiment": c.sentiment, "lead_score": c.lead_score,
        "category": c.category, "summary": c.summary,
        "call_status": c.call_status,
        "direction": getattr(c, "direction", "outbound") or "outbound",
        "created_at": str(c.created_at),
    } for c in calls]}

@app.get("/admin/leads")
def admin_all_leads(admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db), limit: int = 200):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"): raise HTTPException(status_code=403, detail="Admin access only")
    leads = db.query(Lead).order_by(Lead.created_at.desc()).limit(limit).all()
    clients_map = {c.id: c.company_name for c in db.query(Client).all()}
    return {"total": len(leads), "leads": [{
        "id": l.id, "client_id": l.client_id,
        "company": clients_map.get(l.client_id, "Unknown"),
        "name": l.name, "phone": l.phone, "email": l.email,
        "score": l.score, "category": l.category, "status": l.status,
        "created_at": str(l.created_at),
    } for l in leads]}


# ===== AI URL ANALYZER (Auto-generate script from website) =====

class AnalyzeURLRequest(BaseModel):
    url: str

@app.post("/ai/analyze-url")
async def analyze_url(req: AnalyzeURLRequest, client: Client = Depends(get_current_client)):
    """Scrape a company website and auto-generate AI calling script"""
    import httpx as hx
    from bs4 import BeautifulSoup

    url = req.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    # Step 1: Scrape the website
    try:
        async with hx.AsyncClient(follow_redirects=True, timeout=15.0) as http_client:
            resp = await http_client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            html = resp.text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not access website: {str(e)[:100]}")

    # Step 2: Extract text from HTML
    try:
        soup = BeautifulSoup(html, "html.parser")
        # Remove script and style elements
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        # Limit to first 3000 chars
        text = text[:3000]
        title = soup.title.string if soup.title else ""
    except Exception:
        text = html[:3000]
        title = ""

    # Step 3: Send to Groq to analyze and generate script
    from groq import Groq
    from config import GROQ_API_KEY, AI_MODEL
    groq_client = Groq(api_key=GROQ_API_KEY)

    prompt = f"""Analyze this company website content and generate an AI calling agent configuration.

Website: {url}
Title: {title}
Content: {text}

Generate a JSON response with these fields:
- company_name: The company name
- industry: One of: Real Estate, Education, Healthcare, Insurance, Finance, E-commerce, Restaurant, Hotel, Recruitment, Customer Support, Sales, Other
- products: Brief description of what they sell/offer (2-3 lines)
- pricing: Any pricing info found (or "Contact for pricing" if not found)
- greeting: A natural phone greeting in Telugu+English mix (1 line). Example: "హాయ్! నేను Priya ని, ABC company నుంచి call చేస్తున్నా."
- script: What the AI should talk about during the call (3-5 lines, include key selling points)
- goals: What the AI should achieve on the call (2-3 goals like "Book site visit", "Collect budget info")
- objections: Common objections and how to handle them (3 objections)
- target_audience: Who would be calling/being called

Respond ONLY in valid JSON. No markdown, no explanation."""

    try:
        response = groq_client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": "You analyze company websites and generate AI calling scripts. Respond only in valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=800
        )
        result_text = response.choices[0].message.content.strip()
        # Clean up if wrapped in markdown
        if "```" in result_text:
            result_text = result_text.split("```")[1].replace("json", "").strip()
        result = json.loads(result_text)
        return {"status": "success", "data": result, "url": url}
    except json.JSONDecodeError:
        return {"status": "success", "data": {"company_name": title or url, "industry": "Other", "products": text[:200], "pricing": "Contact for pricing", "greeting": f"హాయ్! నేను Priya ని, {title or 'your company'} నుంచి call చేస్తున్నా.", "script": text[:300], "goals": "Qualify lead, Book appointment", "objections": "Handle pricing questions", "target_audience": "General"}, "url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)[:100]}")


# ═══════════════════════════════════════════════════════════════
# REAL VOICE CALLS — Outgoing + Incoming + AI Filter + Transfer
# ═══════════════════════════════════════════════════════════════

class VoiceCallRequest(BaseModel):
    lead_id: int
    human_transfer_number: Optional[str] = ""   # number to transfer HOT leads to


# ── OUTGOING: Dashboard triggers a call to a lead ──────────────
@app.post("/voice/call")
def initiate_voice_call(req: VoiceCallRequest,
                        client: Client = Depends(get_current_client),
                        db: Session = Depends(get_db)):
    check_call_limit(client, db)  # enforce plan limits on real calls too
    lead = db.query(Lead).filter(Lead.id == req.lead_id, Lead.client_id == client.id).first()
    if not lead: raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.phone: raise HTTPException(status_code=400, detail="Lead has no phone number")

    opening = generate_opening(lead.name, client.product_info or "our services",
                               ai_name=client.ai_name or "Misha",
                               company_name=client.company_name or "")
    result = make_outgoing_call(
        phone_number          = lead.phone,
        lead_id               = lead.id,
        client_id             = client.id,
        opening_message       = opening,
        human_transfer_number = req.human_transfer_number or "",
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # Attach product/script info to call data for AI context
    cid = result["call_id"]
    if cid in active_voice_calls:
        active_voice_calls[cid]["product_info"] = client.product_info or ""
        active_voice_calls[cid]["script"]       = client.ai_script or ""
        active_voice_calls[cid]["goals"]        = "Qualify the lead and book a meeting"

    lead.status = "calling"
    db.commit()
    return {"status": result.get("status", "initiated"),
            "call_id": cid, "lead_name": lead.name, "phone": lead.phone,
            "message": result.get("message", "")}


# ── EXOTEL WEBHOOKS ────────────────────────────────────────────

@app.get("/voice/exotel/answer/{call_id}")
@app.post("/voice/exotel/answer/{call_id}")
def exotel_answer(call_id: str):
    """Exotel calls this when lead picks up — AI speaks opening + starts recording"""
    xml = generate_exoml_answer(call_id)
    return Response(content=xml, media_type="application/xml")


@app.post("/voice/exotel/incoming")
async def exotel_incoming(request: Request, db: Session = Depends(get_db)):
    """
    Exotel calls this for EVERY incoming call to your number.
    AI picks up, qualifies, transfers HOT leads to human.
    Configure in Exotel dashboard: Passthrough → this URL
    """
    form        = await request.form()
    from_number = form.get("From", form.get("CallFrom", ""))
    # Use client_id=1 for single-tenant; extend for multi-tenant via DID mapping
    client_id   = 1
    call_id, xml = generate_exoml_incoming(from_number, client_id)

    # Auto-create lead from caller number
    try:
        existing = db.query(Lead).filter(Lead.phone.contains(from_number[-10:])).first()
        if not existing:
            new_lead = Lead(client_id=client_id, name=f"Caller {from_number}",
                            phone=from_number, status="calling")
            db.add(new_lead)
            db.commit()
            db.refresh(new_lead)
            active_voice_calls[call_id]["lead_id"] = new_lead.id
        else:
            active_voice_calls[call_id]["lead_id"] = existing.id
            existing.status = "calling"
            db.commit()
    except Exception:
        pass

    return Response(content=xml, media_type="application/xml")


@app.post("/voice/exotel/speech/{call_id}")
async def exotel_speech(call_id: str, request: Request, db: Session = Depends(get_db)):
    """
    Exotel posts here after each customer speech recording.
    AI processes → replies → decides: continue OR transfer to human.
    """
    form          = await request.form()
    recording_url = form.get("RecordingUrl", form.get("recordingUrl", ""))
    digits        = form.get("Digits", "")

    xml = await process_speech_turn(call_id, recording_url, digits)

    # If transfer was just triggered → save call log
    call = active_voice_calls.get(call_id, {})
    if call.get("transfer_requested") and call.get("status") == "transfer_pending":
        _save_call_log(call_id, db)

    return Response(content=xml, media_type="application/xml")


@app.post("/voice/exotel/status/{call_id}")
async def exotel_status(call_id: str, request: Request, db: Session = Depends(get_db)):
    """Exotel posts final call status here"""
    form   = await request.form()
    status = form.get("Status", form.get("CallStatus", ""))
    if call_id in active_voice_calls:
        active_voice_calls[call_id]["status"] = status
        if status in ("completed", "failed", "busy", "no-answer"):
            _save_call_log(call_id, db)
    return Response(content="<Response/>" , media_type="application/xml")


# ── PLIVO WEBHOOKS (fallback) ──────────────────────────────────

@app.get("/voice/plivo/answer/{call_id}")
@app.post("/voice/plivo/answer/{call_id}")
def plivo_answer(call_id: str):
    xml = generate_plivo_xml(call_id)
    return Response(content=xml, media_type="application/xml")

@app.post("/voice/plivo/speech/{call_id}")
async def plivo_speech(call_id: str, request: Request, db: Session = Depends(get_db)):
    form          = await request.form()
    recording_url = form.get("RecordUrl", "")
    xml = await process_speech_turn(call_id, recording_url)
    return Response(content=xml, media_type="application/xml")

@app.post("/voice/plivo/status/{call_id}")
async def plivo_status_callback(call_id: str, request: Request, db: Session = Depends(get_db)):
    form   = await request.form()
    status = form.get("CallStatus", "")
    if call_id in active_voice_calls:
        active_voice_calls[call_id]["status"] = status
        if status == "completed":
            _save_call_log(call_id, db)
    return {"ok": True}


# ── CALL CONTROL ───────────────────────────────────────────────

@app.post("/voice/end")
def end_active_call(call_id: str, client: Client = Depends(get_current_client),
                   db: Session = Depends(get_db)):
    result = end_voice_call(call_id)
    if "error" in result: raise HTTPException(status_code=404, detail=result["error"])
    _save_call_log(call_id, db)
    return {"status": "ended"}

@app.get("/voice/status/{call_id}")
def voice_call_status(call_id: str, client: Client = Depends(get_current_client)):
    return get_call_status(call_id)

@app.get("/voice/active")
def get_active_calls(client: Client = Depends(get_current_client)):
    """List all currently active calls for this client"""
    calls = [
        {"call_id": cid, **get_call_status(cid)}
        for cid, d in active_voice_calls.items()
        if d.get("client_id") == client.id and d.get("status") not in ("completed", "failed")
    ]
    return {"active_calls": calls, "count": len(calls)}


class TransferRequest(BaseModel):
    call_id:      str
    human_number: str

@app.post("/voice/transfer")
def transfer_to_human(req: TransferRequest, client: Client = Depends(get_current_client)):
    """
    Dashboard agent manually transfers an active call to a human.
    The next time Exotel hits /speech, it will get a transfer ExoML.
    """
    result = request_human_transfer(req.call_id, req.human_number)
    if "error" in result: raise HTTPException(status_code=404, detail=result["error"])
    return result


# ── INTERNAL: save call log after call ends ────────────────────
def _save_call_log(call_id: str, db):
    call = active_voice_calls.get(call_id)
    if not call or call.get("_logged"): return
    call["_logged"] = True
    transcript = call.get("transcript", [])
    if not transcript: return
    try:
        analysis = analyze_sentiment(transcript, summary_lang=call.get("summary_lang", "en"))
        duration = int(time.time() - call.get("started_at", time.time()))
        lead_name = "Incoming Caller" if call.get("direction") == "inbound" else "Voice Lead"
        # Try to get real lead name
        if call.get("lead_id"):
            lead = db.query(Lead).filter(Lead.id == call["lead_id"]).first()
            if lead:
                lead_name = lead.name
                lead.score    = analysis.get("score", 5)
                lead.category = analysis.get("category", "warm")
                lead.status   = "qualified"
                lead.notes    = analysis.get("summary", "")
        log = CallLog(
            client_id        = call["client_id"],
            lead_id          = call.get("lead_id") or 0,
            lead_name        = lead_name,
            phone            = call.get("caller_number", "real"),
            duration_seconds = duration,
            transcript       = json.dumps(transcript),
            sentiment        = analysis.get("sentiment", "neutral"),
            lead_score       = analysis.get("score", 5),
            category         = analysis.get("category", "warm"),
            summary          = analysis.get("summary", ""),
            call_status      = "transferred" if call.get("transfer_requested") else "completed",
            recording_url    = call.get("recording_url", ""),
            intent           = analysis.get("intent", ""),
            emotion          = analysis.get("emotion", ""),
            buying_signals   = json.dumps(analysis.get("buying_signals", [])),
            objections       = json.dumps(analysis.get("objections", [])),
            recommended_action = analysis.get("recommended_action", ""),
            follow_up_urgency  = analysis.get("follow_up_urgency", "this_week"),
            key_topics       = json.dumps(analysis.get("key_topics", [])),
            direction        = call.get("direction", "outbound"),
        )
        db.add(log)
        client_row = db.query(Client).filter(Client.id == call["client_id"]).first()
        if client_row: client_row.total_calls += 1
        db.commit()
    except Exception as e:
        print(f"[save_call_log] {e}")


class AgentMessage(BaseModel):
    message: str
    history: list = []  # full conversation history from frontend

@app.post("/agent/respond")
def agent_respond(msg: AgentMessage, emp_id: Optional[int] = None, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    """Live Agent: full conversation context — remembers everything said"""
    from database import AIEmployee
    product_info = client.product_info or "AI calling assistant"
    system_prompt = """You are a real human sales agent on a live phone call. Be natural and conversational.
Rules:
- Remember everything said in this conversation — never repeat questions already asked
- Answer EVERY question fully and clearly
- Keep it natural: 2-4 sentences max per reply
- Ask ONE follow-up question at the end only if needed
- Sound warm, human, never robotic
- If they say bye/goodbye, end politely: 'Thank you! Have a great day. Goodbye!'
- NEVER cut off mid-answer. Always complete your thought."""

    if emp_id:
        emp = db.query(AIEmployee).filter(AIEmployee.id == emp_id, AIEmployee.client_id == client.id).first()
        if emp:
            system_prompt = f"""You are {emp.name}, {emp.role} at {emp.company_name or client.company_name}.
Script: {emp.script or ''}
Goals: {emp.goals or ''}
Languages: {emp.languages or 'English'}
Rules: Remember full conversation, answer all questions, sound human, 2-4 sentences, never repeat yourself."""
            product_info = emp.company_info or product_info

    from ai_agent import client as groq_client, FAST_MODEL
    # Build messages: system + full history + current message
    messages = [{"role": "system", "content": system_prompt}]
    for h in msg.history[-20:]:  # last 20 turns max to stay within token limit
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": msg.message})

    try:
        response = groq_client.chat.completions.create(
            model=FAST_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=150,
        )
        reply = response.choices[0].message.content.strip()
        return {"reply": reply}
    except Exception:
        return {"reply": "Sure! Let me explain that for you."}




# ===== CONVERSATION ORCHESTRATOR (Production Voice Agent) =====

from orchestrator import create_session, get_session, end_session, process_turn, get_session_summary
import uuid

class SessionStartRequest(BaseModel):
    agent_name:   str = "Misha"
    product_info: str = ""
    script:       str = ""
    goals:        str = ""
    languages:    str = "English"
    greeting:     str = ""
    emp_id:       Optional[int] = None

class TurnRequest(BaseModel):
    session_id: str
    user_text:  str
    stt_ms:     int = 0
    barge_in:   bool = False

@app.post("/agent/session/start")
def session_start(req: SessionStartRequest, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    """Start a new orchestrated voice session"""
    from database import AIEmployee
    agent_name   = req.agent_name
    product_info = req.product_info or client.product_info or "AI calling assistant"
    script, goals, languages, greeting = req.script, req.goals, req.languages, req.greeting

    if req.emp_id:
        emp = db.query(AIEmployee).filter(AIEmployee.id == req.emp_id, AIEmployee.client_id == client.id).first()
        if emp:
            agent_name   = emp.name
            product_info = emp.company_info or product_info
            script       = emp.script or script
            goals        = emp.goals or goals
            languages    = emp.languages or languages
            greeting     = emp.greeting or greeting

    session_id = str(uuid.uuid4())
    create_session(session_id, agent_name, product_info, script, goals, languages)
    greeting_text = greeting or f"Hi! I'm {agent_name}, how are you doing today?"

    return {"session_id": session_id, "greeting": greeting_text, "agent_name": agent_name}

@app.post("/agent/session/turn")
def session_turn(req: TurnRequest, client: Client = Depends(get_current_client)):
    """Process one conversation turn — returns reply + emotion + intent + latency"""
    result = process_turn(req.session_id, req.user_text, stt_ms=req.stt_ms, barge_in=req.barge_in)
    return result

class SessionEndRequest(BaseModel):
    session_id: str

@app.post("/agent/session/end")
def session_end(req: SessionEndRequest, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    """End session, get full summary + latency report"""
    session_id = req.session_id
    summary = get_session_summary(session_id)
    end_session(session_id)
    if summary.get("history"):
        from ai_agent import analyze_sentiment
        analysis = analyze_sentiment(summary["history"])
        summary["analysis"] = analysis
    return summary



import io

class TTSRequest(BaseModel):
    text: str
    language: str = "en-IN"
    speaker: str = "female"
    pace: float = 1.1

class GrammarRequest(BaseModel):
    text: str

@app.post("/voicelab/fix-grammar")
def fix_grammar(req: GrammarRequest, client: Client = Depends(get_current_client)):
    from config import GROQ_API_KEY, AI_MODEL
    import httpx as hx
    try:
        r = hx.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={"model": AI_MODEL, "messages": [
                {"role": "system", "content": "Fix grammar and spelling. Return ONLY the corrected text."},
                {"role": "user", "content": req.text}
            ], "temperature": 0.2, "max_tokens": 500}, timeout=30.0)
        return {"fixed": r.json()["choices"][0]["message"]["content"].strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voicelab/humanize")
def humanize_text(req: GrammarRequest, client: Client = Depends(get_current_client)):
    from config import GROQ_API_KEY, AI_MODEL
    import httpx as hx
    try:
        r = hx.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={"model": AI_MODEL, "messages": [
                {"role": "system", "content": "Rewrite this text to sound natural and human, like a real person on a phone call. Casual, warm, conversational tone. Return ONLY the rewritten text."},
                {"role": "user", "content": req.text}
            ], "temperature": 0.7, "max_tokens": 500}, timeout=30.0)
        return {"humanized": r.json()["choices"][0]["message"]["content"].strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== AI EMPLOYEES =====

class AIEmployeeCreate(BaseModel):
    name: str
    role: str
    industry: str = ""
    voice: str = "suhani"
    languages: str = "Telugu, English"
    greeting: str = ""
    script: str
    company_name: str = ""
    company_info: str = ""
    goals: str = ""

class AIEmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    greeting: Optional[str] = None
    script: Optional[str] = None
    company_name: Optional[str] = None
    company_info: Optional[str] = None
    goals: Optional[str] = None
    languages: Optional[str] = None
    voice: Optional[str] = None
    status: Optional[str] = None

@app.post("/ai-employees")
def create_ai_employee(data: AIEmployeeCreate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import AIEmployee
    emp = AIEmployee(client_id=client.id, name=data.name, role=data.role, industry=data.industry,
        voice=data.voice, languages=data.languages, greeting=data.greeting, script=data.script,
        company_name=data.company_name, company_info=data.company_info, goals=data.goals)
    db.add(emp); db.commit(); db.refresh(emp)
    return {"id": emp.id, "message": f"{emp.name} created"}

@app.get("/ai-employees")
def get_ai_employees(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import AIEmployee
    emps = db.query(AIEmployee).filter(AIEmployee.client_id == client.id).all()
    return {"total": len(emps), "employees": [{"id": e.id, "name": e.name, "role": e.role, "industry": e.industry, "voice": e.voice, "languages": e.languages, "greeting": e.greeting, "script": e.script, "company_name": e.company_name, "company_info": e.company_info, "goals": e.goals, "status": e.status, "total_calls": e.total_calls, "leads_qualified": e.leads_qualified} for e in emps]}

@app.put("/ai-employees/{emp_id}")
def update_ai_employee(emp_id: int, data: AIEmployeeUpdate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import AIEmployee
    emp = db.query(AIEmployee).filter(AIEmployee.id == emp_id, AIEmployee.client_id == client.id).first()
    if not emp: raise HTTPException(status_code=404, detail="Not found")
    if data.name is not None: emp.name = data.name
    if data.role is not None: emp.role = data.role
    if data.greeting is not None: emp.greeting = data.greeting
    if data.script is not None: emp.script = data.script
    if data.company_name is not None: emp.company_name = data.company_name
    if data.company_info is not None: emp.company_info = data.company_info
    if data.goals is not None: emp.goals = data.goals
    if data.languages is not None: emp.languages = data.languages
    if data.voice is not None: emp.voice = data.voice
    if data.status is not None: emp.status = data.status
    db.commit()
    return {"message": "Updated"}

@app.delete("/ai-employees/{emp_id}")
def delete_ai_employee(emp_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import AIEmployee
    emp = db.query(AIEmployee).filter(AIEmployee.id == emp_id, AIEmployee.client_id == client.id).first()
    if not emp: raise HTTPException(status_code=404, detail="Not found")
    db.delete(emp); db.commit()
    return {"message": "Deleted"}


# ===== KNOWLEDGE BASE =====

class KnowledgeCreate(BaseModel):
    title: str
    content: str
    category: str = "general"

@app.post("/knowledge")
def add_knowledge(data: KnowledgeCreate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import KnowledgeBase
    kb = KnowledgeBase(client_id=client.id, title=data.title, content=data.content, category=data.category)
    db.add(kb); db.commit(); db.refresh(kb)
    return {"id": kb.id, "message": "Knowledge added"}

@app.get("/knowledge")
def get_knowledge(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import KnowledgeBase
    items = db.query(KnowledgeBase).filter(KnowledgeBase.client_id == client.id).all()
    return {"total": len(items), "items": [{"id": i.id, "title": i.title, "content": i.content, "category": i.category, "created_at": str(i.created_at)} for i in items]}

@app.delete("/knowledge/{kb_id}")
def delete_knowledge(kb_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import KnowledgeBase
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id, KnowledgeBase.client_id == client.id).first()
    if not kb: raise HTTPException(status_code=404, detail="Not found")
    db.delete(kb); db.commit()
    return {"message": "Deleted"}

@app.post("/knowledge/search")
def search_knowledge(query: ChatMessage, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import KnowledgeBase
    items = db.query(KnowledgeBase).filter(KnowledgeBase.client_id == client.id).all()
    q = query.message.lower()
    results = [i for i in items if q in i.title.lower() or q in i.content.lower()]
    return {"results": [{"title": i.title, "content": i.content[:200]} for i in results[:5]]}


# ===== CALL SUMMARY WHATSAPP =====

class WhatsAppSummaryRequest(BaseModel):
    call_id: int
    phone: Optional[str] = None  # override number, else uses lead's phone

@app.post("/calls/{call_id}/whatsapp-summary")
def send_whatsapp_summary(call_id: int, req: WhatsAppSummaryRequest,
                          client: Client = Depends(get_current_client),
                          db: Session = Depends(get_db)):
    """Send call summary to lead's WhatsApp number via wa.me link (returns link for frontend to open)"""
    call = db.query(CallLog).filter(CallLog.id == call_id, CallLog.client_id == client.id).first()
    if not call: raise HTTPException(status_code=404, detail="Call not found")

    direction = "Incoming" if getattr(call, 'direction', 'outbound') == 'inbound' else "Outgoing"
    score_emoji = "🔥" if call.category == "hot" else "🌤️" if call.category == "warm" else "❄️"
    duration_min = f"{call.duration_seconds // 60}m {call.duration_seconds % 60}s" if call.duration_seconds else "N/A"

    summary_text = (
        f"📞 *{direction} Call Summary*\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 *Lead:* {call.lead_name}\n"
        f"⏱️ *Duration:* {duration_min}\n"
        f"🎯 *Score:* {call.lead_score}/10\n"
        f"{score_emoji} *Category:* {(call.category or 'warm').upper()}\n"
        f"😊 *Sentiment:* {call.sentiment or 'neutral'}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📋 *Summary:*\n{call.summary or 'No summary available'}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🤖 Powered by AI Voice Engine"
    )

    # Determine phone number
    phone = req.phone
    if not phone and call.lead_id:
        lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
        if lead: phone = lead.phone
    if not phone:
        phone = call.phone

    # Clean phone number
    phone_clean = ''.join(filter(str.isdigit, phone or ''))
    if phone_clean.startswith('0'): phone_clean = '91' + phone_clean[1:]
    if len(phone_clean) == 10: phone_clean = '91' + phone_clean

    import urllib.parse
    wa_link = f"https://wa.me/{phone_clean}?text={urllib.parse.quote(summary_text)}"

    return {
        "status": "ok",
        "wa_link": wa_link,
        "phone": phone_clean,
        "summary": summary_text
    }


# ===== API KEY SYSTEM =====

import secrets

PLAN_LIMITS = {
    "free":       {"calls": 50,    "price": 0,     "api_keys": 1},
    "starter":    {"calls": 500,   "price": 5000,  "api_keys": 2},
    "growth":     {"calls": 2000,  "price": 15000, "api_keys": 5},
    "pro":        {"calls": 5000,  "price": 30000, "api_keys": 10},
    "enterprise": {"calls": 15000, "price": 75000, "api_keys": 999},
}

def get_client_by_api_key(api_key: str, db: Session):
    from database import APIKey
    key_obj = db.query(APIKey).filter(APIKey.key == api_key, APIKey.is_active == True).first()
    if not key_obj: return None, None
    client = db.query(Client).filter(Client.id == key_obj.client_id).first()
    # Update usage
    key_obj.calls_used += 1
    key_obj.last_used = datetime.utcnow()
    db.commit()
    return client, key_obj

class APIKeyCreate(BaseModel):
    name: str
    calls_limit: Optional[int] = 1000

@app.post("/api-keys")
def create_api_key(data: APIKeyCreate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import APIKey
    plan_info = PLAN_LIMITS.get(client.plan, PLAN_LIMITS["free"])
    existing = db.query(APIKey).filter(APIKey.client_id == client.id, APIKey.is_active == True).count()
    if existing >= plan_info["api_keys"]:
        raise HTTPException(status_code=400, detail=f"Your {client.plan} plan allows max {plan_info['api_keys']} API keys. Upgrade to get more.")
    raw = secrets.token_urlsafe(32)
    key = f"tzm_live_{raw[:40]}"
    api_key = APIKey(client_id=client.id, name=data.name, key=key, calls_limit=data.calls_limit or plan_info["calls"])
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return {"id": api_key.id, "name": api_key.name, "key": key, "calls_limit": api_key.calls_limit, "message": "Save this key — it won't be shown again in full"}

@app.get("/api-keys")
def list_api_keys(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import APIKey
    keys = db.query(APIKey).filter(APIKey.client_id == client.id).all()
    return {"keys": [{
        "id": k.id, "name": k.name,
        "key_preview": k.key[:12] + "..." + k.key[-4:],  # never expose full key again
        "is_active": k.is_active, "calls_used": k.calls_used,
        "calls_limit": k.calls_limit, "last_used": str(k.last_used) if k.last_used else None,
        "created_at": str(k.created_at)
    } for k in keys]}

@app.delete("/api-keys/{key_id}")
def revoke_api_key(key_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import APIKey
    key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.client_id == client.id).first()
    if not key: raise HTTPException(status_code=404, detail="Key not found")
    key.is_active = False
    db.commit()
    return {"message": "API key revoked"}

@app.put("/api-keys/{key_id}/toggle")
def toggle_api_key(key_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import APIKey
    key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.client_id == client.id).first()
    if not key: raise HTTPException(status_code=404, detail="Key not found")
    key.is_active = not key.is_active
    db.commit()
    return {"is_active": key.is_active}


# ===== USAGE LIMITS ENFORCEMENT =====

def check_call_limit(client: Client, db: Session):
    """Call this before every AI call to enforce plan limits"""
    plan_info = PLAN_LIMITS.get(client.plan, PLAN_LIMITS["free"])
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    month_calls = db.query(CallLog).filter(
        CallLog.client_id == client.id,
        CallLog.created_at >= month_start
    ).count()
    if month_calls >= plan_info["calls"]:
        raise HTTPException(
            status_code=429,
            detail=f"Monthly call limit reached ({plan_info['calls']} calls on {client.plan} plan). Please upgrade."
        )
    return month_calls

@app.get("/usage")
def get_usage(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    plan_info = PLAN_LIMITS.get(client.plan, PLAN_LIMITS["free"])
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    month_calls = db.query(CallLog).filter(CallLog.client_id == client.id, CallLog.created_at >= month_start).count()
    total_calls  = db.query(CallLog).filter(CallLog.client_id == client.id).count()
    from database import APIKey
    api_keys_count = db.query(APIKey).filter(APIKey.client_id == client.id, APIKey.is_active == True).count()
    return {
        "plan": client.plan,
        "plan_price": plan_info["price"],
        "calls_this_month": month_calls,
        "calls_limit": plan_info["calls"],
        "calls_remaining": max(0, plan_info["calls"] - month_calls),
        "percent_used": round((month_calls / max(plan_info["calls"], 1)) * 100, 1),
        "total_calls_ever": total_calls,
        "api_keys_active": api_keys_count,
        "api_keys_limit": plan_info["api_keys"],
    }


# ===== RAZORPAY PAYMENT =====

RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

class CreateOrderRequest(BaseModel):
    plan: str

@app.post("/payment/create-order")
def create_payment_order(req: CreateOrderRequest, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    if req.plan not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan_info = PLAN_LIMITS[req.plan]
    if plan_info["price"] == 0:
        raise HTTPException(status_code=400, detail="Free plan needs no payment")
    amount_paise = int(plan_info["price"] * 100)  # Razorpay uses paise
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        import razorpay
        rz = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        order = rz.order.create({"amount": amount_paise, "currency": "INR", "receipt": f"tzm_{client.id}_{req.plan}"})
        order_id = order["id"]
    else:
        # Demo mode — no real Razorpay keys
        order_id = f"demo_order_{client.id}_{req.plan}_{int(datetime.utcnow().timestamp())}"
    from database import RazorpayOrder
    rz_order = RazorpayOrder(client_id=client.id, order_id=order_id, plan=req.plan, amount_inr=plan_info["price"])
    db.add(rz_order)
    db.commit()
    return {
        "order_id": order_id,
        "amount": amount_paise,
        "currency": "INR",
        "plan": req.plan,
        "key_id": RAZORPAY_KEY_ID or "demo_mode",
        "company_name": "Tzmicha AI Voice Engine",
        "client_email": client.email,
        "client_name": client.contact_name,
    }

class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: Optional[str] = ""
    plan: str

@app.post("/payment/verify")
def verify_payment(req: VerifyPaymentRequest, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import RazorpayOrder
    order = db.query(RazorpayOrder).filter(RazorpayOrder.order_id == req.order_id, RazorpayOrder.client_id == client.id).first()
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET and req.signature:
        import razorpay, hmac, hashlib
        expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), f"{req.order_id}|{req.payment_id}".encode(), hashlib.sha256).hexdigest()
        if expected != req.signature:
            raise HTTPException(status_code=400, detail="Payment verification failed")
    # Upgrade plan
    client.plan = req.plan
    order.status = "paid"
    order.payment_id = req.payment_id
    db.commit()
    return {"message": f"Plan upgraded to {req.plan}", "plan": req.plan}

@app.get("/payment/plans")
def get_plans_with_pricing():
    return {"plans": [
        {"id": "free",       "name": "Free",       "price": 0,     "calls": 50,    "api_keys": 1,   "features": ["50 calls/month", "1 AI Agent", "Basic dashboard", "Call simulator"]},
        {"id": "starter",   "name": "Starter",    "price": 5000,  "calls": 500,   "api_keys": 2,   "features": ["500 calls/month", "3 AI Agents", "WhatsApp summaries", "2 API keys", "CSV export"]},
        {"id": "growth",    "name": "Growth",     "price": 15000, "calls": 2000,  "api_keys": 5,   "features": ["2000 calls/month", "10 AI Agents", "5 API keys", "CRM integration", "Priority support"]},
        {"id": "pro",       "name": "Pro",        "price": 30000, "calls": 5000,  "api_keys": 10,  "features": ["5000 calls/month", "Unlimited agents", "10 API keys", "Real calls (Exotel)", "Dedicated support"]},
        {"id": "enterprise","name": "Enterprise", "price": 75000, "calls": 15000, "api_keys": 999, "features": ["15000 calls/month", "White label", "Unlimited API keys", "SLA guarantee", "24/7 support"]},
    ]}


# ===== NOTIFICATIONS =====

@app.get("/notifications")
def get_notifications(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    calls = db.query(CallLog).filter(CallLog.client_id == client.id).order_by(CallLog.created_at.desc()).limit(10).all()
    notifs = []
    for c in calls:
        if c.category == "hot":
            notifs.append({"id": c.id, "type": "hot_lead", "message": f"🔥 {c.lead_name} is a HOT lead! Score: {c.lead_score}/10", "time": str(c.created_at), "read": False})
        elif c.category == "warm":
            notifs.append({"id": c.id, "type": "warm_lead", "message": f"🌤️ {c.lead_name} is a WARM lead. Score: {c.lead_score}/10", "time": str(c.created_at), "read": False})
    return {"total": len(notifs), "notifications": notifs}


# ===== FORGOT PASSWORD =====

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str
    reset_code: str

reset_codes = {}  # email -> code (in-memory, simple)

@app.post("/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.email == data.email).first()
    if not client:
        return {"message": "If email exists, reset code sent"}  # don't reveal
    import random
    code = str(random.randint(100000, 999999))
    reset_codes[data.email] = code
    # In production: send via email. For now return code directly (dev mode)
    return {"message": "Reset code generated", "code": code, "note": "In production this will be emailed"}

@app.post("/auth/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    stored = reset_codes.get(data.email)
    if not stored or stored != data.reset_code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    client = db.query(Client).filter(Client.email == data.email).first()
    if not client:
        raise HTTPException(status_code=404, detail="Email not found")
    client.password = hash_password(data.new_password)
    db.commit()
    del reset_codes[data.email]
    return {"message": "Password reset successful"}


# ===== APPOINTMENTS =====

class AppointmentCreate(BaseModel):
    lead_name: str
    phone: str
    date: str
    time: str
    agent: str = "AI Agent"
    apt_type: str = "callback"  # callback | demo | follow-up
    notes: Optional[str] = None

@app.post("/appointments")
def create_appointment(data: AppointmentCreate, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import Appointment as ApptModel
    appt = ApptModel(
        client_id=client.id, lead_name=data.lead_name, phone=data.phone,
        date=data.date, time=data.time, agent=data.agent,
        apt_type=data.apt_type, notes=data.notes
    )
    db.add(appt); db.commit(); db.refresh(appt)
    return {"id": appt.id, "message": "Appointment created"}

@app.get("/appointments")
def get_appointments(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import Appointment as ApptModel
    items = db.query(ApptModel).filter(ApptModel.client_id == client.id).order_by(ApptModel.created_at.desc()).all()
    return {"total": len(items), "appointments": [
        {"id": a.id, "lead_name": a.lead_name, "phone": a.phone, "date": a.date,
         "time": a.time, "agent": a.agent, "type": a.apt_type,
         "status": a.status, "notes": a.notes, "created_at": str(a.created_at)}
        for a in items
    ]}

@app.put("/appointments/{appt_id}/status")
def update_appointment_status(appt_id: int, status: str, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import Appointment as ApptModel
    appt = db.query(ApptModel).filter(ApptModel.id == appt_id, ApptModel.client_id == client.id).first()
    if not appt: raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = status
    db.commit()
    return {"message": "Status updated"}

@app.delete("/appointments/{appt_id}")
def delete_appointment(appt_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    from database import Appointment as ApptModel
    appt = db.query(ApptModel).filter(ApptModel.id == appt_id, ApptModel.client_id == client.id).first()
    if not appt: raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt); db.commit()
    return {"message": "Deleted"}


@app.get("/billing/plans")
def get_plans():
    return {"plans": [
        {"id": "starter", "name": "Starter", "price": 5000, "calls": 500, "features": ["500 calls/month", "Basic AI", "1 Campaign", "Email support"]},
        {"id": "growth", "name": "Growth", "price": 15000, "calls": 2000, "features": ["2000 calls/month", "Advanced AI", "5 Campaigns", "CSV Export", "Priority support"]},
        {"id": "pro", "name": "Pro", "price": 30000, "calls": 5000, "features": ["5000 calls/month", "Premium AI", "Unlimited Campaigns", "Real Calls", "Dedicated support"]},
        {"id": "enterprise", "name": "Enterprise", "price": 75000, "calls": 15000, "features": ["15000 calls/month", "Own AI Model", "Unlimited everything", "SLA guarantee", "24/7 support"]},
    ]}

@app.get("/billing/usage")
def get_billing_usage(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    total_calls = db.query(CallLog).filter(CallLog.client_id == client.id).count()
    plan_limits = {"free": 50, "starter": 500, "growth": 2000, "pro": 5000, "enterprise": 15000}
    limit = plan_limits.get(client.plan, 50)
    return {"plan": client.plan, "calls_used": total_calls, "calls_limit": limit, "percent_used": round((total_calls / max(limit, 1)) * 100, 1)}


# ===== CAMPAIGN RUN =====

@app.post("/campaigns/{campaign_id}/run")
def run_campaign(campaign_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.client_id == client.id).first()
    if not campaign: raise HTTPException(status_code=404, detail="Campaign not found")
    leads = db.query(Lead).filter(Lead.client_id == client.id, Lead.status == "new").limit(10).all()
    if not leads: return {"message": "No new leads to call", "count": 0}
    results = []
    for lead in leads:
        opening = generate_opening(lead.name, campaign.product_info, ai_name=client.ai_name or "Misha", company_name=client.company_name or "")
        conv_id = f"camp_{campaign.id}_{lead.id}_{int(datetime.now().timestamp())}"
        active_conversations[conv_id] = {
            "client_id": client.id, "lead_id": lead.id, "lead_name": lead.name,
            "product_info": campaign.product_info,
            "history": [{"role": "assistant", "content": opening}],
            "started_at": datetime.now().isoformat()
        }
        lead.status = "called"
        campaign.total_calls += 1
        results.append({"lead_id": lead.id, "lead_name": lead.name, "conversation_id": conv_id})
    db.commit()
    # Send campaign complete email
    try:
        notif_email = os.getenv('SMTP_USER', '')
        hot = sum(1 for r in results if active_conversations.get(r['conversation_id'], {}).get('category') == 'hot')
        if notif_email:
            send_campaign_complete(notif_email, campaign.name, len(results), hot, 0, len(results) - hot)
    except: pass
    return {"message": f"Campaign started for {len(results)} leads", "count": len(results), "conversations": results}

@app.post("/campaigns/{campaign_id}/assign-leads")
def assign_leads_to_campaign(campaign_id: int, lead_ids: list[int], client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.client_id == client.id).first()
    if not campaign: raise HTTPException(status_code=404, detail="Campaign not found")
    count = 0
    for lid in lead_ids:
        lead = db.query(Lead).filter(Lead.id == lid, Lead.client_id == client.id).first()
        if lead: lead.status = "assigned"; count += 1
    db.commit()
    return {"message": f"{count} leads assigned to campaign"}


# ===== TZMICHA ENGINE (Whisper STT + Edge TTS) =====

@app.post("/voicelab/tts/tzmicha")
async def voicelab_tts_tzmicha(req: TTSRequest, client: Client = Depends(get_current_client)):
    """Edge TTS - Telugu / Hindi / Indian English. Free, no API key."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    try:
        import engine_tts
        lang = req.language.split("-")[0] if "-" in req.language else req.language
        gender = "male" if req.speaker == "male" else "female"
        audio_bytes = await engine_tts.synthesize_async(req.text, language=lang, gender=gender)
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=voice.mp3"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voicelab/stt/tzmicha")
async def voicelab_stt_tzmicha(file: UploadFile = File(...), client: Client = Depends(get_current_client)):
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")
    try:
        import engine_stt
        transcript = engine_stt.transcribe(audio_bytes)
        language = engine_stt.detect_language(audio_bytes)
        return {"transcript": transcript, "detected_language": language}
    except ImportError:
        return {"transcript": "", "detected_language": "en", "note": "Engine not loaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== ADMIN CLIENT DETAIL =====

@app.get("/admin/clients/{client_id}/detail")
def admin_client_detail(client_id: int, admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db)):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"): raise HTTPException(status_code=403, detail="Admin access only")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client: raise HTTPException(status_code=404, detail="Client not found")
    team  = db.query(User).filter(User.client_id == client_id).all()
    calls = db.query(CallLog).filter(CallLog.client_id == client_id).order_by(CallLog.created_at.desc()).all()
    leads = db.query(Lead).filter(Lead.client_id == client_id).all()
    total_calls    = len(calls)
    inbound_calls  = sum(1 for c in calls if getattr(c, 'direction', 'outbound') == 'inbound')
    outbound_calls = total_calls - inbound_calls
    avg_dur = int(sum(c.duration_seconds or 0 for c in calls) / max(total_calls, 1))
    total_min = sum(c.duration_seconds or 0 for c in calls) // 60
    from database import RazorpayOrder
    payments = db.query(RazorpayOrder).filter(RazorpayOrder.client_id == client_id).order_by(RazorpayOrder.created_at.desc()).all()
    total_paid = sum(p.amount_inr or 0 for p in payments if p.status == 'paid')
    from datetime import timedelta
    monthly = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        ms = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0)
        me = (ms + timedelta(days=32)).replace(day=1)
        cnt = sum(1 for c in calls if c.created_at and ms <= c.created_at < me)
        monthly.append({"month": ms.strftime("%b %Y"), "calls": cnt})
    plan_prices = {"free":0,"starter":5000,"growth":15000,"pro":30000,"enterprise":75000}
    return {
        "company": {"id": client.id, "name": client.company_name, "industry": client.industry, "contact_name": client.contact_name, "email": client.email, "phone": client.phone, "plan": client.plan, "is_active": client.is_active, "ai_name": client.ai_name, "product_info": client.product_info, "joined": str(client.created_at), "monthly_value": plan_prices.get(client.plan, 0)},
        "team": [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "permissions": u.permissions, "is_active": u.is_active} for u in team],
        "call_stats": {"total": total_calls, "inbound": inbound_calls, "outbound": outbound_calls, "inbound_pct": round(inbound_calls/max(total_calls,1)*100,1), "outbound_pct": round(outbound_calls/max(total_calls,1)*100,1), "hot": sum(1 for c in calls if c.category=='hot'), "warm": sum(1 for c in calls if c.category=='warm'), "cold": sum(1 for c in calls if c.category=='cold'), "avg_duration_sec": avg_dur, "total_duration_min": total_min},
        "recent_calls": [{"id": c.id, "lead_name": c.lead_name, "duration": c.duration_seconds, "score": c.lead_score, "category": c.category, "sentiment": c.sentiment, "direction": getattr(c,'direction','outbound') or 'outbound', "status": c.call_status, "date": str(c.created_at)} for c in calls[:20]],
        "leads": {"total": len(leads), "hot": sum(1 for l in leads if l.category=='hot'), "warm": sum(1 for l in leads if l.category=='warm'), "cold": sum(1 for l in leads if l.category=='cold')},
        "payments": [{"order_id": p.order_id, "plan": p.plan, "amount": p.amount_inr, "status": p.status, "date": str(p.created_at)} for p in payments],
        "total_paid": total_paid,
        "monthly_usage": monthly,
    }


# ===== SUPER ADMIN EXTRA ENDPOINTS =====

@app.get("/admin/campaigns")
def admin_all_campaigns(admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db)):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"): raise HTTPException(status_code=403)
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    clients_map = {c.id: c.company_name for c in db.query(Client).all()}
    return {"total": len(campaigns), "campaigns": [{
        "id": c.id, "client_id": c.client_id,
        "company": clients_map.get(c.client_id, "Unknown"),
        "name": c.name, "total_calls": c.total_calls,
        "created_at": str(c.created_at)
    } for c in campaigns]}

@app.get("/admin/ai-employees")
def admin_all_employees(admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db)):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"): raise HTTPException(status_code=403)
    from database import AIEmployee
    emps = db.query(AIEmployee).order_by(AIEmployee.created_at.desc()).all()
    clients_map = {c.id: c.company_name for c in db.query(Client).all()}
    return {"total": len(emps), "employees": [{
        "id": e.id, "client_id": e.client_id,
        "company": clients_map.get(e.client_id, "Unknown"),
        "name": e.name, "role": e.role, "industry": e.industry,
        "status": e.status, "total_calls": e.total_calls,
        "leads_qualified": e.leads_qualified,
        "created_at": str(e.created_at)
    } for e in emps]}

@app.get("/admin/payments")
def admin_all_payments(admin_key: str = Header(None, alias="x-admin-key"), db: Session = Depends(get_db)):
    if admin_key != os.getenv("ADMIN_KEY", "superadmin123"): raise HTTPException(status_code=403)
    orders = db.query(RazorpayOrder).order_by(RazorpayOrder.created_at.desc()).all()
    clients_map = {c.id: c.company_name for c in db.query(Client).all()}
    total_revenue = sum(o.amount_inr or 0 for o in orders if o.status == "paid")
    return {"total": len(orders), "total_revenue": total_revenue, "payments": [{
        "id": o.id, "client_id": o.client_id,
        "company": clients_map.get(o.client_id, "Unknown"),
        "order_id": o.order_id, "plan": o.plan,
        "amount": o.amount_inr, "status": o.status,
        "created_at": str(o.created_at)
    } for o in orders]}

# ===== RUN =====

if __name__ == "__main__":
    import uvicorn
    print("\nStarting AI Caller SaaS Platform v2.0...")
    print(f"API Docs: http://localhost:{PORT}/docs")
    print(f"Server: http://localhost:{PORT}")
    import sys
    uvicorn.run(
        app, host=HOST, port=PORT,
        workers=1,
        loop="asyncio" if sys.platform == "win32" else "uvloop",
        http="httptools",
        access_log=False,
    )

