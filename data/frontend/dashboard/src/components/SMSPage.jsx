import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, Zap, Info } from 'lucide-react'

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }

const SMS_PROVIDERS = [
  { name: 'Twilio', desc: 'Global SMS, WhatsApp, Voice', url: 'https://twilio.com', color: '#f22f46' },
  { name: 'MSG91', desc: 'India SMS — OTP, Transactional', url: 'https://msg91.com', color: '#6c63ff' },
  { name: 'Exotel', desc: 'India SMS + Voice calls', url: 'https://exotel.com', color: '#00b4d8' },
  { name: 'Fast2SMS', desc: 'Cheapest India bulk SMS', url: 'https://fast2sms.com', color: '#ff6b35' },
]

export default function SMSPage() {
  const [numbers, setNumbers] = useState('')
  const [message, setMessage] = useState('')
  const [provider, setProvider] = useState('')

  const charCount = message.length
  const smsCount  = Math.ceil(charCount / 160) || 1

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={20} color="#06b6d4" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>SMS</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Send bulk SMS to leads after calls</p>
          </div>
        </div>
      </motion.div>

      {/* Setup notice */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <Info size={14} color="#06b6d4" style={{ flexShrink: 0, marginTop: '1px' }} />
        <div>
          <p style={{ fontSize: '12px', color: '#06b6d4', fontWeight: '700', marginBottom: '3px' }}>SMS Provider Required</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Connect an SMS provider below to send real SMS. For now, use WhatsApp (free) for messaging leads.</p>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Compose */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={card}>
          <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>Compose SMS</p>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Provider</label>
            <select value={provider} onChange={e => setProvider(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
              <option value="">Select provider...</option>
              {SMS_PROVIDERS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Phone Numbers (one per line)</label>
            <textarea value={numbers} onChange={e => setNumbers(e.target.value)}
              placeholder={"+91 9876543210\n+91 8765432109"}
              style={{ width: '100%', height: '100px', padding: '10px 12px', borderRadius: '9px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Type your SMS message..."
              style={{ width: '100%', height: '90px', padding: '10px 12px', borderRadius: '9px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{charCount}/160 chars</p>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{smsCount} SMS credit{smsCount > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button disabled={!provider}
            style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: provider ? 'linear-gradient(135deg,#06b6d4,#0891b2)' : 'var(--border)', color: 'white', fontSize: '13px', fontWeight: '700', cursor: provider ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: !provider ? 0.5 : 1 }}>
            <Send size={14} /> {provider ? `Send via ${provider}` : 'Select a provider first'}
          </button>
          {!provider && <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'center' }}>Connect a provider to enable sending</p>}
        </motion.div>

        {/* Providers */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card}>
          <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>SMS Providers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {SMS_PROVIDERS.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: '900', color: p.color }}>{p.name[0]}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{p.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{p.desc}</p>
                </div>
                <a href={p.url} target="_blank" rel="noreferrer"
                  style={{ padding: '5px 12px', borderRadius: '7px', background: `${p.color}15`, border: `1px solid ${p.color}33`, color: p.color, fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                  Setup →
                </a>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '14px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--accent-light)', fontWeight: '700', marginBottom: '4px' }}>💡 Recommendation</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>For India: Use <strong style={{ color: 'var(--text-primary)' }}>MSG91</strong> (cheapest) or <strong style={{ color: 'var(--text-primary)' }}>Exotel</strong> (SMS + calls together). Add API key to backend .env to activate.</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
