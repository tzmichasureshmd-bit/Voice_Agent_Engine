import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Building, User, Mail, Phone, Package, Bot, Save } from 'lucide-react'
import api from '../api'

export default function Profile({ clientData, setClientData }) {
  const [form, setForm] = useState({
    company_name: clientData?.company_name || '',
    industry: clientData?.industry || '',
    contact_name: clientData?.contact_name || '',
    email: clientData?.email || '',
    product_info: clientData?.product_info || '',
    ai_name: clientData?.ai_name || 'Misha',
    ai_tone: clientData?.ai_tone || 'friendly',
  })
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    try {
      await api.put('/auth/profile', {
        product_info: form.product_info,
        ai_name: form.ai_name,
        ai_tone: form.ai_tone,
      })
      const updated = { ...clientData, ...form }
      setClientData(updated)
      localStorage.setItem('client_data', JSON.stringify(updated))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {}
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>Company Profile</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Manage your account and AI settings</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '800px' }}>
        {/* Company Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={16} color="var(--accent-light)" /> Company Info
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Company Name</label>
              <input type="text" value={form.company_name} disabled className="input" style={{ opacity: 0.6 }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Industry</label>
              <input type="text" value={form.industry} disabled className="input" style={{ opacity: 0.6 }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Contact Person</label>
              <input type="text" value={form.contact_name} disabled className="input" style={{ opacity: 0.6 }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Email</label>
              <input type="text" value={form.email} disabled className="input" style={{ opacity: 0.6 }} />
            </div>
          </div>
        </motion.div>

        {/* AI Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={16} color="var(--accent-light)" /> AI Settings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>AI Caller Name</label>
              <input type="text" value={form.ai_name} onChange={e => setForm({...form, ai_name: e.target.value})} className="input" placeholder="e.g. Misha, Sarah" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>AI Tone</label>
              <select value={form.ai_tone} onChange={e => setForm({...form, ai_tone: e.target.value})} className="input">
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Product/Service Info</label>
              <textarea value={form.product_info} onChange={e => setForm({...form, product_info: e.target.value})} className="input" style={{ height: '100px', resize: 'none' }} placeholder="Describe what your company offers..." />
            </div>
            <button onClick={handleSave} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
              <Save size={14} /> {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
