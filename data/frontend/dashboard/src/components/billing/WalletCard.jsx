import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, Plus, X } from 'lucide-react'
import api from '../../api'
import { fmt } from './currency'

const QUICK = [500, 1000, 2000, 5000]

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
        window.location.href = r.data.checkout_url   // Stripe redirect
      } else {
        setMsg(`✅ ₹${amount.toLocaleString()} credited!`)
        setTimeout(() => { onSuccess(); onClose() }, 1200)
      }
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Payment failed')
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#55556a' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
          {QUICK.map(a => (
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
            width: '100%', padding: '10px 14px', borderRadius: '10px', marginBottom: '6px',
            background: '#0a0a14', border: '1px solid #1e1e30',
            color: '#f0f0f8', fontSize: '16px', fontWeight: '700',
          }} />
        {cur.code !== 'INR' && (
          <p style={{ fontSize: '11px', color: '#55556a', marginBottom: '12px' }}>≈ {fmt(amount, cur)}</p>
        )}

        {msg && (
          <p style={{ fontSize: '12px', marginBottom: '12px', color: msg.startsWith('✅') ? '#10b981' : '#f87171' }}>{msg}</p>
        )}

        <button onClick={pay} disabled={loading} style={{
          width: '100%', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
          fontSize: '14px', fontWeight: '800', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Processing...' : `Pay ${fmt(amount, cur)}`}
        </button>
        <p style={{ fontSize: '10px', color: '#33334a', marginTop: '10px', textAlign: 'center' }}>
          Stripe · Razorpay · UPI — connect in .env
        </p>
      </motion.div>
    </div>
  )
}

export default function WalletCard({ cur }) {
  const [balance, setBalance]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const clientId = localStorage.getItem('client_id')

  const load = () =>
    api.get(`/billing/wallet?client_id=${clientId}`)
      .then(r => setBalance(r.data.balance_inr))
      .catch(() => setBalance(0))

  useEffect(() => { load() }, [])

  // Handle Stripe success return
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('payment') === 'success') {
      load()
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
          <Wallet size={14} color="#a78bfa" />
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Wallet Balance
          </span>
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

      <AnimatePresence>
        {showModal && (
          <AddMoneyModal cur={cur} onClose={() => setShowModal(false)} onSuccess={load} />
        )}
      </AnimatePresence>
    </>
  )
}
