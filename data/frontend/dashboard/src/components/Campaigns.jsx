import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Plus, Megaphone, X, Play, Users } from 'lucide-react'
import api from '../api'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [leads, setLeads] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [form, setForm] = useState({ name: '', script: '', product_info: '' })

  useEffect(() => {
    fetchCampaigns()
    api.get('/leads').then(r => setLeads(r.data.leads || [])).catch(() => {})
  }, [])

  const fetchCampaigns = async () => {
    try {
      const res = await api.get('/campaigns')
      setCampaigns(res.data.campaigns || [])
    } catch (err) {}
  }

  const createCampaign = async () => {
    if (!form.name || !form.script || !form.product_info) return
    await api.post('/campaigns', form).catch(() => {})
    setForm({ name: '', script: '', product_info: '' })
    setShowModal(false)
    fetchCampaigns()
  }

  const runCampaign = async (id) => {
    try {
      const res = await api.post(`/campaigns/${id}/run`)
      setRunResult(res.data)
      fetchCampaigns()
    } catch (err) {
      setRunResult({ message: err.response?.data?.detail || 'Failed to run' })
    }
  }

  const newLeads = leads.filter(l => l.status === 'new').length

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>Campaigns</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {newLeads} new leads ready to call
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={14} /> New Campaign</button>
      </motion.div>

      {/* Run Result Banner */}
      <AnimatePresence>
        {runResult && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: '#34d399', fontWeight: '500' }}>✅ {runResult.message}</p>
            <button onClick={() => setRunResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399' }}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
        {campaigns.length === 0 ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center', gridColumn: '1 / -1' }}>
            <Megaphone size={28} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No campaigns yet</p>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Create your first campaign to start calling</p>
          </div>
        ) : (
          campaigns.map((camp, i) => (
            <motion.div key={camp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Megaphone size={16} color="var(--accent-light)" />
                </div>
                <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(34,197,94,0.1)', color: '#34d399', border: '1px solid rgba(34,197,94,0.2)', padding: '3px 8px', borderRadius: '6px' }}>
                  {camp.is_active ? 'Active' : 'Paused'}
                </span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>{camp.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{camp.product_info}</p>
              <div style={{ display: 'flex', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                <span>Calls: {camp.total_calls}</span>
                <span style={{ color: '#f87171' }}>Hot: {camp.hot_leads}</span>
                <span style={{ color: '#fbbf24' }}>Warm: {camp.warm_leads}</span>
                <span style={{ color: '#60a5fa' }}>Cold: {camp.cold_leads}</span>
              </div>
              <button onClick={() => runCampaign(camp.id)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}>
                <Play size={13} /> Run Campaign ({newLeads} leads)
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="card" style={{ padding: '28px', width: '100%', maxWidth: '440px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>New Campaign</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="Campaign Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" />
                <textarea placeholder="Product/Service Info *" value={form.product_info} onChange={e => setForm({ ...form, product_info: e.target.value })} className="input" style={{ height: '70px', resize: 'none' }} />
                <textarea placeholder="AI Script/Instructions *" value={form.script} onChange={e => setForm({ ...form, script: e.target.value })} className="input" style={{ height: '90px', resize: 'none' }} />
                <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <Users size={12} style={{ display: 'inline', marginRight: '6px' }} />
                  {newLeads} new leads will be called when you run this campaign
                </div>
                <button onClick={createCampaign} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>Create Campaign</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
