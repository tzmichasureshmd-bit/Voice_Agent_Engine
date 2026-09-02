import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Plus, Check, Download, ChevronDown, RefreshCw, Shield } from 'lucide-react'
import api from '../api'

// ── Currencies ───────────────────────────────────────────────
const CURRENCIES = [
  { code: 'INR', symbol: '₹',   rate: 1,       flag: '🇮🇳' },
  { code: 'USD', symbol: '$',   rate: 0.012,   flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',   rate: 0.011,   flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   rate: 0.0094,  flag: '🇬🇧' },
  { code: 'AED', symbol: 'د.إ', rate: 0.044,   flag: '🇦🇪' },
  { code: 'SGD', symbol: 'S$',  rate: 0.016,   flag: '🇸🇬' },
]

function fmt(inr, cur) {
  const v = (inr * cur.rate)
  return `${cur.symbol}${v.toLocaleString('en-IN', { maximumFractionDigits: cur.code === 'INR' ? 0 : 2 })}`
}

// ── Plans data ───────────────────────────────────────────────
const PLANS = [
  { id: 'starter', name: 'Starter', inr: 0,    mins: 0,    popular: false,
    features: ['Pay-as-you-go', '₹3/min normal', '₹5.50/min premium'] },
  { id: 'growth',  name: 'Growth',  inr: 2499, mins: 1000, popular: true,
    features: ['1,000 min included', '₹2.50/min normal', '₹4.80/min premium'] },
  { id: 'scale',   name: 'Scale',   inr: 9999, mins: 5000, popular: false,
    features: ['5,000 min included', '₹2.20/min normal', '₹4.20/min premium'] },
]

// ── Sample invoices ─────────────────────────────────────────
const SAMPLE_INV = []

// ── Currency Picker ──────────────────────────────────────────
function CurrencyPicker({ cur, setCur }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(p => !p)} style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
        borderRadius: '10px', cursor: 'pointer', background: 'var(--bg-card)',
        border: '1px solid rgba(124,58,237,0.3)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600',
      }}>
        {cur.flag} {cur.code} <ChevronDown size={12} />
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute', top: '38px', right: 0, zIndex: 999,
            background: 'var(--bg-card)', border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: '12px', overflow: 'hidden', minWidth: '140px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}>
          {CURRENCIES.map(c => (
            <button key={c.code} onClick={() => { setCur(c); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
              padding: '9px 14px', border: 'none', cursor: 'pointer',
              background: c.code === cur.code ? 'rgba(124,58,237,0.15)' : 'transparent',
              color: c.code === cur.code ? '#a78bfa' : 'var(--text-primary)', fontSize: '13px', fontWeight: '500',
            }}>
              {c.flag} {c.code}
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '11px' }}>{c.symbol}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

// ── Add Money Modal ──────────────────────────────────────────
const QUICK_AMOUNTS = [500, 1000, 2000, 5000]

function AddMoneyModal({ cur, onClose, onSuccess }) {
  const [amount, setAmount]   = useState(1000)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const clientId = parseInt(localStorage.getItem('client_id') || '0')

  const pay = async () => {
    if (!amount || amount < 1) return setMsg('Enter a valid amount')
    setLoading(true); setMsg('')
    try {
      const r = await api.post('/billing/wallet/add-money', {
        client_id:   clientId,
        amount_inr:  amount,
        success_url: window.location.href + '?payment=success',
        cancel_url:  window.location.href + '?payment=cancelled',
      })
      if (r.data.checkout_url) {
        window.location.href = r.data.checkout_url
      } else {
        setMsg(`✅ ₹${amount.toLocaleString()} credited to wallet!`)
        setTimeout(() => { onSuccess(); onClose() }, 1200)
      }
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Payment failed. Try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: '18px', padding: '28px', width: '360px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Add Money to Wallet</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
          {QUICK_AMOUNTS.map(a => (
            <button key={a} onClick={() => setAmount(a)} style={{
              padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: '700',
              background: amount === a ? 'rgba(124,58,237,0.2)' : 'var(--border)',
              color: amount === a ? '#a78bfa' : 'var(--text-secondary)',
              outline: amount === a ? '1px solid #7c3aed' : 'none',
            }}>₹{a.toLocaleString()}</button>
          ))}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Custom amount (₹)</p>
        <input type="number" value={amount} onChange={e => setAmount(+e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '10px', marginBottom: '8px',
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700',
          }} />
        {cur.code !== 'INR' && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>≈ {fmt(amount, cur)}</p>
        )}
        {msg && <p style={{ fontSize: '12px', marginBottom: '12px', color: msg.startsWith('✅') ? '#10b981' : '#f87171' }}>{msg}</p>}
        <button onClick={pay} disabled={loading} style={{
          width: '100%', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
          fontSize: '14px', fontWeight: '800', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Processing...' : `Pay ${fmt(amount, cur)}`}
        </button>
        <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '10px', textAlign: 'center' }}>
          Stripe · Razorpay · UPI — secure payment
        </p>
      </motion.div>
    </div>
  )
}

// ── A) Wallet Card ───────────────────────────────────────────
function WalletCard({ cur }) {
  const [balance, setBalance]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const clientId = localStorage.getItem('client_id')

  const loadBalance = () =>
    api.get(`/billing/wallet?client_id=${clientId}`)
      .then(r => setBalance(r.data.balance_inr))
      .catch(() => setBalance(0))

  useEffect(() => { loadBalance() }, [])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('payment') === 'success') {
      loadBalance()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--bg-card)', border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: '16px', padding: '24px',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Wallet size={14} color='#a78bfa' />
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Wallet Balance</span>
        </div>
        <p style={{ fontSize: '38px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>
          {balance === null ? '—' : fmt(balance, cur)}
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Prepaid — calling pauses automatically if balance runs out.
        </p>
        <button onClick={() => setShowModal(true)} style={{
          width: '100%', padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
          fontSize: '13px', fontWeight: '700',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}>
          <Plus size={14} /> Add money
        </button>
      </motion.div>
      {showModal && <AddMoneyModal cur={cur} onClose={() => setShowModal(false)} onSuccess={loadBalance} />}
    </>
  )
}

// ── B) Plans Cards ───────────────────────────────────────────
function PlansSection({ cur, currentPlan, setCurrentPlan }) {
  return (
    <div>
      <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>Plans</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {PLANS.map((p, i) => {
          const active = currentPlan === p.id
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{
                background: 'var(--bg-card)', borderRadius: '14px', padding: '20px', position: 'relative',
                border: active ? '1px solid #7c3aed' : p.popular ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--border)',
              }}>
              {p.popular && (
                <div style={{
                  position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                  background: '#7c3aed', color: '#fff', fontSize: '9px', fontWeight: '800',
                  padding: '3px 12px', borderRadius: '20px', letterSpacing: '0.8px',
                }}>POPULAR</div>
              )}
              <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>{p.name}</p>
              <p style={{ fontSize: '28px', fontWeight: '900', color: p.popular ? '#a78bfa' : 'var(--text-primary)', marginBottom: '14px' }}>
                {p.inr === 0 ? `${cur.symbol}0` : fmt(p.inr, cur)}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '400' }}>/mo</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '18px' }}>
                {p.features.map((f, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <Check size={11} color='#7c3aed' /> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => setCurrentPlan(p.id)} style={{
                width: '100%', padding: '9px', borderRadius: '9px', border: 'none', cursor: active ? 'default' : 'pointer',
                background: active ? 'rgba(124,58,237,0.15)' : p.popular ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'var(--border)',
                color: active ? '#a78bfa' : 'var(--text-primary)', fontSize: '12px', fontWeight: '700',
              }}>
                {active ? '✓ Current Plan' : `Switch to ${p.name}`}
              </button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Create Invoice Modal ─────────────────────────────────────
function CreateInvoiceModal({ clientId, onClose, onSuccess }) {
  const [plan, setPlan]     = useState('Growth')
  const [amount, setAmount] = useState(2499)
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [status, setStatus] = useState('paid')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState('')

  const create = async () => {
    if (!plan.trim() || !amount || amount < 1) return setMsg('Enter a plan and valid amount')
    setLoading(true); setMsg('')
    try {
      const r = await api.post('/billing/invoices', {
        client_id: clientId,
        plan,
        amount_inr: amount,
        period,
        status,
      })
      setMsg(`✅ Invoice ${r.data.invoice_no} created!`)
      setTimeout(onSuccess, 900)
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Failed to create invoice')
    }
    setLoading(false)
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '9px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '600' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '18px', padding: '28px', width: '400px', boxShadow: '0 24px 60px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Create Invoice</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={lbl}>Plan / Description</label>
            <input value={plan} onChange={e => setPlan(e.target.value)} placeholder="e.g. Growth Plan" style={inp} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Amount (₹)</label>
              <input type="number" value={amount} onChange={e => setAmount(+e.target.value)} style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Period</label>
              <input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {msg && <p style={{ fontSize: '12px', color: msg.startsWith('✅') ? '#10b981' : '#f87171' }}>{msg}</p>}
          <button onClick={create} disabled={loading} style={{
            width: '100%', padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff',
            fontSize: '13px', fontWeight: '800', opacity: loading ? 0.7 : 1, marginTop: '4px',
          }}>
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── C) Invoices Table ────────────────────────────────────────
function InvoicesSection({ cur }) {
  const [tab, setTab]         = useState('invoices')
  const [invoices, setInvoices] = useState(SAMPLE_INV)
  const [showCreate, setShowCreate] = useState(false)
  const clientId = parseInt(localStorage.getItem('client_id') || '0')

  const loadInvoices = () =>
    api.get('/billing/invoices').then(r => { setInvoices(r.data || []) }).catch(() => {})

  useEffect(() => { loadInvoices() }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        {['transactions', 'payments', 'invoices'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '5px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: '600', textTransform: 'capitalize',
            background: tab === t ? '#7c3aed' : 'transparent',
            color: tab === t ? '#fff' : 'var(--text-muted)',
          }}>{t}</button>
        ))}
        {tab === 'invoices' && (
          <button onClick={() => setShowCreate(true)} style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff',
            fontSize: '12px', fontWeight: '700',
          }}>
            <Plus size={13} /> New Invoice
          </button>
        )}
      </div>

      {showCreate && (
        <CreateInvoiceModal
          clientId={clientId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { loadInvoices(); setShowCreate(false) }}
        />
      )}

      {tab === 'invoices' && invoices.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
          No invoices yet.
        </div>
      )}
      {tab === 'invoices' && invoices.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Invoice', 'Period', 'Total', 'Status', 'Date', 'PDF'].map(h => (
                <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--bg-input)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '13px 20px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{inv.invoice_no}</td>
                <td style={{ padding: '13px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>{inv.period}</td>
                <td style={{ padding: '13px 20px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700' }}>{fmt(inv.amount_inr, cur)}</td>
                <td style={{ padding: '13px 20px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 10px', borderRadius: '999px', textTransform: 'capitalize' }}>
                    {inv.status}
                  </span>
                </td>
                <td style={{ padding: '13px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>{inv.issued_at}</td>
                <td style={{ padding: '13px 20px' }}>
                  <button onClick={() => window.open(`/billing/invoices/${inv.id}/pdf`)}
                    style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', color: '#a78bfa' }}>
                    <Download size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab !== 'invoices' && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
          No {tab} yet.
        </div>
      )}
    </motion.div>
  )
}

