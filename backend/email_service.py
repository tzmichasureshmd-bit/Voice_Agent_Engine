import os, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM     = os.getenv("SMTP_FROM_EMAIL", SMTP_USER)
SMTP_NAME     = os.getenv("SMTP_FROM_NAME", "TZMICHA AI Voice Engine")

def _send(to: str, subject: str, html: str) -> bool:
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[EMAIL] SMTP not configured. Would send to {to}: {subject}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{SMTP_NAME} <{SMTP_FROM}>"
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.sendmail(SMTP_FROM, to, msg.as_string())
        print(f"[EMAIL] Sent to {to}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed: {e}")
        return False

def _base(content: str) -> str:
    return f"""
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#05050a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#0e0e1a;border:1px solid #1e1e30;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:24px 32px;">
    <h1 style="margin:0;color:white;font-size:20px;font-weight:800;letter-spacing:-0.5px;">⚡ TZMICHA</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">AI Voice Engine</p>
  </div>
  <div style="padding:28px 32px;">{content}</div>
  <div style="padding:16px 32px;border-top:1px solid #1e1e30;text-align:center;">
    <p style="margin:0;font-size:11px;color:#33334a;">© 2026 TZMICHA · <a href="https://tzmicha.com" style="color:#a78bfa;text-decoration:none;">tzmicha.com</a></p>
  </div>
</div>
</body></html>"""

def send_welcome(to: str, name: str, company: str):
    content = f"""
<h2 style="color:#f0f0f8;font-size:18px;margin:0 0 12px;">Welcome to TZMICHA, {name}! 🎉</h2>
<p style="color:#8888aa;font-size:14px;line-height:1.7;margin:0 0 16px;">
  Your AI Voice Engine is ready. <strong style="color:#f0f0f8;">{company}</strong> can now make intelligent AI calls, qualify leads, and grow faster.
</p>
<div style="background:#0a0a14;border:1px solid #1e1e30;border-radius:12px;padding:16px;margin:0 0 20px;">
  <p style="color:#a78bfa;font-size:12px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Quick Start</p>
  <p style="color:#8888aa;font-size:13px;margin:0 0 6px;">1. Create your first AI Agent</p>
  <p style="color:#8888aa;font-size:13px;margin:0 0 6px;">2. Add leads (CSV upload or manual)</p>
  <p style="color:#8888aa;font-size:13px;margin:0;">3. Run Call Simulator to test</p>
</div>
<a href="https://app.tzmicha.com" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:700;">Open Dashboard →</a>"""
    return _send(to, f"Welcome to TZMICHA, {name}! 🚀", _base(content))

def send_hot_lead_alert(to: str, lead_name: str, score: int, summary: str, recommended_action: str):
    content = f"""
<div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:12px;padding:16px;margin:0 0 20px;">
  <p style="color:#f87171;font-size:13px;font-weight:800;margin:0 0 4px;">🔥 HOT LEAD DETECTED</p>
  <p style="color:#f0f0f8;font-size:20px;font-weight:900;margin:0;">{lead_name}</p>
  <p style="color:#f87171;font-size:13px;margin:4px 0 0;">Score: {score}/10</p>
</div>
<p style="color:#8888aa;font-size:13px;line-height:1.7;margin:0 0 16px;"><strong style="color:#f0f0f8;">Call Summary:</strong><br>{summary}</p>
<div style="background:#0a0a14;border:1px solid rgba(124,58,237,0.2);border-radius:10px;padding:14px;margin:0 0 20px;">
  <p style="color:#a78bfa;font-size:11px;font-weight:700;margin:0 0 6px;text-transform:uppercase;">Recommended Action</p>
  <p style="color:#f0f0f8;font-size:13px;font-weight:600;margin:0;">{recommended_action}</p>
</div>
<a href="https://app.tzmicha.com" style="display:inline-block;background:linear-gradient(135deg,#f87171,#ef4444);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:700;">View Lead Now →</a>"""
    return _send(to, f"🔥 Hot Lead: {lead_name} (Score {score}/10)", _base(content))

def send_call_summary(to: str, lead_name: str, category: str, score: int, summary: str, duration: int):
    emoji = "🔥" if category == "hot" else "🌤️" if category == "warm" else "❄️"
    dur = f"{duration // 60}m {duration % 60}s"
    content = f"""
<h2 style="color:#f0f0f8;font-size:18px;margin:0 0 16px;">📞 Call Completed</h2>
<div style="display:grid;gap:8px;margin:0 0 20px;">
  <div style="background:#0a0a14;border:1px solid #1e1e30;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;">
    <span style="color:#55556a;font-size:12px;">Lead</span>
    <span style="color:#f0f0f8;font-size:13px;font-weight:700;">{lead_name}</span>
  </div>
  <div style="background:#0a0a14;border:1px solid #1e1e30;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;">
    <span style="color:#55556a;font-size:12px;">Category</span>
    <span style="color:#f0f0f8;font-size:13px;font-weight:700;">{emoji} {category.upper()}</span>
  </div>
  <div style="background:#0a0a14;border:1px solid #1e1e30;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;">
    <span style="color:#55556a;font-size:12px;">Score</span>
    <span style="color:#f0f0f8;font-size:13px;font-weight:700;">{score}/10</span>
  </div>
  <div style="background:#0a0a14;border:1px solid #1e1e30;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;">
    <span style="color:#55556a;font-size:12px;">Duration</span>
    <span style="color:#f0f0f8;font-size:13px;font-weight:700;">{dur}</span>
  </div>
</div>
<p style="color:#8888aa;font-size:13px;line-height:1.7;margin:0 0 20px;"><strong style="color:#f0f0f8;">Summary:</strong><br>{summary}</p>
<a href="https://app.tzmicha.com" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:700;">View Full Report →</a>"""
    return _send(to, f"📞 Call Summary: {lead_name} — {emoji} {category.upper()}", _base(content))

def send_campaign_complete(to: str, campaign_name: str, total: int, hot: int, warm: int, cold: int):
    content = f"""
<h2 style="color:#f0f0f8;font-size:18px;margin:0 0 16px;">🎯 Campaign Complete: {campaign_name}</h2>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:0 0 20px;">
  <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:14px;text-align:center;">
    <p style="color:#f87171;font-size:22px;font-weight:900;margin:0;">{hot}</p>
    <p style="color:#f87171;font-size:11px;margin:4px 0 0;">🔥 Hot</p>
  </div>
  <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:14px;text-align:center;">
    <p style="color:#fbbf24;font-size:22px;font-weight:900;margin:0;">{warm}</p>
    <p style="color:#fbbf24;font-size:11px;margin:4px 0 0;">🌤️ Warm</p>
  </div>
  <div style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.2);border-radius:10px;padding:14px;text-align:center;">
    <p style="color:#60a5fa;font-size:22px;font-weight:900;margin:0;">{cold}</p>
    <p style="color:#60a5fa;font-size:11px;margin:4px 0 0;">❄️ Cold</p>
  </div>
</div>
<p style="color:#8888aa;font-size:13px;margin:0 0 20px;">Total calls: <strong style="color:#f0f0f8;">{total}</strong> · Conversion rate: <strong style="color:#10b981;">{round(hot/max(total,1)*100,1)}%</strong></p>
<a href="https://app.tzmicha.com" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:700;">View Campaign Report →</a>"""
    return _send(to, f"🎯 Campaign Complete: {campaign_name} — {hot} Hot Leads!", _base(content))
