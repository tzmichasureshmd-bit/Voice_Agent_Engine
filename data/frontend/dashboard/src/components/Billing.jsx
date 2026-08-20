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

// ── Sample invoices (replaced by API when backend ready) ─────
const SAMPLE_INV = [
  { id: 1, invoice_no: 'INV-TZMICHA-0002', period: '2026-07', plan: 'Growth', amount_inr: 2499, status: 'paid',    issued_at: 'Jul 17, 2026' },
  { id: 2, invoice_no: 'INV-TZMICHA-0001', period: '2026-06', plan: 'Growth', amount_inr: 2499, status: 'paid',    issued_at: 'Jun 30, 2026' },
]

// ── Currency Picker ──────────────────────────────────────────
function CurrencyPicker({ cur, setCur }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(p => !p)} style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
        borderRadius: '10px', cursor: 'pointer', background: '#0e0e1a',
        border: '1px solid rgba(124,58,237,0.3)', color: '#f0f0f8', fontSize: '13px', fontWeight: '600',
      }}>
        {cur.flag} {cur.code} <ChevronDown size={12} />
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute', top: '38px', right: 0, zIndex: 999,
            background: '#0e0e1a', border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: '12px', overflow: 'hidden', minWidth: '140px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}>
          {CURRENCIES.map(c => (
            <button key={c.code} onClick={() => { setCur(c); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
              padding: '9px 14px', border: 'none', cursor: 'pointer',
              background: c.code === cur.code ? 'rgba(124,58,237,0.15)' : 'transparent',
              color: c.code === cur.code ? '#a78bfa' : '#f0f0f8', fontSize: '13px', fontWeight: '500',
            }}>
              {c.flag} {c.code}
              <span style={{ marginLeft: 'auto', color: '#55556a', fontSize: '11px' }}>{c.symbol}</span>
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
          background: '#0e0e1a', border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: '18px', padding: '28px', width: '360px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '16px', fontWeight: '800', color: '#f0f0f8' }}>Add Money to Wallet</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#55556a' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
          {QUICK_AMOUNTS.map(a => (
            <button key={a} onClick={() => setAmount(a)} style={{
              padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: '700',
              background: amount === a ? 'rgba(124,58,237,0.2)' : '#1e1e30',
              color: amount === a ? '#a78bfa' : '#9999b3',
              outline: amount === a ? '1px solid #7c3aed' : 'none',
            }}>₹{a.toLocaleString()}</button>
          ))}
        </div>
        <p style={{ fontSize: '11px', color: '#55556a', marginBottom: '6px' }}>Custom amount (₹)</p>
        <input type="number" value={amount} onChange={e => setAmount(+e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '10px', marginBottom: '8px',
            background: '#0a0a14', border: '1px solid #1e1e30',
            color: '#f0f0f8', fontSize: '16px', fontWeight: '700',
          }} />
        {cur.code !== 'INR' && (
          <p style={{ fontSize: '11px', color: '#55556a', marginBottom: '12px' }}>≈ {fmt(amount, cur)}</p>
        )}
        {msg && <p style={{ fontSize: '12px', marginBottom: '12px', color: msg.startsWith('✅') ? '#10b981' : '#f87171' }}>{msg}</p>}
        <button onClick={pay} disabled={loading} style={{
          width: '100%', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
          fontSize: '14px', fontWeight: '800', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Processing...' : `Pay ${fmt(amount, cur)}`}
        </button>
        <p style={{ fontSize: '10px', color: '#33334a', marginTop: '10px', textAlign: 'center' }}>
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
          background: '#0e0e1a', border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: '16px', padding: '24px',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Wallet size={14} color='#a78bfa' />
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px' }}>Wallet Balance</span>
        </div>
        <p style={{ fontSize: '38px', fontWeight: '900', color: '#f0f0f8', marginBottom: '4px' }}>
          {balance === null ? '—' : fmt(balance, cur)}
        </p>
        <p style={{ fontSize: '11px', color: '#55556a', marginBottom: '20px' }}>
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
      <p style={{ fontSize: '13px', fontWeight: '700', color: '#f0f0f8', marginBottom: '14px' }}>Plans</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {PLANS.map((p, i) => {
          const active = currentPlan === p.id
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{
                background: '#0e0e1a', borderRadius: '14px', padding: '20px', position: 'relative',
                border: active ? '1px solid #7c3aed' : p.popular ? '1px solid rgba(124,58,237,0.3)' : '1px solid #1e1e30',
              }}>
              {p.popular && (
                <div style={{
                  position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                  background: '#7c3aed', color: '#fff', fontSize: '9px', fontWeight: '800',
                  padding: '3px 12px', borderRadius: '20px', letterSpacing: '0.8px',
                }}>POPULAR</div>
              )}
              <p style={{ fontSize: '15px', fontWeight: '800', color: '#f0f0f8', marginBottom: '6px' }}>{p.name}</p>
              <p style={{ fontSize: '28px', fontWeight: '900', color: p.popular ? '#a78bfa' : '#f0f0f8', marginBottom: '14px' }}>
                {p.inr === 0 ? `${cur.symbol}0` : fmt(p.inr, cur)}
                <span style={{ fontSize: '12px', color: '#55556a', fontWeight: '400' }}>/mo</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '18px' }}>
                {p.features.map((f, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#9999b3' }}>
                    <Check size={11} color='#7c3aed' /> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => setCurrentPlan(p.id)} style={{
                width: '100%', padding: '9px', borderRadius: '9px', border: 'none', cursor: active ? 'default' : 'pointer',
                background: active ? 'rgba(124,58,237,0.15)' : p.popular ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#1e1e30',
                color: active ? '#a78bfa' : '#f0f0f8', fontSize: '12px', fontWeight: '700',
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

// ── C) Invoices Table ────────────────────────────────────────
function InvoicesSection({ cur }) {
  const [tab, setTab]         = useState('invoices')
  const [invoices, setInvoices] = useState(SAMPLE_INV)

  useEffect(() => {
    api.get('/billing/invoices').then(r => { if (r.data?.length) setInvoices(r.data) }).catch(() => {})
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      style={{ background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '14px 20px', borderBottom: '1px solid #1e1e30' }}>
        {['transactions', 'payments', 'invoices'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '5px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: '600', textTransform: 'capitalize',
            background: tab === t ? '#7c3aed' : 'transparent',
            color: tab === t ? '#fff' : '#55556a',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'invoices' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e1e30' }}>
              {['Invoice', 'Period', 'Total', 'Status', 'Date', 'PDF'].map(h => (
                <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#33334a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #0a0a14' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '13px 20px', fontSize: '13px', color: '#f0f0f8', fontWeight: '600' }}>{inv.invoice_no}</td>
                <td style={{ padding: '13px 20px', fontSize: '12px', color: '#55556a' }}>{inv.period}</td>
                <td style={{ padding: '13px 20px', fontSize: '13px', color: '#f0f0f8', fontWeight: '700' }}>{fmt(inv.amount_inr, cur)}</td>
                <td style={{ padding: '13px 20px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 10px', borderRadius: '999px', textTransform: 'capitalize' }}>
                    {inv.status}
                  </span>
                </td>
                <td style={{ padding: '13px 20px', fontSize: '12px', color: '#55556a' }}>{inv.issued_at}</td>
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
        <div style={{ padding: '40px', textAlign: 'center', color: '#33334a', fontSize: '13px' }}>
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

  const inp = { width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0a0a14', border: '1px solid #1e1e30', color: '#f0f0f8', fontSize: '13px' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

      {/* Spend Caps */}
      <div style={{ background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Shield size={14} color='#a78bfa' />
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#f0f0f8' }}>Spend caps</p>
        </div>
        <p style={{ fontSize: '11px', color: '#55556a', marginBottom: '16px' }}>
          Hard safety limit — calling pauses once you hit the cap. Set 0 for unlimited.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: '#55556a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Daily cap (₹)</p>
            <input type='number' value={dailyCap} onChange={e => setDailyCap(+e.target.value)} style={inp} />
            <p style={{ fontSize: '10px', color: '#33334a', marginTop: '4px' }}>0 = unlimited</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: '#55556a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Monthly cap (₹)</p>
            <input type='number' value={monthlyCap} onChange={e => setMonthlyCap(+e.target.value)} style={inp} />
            <p style={{ fontSize: '10px', color: '#33334a', marginTop: '4px' }}>0 = unlimited</p>
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
      <div style={{ background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <RefreshCw size={14} color='#a78bfa' />
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#f0f0f8' }}>Auto-recharge</p>
        </div>
        <p style={{ fontSize: '11px', color: '#55556a', marginBottom: '16px' }}>
          Never run out mid-campaign. Auto top-up when balance drops below threshold.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div onClick={() => setAutoOn(p => !p)} style={{
            width: '38px', height: '22px', borderRadius: '11px', cursor: 'pointer', position: 'relative',
            background: autoOn ? '#7c3aed' : '#1e1e30', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: '3px', left: autoOn ? '19px' : '3px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            }} />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#f0f0f8' }}>Enable auto-recharge</p>
            <p style={{ fontSize: '10px', color: '#55556a' }}>Automatically add funds when wallet runs low</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', opacity: autoOn ? 1 : 0.4 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: '#55556a', marginBottom: '6px' }}>When balance falls below (₹)</p>
            <input type='number' value={threshold} onChange={e => setThreshold(+e.target.value)} disabled={!autoOn} style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: '#55556a', marginBottom: '6px' }}>Automatically add (₹)</p>
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
        <p style={{ fontSize: '10px', color: '#33334a', marginTop: '8px', textAlign: 'center' }}>
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
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#f0f0f8' }}>Billing</h1>
          <p style={{ fontSize: '13px', color: '#55556a', marginTop: '4px' }}>
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
