import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Send, Users, Zap, CheckCircle2, Phone, Clock, Plus, Trash2 } from 'lucide-react'
import api from '../api'

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }

const TEMPLATES = [
  { id: 1, name: 'Hot Lead Follow-up', msg: 'Hi {name}! We spoke earlier about {product}. You showed great interest — would you like to schedule a quick demo? Reply YES and we will call you back! 🔥' },
  { id: 2, name: 'Call Summary', msg: 'Hi {name}! Thank you for your time today. Here is a quick summary of our call: {summary}. Next step: {action}. Feel free to reply with any questions!' },
  { id: 3, name: 'Appointment Reminder', msg: 'Hi {name}! Reminder: You have a meeting scheduled tomorrow at {time}. Reply CONFIRM to confirm or RESCHEDULE to change the time. See you soon! 📅' },
  { id: 4, name: 'Campaign Intro', msg: 'Hi {name}! I am {agent} from {company}. We have an exciting offer for you regarding {product}. Interested? Reply YES for more details or STOP to opt out.' },
]

export default function WhatsAppPage() {
  const [tab, setTab]           = useState('broadcast') // broadcast | templates | logs
  const [numbers, setNumbers]   = useState('')
  const [message, setMessage]   = useState('')
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(null)
  const [selectedTpl, setSelectedTpl] = useState(null)

  const handleSend = () => {
    const nums = numbers.split('\n').map(n => n.trim()).filter(Boolean)
    if (!nums.length || !message.trim()) return
    setSending(true)
    // Open WhatsApp for each number sequentially
    nums.forEach((num, i) => {
      setTimeout(() => {
        const clean = num.replace(/\D/g, '')
        const n = clean.length === 10 ? '91' + clean : clean
        window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, '_blank')
      }, i * 800)
    })
    setTimeout(() => {
      setSending(false)
      setSent(nums.length)
      setTimeout(() => setSent(null), 3000)
    }, nums.length * 800 + 500)
  }

  const applyTemplate = (tpl) => {
    setMessage(tpl.msg)
    setSelectedTpl(tpl.id)
    setTab('broadcast')
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(37,211,102,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={20} color="#25d366" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>WhatsApp</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Send messages & call summaries via WhatsApp</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        {[['broadcast','📢 Broadcast'],['templates','📋 Templates'],['auto','⚡ Auto-Summary']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '7px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', background: tab === id ? '#25d366' : 'transparent', color: tab === id ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'broadcast' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>Send Message</p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Phone Numbers (one per line)</label>
              <textarea value={numbers} onChange={e => setNumbers(e.target.value)}
                placeholder={"+91 9876543210\n+91 8765432109\n..."}
                style={{ width: '100%', height: '120px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Type your message here..."
                style={{ width: '100%', height: '100px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>{message.length} characters</p>
            </div>
            <button onClick={handleSend} disabled={sending || !numbers.trim() || !message.trim()}
              style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: sending ? 'var(--border)' : 'linear-gradient(135deg,#25d366,#128c7e)', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: (!numbers.trim() || !message.trim()) ? 0.5 : 1 }}>
              <Send size={14} /> {sending ? 'Opening WhatsApp...' : 'Send via WhatsApp'}
            </button>
            {sent && <p style={{ fontSize: '12px', color: '#25d366', marginTop: '10px', textAlign: 'center' }}>✅ Opened WhatsApp for {sent} number{sent > 1 ? 's' : ''}!</p>}
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'center' }}>Opens WhatsApp Web for each number. Works without WhatsApp Business API.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card}>
            <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>Quick Stats</p>
            {[
              { label: 'Auto-Summary', desc: 'Sends after every call', status: localStorage.getItem('s_wa_auto') === 'true', color: '#25d366' },
              { label: 'Notify Numbers', desc: `${(() => { try { return JSON.parse(localStorage.getItem('s_wa_numbers') || '[]').length } catch { return 0 } })()} numbers configured`, status: true, color: '#06b6d4' },
              { label: 'Both Directions', desc: 'Inbound + Outbound', status: localStorage.getItem('s_wa_both') !== 'false', color: '#a78bfa' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{s.label}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{s.desc}</p>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', background: s.status ? `rgba(37,211,102,0.1)` : 'rgba(85,85,106,0.1)', color: s.status ? '#25d366' : 'var(--text-muted)' }}>
                  {s.status ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' }))}
              style={{ width: '100%', marginTop: '14px', padding: '9px', borderRadius: '9px', background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', color: '#25d366', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              Configure in Settings →
            </button>
          </motion.div>
        </div>
      )}

      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
          {TEMPLATES.map((tpl, i) => (
            <motion.div key={tpl.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ ...card, cursor: 'pointer', border: selectedTpl === tpl.id ? '1px solid rgba(37,211,102,0.4)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{tpl.name}</p>
                {selectedTpl === tpl.id && <CheckCircle2 size={14} color="#25d366" />}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '12px' }}>{tpl.msg}</p>
              <button onClick={() => applyTemplate(tpl)}
                style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', color: '#25d366', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                Use Template
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {tab === 'auto' && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Zap size={16} color="#25d366" />
            <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>Auto-Summary Configuration</p>
          </div>
          <div style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#25d366', fontWeight: '700', marginBottom: '8px' }}>How it works</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              After every call ends → AI generates summary → WhatsApp opens automatically for each configured number → Each person gets summary in their preferred language (EN/TE/HI/TA/KN).
            </p>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Configure auto-summary settings in <strong style={{ color: 'var(--accent-light)' }}>Settings → WhatsApp Auto-Summary</strong></p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: '900', color: '#25d366' }}>
                {(() => { try { return JSON.parse(localStorage.getItem('s_wa_numbers') || '[]').length } catch { return 0 } })()}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Notify Numbers</p>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: '900', color: localStorage.getItem('s_wa_auto') === 'true' ? '#25d366' : 'var(--text-dim)' }}>
                {localStorage.getItem('s_wa_auto') === 'true' ? 'ON' : 'OFF'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Auto-Send</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
