import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Bot, Phone, Globe, Mic, MicOff, X, Save, ChevronLeft, Search,
  Loader2, Send, User, Volume2, CheckSquare, Square, Zap, Link2,
  Building2, Sparkles, PenLine, History, PhoneCall, ChevronDown,
  ChevronUp, Check, ArrowLeft, Radio, Ear, MessageSquareText
} from 'lucide-react'
import api from '../api'

// ── Helpers ──────────────────────────────────────────────────────────
const CARD_GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#5b21b6)',
  'linear-gradient(135deg,#0891b2,#0e7490)',
  'linear-gradient(135deg,#059669,#047857)',
  'linear-gradient(135deg,#d97706,#b45309)',
]

const LANGUAGES = ['English', 'Telugu (India)', 'Hindi', 'Tamil', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati']
const TYPES = ['Outbound', 'Inbound']
const GENDERS = ['Male', 'Female']
const GOALS = ['Lead Generation and Qualification', 'Customer Support', 'Appointment Booking', 'Survey', 'Other']

const DEFAULT_OPENING = 'Hello FirstName,'

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '🤖'
}

function getLanguageString(emp) {
  const langs = emp.languages || emp.language || 'English'
  return langs
}

function getGoalDisplay(emp) {
  return emp.goal || emp.goals || emp.role || 'Lead Generation and Qualification'
}

// ── Checklist items ──
const CHECKLIST_ITEMS = [
  { label: 'Name & Company',    check: (d) => !!(d.name && d.company_name) },
  { label: 'Language set',      check: (d) => !!d.language },
  { label: 'Custom greeting',   check: (d) => !!(d.opening_message && d.opening_message !== DEFAULT_OPENING) },
  { label: 'Script written',    check: (d) => !!(d.script && d.script.length > 50) },
  { label: 'Goal defined',      check: (d) => !!d.goal },
  { label: 'Multi-language',    check: (d) => !!(d.languages && d.languages.includes(',')) },
]

