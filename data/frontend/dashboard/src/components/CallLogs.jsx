import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Phone, Clock, Download, PhoneForwarded, Radio, ArrowRightLeft, FileText, MessageCircle, TrendingUp, AlertTriangle, Zap, Target, Brain, Calendar, PhoneCall, CheckCircle2 } from 'lucide-react'
import api from '../api'

// ── WhatsApp helpers ──────────────────────────────────────────
const LABELS = {
  en: { title: 'Call Summary', lead: 'Lead', dur: 'Duration', score: 'Score', cat: 'Category', sent: 'Sentiment', summ: 'Summary' },
  te: { title: 'కాల్ సారాంశం', lead: 'లీడ్', dur: 'వ్యవధి', score: 'స్కోర్', cat: 'వర్గం', sent: 'భావన', summ: 'సారాంశం' },
  hi: { title: 'कॉल सारांश', lead: 'लीड', dur: 'अवधि', score: 'स्कोर', cat: 'श्रेणी', sent: 'भावना', summ: 'सारांश' },
  ta: { title: 'அழைப்பு சுருக்கம்', lead: 'லீட்', dur: 'கால அளவு', score: 'மதிப்பெண்', cat: 'வகை', sent: 'உணர்வு', summ: 'சுருக்கம்' },
  kn: { title: 'ಕರೆ ಸಾರಾಂಶ', lead: 'ಲೀಡ್', dur: 'ಅವಧಿ', score: 'ಸ್ಕೋರ್', cat: 'ವರ್ಗ', sent: 'ಭಾವನೆ', summ: 'ಸಾರಾಂಶ' },
}

function buildSummary(call, lang = 'en') {
  const dir   = call.direction === 'inbound' ? 'Incoming 📲' : 'Outgoing 📞'
  const emoji = call.category === 'hot' ? '🔥' : call.category === 'warm' ? '🌤️' : '❄️'
  const dur   = call.duration_seconds
    ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
    : 'N/A'
  const t = LABELS[lang] || LABELS.en
  // Use per-language summary if stored, else fallback to default summary
  const summaryText = call[`summary_${lang}`] || call.summary || 'No summary available'

  return (
    `📞 *${dir} ${t.title}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *${t.lead}:* ${call.lead_name}\n` +
    `⏱️ *${t.dur}:* ${dur}\n` +
    `🎯 *${t.score}:* ${call.lead_score}/10\n` +
    `${emoji} *${t.cat}:* ${(call.category || 'warm').toUpperCase()}\n` +
    `😊 *${t.sent}:* ${call.sentiment || 'neutral'}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *${t.summ}:*\n${summaryText}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🤖 AI Voice Engine`
  )
}

function openWa(phone, text) {
  const clean = phone.replace(/\D/g, '')
  const num   = clean.length === 10 ? '91' + clean : clean
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank')
}

// Auto-send after every call — each number gets summary in their own language
function autoSendWa(call) {
  if (localStorage.getItem('s_wa_auto') !== 'true') return
  const bothDir = localStorage.getItem('s_wa_both') !== 'false'
  if (!bothDir && call.direction === 'inbound') return
  try {
    const numbers = JSON.parse(localStorage.getItem('s_wa_numbers') || '[]')
    numbers.filter(n => n.enabled && n.phone).forEach(n => {
      const lang = n.lang || 'en'
      openWa(n.phone, buildSummary(call, lang))
    })
  } catch {}
}

// ── Score Ring ────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 16, circ = 2 * Math.PI * r
  const pct   = Math.min(Math.max((score || 0) / 10, 0), 1)
  const color = pct >= 0.7 ? '#f87171' : pct >= 0.4 ? '#fbbf24' : '#60a5fa'
  return (
    <svg width="44" height="44" style={{ flexShrink: 0 }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#1e1e30" strokeWidth="3" />
      <motion.circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - pct * circ }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        transform="rotate(-90 22 22)"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x="22" y="27" textAnchor="middle" fill="#f0f0f8" fontSize="11" fontWeight="800">{score}</text>
    </svg>
  )
}

