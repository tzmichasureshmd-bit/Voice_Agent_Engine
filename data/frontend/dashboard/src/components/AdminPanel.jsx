import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Users, Phone, Shield, Crown, TrendingUp, Ban, CheckCircle2, RefreshCw, Search, ChevronDown, Key, Zap, DollarSign, Activity, ToggleLeft, ToggleRight, Trash2, Eye } from 'lucide-react'
import axios from 'axios'

const API = window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''
const ADMIN_KEY = 'superadmin123'
const ax = axios.create({ baseURL: API, headers: { 'x-admin-key': ADMIN_KEY } })

const PLAN_COLORS = {
  free:       { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  starter:    { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  growth:     { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  pro:        { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  enterprise: { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const card = { background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '16px', padding: '20px' }

export default function AdminPanel({ onBack }) {
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('clients') // clients | revenue | system
  const [selected, setSelected] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    setLoading(true)
    try {
      const r = await ax.get('/admin/clients')
      setClients(r.data.clients || [])
    } catch {}
    setLoading(false)
  }

  const changePlan = async (id, plan) => {
    setActionLoading(`plan_${id}`)
    try { await ax.put(`/admin/clients/${id}/plan?plan=${plan}`); fetchClients() } catch {}
    setActionLoading(null)
  }

  const toggleClient = async (id) => {
    setActionLoading(`toggle_${id}`)
    try { await ax.put(`/admin/clients/${id}/toggle`); fetchClients() } catch {}
    setActionLoading(null)
  }

  const resetPassword = async (id) => {
    const pwd = prompt('New password for this client:')
    if (!pwd) return
    try { await ax.put(`/admin/clients/${id}/reset-password?new_password=${pwd}`); alert('Password reset!') } catch {}
  }

  const filtered = clients.filter(c =>
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  )

  // Revenue stats
  const PLAN_PRICES = { free: 0, starter: 5000, growth: 15000, pro: 30000, enterprise: 75000 }
  const mrr = clients.reduce((s, c) => s + (PLAN_PRICES[c.plan] || 0), 0)
  const totalCalls = clients.reduce((s, c) => s + (c.total_calls || 0), 0)
  const activePaid = clients.filter(c => c.plan !== 'free' && c.is_active).length

  return (
    <div style={{ minHeight: '100vh', background: '#05050a', padding: '28px 36px' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#f0f0f8', letterSpacing: '-0.5px' }}>Super Admin</h1>
            <p style={{ fontSize: '11px', color: '#55556a' }}>Tzmicha AI Voice Engine — Platform Control</p>
          </div>
        </div>
        <button onClick={onBack} style={{ padding: '8px 16px', borderRadius: '9px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
          ← Back to App
        </button>
      </motion.div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Total Clients', value: clients.length, icon: Users, color: '#06b6d4', glow: '6,182,212' },
          { label: 'Paid Clients', value: activePaid, icon: Crown, color: '#fbbf24', glow: '251,191,36' },
          { label: 'MRR', value: `₹${(mrr/1000).toFixed(0)}K`, icon: DollarSign, color: '#10b981', glow: '16,185,129' },
          { label: 'Total Calls', value: totalCalls, icon: Phone, color: '#a78bfa', glow: '167,139,250' },
          { label: 'Active', value: clients.filter(c => c.is_active).length, icon: Activity, color: '#4ade80', glow: '74,222,128' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: '#0e0e1a', border: `1px solid rgba(${s.glow},0.15)`, borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `rgba(${s.glow},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={14} color={s.color} />
              </div>
              <span style={{ fontSize: '10px', color: '#33334a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{s.label}</span>
            </div>
            <p style={{ fontSize: '24px', fontWeight: '900', color: '#f0f0f8', letterSpacing: '-0.5px' }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px', marginBottom: '20px' }}>
        {Object.entries(PLAN_PRICES).map(([plan, price]) => {
          const count = clients.filter(c => c.plan === plan).length
          const pc = PLAN_COLORS[plan]
          return (
            <div key={plan} style={{ background: '#0e0e1a', border: `1px solid ${pc.color}22`, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', fontWeight: '800', color: pc.color }}>{count}</p>
              <p style={{ fontSize: '10px', color: '#55556a', textTransform: 'uppercase', fontWeight: '700', marginTop: '2px' }}>{plan}</p>
              <p style={{ fontSize: '9px', color: '#33334a', marginTop: '2px' }}>₹{(price/1000).toFixed(0)}K/mo</p>
            </div>
          )
        })}
      </div>

      {/* Search + Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e30', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Search size={14} color="#33334a" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients by name, email, industry..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f0f0f8', fontSize: '13px' }} />
          <button onClick={fetchClients} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#33334a' }}>
            <RefreshCw size={14} />
          </button>
          <span style={{ fontSize: '11px', color: '#33334a' }}>{filtered.length} clients</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1e30' }}>
                {['#', 'Company', 'Industry', 'Email', 'Plan', 'Calls', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', fontWeight: '700', color: '#33334a', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#33334a', fontSize: '13px' }}>Loading...</td></tr>
              ) : filtered.map((c, i) => {
                const pc = PLAN_COLORS[c.plan] || PLAN_COLORS.free
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #0e0e1a' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0a0a14'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', fontSize: '11px', color: '#33334a' }}>#{c.id}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '600', color: '#f0f0f8', whiteSpace: 'nowrap' }}>{c.company}</td>
                    <td style={{ padding: '10px 14px', fontSize: '11px', color: '#55556a', textTransform: 'capitalize' }}>{c.industry}</td>
                    <td style={{ padding: '10px 14px', fontSize: '11px', color: '#55556a' }}>{c.email}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <select value={c.plan} onChange={e => changePlan(c.id, e.target.value)}
                        style={{ background: pc.bg, border: `1px solid ${pc.color}44`, color: pc.color, borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', outline: 'none', textTransform: 'uppercase' }}>
                        {['free','starter','growth','pro','enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', color: '#f0f0f8' }}>{c.total_calls}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', background: c.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', color: c.is_active ? '#4ade80' : '#f87171' }}>
                        {c.is_active ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '10px', color: '#33334a', whiteSpace: 'nowrap' }}>{c.created?.split('T')[0]}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => toggleClient(c.id)} title={c.is_active ? 'Ban' : 'Activate'}
                          style={{ background: c.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', border: 'none', borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', color: c.is_active ? '#f87171' : '#4ade80' }}>
                          {c.is_active ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                        </button>
                        <button onClick={() => resetPassword(c.id)} title="Reset Password"
                          style={{ background: 'rgba(167,139,250,0.1)', border: 'none', borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', color: '#a78bfa' }}>
                          <Key size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Revenue Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        style={{ ...card, marginTop: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: '800', color: '#f0f0f8', marginBottom: '14px' }}>💰 Revenue Breakdown</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
          {Object.entries(PLAN_PRICES).map(([plan, price]) => {
            const count = clients.filter(c => c.plan === plan && c.is_active).length
            const rev = count * price
            const pc = PLAN_COLORS[plan]
            return (
              <div key={plan} style={{ background: '#0a0a14', borderRadius: '12px', padding: '14px', border: `1px solid ${pc.color}22` }}>
                <p style={{ fontSize: '10px', color: pc.color, fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>{plan}</p>
                <p style={{ fontSize: '20px', fontWeight: '900', color: '#f0f0f8' }}>₹{(rev/1000).toFixed(0)}K</p>
                <p style={{ fontSize: '10px', color: '#33334a', marginTop: '4px' }}>{count} clients × ₹{(price/1000).toFixed(0)}K</p>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '700' }}>Total MRR</span>
          <span style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>₹{(mrr/1000).toFixed(1)}K / month</span>
        </div>
      </motion.div>
    </div>
  )
}