// ── Main Component ───────────────────────────────────────────────────
export default function AIEmployees() {
  const [view, setView] = useState('list')          // 'list' | 'create' | 'detail'
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Create form state ──
  const [form, setForm] = useState({
    type: 'Outbound',
    language: 'English',
    languages: 'English, Telugu (India)',
    company_name: '',
    company_website: '',
    gender: 'Male',
    name: '',
    goal: 'Lead Generation and Qualification',
    opening_message: DEFAULT_OPENING,
    script_mode: 'manual', // 'ai' | 'manual'
    script: '',
    image: null,
  })

  // ── Detail / Live Agent state ──
  const [detailForm, setDetailForm] = useState(null)
  const [callActive, setCallActive] = useState(false)
  const [agentStatus, setAgentStatus] = useState('idle') // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [chatMessages, setChatMessages] = useState([])    // {role, text, latency, timestamp}
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef(null)

  // Role play / live mic
  const [roleplayActive, setRoleplayActive] = useState(false)
  const [roleplayLatency, setRoleplayLatency] = useState(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const sessionRef = useRef(null)
  const callActiveRef = useRef(false)

  // Progress
  const [progressExpanded, setProgressExpanded] = useState(true)
  const [generalExpanded, setGeneralExpanded] = useState(true)

  // ── Lead form for calling ──
  const [leadForm, setLeadForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', dialer: '', description: '',
  })

  // ── Fetch employees on mount ──
  useEffect(() => { fetchEmployees() }, [])

  // ── Scroll chat to bottom ──
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const fetchEmployees = async () => {
    try {
      const r = await api.get('/ai-employees')
      setEmployees(r.data.employees || [])
    } catch {}
  }

  // ── Compute checklist progress ──
  const computeProgress = (data) => {
    let count = 0
    if (data.name && data.company_name) count++
    if (data.language) count++
    if (data.opening_message && data.opening_message !== DEFAULT_OPENING) count++
    if (data.script && data.script.length > 50) count++
    if (data.goal) count++
    if (data.languages && data.languages.includes(',')) count++ // multiple languages
    return count
  }

  const getReadinessLabel = (pct) => {
    if (pct >= 90) return { label: '🟢 Production Ready', color: '#10b981' }
    if (pct >= 70) return { label: '🟡 Almost Ready', color: '#fbbf24' }
    if (pct >= 40) return { label: '🟠 Needs Work', color: '#f97316' }
    return { label: '🔴 Not Ready', color: '#f87171' }
  }

  const progressCount = form ? CHECKLIST_ITEMS.filter(item => item.check(form)).length : 0
  const progressPercent = Math.round((progressCount / 6) * 100)

  // ── Create employee ──
  const createEmployee = async () => {
    if (!form.name || !form.opening_message) return
    setLoading(true)
    try {
      await api.post('/ai-employees', {
        name: form.name,
        role: form.goal,
        type: form.type?.toLowerCase(),
        language: form.language,
        languages: form.languages,
        company_name: form.company_name,
        company_website: form.company_website,
        gender: form.gender,
        goal: form.goal,
        greeting: form.opening_message,
        script: form.script,
        script_mode: form.script_mode,
      })
      resetForm()
      setView('list')
      fetchEmployees()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create assistant')
    }
    setLoading(false)
  }

  // ── Save (update) employee ──
  const saveEmployee = async () => {
    if (!detailForm || !detailForm.id) return
    setLoading(true)
    try {
      await api.put(`/ai-employees/${detailForm.id}`, {
        name: detailForm.name,
        type: detailForm.type?.toLowerCase(),
        language: detailForm.language,
        languages: detailForm.languages,
        company_name: detailForm.company_name,
        company_website: detailForm.company_website,
        gender: detailForm.gender,
        goal: detailForm.goal,
        greeting: detailForm.opening_message,
        script: detailForm.script,
        script_mode: detailForm.script_mode,
      })
      fetchEmployees()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save')
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({
      type: 'Outbound',
      language: 'English',
      languages: 'English, Telugu (India)',
      company_name: '',
      company_website: '',
      gender: 'Male',
      name: '',
      goal: 'Lead Generation and Qualification',
      opening_message: DEFAULT_OPENING,
      script_mode: 'manual',
      script: '',
      image: null,
    })
  }

  const openDetail = (emp) => {
    setSelectedEmployee(emp)
    setDetailForm({
      id: emp.id,
      type: emp.type === 'inbound' ? 'Inbound' : 'Outbound',
      language: emp.language || 'English',
      languages: emp.languages || 'English, Telugu (India)',
      company_name: emp.company_name || '',
      company_website: emp.company_website || '',
      gender: emp.gender || 'Male',
      name: emp.name || '',
      goal: emp.goal || emp.role || 'Lead Generation and Qualification',
      opening_message: emp.greeting || DEFAULT_OPENING,
      script_mode: emp.script_mode || 'manual',
      script: emp.script || '',
      image: null,
    })
    setLeadForm({ first_name: '', last_name: '', email: '', phone: '', dialer: '', description: '' })
    setChatMessages([])
    setCallActive(false)
    setAgentStatus('idle')
    setRoleplayActive(false)
    setRoleplayLatency(null)
    setView('detail')
  }

  // ── ── LIVE CALL LOGIC ── ──

  // Start call (mic + session)
  const startCall = async () => {
    try {
      // Request mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Start session with employee context
      const r = await api.post('/agent/session/start', {
        agent_name:   detailForm.name || 'Alex',
        product_info: detailForm.company_name || '',
        script:       detailForm.script || '',
        goals:        detailForm.goal || '',
        languages:    detailForm.languages || 'English',
        greeting:     detailForm.opening_message || '',
        emp_id:       detailForm.id || null,
      })
      sessionRef.current = r.data.session_id

      callActiveRef.current = true
      setCallActive(true)
      setAgentStatus('speaking')
      const greeting = r.data.greeting || 'Hello! How can I help you today?'
      setChatMessages([{ role: 'assistant', text: greeting, latency: null, timestamp: Date.now() }])

      // TTS for greeting
      try {
        const ttsRes = await api.post('/voicelab/tts/tzmicha', { text: greeting, language: 'en' }, { responseType: 'blob' })
        const audio = new Audio(URL.createObjectURL(new Blob([ttsRes.data], { type: 'audio/mpeg' })))
        audio.onended = () => {
          setAgentStatus('listening')
          startRecording()
        }
        audio.play()
      } catch {
        setAgentStatus('listening')
        startRecording()
      }
    } catch (err) {
      alert('Microphone access denied or session start failed')
    }
  }

  // Start recording
  const startRecording = () => {
    if (!streamRef.current || !callActiveRef.current) return
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' })
    mediaRecorderRef.current = mediaRecorder
    const chunks = []

    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

    mediaRecorder.onstop = async () => {
      if (!callActiveRef.current) return
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const startTime = Date.now()
      setAgentStatus('thinking')

      // STT
      try {
        const fd = new FormData()
        fd.append('file', blob, 'recording.webm')
        const sttRes = await api.post('/voicelab/stt/tzmicha', fd)
        const transcript = sttRes.data.transcript || ''
        if (transcript.trim()) {
          setChatMessages(prev => [...prev, { role: 'user', text: transcript, timestamp: Date.now() }])
          setAgentStatus('thinking')

          // Session turn
          const turnRes = await api.post('/agent/session/turn', {
            session_id: sessionRef.current,
            user_text: transcript,
          })
          const latency = Date.now() - startTime
          setRoleplayLatency(latency)
          const reply = turnRes.data.reply || turnRes.data.response || ''
          setChatMessages(prev => [...prev, { role: 'assistant', text: reply, latency, timestamp: Date.now() }])

          // TTS
          if (reply) {
            setAgentStatus('speaking')
            try {
              const ttsRes = await api.post('/voicelab/tts/tzmicha', { text: reply, language: 'en' }, { responseType: 'blob' })
              const audio = new Audio(URL.createObjectURL(new Blob([ttsRes.data], { type: 'audio/mpeg' })))
              audio.onended = () => {
                if (callActiveRef.current) {
                  setAgentStatus('listening')
                  startRecording()
                }
              }
              audio.play()
            } catch {
              if (callActiveRef.current) {
                setAgentStatus('listening')
                startRecording()
              }
            }
          } else {
            if (callActiveRef.current) {
              setAgentStatus('listening')
              startRecording()
            }
          }
        } else {
          // No transcript, continue listening
          if (callActiveRef.current) {
            setAgentStatus('listening')
            startRecording()
          }
        }
      } catch {
        if (callActiveRef.current) {
          setAgentStatus('listening')
          startRecording()
        }
      }
    }

    mediaRecorder.start()
  }

  // End call
  const endCall = async () => {
    callActiveRef.current = false
    setCallActive(false)
    setAgentStatus('idle')
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    if (sessionRef.current) {
      try { await api.post('/agent/session/end', { session_id: sessionRef.current }) } catch {}
    }
  }

  // Send typed message (alternative to mic)
  const sendTypedMessage = async () => {
    if (!chatInput.trim() || !sessionRef.current || sending) return
    const userText = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: userText, timestamp: Date.now() }])
    setSending(true)
    setAgentStatus('thinking')
    try {
      const r = await api.post('/agent/session/turn', { session_id: sessionRef.current, user_text: userText })
      const data = r.data
      const reply = data.reply || data.response || ''
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply, latency: null, timestamp: Date.now() }])
      setAgentStatus('speaking')
      if (reply) {
        try {
          const ttsRes = await api.post('/voicelab/tts/tzmicha', { text: reply, language: 'en' }, { responseType: 'blob' })
          const audio = new Audio(URL.createObjectURL(new Blob([ttsRes.data], { type: 'audio/mpeg' })))
          audio.onended = () => { if (callActiveRef.current) setAgentStatus('listening') }
          audio.play()
        } catch { if (callActiveRef.current) setAgentStatus('listening') }
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error.', timestamp: Date.now() }])
    }
    setSending(false)
  }

  // ── Filtered employees ──
  const filteredEmployees = employees.filter(emp =>
    !searchQuery || emp.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // ── RENDER: LIST VIEW ─────────────────────────────────────────────
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  if (view === 'list') {
    return (
      <div>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#f0f0f8' }}>AI Agents</h1>
            <p style={{ fontSize: '13px', color: '#55556a', marginTop: '4px' }}>Each agent is a trained voice caller with its own script, voice and goal.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#55556a" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Search agents..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="input" style={{ paddingLeft: '34px', fontSize: '12px', width: '200px' }} />
            </div>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => { resetForm(); setView('create') }}
              className="btn btn-primary" style={{ gap: '6px', padding: '8px 16px' }}>
              <Plus size={14} /> New agent
            </motion.button>
          </div>
        </motion.div>

        {/* Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
          {filteredEmployees.length === 0 ? (
            <div style={{
              gridColumn: '1/-1', textAlign: 'center', padding: '80px 0',
              background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '20px',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '18px',
                background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px'
              }}>
                <Bot size={24} color="#a78bfa" />
              </div>
              <p style={{ fontSize: '15px', fontWeight: '700', color: '#55556a' }}>Create your first assistant</p>
              <p style={{ fontSize: '12px', color: '#33334a', marginTop: '4px' }}>Get started by creating an AI voice assistant</p>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => { resetForm(); setView('create') }}
                className="btn btn-primary" style={{ marginTop: '18px' }}>
                <Plus size={14} /> Create Assistant
              </motion.button>
            </div>
          ) : (
            filteredEmployees.map((emp, i) => (
              <motion.div key={emp.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{
                  background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '16px',
                  overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e30'}
                onClick={() => openDetail(emp)}
              >
                <div style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '14px',
                      background: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Bot size={20} color="white" />
                    </div>
                    <span style={{
                      background: i === 0 ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${i === 0 ? 'rgba(124,58,237,0.3)' : '#1e1e30'}`,
                      borderRadius: '999px', padding: '3px 10px', fontSize: '10px',
                      fontWeight: '700', color: i === 0 ? '#a78bfa' : '#55556a',
                    }}>
                      {i === 0 ? '✦ Premium' : 'Normal'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f0f0f8', marginBottom: '4px' }}>
                    {emp.name || 'Assistant'} — {emp.role || emp.goal || 'Sales'}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#55556a', marginBottom: '12px', lineHeight: 1.5 }}>
                    {emp.script ? emp.script.slice(0, 60) + '...' : getGoalDisplay(emp)}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', color: '#55556a' }}>🌐 {getLanguageString(emp)}</span>
                    <span style={{ fontSize: '11px', color: '#33334a' }}>·</span>
                    <span style={{ fontSize: '11px', color: '#55556a' }}>{emp.gender || 'Female'}</span>
                    <span style={{ fontSize: '11px', color: '#33334a' }}>·</span>
                    <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '600' }}>$2.50/min</span>
                  </div>
                  <div style={{ height: '1px', background: '#1e1e30', marginBottom: '14px' }} />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={(e) => { e.stopPropagation(); openDetail(emp) }}
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '12px', gap: '6px', padding: '8px' }}>
                      <MessageSquareText size={13} /> Chat test
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={(e) => { e.stopPropagation(); openDetail(emp) }}
                      className="btn btn-ghost" style={{ padding: '8px 10px' }}>
                      <Phone size={13} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={(e) => { e.stopPropagation(); openDetail(emp) }}
                      className="btn btn-ghost" style={{ padding: '8px 10px' }}>
                      <PenLine size={13} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (confirm('Delete this agent?')) {
                          await api.delete(`/ai-employees/${emp.id}`).catch(() => {})
                          fetchEmployees()
                        }
                      }}
                      className="btn btn-ghost" style={{ padding: '8px 10px', color: '#f87171' }}>
                      <X size={13} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    )
  }

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // ── RENDER: CREATE VIEW ───────────────────────────────────────────
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  if (view === 'create') {
    return (
      <div style={{ display: 'flex', height: 'calc(100vh - 100px)', gap: '0', background: '#0d0d1a' }}>
        {/* ── LEFT PANEL: Configuration ── */}
        <div style={{
          width: '280px', minWidth: '280px', background: '#0e0e1a',
          borderRight: '1px solid #1e1e30', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 18px', borderBottom: '1px solid #1e1e30',
          }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px' }}>CONFIGURATION</p>
            <button onClick={() => setView('list')}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', color: '#55556a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ padding: '14px 16px', flex: 1, overflowY: 'auto' }}>
            {/* General Section */}
            <div style={{ marginBottom: '12px' }}>
              <div
                onClick={() => setGeneralExpanded(!generalExpanded)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '10px' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>General</p>
                {generalExpanded ? <ChevronUp size={12} color="#55556a" /> : <ChevronDown size={12} color="#55556a" />}
              </div>

              <AnimatePresence>
                {generalExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input" style={{ fontSize: '11px' }}>
                          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Language</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                          {LANGUAGES.slice(0, 3).map(lang => (
                            <button key={lang}
                              onClick={() => {
                                const langs = form.languages.split(', ').filter(Boolean)
                                const idx = langs.indexOf(lang)
                                if (idx >= 0) langs.splice(idx, 1)
                                else langs.push(lang)
                                setForm({ ...form, languages: langs.join(', ') })
                              }}
                              style={{
                                padding: '3px 8px', borderRadius: '6px', border: '1px solid',
                                fontSize: '10px', cursor: 'pointer',
                                background: form.languages.includes(lang) ? 'rgba(124,58,237,0.15)' : 'transparent',
                                borderColor: form.languages.includes(lang) ? 'rgba(124,58,237,0.3)' : '#1e1e30',
                                color: form.languages.includes(lang) ? '#a78bfa' : '#55556a',
                              }}>
                              {lang}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company Name</label>
                        <input type="text" placeholder="Enter company name" value={form.company_name}
                          onChange={e => setForm({ ...form, company_name: e.target.value })} className="input" style={{ fontSize: '11px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company Website</label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e30', borderRadius: '8px', padding: '0 8px' }}>
                          <span style={{ fontSize: '11px', color: '#55556a', whiteSpace: 'nowrap' }}>https://</span>
                          <input type="text" placeholder="company-website.com" value={form.company_website}
                            onChange={e => setForm({ ...form, company_website: e.target.value })}
                            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f0f0f8', fontSize: '11px', padding: '7px 4px' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gender</label>
                        <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="input" style={{ fontSize: '11px' }}>
                          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name of Agent</label>
                        <input type="text" placeholder="e.g. Priya" value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })} className="input" style={{ fontSize: '11px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal</label>
                        <select value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} className="input" style={{ fontSize: '11px' }}>
                          {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assistant Image</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '10px',
                            background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: '700', color: 'white',
                          }}>
                            {form.name ? getInitials(form.name) : '🤖'}
                          </div>
                          <button className="btn btn-ghost" style={{ fontSize: '10px', padding: '4px 10px' }}>Change</button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── CENTER PANEL: Main Content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0', display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 24px', borderBottom: '1px solid #1e1e30',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => setView('list')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#55556a', display: 'flex', padding: '4px' }}>
                <ChevronLeft size={18} />
              </button>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f0f0f8' }}>New Assistant</h2>
                <p style={{ fontSize: '11px', color: '#55556a', marginTop: '2px' }}>Outbound Agent</p>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={createEmployee} disabled={loading || !form.name}
              className="btn btn-primary" style={{ opacity: (!form.name || loading) ? 0.5 : 1, fontSize: '12px', gap: '4px' }}>
              {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Publishing...' : 'Publish'}
            </motion.button>
          </div>

          {/* Progress banner */}
          <div style={{
            margin: '16px 24px', padding: '12px 16px', borderRadius: '12px',
            background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14} color="#a78bfa" />
              <span style={{ fontSize: '12px', color: '#f0f0f8' }}>
                A few steps left — Finish setting up your assistant
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa' }}>{progressCount}/6</span>
          </div>

          {/* Opening Message */}
          <div style={{ padding: '0 24px 16px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#f0f0f8', marginBottom: '6px', display: 'block' }}>
              Call Opening Message <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={form.opening_message}
              onChange={e => setForm({ ...form, opening_message: e.target.value })}
              className="input"
              style={{ width: '100%', height: '80px', resize: 'vertical', fontSize: '12px', lineHeight: 1.6 }}
            />
          </div>

          {/* Script Section */}
          <div style={{ padding: '0 24px 24px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#f0f0f8', marginBottom: '8px', display: 'block' }}>
              Script
            </label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => setForm({ ...form, script_mode: 'ai' })}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                  background: form.script_mode === 'ai' ? 'rgba(124,58,237,0.15)' : 'transparent',
                  border: `1px solid ${form.script_mode === 'ai' ? 'rgba(124,58,237,0.3)' : '#1e1e30'}`,
                  color: form.script_mode === 'ai' ? '#a78bfa' : '#55556a',
                }}>
                <Sparkles size={12} style={{ marginRight: '4px' }} /> AI Assistant
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => setForm({ ...form, script_mode: 'manual' })}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                  background: form.script_mode === 'manual' ? 'rgba(124,58,237,0.15)' : 'transparent',
                  border: `1px solid ${form.script_mode === 'manual' ? 'rgba(124,58,237,0.3)' : '#1e1e30'}`,
                  color: form.script_mode === 'manual' ? '#a78bfa' : '#55556a',
                }}>
                <PenLine size={12} style={{ marginRight: '4px' }} /> Manual Script
              </motion.button>
            </div>
            <textarea
              value={form.script}
              onChange={e => setForm({ ...form, script: e.target.value })}
              placeholder="Enter your script here..."
              className="input"
              style={{ width: '100%', height: '160px', resize: 'vertical', fontSize: '12px', lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* ── RIGHT PANEL: Progress Checklist ── */}
        <div style={{
          width: '280px', minWidth: '280px', background: '#0e0e1a',
          borderLeft: '1px solid #1e1e30', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 18px', borderBottom: '1px solid #1e1e30',
          }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px' }}>PROGRESS</p>
            <button onClick={() => setProgressExpanded(!progressExpanded)}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', color: '#55556a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {progressExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {progressExpanded && (
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: '#55556a' }}>{progressCount} / 6 sections</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa' }}>{progressPercent}%</span>
              </div>
              <div style={{ height: '4px', background: '#1e1e30', borderRadius: '999px', marginBottom: '8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPercent}%`, background: progressPercent >= 90 ? '#10b981' : progressPercent >= 70 ? '#fbbf24' : '#7c3aed', borderRadius: '999px', transition: 'width 0.3s' }} />
              </div>
              {(() => { const r = getReadinessLabel(progressPercent); return (
                <div style={{ background: `${r.color}15`, border: `1px solid ${r.color}33`, borderRadius: '8px', padding: '8px 10px', marginBottom: '14px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', fontWeight: '800', color: r.color }}>{r.label}</p>
                </div>
              )})()}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {CHECKLIST_ITEMS.map((item, idx) => {
                  const isChecked = item.check(form)
                  return (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isChecked ? (
                        <CheckSquare size={14} color="#7c3aed" />
                      ) : (
                        <Square size={14} color="#33334a" />
                      )}
                      <span style={{ fontSize: '11px', color: isChecked ? '#f0f0f8' : '#33334a', fontWeight: isChecked ? '500' : '400' }}>
                        {item.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // ── RENDER: DETAIL VIEW (QCall.ai style) ──────────────────────────
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  if (view === 'detail' && detailForm) {
    const statusText = agentStatus === 'idle' ? 'Ready' :
      agentStatus === 'listening' ? 'Listening...' :
      agentStatus === 'thinking' ? 'Thinking...' :
      agentStatus === 'speaking' ? 'Speaking...' : 'Ready'

    const statusColor = agentStatus === 'idle' ? '#55556a' :
      agentStatus === 'listening' ? '#34d399' :
      agentStatus === 'thinking' ? '#fbbf24' :
      agentStatus === 'speaking' ? '#a78bfa' : '#55556a'

    return (
      <div style={{ display: 'flex', height: 'calc(100vh - 100px)', gap: '0', background: '#0d0d1a' }}>
        {/* ── LEFT PANEL: Configuration ── */}
        <div style={{
          width: '260px', minWidth: '260px', background: '#0e0e1a',
          borderRight: '1px solid #1e1e30', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 18px', borderBottom: '1px solid #1e1e30',
          }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px' }}>CONFIGURATION</p>
            <button onClick={() => setView('list')}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', color: '#55556a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ padding: '14px 16px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</label>
                <select value={detailForm.type} onChange={e => setDetailForm({ ...detailForm, type: e.target.value })} className="input" style={{ fontSize: '11px' }}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Language</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {LANGUAGES.slice(0, 3).map(lang => (
                    <button key={lang}
                      onClick={() => {
                        const langs = detailForm.languages.split(', ').filter(Boolean)
                        const idx = langs.indexOf(lang)
                        if (idx >= 0) langs.splice(idx, 1)
                        else langs.push(lang)
                        setDetailForm({ ...detailForm, languages: langs.join(', ') })
                      }}
                      style={{
                        padding: '3px 8px', borderRadius: '6px', border: '1px solid',
                        fontSize: '10px', cursor: 'pointer',
                        background: detailForm.languages.includes(lang) ? 'rgba(124,58,237,0.15)' : 'transparent',
                        borderColor: detailForm.languages.includes(lang) ? 'rgba(124,58,237,0.3)' : '#1e1e30',
                        color: detailForm.languages.includes(lang) ? '#a78bfa' : '#55556a',
                      }}>
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company Name</label>
                <input type="text" placeholder="Company name" value={detailForm.company_name}
                  onChange={e => setDetailForm({ ...detailForm, company_name: e.target.value })} className="input" style={{ fontSize: '11px' }} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company Website</label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e30', borderRadius: '8px', padding: '0 8px' }}>
                  <span style={{ fontSize: '11px', color: '#55556a', whiteSpace: 'nowrap' }}>https://</span>
                  <input type="text" placeholder="company-website.com" value={detailForm.company_website}
                    onChange={e => setDetailForm({ ...detailForm, company_website: e.target.value })}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f0f0f8', fontSize: '11px', padding: '7px 4px' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gender</label>
                <select value={detailForm.gender} onChange={e => setDetailForm({ ...detailForm, gender: e.target.value })} className="input" style={{ fontSize: '11px' }}>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name of Agent</label>
                <input type="text" placeholder="e.g. Priya" value={detailForm.name}
                  onChange={e => setDetailForm({ ...detailForm, name: e.target.value })} className="input" style={{ fontSize: '11px' }} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal</label>
                <select value={detailForm.goal} onChange={e => setDetailForm({ ...detailForm, goal: e.target.value })} className="input" style={{ fontSize: '11px' }}>
                  {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#55556a', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assistant Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '10px',
                    background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '700', color: 'white',
                  }}>
                    {detailForm.name ? getInitials(detailForm.name) : '🤖'}
                  </div>
                  <button className="btn btn-ghost" style={{ fontSize: '10px', padding: '4px 10px' }}>Change</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER PANEL: Live Agent ── */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#0d0d1a' }}>
          {/* Top bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 24px', borderBottom: '1px solid #1e1e30',
            background: '#0e0e1a',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => setView('list')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#55556a', display: 'flex', padding: '4px' }}>
                <ChevronLeft size={18} />
              </button>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f0f0f8' }}>{detailForm.name || 'Assistant'}</h2>
                <p style={{ fontSize: '11px', color: '#55556a', marginTop: '2px' }}>
                  {detailForm.type || 'Outbound'} Agent · {detailForm.goal || 'Lead Generation'}
                </p>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={saveEmployee} disabled={loading}
              className="btn btn-primary" style={{ fontSize: '12px', gap: '4px', opacity: loading ? 0.5 : 1 }}>
              {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
              {loading ? 'Saving...' : 'Save'}
            </motion.button>
          </div>

          {/* Live Agent Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
            {!callActive ? (
              /* ── Inactive: Show lead form + Start Call ── */
              <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                {/* Agent avatar */}
                <div style={{
                  width: 80, height: 80, borderRadius: '24px',
                  background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', fontWeight: '700', color: 'white',
                  boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
                  marginBottom: '4px',
                }}>
                  {detailForm.name ? getInitials(detailForm.name) : '🤖'}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f0f0f8' }}>{detailForm.name || 'Assistant'}</h3>
                <p style={{ fontSize: '12px', color: '#55556a' }}>Ready to test</p>

                {/* Lead form */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="text" placeholder="First Name" value={leadForm.first_name}
                      onChange={e => setLeadForm({ ...leadForm, first_name: e.target.value })} className="input" style={{ fontSize: '12px' }} />
                    <input type="text" placeholder="Last Name" value={leadForm.last_name}
                      onChange={e => setLeadForm({ ...leadForm, last_name: e.target.value })} className="input" style={{ fontSize: '12px' }} />
                  </div>
                  <input type="email" placeholder="Email" value={leadForm.email}
                    onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} className="input" style={{ fontSize: '12px' }} />
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e30', borderRadius: '8px', padding: '0 8px' }}>
                    <span style={{ fontSize: '12px', color: '#55556a', whiteSpace: 'nowrap' }}>🇮🇳 +91</span>
                    <input type="tel" placeholder="9876543210" value={leadForm.phone}
                      onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f0f0f8', fontSize: '12px', padding: '7px 4px' }} />
                  </div>
                  <select value={leadForm.dialer} onChange={e => setLeadForm({ ...leadForm, dialer: e.target.value })} className="input" style={{ fontSize: '12px' }}>
                    <option value="">Select dialer</option>
                    <option value="exotel">Exotel</option>
                    <option value="plivo">Plivo</option>
                    <option value="twilio">Twilio</option>
                  </select>
                  <textarea placeholder="Description..." value={leadForm.description}
                    onChange={e => setLeadForm({ ...leadForm, description: e.target.value })}
                    className="input" style={{ height: '50px', resize: 'none', fontSize: '12px' }} />
                </div>

                <motion.button whileTap={{ scale: 0.97 }} onClick={startCall}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', gap: '8px', marginTop: '4px' }}>
                  <Phone size={16} /> Start Call
                </motion.button>
              </div>
            ) : (
              /* ── Active: Live Agent with status ── */
              <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                {/* Agent Avatar with pulse animation when speaking */}
                <div style={{ position: 'relative' }}>
                  <motion.div
                    animate={agentStatus === 'speaking' ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{
                      width: 100, height: 100, borderRadius: '28px',
                      background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '36px', fontWeight: '700', color: 'white',
                      boxShadow: agentStatus === 'speaking'
                        ? '0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(124,58,237,0.2)'
                        : '0 8px 32px rgba(124,58,237,0.3)',
                      transition: 'box-shadow 0.3s',
                    }}>
                    {detailForm.name ? getInitials(detailForm.name) : '🤖'}
                  </motion.div>

                  {/* Status indicator ring */}
                  <div style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 20, height: 20, borderRadius: '50%',
                    background: statusColor,
                    border: '3px solid #0d0d1a',
                    boxShadow: agentStatus === 'listening'
                      ? '0 0 12px rgba(52,211,153,0.6)'
                      : agentStatus === 'speaking'
                      ? '0 0 12px rgba(167,139,250,0.6)'
                      : 'none',
                  }} />
                </div>

                {/* Agent name + status */}
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f0f0f8' }}>{detailForm.name || 'Assistant'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: statusColor,
                      animation: agentStatus !== 'idle' ? 'pulse 1s ease-in-out infinite' : 'none',
                    }} />
                    <span style={{ fontSize: '13px', color: statusColor, fontWeight: '500' }}>{statusText}</span>
                  </div>
                </div>

                {/* Latency badge */}
                {roleplayLatency !== null && (
                  <div style={{
                    padding: '4px 14px', borderRadius: '999px',
                    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                    fontSize: '12px', color: '#a78bfa', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <Zap size={12} /> {roleplayLatency}ms
                  </div>
                )}

                {/* Sound wave visualization when listening/speaking */}
                {(agentStatus === 'listening' || agentStatus === 'speaking') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '30px' }}>
                    {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: agentStatus === 'listening'
                            ? [8 + Math.random() * 20, 8 + Math.random() * 20, 8 + Math.random() * 20]
                            : [12, 24, 12],
                        }}
                        transition={{ repeat: Infinity, duration: 0.6 + Math.random() * 0.4, delay: i * 0.08 }}
                        style={{
                          width: 4, borderRadius: '2px',
                          background: agentStatus === 'listening' ? '#34d399' : '#a78bfa',
                          opacity: 0.8,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* End Call button */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={endCall}
                  style={{
                    padding: '12px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                    cursor: 'pointer', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}>
                  <Phone size={16} /> End Call
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: CHAT ── */}
        <div style={{
          width: '320px', minWidth: '320px', background: '#0e0e1a',
          borderLeft: '1px solid #1e1e30', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 18px', borderBottom: '1px solid #1e1e30',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquareText size={14} color="#a78bfa" />
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px' }}>CHAT</p>
            </div>
            <button onClick={() => setView('list')}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', color: '#55556a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>

          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chatMessages.length === 0 && !callActive && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#33334a' }}>
                <MessageSquareText size={24} color="#1e1e30" style={{ marginBottom: '8px' }} />
                <p style={{ fontSize: '12px' }}>Start a call to see the conversation</p>
              </div>
            )}
            {chatMessages.length === 0 && callActive && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#55556a' }}>
                <Loader2 size={20} color="#a78bfa" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                <p style={{ fontSize: '11px' }}>Waiting for conversation...</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                style={{
                  display: 'flex', gap: '8px',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '8px',
                  background: msg.role === 'user' ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(124,58,237,0.2)' : '#1e1e30'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {msg.role === 'user' ? <User size={12} color="#a78bfa" /> : <Bot size={12} color="#55556a" />}
                </div>
                <div style={{
                  padding: '8px 12px', borderRadius: '12px', fontSize: '12px', lineHeight: 1.5, maxWidth: '80%',
                  background: msg.role === 'user' ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(124,58,237,0.15)' : '#1e1e30'}`,
                  color: '#f0f0f8',
                }}>
                  <span style={{ fontWeight: '600', fontSize: '10px', color: msg.role === 'user' ? '#a78bfa' : '#55556a', display: 'block', marginBottom: '2px' }}>
                    {msg.role === 'user' ? 'You (STT)' : 'AI (TTS)'}
                  </span>
                  {msg.text}
                  {msg.latency && (
                    <span style={{ fontSize: '9px', color: '#55556a', marginLeft: '6px', display: 'block', marginTop: '4px' }}>
                      <Zap size={8} style={{ marginRight: '2px' }} />{msg.latency}ms
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #1e1e30' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text" placeholder="Type a message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendTypedMessage()}
                className="input"
                style={{ flex: 1, fontSize: '11px' }}
                disabled={!callActive}
              />
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={sendTypedMessage}
                disabled={sending || !chatInput.trim() || !callActive}
                className="btn btn-primary"
                style={{ padding: '8px', opacity: (sending || !chatInput.trim() || !callActive) ? 0.5 : 1 }}>
                {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              </motion.button>
            </div>
            <p style={{ fontSize: '9px', color: '#33334a', marginTop: '6px', textAlign: 'center' }}>
              {callActive ? 'Messages appear in real-time from STT (you) & TTS (AI)' : 'Start a call to begin chatting'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Fallback
  return null
}