// ── D) Spend Caps + Auto-recharge ────────────────────────────
function SpendControls() {
  const clientId = parseInt(localStorage.getItem('client_id') || '0')
  const [dailyCap,   setDailyCap]   = useState(0)
  const [monthlyCap, setMonthlyCap] = useState(0)
  const [autoOn,     setAutoOn]     = useState(false)
  const [threshold,  setThreshold]  = useState(200)
  const [topup,      setTopup]      = useState(1000)
  const [capMsg,     setCapMsg]     = useState('')
  const [autoMsg,    setAutoMsg]    = useState('')
  const [capSaving,  setCapSaving]  = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)

  // Load saved settings on mount
  useEffect(() => {
    api.get(`/billing/spend-caps?client_id=${clientId}`)
      .then(r => { setDailyCap(r.data.daily_cap); setMonthlyCap(r.data.monthly_cap) })
      .catch(() => {})
    api.get(`/billing/auto-recharge?client_id=${clientId}`)
      .then(r => { setAutoOn(r.data.auto_recharge); setThreshold(r.data.recharge_below); setTopup(r.data.recharge_amount) })
      .catch(() => {})
  }, [])

  const saveCaps = async () => {
    setCapSaving(true); setCapMsg('')
    try {
      await api.post('/billing/spend-caps', { client_id: clientId, daily_cap: dailyCap, monthly_cap: monthlyCap })
      setCapMsg('✅ Saved!')
    } catch { setCapMsg('❌ Failed to save') }
    setCapSaving(false)
    setTimeout(() => setCapMsg(''), 2500)
  }

  const saveAuto = async () => {
    setAutoSaving(true); setAutoMsg('')
    try {
      await api.post('/billing/auto-recharge', { client_id: clientId, auto_recharge: autoOn, recharge_below: threshold, recharge_amount: topup })
      setAutoMsg('✅ Saved!')
    } catch { setAutoMsg('❌ Failed to save') }
    setAutoSaving(false)
    setTimeout(() => setAutoMsg(''), 2500)
  }

  const inp = { width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

      {/* Spend Caps */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Shield size={14} color='#a78bfa' />
          <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Spend caps</p>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Hard safety limit — calling pauses once you hit the cap. Set 0 for unlimited.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Daily cap (₹)</p>
            <input type='number' value={dailyCap} onChange={e => setDailyCap(+e.target.value)} style={inp} />
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>0 = unlimited</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Monthly cap (₹)</p>
            <input type='number' value={monthlyCap} onChange={e => setMonthlyCap(+e.target.value)} style={inp} />
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>0 = unlimited</p>
          </div>
        </div>
        {capMsg && <p style={{ fontSize: '12px', color: capMsg.startsWith('✅') ? '#10b981' : '#f87171', marginBottom: '10px' }}>{capMsg}</p>}
        <button onClick={saveCaps} disabled={capSaving} style={{
          width: '100%', padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
          fontSize: '12px', fontWeight: '700', opacity: capSaving ? 0.7 : 1,
        }}>
          <Shield size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          {capSaving ? 'Saving...' : 'Save spend caps'}
        </button>
      </div>

      {/* Auto-recharge */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <RefreshCw size={14} color='#a78bfa' />
          <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Auto-recharge</p>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Never run out mid-campaign. Auto top-up when balance drops below threshold.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div onClick={() => setAutoOn(p => !p)} style={{
            width: '38px', height: '22px', borderRadius: '11px', cursor: 'pointer', position: 'relative',
            background: autoOn ? '#7c3aed' : 'var(--border)', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: '3px', left: autoOn ? '19px' : '3px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            }} />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Enable auto-recharge</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Automatically add funds when wallet runs low</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', opacity: autoOn ? 1 : 0.4 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>When balance falls below (₹)</p>
            <input type='number' value={threshold} onChange={e => setThreshold(+e.target.value)} disabled={!autoOn} style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>Automatically add (₹)</p>
            <input type='number' value={topup} onChange={e => setTopup(+e.target.value)} disabled={!autoOn} style={inp} />
          </div>
        </div>
        {autoMsg && <p style={{ fontSize: '12px', color: autoMsg.startsWith('✅') ? '#10b981' : '#f87171', marginBottom: '10px' }}>{autoMsg}</p>}
        <button onClick={saveAuto} disabled={autoSaving} style={{
          width: '100%', padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
          fontSize: '12px', fontWeight: '700', opacity: autoSaving ? 0.7 : 1,
        }}>
          {autoSaving ? 'Saving...' : 'Save preferences'}
        </button>
        <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'center' }}>
          Stripe · Razorpay · UPI — connect in .env
        </p>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function Billing() {
  const [cur, setCur]               = useState(CURRENCIES[0])
  const [currentPlan, setCurrentPlan] = useState('starter')

  useEffect(() => {
    api.get('/usage').then(r => {
      if (r.data?.plan) setCurrentPlan(r.data.plan)
    }).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>Billing</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Wallet · Plans · Invoices — powered by Stripe / Razorpay
          </p>
        </div>
        <CurrencyPicker cur={cur} setCur={setCur} />
      </motion.div>

      {/* A) Wallet */}
      <WalletCard cur={cur} />

      {/* D) Spend Caps + Auto-recharge */}
      <SpendControls />

      {/* B) Plans */}
      <PlansSection cur={cur} currentPlan={currentPlan} setCurrentPlan={setCurrentPlan} />

      {/* C) Invoices */}
      <InvoicesSection cur={cur} />
    </div>
  )
}
