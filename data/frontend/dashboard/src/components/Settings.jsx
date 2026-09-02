import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Eye, EyeOff, Bell, Globe, Shield, Cpu, Phone, CheckCircle2, MessageCircle } from 'lucide-react'

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }

const Section = ({ icon: Icon, color, title, desc, children }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={card}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `rgba(${color},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={`rgb(${color})`} />
      </div>
      <div>
        <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{title}</p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</p>
      </div>
    </div>
    {children}
  </motion.div>
)

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{label}</label>
    {children}
    {hint && <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>{hint}</p>}
  </div>
)

const Input = ({ value, onChange, placeholder, type = 'text', ...rest }) => (
  <input
    type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
    {...rest}
  />
)

const Toggle = ({ value, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--bg-card)' }}>
    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
    <div onClick={() => onChange(!value)} style={{ width: '40px', height: '22px', borderRadius: '999px', background: value ? '#7c3aed' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', top: '3px', left: value ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
    </div>
  </div>
)

export default function Settings() {
  const [saved, setSaved] = useState(false)

  // AI Engine
  const [groqKey, setGroqKey]       = useState(localStorage.getItem('s_groq') || '')
  const [showGroq, setShowGroq]     = useState(false)
  const [llmModel, setLlmModel]     = useState(localStorage.getItem('s_model') || 'llama3-8b-8192')
  const [language, setLanguage]     = useState(localStorage.getItem('s_lang') || 'en')
  const [voiceEngine, setVoiceEngine] = useState(localStorage.getItem('s_voice') || 'edge-tts')

  // Calling
  const [callerId, setCallerId]     = useState(localStorage.getItem('s_caller') || '')
  const [maxCalls, setMaxCalls]     = useState(localStorage.getItem('s_maxcalls') || '5')
  const [callDelay, setCallDelay]   = useState(localStorage.getItem('s_delay') || '2')

  // Notifications
  const [notifHot, setNotifHot]     = useState(localStorage.getItem('s_notif_hot') !== 'false')
  const [notifCall, setNotifCall]   = useState(localStorage.getItem('s_notif_call') !== 'false')
  const [notifEmail, setNotifEmail] = useState(localStorage.getItem('s_notif_email') === 'true')
  const [emailAddr, setEmailAddr]   = useState(localStorage.getItem('s_email') || '')

  // WhatsApp Auto-Summary
  const [waAutoSend, setWaAutoSend] = useState(localStorage.getItem('s_wa_auto') === 'true')
  const [waBothDir, setWaBothDir]   = useState(localStorage.getItem('s_wa_both') !== 'false')
  const [waNumbers, setWaNumbers]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('s_wa_numbers') || '[]') } catch { return [] }
  })
  const [summaryLang, setSummaryLang] = useState(localStorage.getItem('s_summary_lang') || 'en')

  const addWaEntry    = () => setWaNumbers(p => [...p, { label: '', phone: '', enabled: true }])
  const removeWaEntry = (i) => setWaNumbers(p => p.filter((_, idx) => idx !== i))
  const updateWaEntry = (i, key, val) => setWaNumbers(p => p.map((e, idx) => idx === i ? { ...e, [key]: val } : e))
  const toggleWaEntry = (i) => setWaNumbers(p => p.map((e, idx) => idx === i ? { ...e, enabled: !e.enabled } : e))

  // Security
  const [sessionTimeout, setSessionTimeout] = useState(localStorage.getItem('s_timeout') || '60')

  const handleSave = () => {
    localStorage.setItem('s_groq', groqKey)
    localStorage.setItem('s_model', llmModel)
    localStorage.setItem('s_lang', language)
    localStorage.setItem('s_voice', voiceEngine)
    localStorage.setItem('s_caller', callerId)
    localStorage.setItem('s_maxcalls', maxCalls)
    localStorage.setItem('s_delay', callDelay)
    localStorage.setItem('s_notif_hot', notifHot)
    localStorage.setItem('s_notif_call', notifCall)
    localStorage.setItem('s_notif_email', notifEmail)
    localStorage.setItem('s_email', emailAddr)
    localStorage.setItem('s_wa_auto', waAutoSend)
    localStorage.setItem('s_wa_numbers', JSON.stringify(waNumbers))
    localStorage.setItem('s_wa_both', waBothDir)
    localStorage.setItem('s_summary_lang', summaryLang)
    localStorage.setItem('s_timeout', sessionTimeout)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.6px' }}>Settings</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Configure your AI Voice Engine</p>
        </div>
        <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: saved ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#7c3aed,#06b6d4)', border: saved ? '1px solid rgba(16,185,129,0.3)' : 'none', color: saved ? '#10b981' : 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
          {saved ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
        </button>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* AI Engine */}
        <Section icon={Cpu} color="124,58,237" title="AI Engine" desc="LLM, voice & language settings">
          <Field label="Groq API Key" hint="Get free key at console.groq.com">
            <div style={{ position: 'relative' }}>
              <Input type={showGroq ? 'text' : 'password'} value={groqKey} onChange={e => setGroqKey(e.target.value)} placeholder="gsk_..." />
              <button onClick={() => setShowGroq(!showGroq)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showGroq ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="LLM Model">
            <select value={llmModel} onChange={e => setLlmModel(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
              <option value="llama3-8b-8192">LLaMA 3 8B (Fast)</option>
              <option value="llama3-70b-8192">LLaMA 3 70B (Smart)</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
              <option value="gemma-7b-it">Gemma 7B</option>
            </select>
          </Field>
          <Field label="Voice Engine">
            <select value={voiceEngine} onChange={e => setVoiceEngine(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
              <option value="edge-tts">Edge TTS (Free · Fast)</option>
              <option value="elevenlabs">ElevenLabs (Human · Paid)</option>
              <option value="deepgram">Deepgram Aura (Paid)</option>
              <option value="pyttsx3">pyttsx3 (Offline · Robotic)</option>
            </select>
          </Field>
          <Field label="Default Language">
            <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
              <option value="ta">Tamil</option>
              <option value="kn">Kannada</option>
              <option value="mr">Marathi</option>
            </select>
          </Field>
        </Section>

        {/* Calling */}
        <Section icon={Phone} color="6,182,212" title="Calling" desc="Outbound call configuration">
          <Field label="Caller ID / Phone Number" hint="Your Twilio/Exotel number">
            <Input value={callerId} onChange={e => setCallerId(e.target.value)} placeholder="+91 9876543210" />
          </Field>
          <Field label="Max Concurrent Calls" hint="Limit simultaneous AI calls">
            <select value={maxCalls} onChange={e => setMaxCalls(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
              {[1,2,3,5,10,20,50].map(n => <option key={n} value={n}>{n} calls</option>)}
            </select>
          </Field>
          <Field label="Delay Between Calls (seconds)" hint="Pause between each outbound call">
            <select value={callDelay} onChange={e => setCallDelay(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
              {[1,2,3,5,10,15,30].map(n => <option key={n} value={n}>{n}s</option>)}
            </select>
          </Field>
          <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '10px', padding: '12px', marginTop: '8px' }}>
            <p style={{ fontSize: '11px', color: '#06b6d4', fontWeight: '700', marginBottom: '4px' }}>📞 Telephony Status</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Currently using: <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Call Simulator (Demo)</span></p>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>Upgrade to Twilio/Exotel for real calls</p>
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} color="251,191,36" title="Notifications" desc="Alert preferences">
          <Toggle value={notifHot} onChange={setNotifHot} label="Alert on Hot Lead detected" />
          <Toggle value={notifCall} onChange={setNotifCall} label="Alert on call completion" />
          <Toggle value={notifEmail} onChange={setNotifEmail} label="Email notifications" />
          {notifEmail && (
            <Field label="Notification Email" hint="">
              <Input value={emailAddr} onChange={e => setEmailAddr(e.target.value)} placeholder="you@company.com" type="email" />
            </Field>
          )}
        </Section>

        {/* WhatsApp Auto-Summary */}
        <Section icon={MessageCircle} color="37,211,102" title="WhatsApp Auto-Summary" desc="Auto-send call summary after every call">
          <Toggle value={waAutoSend} onChange={setWaAutoSend} label="Auto-send summary after call ends" />
          <Toggle value={waBothDir} onChange={setWaBothDir} label="Send for both inbound & outbound calls" />

          {/* Summary Language */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--bg-card)' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Summary Language</span>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Language used for AI call summary & WhatsApp message</p>
            </div>
            <select value={summaryLang} onChange={e => setSummaryLang(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
              <option value="en">🇬🇧 Always English</option>
              <option value="auto">🌐 Same as call language</option>
              <option value="te">🇮🇳 Always Telugu</option>
              <option value="hi">🇮🇳 Always Hindi</option>
            </select>
          </div>

          {waAutoSend && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
                <p style={{ fontSize: '11px', color: '#25d366', fontWeight: '700', marginBottom: '2px' }}>✅ Auto-send is ON</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Summary opens WhatsApp automatically after every call for each enabled number below.</p>
              </div>

              {/* Number list */}
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Notify Numbers</p>
              {waNumbers.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div onClick={() => toggleWaEntry(i)} style={{ width: '36px', height: '20px', borderRadius: '999px', background: entry.enabled ? '#25d366' : 'var(--border)', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: '2px', left: entry.enabled ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                  </div>
                  <input value={entry.label} onChange={e => updateWaEntry(i, 'label', e.target.value)}
                    placeholder="Label (e.g. Manager)" style={{ width: '100px', padding: '7px 10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '11px', outline: 'none' }} />
                  <input value={entry.phone} onChange={e => updateWaEntry(i, 'phone', e.target.value)}
                    placeholder="+91 9876543210" style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '11px', outline: 'none' }} />
                  <select value={entry.lang || 'en'} onChange={e => updateWaEntry(i, 'lang', e.target.value)}
                    style={{ padding: '7px 8px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '11px', outline: 'none' }}>
                    <option value="en">🇬🇧 EN</option>
                    <option value="te">🇮🇳 TE</option>
                    <option value="hi">🇮🇳 HI</option>
                    <option value="ta">🇮🇳 TA</option>
                    <option value="kn">🇮🇳 KN</option>
                    <option value="auto">🔄 Auto</option>
                  </select>
                  <button onClick={() => removeWaEntry(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '7px', padding: '5px 9px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                </div>
              ))}
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '8px' }}>💡 Each number gets summary in their preferred language</p>
              <button onClick={addWaEntry} style={{ marginTop: '4px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', color: '#25d366', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>+ Add Number</button>
            </div>
          )}
        </Section>

        {/* Security */}
        <Section icon={Shield} color="248,113,113" title="Security" desc="Access & session settings">
          <Field label="Session Timeout (minutes)" hint="Auto logout after inactivity">
            <select value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
              {[15,30,60,120,480].map(n => <option key={n} value={n}>{n} min</option>)}
            </select>
          </Field>
          <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '11px', color: '#f87171', fontWeight: '700', marginBottom: '6px' }}>⚠️ Security Tips</p>
            {['Never share your API keys', 'Rotate tokens every 90 days', 'Use strong passwords'].map((t, i) => (
              <p key={i} style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>• {t}</p>
            ))}
          </div>
        </Section>

      </div>
    </div>
  )
}