const GLOW  = { hot: '239,68,68', warm: '245,158,11', cold: '59,130,246' }
const CCOLOR = { hot: '#f87171', warm: '#fbbf24', cold: '#60a5fa' }

// ── Call Intelligence Panel ──────────────────────────────────
function CallIntelligence({ call }) {
  const urgencyColor = {
    immediate:    { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: '🚨 Immediate' },
    within_24h:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  label: '⚡ Within 24h' },
    this_week:    { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   label: '📅 This Week' },
    low_priority: { color: '#55556a', bg: 'rgba(85,85,106,0.1)',   label: '🔵 Low Priority' },
  }
  const emotionEmoji = {
    excited: '🤩', positive: '😊', neutral: '😐',
    hesitant: '🤔', frustrated: '😤', angry: '😠'
  }
  const intentLabel = {
    interested: 'Interested', not_interested: 'Not Interested',
    callback: 'Wants Callback', price_inquiry: 'Price Inquiry',
    demo_request: 'Demo Request', complaint: 'Complaint', wrong_number: 'Wrong Number'
  }

  const urgency = urgencyColor[call.follow_up_urgency] || urgencyColor.this_week
  const hasSignals = call.buying_signals?.length > 0
  const hasObjections = call.objections?.length > 0
  const hasTopics = call.key_topics?.length > 0

  if (!call.intent && !hasSignals && !hasObjections) return null

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <Brain size={12} color="#06b6d4" />
        <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Call Intelligence</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        {/* Intent */}
        <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '10px', padding: '10px' }}>
          <p style={{ fontSize: '9px', color: '#55556a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Intent</p>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#a78bfa' }}>{intentLabel[call.intent] || call.intent || '—'}</p>
        </div>
        {/* Emotion */}
        <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '10px', padding: '10px' }}>
          <p style={{ fontSize: '9px', color: '#55556a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Emotion</p>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4' }}>{emotionEmoji[call.emotion] || ''} {call.emotion || '—'}</p>
        </div>
        {/* Follow-up urgency */}
        <div style={{ background: urgency.bg, border: `1px solid ${urgency.color}33`, borderRadius: '10px', padding: '10px' }}>
          <p style={{ fontSize: '9px', color: '#55556a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Follow-up</p>
          <p style={{ fontSize: '11px', fontWeight: '700', color: urgency.color }}>{urgency.label}</p>
        </div>
      </div>

      {/* Buying Signals */}
      {hasSignals && (
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
            <TrendingUp size={11} color="#10b981" />
            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>Buying Signals</span>
          </div>
          {call.buying_signals.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <CheckCircle2 size={10} color="#10b981" />
              <span style={{ fontSize: '11px', color: '#a0a0b8' }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Objections */}
      {hasObjections && (
        <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
            <AlertTriangle size={11} color="#fbbf24" />
            <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase' }}>Objections</span>
          </div>
          {call.objections.map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{ fontSize: '10px', color: '#fbbf24' }}>⚠</span>
              <span style={{ fontSize: '11px', color: '#a0a0b8' }}>{o}</span>
            </div>
          ))}
        </div>
      )}

      {/* Key Topics */}
      {hasTopics && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
          {call.key_topics.map((t, i) => (
            <span key={i} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa' }}>{t}</span>
          ))}
        </div>
      )}

      {/* Recommended Action */}
      {call.recommended_action && (
        <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Target size={12} color="#a78bfa" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ fontSize: '9px', color: '#55556a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Recommended Action</p>
            <p style={{ fontSize: '12px', color: '#f0f0f8', fontWeight: '600' }}>{call.recommended_action}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Smart Follow-Up Actions ───────────────────────────────────
function FollowUpActions({ call }) {
  const [done, setDone] = useState(null)

  const actions = [
    {
      id: 'call_tomorrow',
      icon: PhoneCall,
      label: 'Call Tomorrow',
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.1)',
      border: 'rgba(6,182,212,0.25)',
      action: () => {
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
        alert(`📞 Reminder set: Call ${call.lead_name} on ${tomorrow.toLocaleDateString()}`)
        setDone('call_tomorrow')
      }
    },
    {
      id: 'whatsapp_now',
      icon: MessageCircle,
      label: 'WhatsApp Now',
      color: '#25d366',
      bg: 'rgba(37,211,102,0.1)',
      border: 'rgba(37,211,102,0.25)',
      action: () => {
        const numbers = (() => { try { return JSON.parse(localStorage.getItem('s_wa_numbers') || '[]') } catch { return [] } })()
        const text = buildSummary(call, 'en')
        if (call.phone && call.phone !== 'simulated') {
          openWa(call.phone, text)
        } else if (numbers.length > 0) {
          openWa(numbers[0].phone, text)
        } else {
          alert('No phone number available. Add numbers in Settings → WhatsApp.')
        }
        setDone('whatsapp_now')
      }
    },
    {
      id: 'schedule_meeting',
      icon: Calendar,
      label: 'Schedule Meeting',
      color: '#a78bfa',
      bg: 'rgba(124,58,237,0.1)',
      border: 'rgba(124,58,237,0.25)',
      action: () => {
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Meeting+with+${encodeURIComponent(call.lead_name)}&details=${encodeURIComponent(call.summary || 'Follow-up call')}`
        window.open(url, '_blank')
        setDone('schedule_meeting')
      }
    },
  ]

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Zap size={11} color="#fbbf24" />
        <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Smart Follow-Up</span>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {actions.map(a => (
          <button key={a.id} onClick={a.action}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: done === a.id ? 'rgba(16,185,129,0.15)' : a.bg, border: `1px solid ${done === a.id ? 'rgba(16,185,129,0.3)' : a.border}`, color: done === a.id ? '#10b981' : a.color, fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>
            {done === a.id ? <CheckCircle2 size={11} /> : <a.icon size={11} />}
            {done === a.id ? 'Done!' : a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── WhatsApp Manual Button ────────────────────────────────────
function WhatsAppBtn({ call }) {
  const [sent, setSent] = useState(null)
  const numbers = (() => {
    try { return JSON.parse(localStorage.getItem('s_wa_numbers') || '[]') } catch { return [] }
  })()

  const handleSend = (phone, lang = 'en', label = '') => {
    openWa(phone, buildSummary(call, lang))
    setSent(label || phone)
    setTimeout(() => setSent(null), 2000)
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <p style={{ fontSize: '11px', color: '#25d366', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <MessageCircle size={11} /> Send Summary via WhatsApp
      </p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {call.phone && call.phone !== 'simulated' && (
          <button onClick={() => handleSend(call.phone, 'en', 'Lead')}
            style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', color: '#25d366', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
            📱 Lead
          </button>
        )}
        {numbers.filter(n => n.phone).map((n, i) => (
          <button key={i} onClick={() => handleSend(n.phone, n.lang || 'en', n.label)}
            style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', color: '#25d366', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
            👤 {n.label || `#${i + 1}`}
            <span style={{ fontSize: '9px', marginLeft: '4px', opacity: 0.7 }}>({(n.lang || 'en').toUpperCase()})</span>
          </button>
        ))}
        {numbers.length === 0 && (!call.phone || call.phone === 'simulated') && (
          <p style={{ fontSize: '11px', color: '#33334a' }}>Add numbers in Settings → WhatsApp Auto-Summary</p>
        )}
      </div>
      {sent && <p style={{ fontSize: '10px', color: '#25d366', marginTop: '4px' }}>✅ Sent to {sent}!</p>}
    </div>
  )
}

// ── Active Call Card ──────────────────────────────────────────
function ActiveCallCard({ call, onTransfer }) {
  const [humanNum, setHumanNum]         = useState('')
  const [transferring, setTransferring] = useState(false)

  const statusColor = {
    ringing: '#fbbf24', active: '#4ade80', transfer_pending: '#a78bfa', demo: '#60a5fa',
  }[call.status] || '#55556a'

  const handleTransfer = async () => {
    if (!humanNum.trim()) return
    setTransferring(true)
    try {
      await api.post('/voice/transfer', { call_id: call.call_id, human_number: humanNum })
      onTransfer(call.call_id)
    } catch {}
    setTransferring(false)
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#0e0e1a', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '14px', padding: '16px 20px', marginBottom: '10px', boxShadow: '0 0 20px rgba(74,222,128,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', width: 10, height: 10 }}>
            <motion.div animate={{ scale: [1, 2, 1], opacity: [1, 0, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: statusColor, opacity: 0.4 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor }} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f8' }}>
              {call.direction === 'inbound' ? '📲 Incoming' : '📞 Outgoing'} — {call.call_id.split('_').slice(-1)[0]}
            </p>
            <p style={{ fontSize: '11px', color: '#55556a', marginTop: '2px' }}>
              {call.transcript_turns} turns · Score {call.score}/10 · {call.emotion} · {call.intent || 'qualifying'}
            </p>
          </div>
        </div>
        <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: '999px', background: `rgba(${statusColor === '#4ade80' ? '74,222,128' : '245,158,11'},0.12)`, color: statusColor, border: `1px solid ${statusColor}44`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {call.status}
        </span>
      </div>
      {(call.score >= 6 || call.transfer_requested) && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e1e30', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ArrowRightLeft size={13} color="#a78bfa" />
          <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: '600' }}>
            {call.transfer_requested ? '✅ Transfer queued' : '🔥 HOT lead — Transfer to human?'}
          </span>
          {!call.transfer_requested && (
            <>
              <input value={humanNum} onChange={e => setHumanNum(e.target.value)} placeholder="Human agent number"
                style={{ flex: 1, background: '#181828', border: '1px solid #2b3447', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: '#f0f0f8', outline: 'none' }} />
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleTransfer} disabled={!humanNum.trim() || transferring}
                style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', color: '#fff', fontSize: '12px', fontWeight: '700', opacity: !humanNum.trim() ? 0.5 : 1 }}>
                <PhoneForwarded size={12} style={{ display: 'inline', marginRight: 4 }} />
                {transferring ? 'Transferring…' : 'Transfer'}
              </motion.button>
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function CallLogs() {
  const [calls,       setCalls]       = useState([])
  const [activeCalls, setActiveCalls] = useState([])
  const [expanded,    setExpanded]    = useState(null)
  const prevCallIds = useRef(new Set())
  const pollRef     = useRef(null)

  const fetchCalls = () =>
    api.get('/calls').then(r => {
      const newCalls = r.data.calls || []
      newCalls.forEach(c => {
        if (!prevCallIds.current.has(c.id)) {
          prevCallIds.current.add(c.id)
          if (prevCallIds.current.size > 1) autoSendWa(c)
        }
      })
      setCalls(newCalls)
    }).catch(() => {})

  const fetchActive = () =>
    api.get('/voice/active').then(r => setActiveCalls(r.data.active_calls || [])).catch(() => {})

  useEffect(() => {
    fetchCalls()
    fetchActive()
    pollRef.current = setInterval(() => { fetchActive(); fetchCalls() }, 4000)
    return () => clearInterval(pollRef.current)
  }, [])

  const handleTransferred = (callId) =>
    setActiveCalls(p => p.map(c => c.call_id === callId ? { ...c, transfer_requested: true } : c))

  const handleEnd = async (callId) => {
    try { await api.post(`/voice/end?call_id=${callId}`) } catch {}
    fetchActive(); fetchCalls()
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#f0f0f8', letterSpacing: '-0.5px' }}>Call Activity</h1>
          <p style={{ fontSize: '13px', color: '#55556a', marginTop: '4px' }}>
            {activeCalls.length > 0 && <span style={{ color: '#4ade80', fontWeight: 700 }}>{activeCalls.length} live · </span>}
            {calls.length} total calls
            {localStorage.getItem('s_wa_auto') === 'true' && (
              <span style={{ marginLeft: '10px', fontSize: '11px', color: '#25d366', fontWeight: '600' }}>
                <MessageCircle size={10} style={{ display: 'inline', marginRight: 3 }} />WhatsApp Auto ON
              </span>
            )}
          </p>
        </div>
        <a href="#" onClick={e => {
          e.preventDefault()
          const base = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '/api'
          const clientId = localStorage.getItem('client_id')
          fetch(`${base}/export/calls`, { headers: { 'x-client-id': clientId } })
            .then(r => r.blob()).then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'calls.csv'; a.click() })
        }} className="btn btn-ghost" style={{ textDecoration: 'none', fontSize: '12px' }}>
          <Download size={13} /> Export
        </a>
      </motion.div>

      <AnimatePresence>
        {activeCalls.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Radio size={14} color="#4ade80" />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Live Calls</span>
            </div>
            {activeCalls.map(call => (
              <ActiveCallCard key={call.call_id} call={call} onTransfer={handleTransferred} onEnd={handleEnd} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {calls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '18px' }}>
          <Phone size={28} style={{ color: '#1e1e30', margin: '0 auto 14px' }} />
          <p style={{ fontSize: '14px', color: '#33334a', fontWeight: '600' }}>No calls yet</p>
          <p style={{ fontSize: '12px', color: '#1e1e30', marginTop: '4px' }}>Use the Simulator or trigger a real call from Leads</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '28px' }}>
          <div style={{ position: 'absolute', left: '9px', top: '8px', bottom: '8px', width: '2px', background: 'linear-gradient(to bottom, rgba(124,58,237,0.4), rgba(124,58,237,0.05))', borderRadius: '2px' }} />
          {calls.map((call, i) => {
            const g      = GLOW[call.category]  || '124,58,237'
            const c      = CCOLOR[call.category] || '#a78bfa'
            const isOpen = expanded === call.id
            return (
              <motion.div key={call.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{ position: 'relative', marginBottom: '8px' }}>
                <div style={{ position: 'absolute', left: '-24px', top: '20px', width: '10px', height: '10px', borderRadius: '50%', background: c, boxShadow: `0 0 10px rgba(${g},0.6)`, border: '2px solid #05050a' }} />
                <div onClick={() => setExpanded(isOpen ? null : call.id)}
                  style={{ background: '#0e0e1a', border: `1px solid rgba(${g},0.15)`, borderRadius: '14px', padding: '16px 20px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${g},0.35)`; e.currentTarget.style.background = '#13131f' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `rgba(${g},0.15)`; e.currentTarget.style.background = '#0e0e1a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0, background: `rgba(${g},0.12)`, border: `1px solid rgba(${g},0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800', color: c }}>
                        {call.lead_name?.[0] || '?'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {call.direction === 'inbound' ? '📲 ' : '📞 '}{call.lead_name}
                          {call.call_status === 'transferred' && (
                            <span style={{ marginLeft: 8, fontSize: '10px', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '2px 7px', borderRadius: '999px', border: '1px solid rgba(167,139,250,0.25)' }}>👤 Transferred</span>
                          )}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px' }}>
                          <span style={{ fontSize: '11px', color: '#33334a', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} /> {call.duration_seconds}s</span>
                          <span style={{ fontSize: '11px', color: '#33334a', textTransform: 'capitalize' }}>{call.sentiment}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <span style={{ fontSize: '9px', fontWeight: '800', padding: '3px 9px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.6px', background: `rgba(${g},0.12)`, color: c, border: `1px solid rgba(${g},0.25)` }}>{call.category}</span>
                      <ScoreRing score={call.lead_score} />
                    </div>
                  </div>

                  {isOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                      style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid rgba(${g},0.1)` }}>
                      {call.summary && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <FileText size={12} color="#a78bfa" />
                            <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Summary</span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#8888aa', lineHeight: 1.7 }}>{call.summary}</p>
                        </div>
                      )}
                      <CallIntelligence call={call} />
                      <FollowUpActions call={call} />
                      <WhatsAppBtn call={call} />
                      {call.recording_url && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#181828', borderRadius: '10px', padding: '10px 14px', border: '1px solid #2b3447' }}>
                          <span style={{ fontSize: '11px', color: '#55556a', fontWeight: '600' }}>🎙️ Recording</span>
                          <audio controls src={call.recording_url} style={{ flex: 1, height: '28px', accentColor: '#a78bfa' }} />
                          <a href={call.recording_url} download style={{ color: '#a78bfa', fontSize: '11px', textDecoration: 'none', padding: '4px 10px', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '6px', whiteSpace: 'nowrap' }}>⬇ Save</a>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
