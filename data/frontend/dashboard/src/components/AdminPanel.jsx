import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Users, Phone, Shield, Crown, X, Check, Ban } from 'lucide-react'
import axios from 'axios'

const API = 'http://localhost:8000'
const ADMIN_KEY = 'superadmin123'

export default function AdminPanel({ onBack }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/admin/clients`, { headers: { 'x-admin-key': ADMIN_KEY } })
      setClients(res.data.clients || [])
    } catch (err) {}
    setLoading(false)
  }

  const plans = { free: { color: '#6b7280', label: 'Free', calls: 50 }, basic: { color: '#06b6d4', label: 'Basic', calls: 500 }, pro: { color: '#eab308', label: 'Pro', calls: 5000 } }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 40px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} color="#06b6d4" />
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>Super Admin Panel</h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Manage all clients, plans & features</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost">Back to App</button>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Clients', value: clients.length, icon: Users, color: '#06b6d4' },
          { label: 'Free Plan', value: clients.filter(c => c.plan === 'free').length, icon: Users, color: '#6b7280' },
          { label: 'Basic Plan', value: clients.filter(c => c.plan === 'basic').length, icon: Crown, color: '#06b6d4' },
          { label: 'Pro Plan', value: clients.filter(c => c.plan === 'pro').length, icon: Crown, color: '#eab308' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <s.icon size={16} color={s.color} />
            </div>
            <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{s.value}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Plans Info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>Subscription Plans</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Free</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>50 calls/month • Basic AI • 1 Campaign</p>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #06b6d4' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#06b6d4' }}>Basic - ₹5,000/mo</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>500 calls/month • Advanced AI • 5 Campaigns • CSV Export</p>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #eab308' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#eab308' }}>Pro - ₹15,000/mo</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>5000 calls/month • Premium AI • Unlimited Campaigns • Real Calls • Priority Support</p>
          </div>
        </div>
      </motion.div>

      {/* Clients Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>All Clients ({clients.length})</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['ID', 'Company', 'Industry', 'Email', 'Plan', 'Calls', 'Joined'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((client, i) => (
              <tr key={client.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>#{client.id}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{client.company}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{client.industry}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{client.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', background: plans[client.plan]?.color + '20', color: plans[client.plan]?.color, border: `1px solid ${plans[client.plan]?.color}40` }}>
                    {client.plan}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{client.total_calls}</td>
                <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-dim)' }}>{client.created?.split('T')[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  )
}
