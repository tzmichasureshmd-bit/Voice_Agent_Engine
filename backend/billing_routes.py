from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, Invoice, Client, Wallet, BillingSettings
from datetime import datetime
import io, os

router = APIRouter(prefix="/billing", tags=["billing"])

# ── helpers ──────────────────────────────────────────────────
def _get_wallet(client_id: int, db: Session) -> Wallet:
    w = db.query(Wallet).filter(Wallet.client_id == client_id).first()
    if not w:
        w = Wallet(client_id=client_id, balance_inr=0.0)
        db.add(w); db.commit(); db.refresh(w)
    return w

def _get_settings(client_id: int, db: Session) -> BillingSettings:
    s = db.query(BillingSettings).filter(BillingSettings.client_id == client_id).first()
    if not s:
        s = BillingSettings(client_id=client_id)
        db.add(s); db.commit(); db.refresh(s)
    return s

# ── Plans (INR base) ─────────────────────────────────────────
PLANS = [
    { "id": "starter", "name": "Starter", "price_inr": 0,    "mins": 0,    "popular": False,
      "features": ["Pay-as-you-go", "₹3/min normal", "₹5.50/min premium"] },
    { "id": "growth",  "name": "Growth",  "price_inr": 2499, "mins": 1000, "popular": True,
      "features": ["1,000 min included", "₹2.50/min normal", "₹4.80/min premium"] },
    { "id": "scale",   "name": "Scale",   "price_inr": 9999, "mins": 5000, "popular": False,
      "features": ["5,000 min included", "₹2.20/min normal", "₹4.20/min premium"] },
]

# ── GET wallet ───────────────────────────────────────────────
@router.get("/wallet")
def get_wallet(client_id: int, db: Session = Depends(get_db)):
    w = _get_wallet(client_id, db)
    return {"balance_inr": w.balance_inr, "updated_at": str(w.updated_at)}

# ── Add money (Stripe Checkout) ──────────────────────────────
class AddMoneyRequest(BaseModel):
    client_id:  int
    amount_inr: float
    success_url: str = "http://localhost:5173/billing?payment=success"
    cancel_url:  str = "http://localhost:5173/billing?payment=cancelled"

@router.post("/wallet/add-money")
def add_money(req: AddMoneyRequest, db: Session = Depends(get_db)):
    RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
    STRIPE_KEY          = os.getenv("STRIPE_SECRET_KEY", "")

    # ── Razorpay (Primary — India) ──
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET and not RAZORPAY_KEY_ID.startswith('your_'):
        import razorpay
        rz = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        order = rz.order.create({
            "amount": int(req.amount_inr * 100),  # paise
            "currency": "INR",
            "receipt": f"tzm_{req.client_id}_{int(req.amount_inr)}",
            "notes": {"client_id": str(req.client_id), "amount_inr": str(req.amount_inr)}
        })
        return {
            "gateway": "razorpay",
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID,
            "checkout_url": None,  # frontend handles Razorpay checkout
        }

    # ── Stripe (International) ──
    elif STRIPE_KEY and not STRIPE_KEY.startswith('your_'):
        import stripe
        stripe.api_key = STRIPE_KEY
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "inr",
                    "product_data": {"name": "TZMICHA Wallet Top-up"},
                    "unit_amount": int(req.amount_inr * 100),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=req.success_url,
            cancel_url=req.cancel_url,
            metadata={"client_id": req.client_id, "amount_inr": req.amount_inr},
        )
        return {"gateway": "stripe", "checkout_url": session.url, "session_id": session.id}

    # ── Dev mode — no payment keys ──
    else:
        w = _get_wallet(req.client_id, db)
        w.balance_inr += req.amount_inr
        db.commit()
        return {"gateway": "dev", "checkout_url": None, "credited": True,
                "new_balance": w.balance_inr,
                "note": "Dev mode — add RAZORPAY_KEY_ID to .env for live payments"}

# ── Stripe webhook — credit wallet after payment ─────────────
from fastapi import Request
@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    STRIPE_KEY        = os.getenv("STRIPE_SECRET_KEY", "")
    WEBHOOK_SECRET    = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not STRIPE_KEY:
        return {"ok": True}
    import stripe
    stripe.api_key = STRIPE_KEY
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid webhook")
    if event["type"] == "checkout.session.completed":
        meta       = event["data"]["object"]["metadata"]
        client_id  = int(meta.get("client_id", 0))
        amount_inr = float(meta.get("amount_inr", 0))
        if client_id and amount_inr:
            w = _get_wallet(client_id, db)
            w.balance_inr += amount_inr
            # Auto-create invoice
            count = db.query(Invoice).count() + 1
            inv = Invoice(
                client_id=client_id,
                invoice_no=f"INV-TZMICHA-{count:04d}",
                period=datetime.utcnow().strftime("%Y-%m"),
                plan="Wallet Top-up",
                amount_inr=amount_inr,
                status="paid",
            )
            db.add(inv); db.commit()
    return {"ok": True}

# ── GET plans ────────────────────────────────────────────────
@router.get("/plans")
def get_plans():
    return {"plans": PLANS}

# ── Switch plan ──────────────────────────────────────────────
class SwitchPlanRequest(BaseModel):
    client_id: int
    plan_id:   str

