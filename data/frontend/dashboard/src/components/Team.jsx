import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { UserPlus, Shield, Users, X, Trash2, Settings } from 'lucide-react'
import api from '../api'

const ALL_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leads', label: 'Leads' },
  { id: 'calls', label: 'Simulator' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'logs', label: 'Call Logs' },
  { id: 'team', label: 'Team' },
]

export default function Team() {
  const [team, setTeam] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showPerms, setShowPerms] = useState(null) // user id for permission editing
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent', permissions: 'dashboard,leads,calls' })

  useEffect(() => { fetchTeam() }, [])

  const fetchTeam = async () => {
    try {
      const res = await api.get('/team')
      setTeam(res.data.team || [])
    } catch (err) {}
  }

  const addMember = async () => {
    if (!form.name || !form.email || !form.password) return
    try {
      await api.post('/team/add', form)
      setForm({ name: '', email: '', password: '', role: 'agent', permissions: 'dashboard,leads,calls' })
      setShowModal(false)
      fetchTeam()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed')
    }
  }

  const changeRole = async (userId, role) => {
    await api.put(`/team/${userId}/role?role=${role}`).catch(() => {})
    fetchTeam()
  }

  const updatePermissions = async (userId, perms) => {
    await api.put(`/team/${userId}/permissions?permissions=${perms}`).catch(() => {})
    fetchTeam()
  }

  const toggleUser = async (userId) => {
    await api.put(`/team/${userId}/toggle`).catch(() => {})
    fetchTeam()
  }

  const removeUser = async (userId) => {
    if (!confirm('Remove this team member?')) return
    await api.delete(`/team/${userId}`).catch(() => {})
    fetchTeam()
  }

  const togglePerm = (user, pageId) => {
    const current = (user.permissions || '').split(',').filter(Boolean)
    const updated = current.includes(pageId) ? current.filter(p => p !== pageId) : [...current, pageId]
    updatePermissions(user.id, updated.join(','))
  }

  const roleColors = { admin: '#f87171', manager: '#fbbf24', agent: '#06b6d4' }

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>Team</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Manage members, roles & page access</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><UserPlus size={14} /> Add Member</button>
      </motion.div>

      {/* Team List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {team.length === 0 ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
            <Users size={28} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No team members yet</p>
          </div>
        ) : (
          team.map((user, i) => (
            <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${roleColors[user.role]}15`, border: `1px solid ${roleColors[user.role]}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={14} color={roleColors[user.role]} />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{user.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select value={user.role} onChange={e => changeRole(user.id, e.target.value)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="agent">Agent</option>
                  </select>
                  <button onClick={() => setShowPerms(showPerms === user.id ? null : user.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--text-muted)' }} title="Page Access">
                    <Settings size={13} />
                  </button>
                  <button onClick={() => toggleUser(user.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', cursor: 'pointer', color: user.is_active ? '#22c55e' : '#f87171' }}>
                    {user.is_active ? 'Active' : 'Off'}
                  </button>
                  <button onClick={() => removeUser(user.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Permission Checkboxes */}
              {showPerms === user.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>Page Access for {user.name}:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {ALL_PAGES.map(page => {
                      const hasAccess = (user.permissions || '').split(',').includes(page.id)
                      return (
                        <button
                          key={page.id}
                          onClick={() => togglePerm(user, page.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            border: hasAccess ? '1px solid #06b6d4' : '1px solid var(--border)',
                            background: hasAccess ? 'rgba(6,182,212,0.1)' : 'transparent',
                            color: hasAccess ? '#06b6d4' : 'var(--text-muted)',
                          }}
                        >
                          {hasAccess ? '✓ ' : ''}{page.label}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="card" style={{ padding: '28px', width: '100%', maxWidth: '420px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Add Team Member</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="Full Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" />
                <input type="email" placeholder="Email *" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" />
                <input type="password" placeholder="Password *" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input" />
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input">
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>

                {/* Page Access Selection */}
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Page Access:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ALL_PAGES.map(page => {
                      const selected = form.permissions.split(',').includes(page.id)
                      return (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => {
                            const current = form.permissions.split(',').filter(Boolean)
                            const updated = selected ? current.filter(p => p !== page.id) : [...current, page.id]
                            setForm({...form, permissions: updated.join(',')})
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            border: selected ? '1px solid #06b6d4' : '1px solid var(--border)',
                            background: selected ? 'rgba(6,182,212,0.1)' : 'transparent',
                            color: selected ? '#06b6d4' : 'var(--text-muted)',
                          }}
                        >
                          {selected ? '✓ ' : ''}{page.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button onClick={addMember} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>Add Member</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
