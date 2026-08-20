import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Plus, Trash2, Copy, CheckCircle2, ToggleLeft, ToggleRight, Shield, Zap, AlertCircle } from 'lucide-react'
import api from '../api'

const card = { background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '16px', padding: '24px' }

export default function APIPage() {
  const [keys, setKeys]         = useState([])
  const [usage, setUsage]       = useState(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey]     = useState(null)  // shown once after creation
  const [copied, setCopied]     = useState(false)
  const [loading, setLoading]   = useState(true)

  const fetchAll = () => {
    Promise.all([
      api.get('/api-keys').then(r => setKeys(r.data.keys || [])),
      api.get('/usage').then(r => setUsage(r.data)),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const r = await api.post('/api-keys', { name: newKeyName, calls_limit: usage?.calls_limit || 1000 })
      setNewKey(r.data)
      setNewKeyName('')
      fetchAll()
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to create key')
    }
    setCreating(false)
  }

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    await api.delete(`/api-keys/${id}`)
    fetchAll()
  }

  const handleToggle = async (id) => {
    await api.put(`/api-keys/${id}/toggle`)
    fetchAll()
  }

  const copyKey = (key) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pct = usage ? Math.min((usage.calls_this_month / usage.calls_limit) * 100, 100) : 0
  const barColor = pct >= 90 ? '#f87171' : pct >= 70 ? '#fbbf24' : '#10b981'

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#f0f0f8', letterSpacing: '-0.6px' }}>API Access</h1>
        <p style={{ fontSize: '13px', color: '#55556a', marginTop: '4px' }}>Generate API keys to integrate AI Voice Engine into your apps</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '20px' }}>

        {/* Usage Card */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Zap size={16} color="#a78bfa" />
            <p style={{ fontSize: '14px', fontWeight: '800', color: '#f0f0f8' }}>Monthly Usage</p>
            {usage && (
              <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', background: 'rgba(124,58,237,0.15)', color: '#a78bfa', textTransform: 'uppercase' }}>
                {usage.plan}
              </span>
            )}
          </div>
          {usage && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#55556a' }}>Calls this month</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#f0f0f8' }}>{usage.calls_this_month} / {usage.calls_limit}</span>
              </div>
              <div style={{ height: '8px', background: '#1e1e30', borderRadius: '999px', overflow: 'hidden', marginBottom: '12px' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                  style={{ height: '100%', background: barColor, borderRadius: '999px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {[
                  { label: 'Remaining', value: usage.calls_remaining, color: '#10b981' },
                  { label: 'API Keys', value: `${usage.api_keys_active}/${usage.api_keys_limit}`, color: '#a78bfa' },
                  { label: 'Total Ever', value: usage.total_calls_ever, color: '#06b6d4' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#0a0a14', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <p style={{ fontSize: '18px', fontWeight: '800', color: s.color }}>{s.value}</p>
                    <p style={{ fontSize: '10px', color: '#33334a', marginTop: '2px' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {pct >= 80 && (
                <div style={{ marginTop: '12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={13} color="#fbbf24" />
                  <p style={{ fontSize: '11px', color: '#fbbf24' }}>You've used {pct.toFixed(0)}% of your monthly calls. Consider upgrading.</p>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Create Key Card */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Key size={16} color="#06b6d4" />
            <p style={{ fontSize: '14px', fontWeight: '800', color: '#f0f0f8' }}>Generate New Key</p>
          </div>
          <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Key name (e.g. Production, Mobile App)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: '#0a0a14', border: '1px solid #1e1e30', color: '#f0f0f8', fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
          <button onClick={handleCreate} disabled={!newKeyName.trim() || creating}
            style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', border: 'none', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: !newKeyName.trim() ? 0.5 : 1 }}>
            <Plus size={14} /> {creating ? 'Generating...' : 'Generate API Key'}
          </button>
          <div style={{ marginTop: '14px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)', borderRadius: '10px', padding: '10px 12px' }}>
            <p style={{ fontSize: '11px', color: '#06b6d4', fontWeight: '700', marginBottom: '4px' }}>How to use</p>
            <p style={{ fontSize: '10px', color: '#33334a', fontFamily: 'monospace' }}>Header: x-api-key: tzm_live_xxxx</p>
            <p style={{ fontSize: '10px', color: '#33334a', fontFamily: 'monospace', marginTop: '2px' }}>Or: x-client-id: your_client_id</p>
          </div>
        </motion.div>
      </div>

      {/* New Key Display — shown once */}
      <AnimatePresence>
        {newKey && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '14px', padding: '18px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>✅ API Key Created — Copy it now! It won't be shown again.</p>
              <button onClick={() => setNewKey(null)} style={{ background: 'none', border: 'none', color: '#55556a', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0a0a14', borderRadius: '10px', padding: '12px 14px' }}>
              <code style={{ flex: 1, fontSize: '12px', color: '#10b981', fontFamily: 'monospace', wordBreak: 'break-all' }}>{newKey.key}</code>
              <button onClick={() => copyKey(newKey.key)}
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />} {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keys List */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Shield size={16} color="#a78bfa" />
          <p style={{ fontSize: '14px', fontWeight: '800', color: '#f0f0f8' }}>Your API Keys</p>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#33334a' }}>{keys.length} key{keys.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <p style={{ fontSize: '12px', color: '#33334a', textAlign: 'center', padding: '20px' }}>Loading...</p>
        ) : keys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Key size={28} style={{ color: '#1e1e30', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '13px', color: '#33334a' }}>No API keys yet</p>
            <p style={{ fontSize: '11px', color: '#1e1e30', marginTop: '4px' }}>Generate your first key above</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {keys.map((k, i) => (
              <motion.div key={k.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#0a0a14', borderRadius: '12px', border: `1px solid ${k.is_active ? 'rgba(124,58,237,0.15)' : '#1e1e30'}` }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: k.is_active ? '#10b981' : '#33334a', boxShadow: k.is_active ? '0 0 6px #10b981' : 'none', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#f0f0f8' }}>{k.name}</p>
                  <p style={{ fontSize: '11px', color: '#33334a', fontFamily: 'monospace', marginTop: '2px' }}>{k.key_preview}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: '#f0f0f8' }}>{k.calls_used} <span style={{ color: '#33334a', fontWeight: '400' }}>/ {k.calls_limit}</span></p>
                  <p style={{ fontSize: '10px', color: '#33334a' }}>{k.last_used ? `Last: ${new Date(k.last_used).toLocaleDateString()}` : 'Never used'}</p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => handleToggle(k.id)} title={k.is_active ? 'Disable' : 'Enable'}
                    style={{ background: 'none', border: '1px solid #1e1e30', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: k.is_active ? '#10b981' : '#33334a' }}>
                    {k.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button onClick={() => handleRevoke(k.id)} title="Revoke"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#f87171' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* API Docs Quick Reference */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ ...card, marginTop: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: '800', color: '#f0f0f8', marginBottom: '14px' }}>Quick API Reference</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px' }}>
          {[
            { method: 'POST', path: '/call/start', desc: 'Start AI call with a lead' },
            { method: 'POST', path: '/call/respond', desc: 'Send message, get AI reply' },
            { method: 'POST', path: '/call/end', desc: 'End call, get analysis' },
            { method: 'GET',  path: '/leads', desc: 'Get all leads' },
            { method: 'POST', path: '/leads', desc: 'Add a new lead' },
            { method: 'GET',  path: '/calls', desc: 'Get all call logs' },
            { method: 'GET',  path: '/dashboard/stats', desc: 'Get dashboard stats' },
            { method: 'GET',  path: '/usage', desc: 'Get API usage & limits' },
          ].map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#0a0a14', borderRadius: '8px' }}>
              <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 7px', borderRadius: '5px', background: e.method === 'GET' ? 'rgba(6,182,212,0.15)' : 'rgba(124,58,237,0.15)', color: e.method === 'GET' ? '#06b6d4' : '#a78bfa', flexShrink: 0 }}>{e.method}</span>
              <code style={{ fontSize: '11px', color: '#f0f0f8', flex: 1 }}>{e.path}</code>
              <span style={{ fontSize: '10px', color: '#33334a' }}>{e.desc}</span>
            </div>
          ))}
        </div>
        <a href="/docs" target="_blank" style={{ display: 'inline-block', marginTop: '12px', fontSize: '12px', color: '#a78bfa', textDecoration: 'none' }}>
          View full API docs → /docs
        </a>
      </motion.div>
    </div>
  )
}