@router.post("/plans/switch")
def switch_plan(req: SwitchPlanRequest, db: Session = Depends(get_db)):
    plan = next((p for p in PLANS if p["id"] == req.plan_id), None)
    if not plan:
        raise HTTPException(400, "Invalid plan")
    client = db.query(Client).filter(Client.id == req.client_id).first()
    if not client:
        raise HTTPException(404, "Client not found")
    client.plan = req.plan_id
    # Deduct plan cost from wallet if not free
    if plan["price_inr"] > 0:
        w = _get_wallet(req.client_id, db)
        if w.balance_inr < plan["price_inr"]:
            raise HTTPException(400, f"Insufficient balance. Need ₹{plan['price_inr']}, have ₹{w.balance_inr:.0f}")
        w.balance_inr -= plan["price_inr"]
        # Create invoice
        count = db.query(Invoice).count() + 1
        inv = Invoice(
            client_id=req.client_id,
            invoice_no=f"INV-TZMICHA-{count:04d}",
            period=datetime.utcnow().strftime("%Y-%m"),
            plan=plan["name"],
            amount_inr=plan["price_inr"],
            status="paid",
        )
        db.add(inv)
    db.commit()
    return {"ok": True, "plan": req.plan_id, "new_balance": _get_wallet(req.client_id, db).balance_inr}

# ── GET / SAVE spend caps ────────────────────────────────────
@router.get("/spend-caps")
def get_spend_caps(client_id: int, db: Session = Depends(get_db)):
    s = _get_settings(client_id, db)
    return {"daily_cap": s.daily_cap, "monthly_cap": s.monthly_cap}

class SpendCapsRequest(BaseModel):
    client_id:   int
    daily_cap:   float
    monthly_cap: float

@router.post("/spend-caps")
def save_spend_caps(req: SpendCapsRequest, db: Session = Depends(get_db)):
    s = _get_settings(req.client_id, db)
    s.daily_cap   = req.daily_cap
    s.monthly_cap = req.monthly_cap
    db.commit()
    return {"ok": True, "daily_cap": s.daily_cap, "monthly_cap": s.monthly_cap}

# ── GET / SAVE auto-recharge ─────────────────────────────────
@router.get("/auto-recharge")
def get_auto_recharge(client_id: int, db: Session = Depends(get_db)):
    s = _get_settings(client_id, db)
    return {"auto_recharge": s.auto_recharge, "recharge_below": s.recharge_below, "recharge_amount": s.recharge_amount}

class AutoRechargeRequest(BaseModel):
    client_id:       int
    auto_recharge:   bool
    recharge_below:  float
    recharge_amount: float

@router.post("/auto-recharge")
def save_auto_recharge(req: AutoRechargeRequest, db: Session = Depends(get_db)):
    s = _get_settings(req.client_id, db)
    s.auto_recharge   = req.auto_recharge
    s.recharge_below  = req.recharge_below
    s.recharge_amount = req.recharge_amount
    db.commit()
    return {"ok": True}

# ── Invoices list ────────────────────────────────────────────
@router.get("/invoices")
def list_invoices(client_id: int, db: Session = Depends(get_db)):
    rows = db.query(Invoice).filter(Invoice.client_id == client_id).order_by(Invoice.issued_at.desc()).all()
    return [
        {"id": r.id, "invoice_no": r.invoice_no, "period": r.period,
         "plan": r.plan, "amount_inr": r.amount_inr,
         "status": r.status, "issued_at": r.issued_at.strftime("%b %d, %Y")}
        for r in rows
    ]

# ── Create invoice manually ──────────────────────────────────
class CreateInvoiceRequest(BaseModel):
    client_id:  int
    plan:       str
    amount_inr: float
    period:     str = ""
    status:     str = "paid"

@router.post("/invoices")
def create_invoice(req: CreateInvoiceRequest, db: Session = Depends(get_db)):
    count = db.query(Invoice).count() + 1
    inv = Invoice(
        client_id  = req.client_id,
        invoice_no = f"INV-TZMICHA-{count:04d}",
        period     = req.period or datetime.utcnow().strftime("%Y-%m"),
        plan       = req.plan,
        amount_inr = req.amount_inr,
        status     = req.status,
    )
    db.add(inv); db.commit(); db.refresh(inv)
    return {"invoice_no": inv.invoice_no, "id": inv.id}

# ── PDF / receipt download ───────────────────────────────────
@router.get("/invoices/{invoice_id}/pdf")
def download_invoice(invoice_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    client = db.query(Client).filter(Client.id == inv.client_id).first()
    lines = [
        "=" * 54,
        "        TZMICHA — AI Voice Engine",
        "        https://www.tzmicha.com",
        "        Sol Hyder, Hyderabad, India",
        "        support@tzmicha.com",
        "=" * 54,
        f"  Invoice No  : {inv.invoice_no}",
        f"  Client      : {client.company_name if client else 'N/A'}",
        f"  Period      : {inv.period}",
        f"  Plan        : {inv.plan}",
        f"  Amount      : ₹{inv.amount_inr:,.0f}",
        f"  Status      : {inv.status.upper()}",
        f"  Date        : {inv.issued_at.strftime('%B %d, %Y')}",
        "=" * 54,
        "  Thank you for choosing TZMICHA Voice Engine.",
        "  www.tzmicha.com",
        "=" * 54,
    ]
    content = "\n".join(lines).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={inv.invoice_no}.txt"},
    )
