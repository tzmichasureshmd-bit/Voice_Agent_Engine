import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Trash2, Shield, Crown, ToggleLeft, ToggleRight, Key, Phone, Activity, CheckCircle2 } from 'lucide-react'
import api from '../api'

const card = { background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '16px', padding: '22px' }

const ROLE_COLORS = {
  admin:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  manager: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  agent:   { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
}

export default function ClientAdmin() {
  const [team, setTeam]       = useState([])
  const [usage, setUsage]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('team') // team | usage | plan
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'agent', permissions: 'dashboard,leads,calls' })
  const [adding, setAdding]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saved, setSaved]     = useState(null)

  const fetchAll = () => {
    Promise.all([
      api.get('/team').then(r => setTeam(r.data.team || [])),
      api.get('/usage').then(r => setUsage(r.data)),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const handleAddMember = async () => {
    if (!form.name || !form.email || !form.password) return
    setAdding(true)
    try {
      await api.post('/team/add', form)
      setForm({ name: '', email: '', password: '', role: 'agent', permissions: 'dashboard,leads,calls' })
      setShowForm(false)
      fetchAll()
      setSaved('Member added!')
      setTimeout(() => setSaved(null), 2000)
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to add member')
    }
    setAdding(false)
  }

  const handleToggle = async (id) => {
    await api.put(`/team/${id}/toggle`)
    fetchAll()
  }

  const handleRemove = async (id) => {
    if (!confirm('Remove this team member?')) return
    await api.delete(`/team/${id}`)
    fetchAll()
  }

  const handleRoleChange = async (id, role) => {
    await api.put(`/team/${id}/role?role=${role}`)
    fetchAll()
  }

  const PAGES = ['dashboard','leads','calls','campaigns','voicelab','knowledge','appointments','billing','team']
  const togglePerm = (page) => {
    const perms = form.permissions.split(',').filter(Boolean)
    const updated = perms.includes(page) ? perms.filter(p => p !== page) : [...perms, page]
    setForm(f => ({ ...f, permissions: updated.join(',') }))
  }

  const pct = usage ? Math.min((usage.calls_this_month / usage.calls_limit) * 100, 100) : 0
  const barColor = pct >= 90 ? '#f87171' : pct >= 70 ? '#fbbf24' : '#10b981'

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#f0f0f8', letterSpacing: '-0.6px' }}>Admin Panel</h1>
        <p style={{ fontSize: '13px', color: '#55556a', marginTop: '4px' }}>Manage your team, usage and account</p>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '12px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        {[['team', 'Team Members'], ['usage', 'Usage & Plan']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '7px 18px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', background: tab === id ? '#7c3aed' : 'transparent', color: tab === id ? '#fff' : '#55556a', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <div>
          {/* Add Member Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#55556a' }}>{team.length} member{team.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowForm(!showForm)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', border: 'none', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
              <Plus size={13} /> Add Member
            </button>
          </div>

          {/* Add Member Form */}
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, marginBottom: '16px', border: '1px solid rgba(124,58,237,0.3)' }}>
              <p style={{ fontSize: '13px', fontWeight: '800', color: '#f0f0f8', marginBottom: '16px' }}>New Team Member</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                {[['name','Name','text'],['email','Email','email'],['password','Password','password']].map(([key, ph, type]) => (
                  <input key={key} type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph} style={{ padding: '9px 12px', borderRadius: '9px', background: '#0a0a14', border: '1px solid #1e1e30', color: '#f0f0f8', fontSize: '12px', outline: 'none' }} />
                ))}
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ padding: '9px 12px', borderRadius: '9px', background: '#0a0a14', border: '1px solid #1e1e30', color: '#f0f0f8', fontSize: '12px', outline: 'none' }}>
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {/* Page Permissions */}
              <p style={{ fontSize: '11px', color: '#55556a', marginBottom: '8px', fontWeight: '600' }}>Page Access</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {PAGES.map(page => {
                  const active = form.permissions.split(',').includes(page)
                  return (
                    <button key={page} onClick={() => togglePerm(page)}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${active ? 'rgba(124,58,237,0.4)' : '#1e1e30'}`, background: active ? 'rgba(124,58,237,0.15)' : 'transparent', color: active ? '#a78bfa' : '#33334a', fontSize: '11px', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize' }}>
                      {page}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleAddMember} disabled={adding || !form.name || !form.email || !form.password}
                  style={{ flex: 1, padding: '9px', borderRadius: '9px', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', border: 'none', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', opacity: (!form.name || !form.email || !form.password) ? 0.5 : 1 }}>
                  {adding ? 'Adding...' : 'Add Member'}
                </button>
                <button onClick={() => setShowForm(false)}
                  style={{ padding: '9px 16px', borderRadius: '9px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {saved && <p style={{ fontSize: '12px', color: '#10b981', marginBottom: '10px' }}>✅ {saved}</p>}

          {/* Team List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? <p style={{ color: '#33334a', fontSize: '13px' }}>Loading...</p> :
            team.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
                <Users size={28} style={{ color: '#1e1e30', margin: '0 auto 10px' }} />
                <p style={{ fontSize: '13px', color: '#33334a' }}>No team members yet</p>
                <p style={{ fontSize: '11px', color: '#1e1e30', marginTop: '4px' }}>Add your first team member above</p>
              </div>
            ) : team.map((m, i) => {
              const rc = ROLE_COLORS[m.role] || ROLE_COLORS.agent
              return (
                <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: rc.color, flexShrink: 0 }}>
                    {m.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: m.is_active ? '#f0f0f8' : '#33334a' }}>{m.name}</p>
                    <p style={{ fontSize: '11px', color: '#33334a', marginTop: '1px' }}>{m.email}</p>
                  </div>
                  <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)}
                    style={{ background: rc.bg, border: `1px solid ${rc.color}44`, color: rc.color, borderRadius: '7px', padding: '4px 8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', outline: 'none', textTransform: 'uppercase' }}>
                    <option value="agent">Agent</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => handleToggle(m.id)} title={m.is_active ? 'Deactivate' : 'Activate'}
                      style={{ background: m.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '7px', padding: '5px 8px', cursor: 'pointer', color: m.is_active ? '#4ade80' : '#f87171' }}>
                      {m.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button onClick={() => handleRemove(m.id)}
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '7px', padding: '5px 8px', cursor: 'pointer', color: '#f87171' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'usage' && usage && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Usage */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <p style={{ fontSize: '14px', fontWeight: '800', color: '#f0f0f8', marginBottom: '16px' }}>📊 Monthly Usage</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#55556a' }}>Calls this month</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#f0f0f8' }}>{usage.calls_this_month} / {usage.calls_limit}</span>
            </div>
            <div style={{ height: '10px', background: '#1e1e30', borderRadius: '999px', overflow: 'hidden', marginBottom: '16px' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                style={{ height: '100%', background: barColor, borderRadius: '999px' }} />
            </div>
            {[
              { label: 'Calls Remaining', value: usage.calls_remaining, color: '#10b981' },
              { label: 'Total Calls Ever', value: usage.total_calls_ever, color: '#06b6d4' },
              { label: 'API Keys Active', value: `${usage.api_keys_active} / ${usage.api_keys_limit}`, color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0e0e1a' }}>
                <span style={{ fontSize: '12px', color: '#55556a' }}>{s.label}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: s.color }}>{s.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Current Plan */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card}>
            <p style={{ fontSize: '14px', fontWeight: '800', color: '#f0f0f8', marginBottom: '16px' }}>💎 Current Plan</p>
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '14px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: '900', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '2px' }}>{usage.plan}</p>
              <p style={{ fontSize: '13px', color: '#55556a', marginTop: '4px' }}>₹{(usage.plan_price/1000).toFixed(0)}K / month</p>
            </div>
            <p style={{ fontSize: '11px', color: '#55556a', textAlign: 'center' }}>
              To upgrade your plan, go to <span style={{ color: '#a78bfa', cursor: 'pointer' }}>Billing</span> page
            </p>
          </motion.div>
        </div>
      )}
    </div>
  )
}
