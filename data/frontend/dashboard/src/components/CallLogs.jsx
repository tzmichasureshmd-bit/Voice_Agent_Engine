import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Phone, Clock, Download, PhoneForwarded, Radio, ArrowRightLeft, Play, Pause, FileText } from 'lucide-react'
import api from '../api'

function ScoreRing({ score }) {
  const r = 16, circ = 2 * Math.PI * r
  const pct = Math.min(Math.max((score||0)/10, 0), 1)
  const color = pct >= 0.7 ? '#f87171' : pct >= 0.4 ? '#fbbf24' : '#60a5fa'
  return (
    <svg width="44" height="44" style={{ flexShrink:0 }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#1e1e30" strokeWidth="3"/>
      <motion.circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - pct * circ }}
        transition={{ duration:0.8, ease:'easeOut' }}
        transform="rotate(-90 22 22)"
        style={{ filter:`drop-shadow(0 0 4px ${color})` }}
      />
      <text x="22" y="27" textAnchor="middle" fill="#f0f0f8" fontSize="11" fontWeight="800">{score}</text>
    </svg>
  )
}

const GLOW  = { hot:'239,68,68', warm:'245,158,11', cold:'59,130,246' }
const CCOLOR = { hot:'#f87171', warm:'#fbbf24', cold:'#60a5fa' }

// ── Active Call Card ──────────────────────────────────────────
function ActiveCallCard({ call, onTransfer, onEnd }) {
  const [humanNum, setHumanNum] = useState('')
  const [transferring, setTransferring] = useState(false)

  const statusColor = {
    ringing:          '#fbbf24',
    active:           '#4ade80',
    transfer_pending: '#a78bfa',
    demo:             '#60a5fa',
  }[call.status] || '#55556a'

  const handleTransfer = async () => {
    if (!humanNum.trim()) return
    setTransferring(true)
    try {
      await api.post('/voice/transfer', { call_id: call.call_id, human_number: humanNum })
      onTransfer(call.call_id)
    } catch { /* ignore */ }
    setTransferring(false)
  }

  return (
    <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
      style={{ background:'#0e0e1a', border:'1px solid rgba(74,222,128,0.25)',
        borderRadius:'14px', padding:'16px 20px', marginBottom:'10px',
        boxShadow:'0 0 20px rgba(74,222,128,0.06)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {/* Pulse dot */}
          <div style={{ position:'relative', width:10, height:10 }}>
            <motion.div animate={{ scale:[1,2,1], opacity:[1,0,1] }}
              transition={{ duration:1.4, repeat:Infinity }}
              style={{ position:'absolute', inset:0, borderRadius:'50%',
                background: statusColor, opacity:0.4 }} />
            <div style={{ width:10, height:10, borderRadius:'50%', background: statusColor }} />
          </div>
          <div>
            <p style={{ fontSize:'14px', fontWeight:'700', color:'#f0f0f8' }}>
              {call.direction === 'inbound' ? '📲 Incoming' : '📞 Outgoing'} — {call.call_id.split('_').slice(-1)[0]}
            </p>
            <p style={{ fontSize:'11px', color:'#55556a', marginTop:'2px' }}>
              {call.transcript_turns} turns · Score {call.score}/10 · {call.emotion} · {call.intent || 'qualifying'}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'10px', fontWeight:'700', padding:'3px 9px', borderRadius:'999px',
            background:`rgba(${statusColor === '#4ade80' ? '74,222,128' : '245,158,11'},0.12)`,
            color: statusColor, border:`1px solid ${statusColor}44`,
            textTransform:'uppercase', letterSpacing:'0.5px' }}>
            {call.status}
          </span>
        </div>
      </div>

      {/* Transfer row — show when score ≥ 6 or transfer_requested */}
      {(call.score >= 6 || call.transfer_requested) && (
        <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #1e1e30',
          display:'flex', gap:'8px', alignItems:'center' }}>
          <ArrowRightLeft size={13} color="#a78bfa" />
          <span style={{ fontSize:'12px', color:'#a78bfa', fontWeight:'600' }}>
            {call.transfer_requested ? '✅ Transfer queued' : '🔥 HOT lead — Transfer to human?'}
          </span>
          {!call.transfer_requested && (
            <>
              <input value={humanNum} onChange={e => setHumanNum(e.target.value)}
                placeholder="Human agent number"
                style={{ flex:1, background:'#181828', border:'1px solid #2b3447', borderRadius:'8px',
                  padding:'5px 10px', fontSize:'12px', color:'#f0f0f8', outline:'none' }} />
              <motion.button whileTap={{ scale:0.95 }} onClick={handleTransfer}
                disabled={!humanNum.trim() || transferring}
                style={{ padding:'5px 14px', borderRadius:'8px', border:'none', cursor:'pointer',
                  background:'linear-gradient(135deg,#a78bfa,#7c3aed)', color:'#fff',
                  fontSize:'12px', fontWeight:'700', opacity: !humanNum.trim() ? 0.5 : 1 }}>
                <PhoneForwarded size={12} style={{ display:'inline', marginRight:4 }} />
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
  const pollRef = useRef(null)

  const fetchCalls = () =>
    api.get('/calls').then(r => setCalls(r.data.calls || [])).catch(() => {})

  const fetchActive = () =>
    api.get('/voice/active').then(r => setActiveCalls(r.data.active_calls || [])).catch(() => {})

  useEffect(() => {
    fetchCalls()
    fetchActive()
    // Poll active calls every 4s
    pollRef.current = setInterval(() => { fetchActive(); fetchCalls() }, 4000)
    return () => clearInterval(pollRef.current)
  }, [])

  const handleTransferred = (callId) => {
    setActiveCalls(p => p.map(c => c.call_id === callId ? { ...c, transfer_requested: true } : c))
  }

  const handleEnd = async (callId) => {
    try { await api.post(`/voice/end?call_id=${callId}`) } catch {}
    fetchActive(); fetchCalls()
  }

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontSize:'26px', fontWeight:'900', color:'#f0f0f8', letterSpacing:'-0.5px' }}>Call Activity</h1>
          <p style={{ fontSize:'13px', color:'#55556a', marginTop:'4px' }}>
            {activeCalls.length > 0 && <span style={{ color:'#4ade80', fontWeight:700 }}>{activeCalls.length} live · </span>}
            {calls.length} total calls
          </p>
        </div>
        <a href="#" onClick={e => {
          e.preventDefault()
          const base = window.location.hostname==='localhost'?'http://localhost:8000':'/api'
          const clientId = localStorage.getItem('client_id')
          fetch(`${base}/export/calls`, { headers:{'x-client-id': clientId} })
            .then(r=>r.blob()).then(b=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='calls.csv'; a.click() })
        }} className="btn btn-ghost" style={{ textDecoration:'none', fontSize:'12px' }}>
          <Download size={13}/> Export
        </a>
      </motion.div>

      {/* ── LIVE CALLS ── */}
      <AnimatePresence>
        {activeCalls.length > 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ marginBottom:'28px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
              <Radio size={14} color="#4ade80" />
              <span style={{ fontSize:'12px', fontWeight:'700', color:'#4ade80',
                textTransform:'uppercase', letterSpacing:'0.6px' }}>Live Calls</span>
            </div>
            {activeCalls.map(call => (
              <ActiveCallCard key={call.call_id} call={call}
                onTransfer={handleTransferred} onEnd={handleEnd} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CALL HISTORY ── */}
      {calls.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 0', background:'#0e0e1a',
          border:'1px solid #1e1e30', borderRadius:'18px' }}>
          <Phone size={28} style={{ color:'#1e1e30', margin:'0 auto 14px' }}/>
          <p style={{ fontSize:'14px', color:'#33334a', fontWeight:'600' }}>No calls yet</p>
          <p style={{ fontSize:'12px', color:'#1e1e30', marginTop:'4px' }}>
            Use the Simulator or trigger a real call from Leads
          </p>
        </div>
      ) : (
        <div style={{ position:'relative', paddingLeft:'28px' }}>
          <div style={{ position:'absolute', left:'9px', top:'8px', bottom:'8px', width:'2px',
            background:'linear-gradient(to bottom, rgba(124,58,237,0.4), rgba(124,58,237,0.05))',
            borderRadius:'2px' }}/>

          {calls.map((call, i) => {
            const g = GLOW[call.category]  || '124,58,237'
            const c = CCOLOR[call.category] || '#a78bfa'
            const isOpen = expanded === call.id
            const transferred = call.call_status === 'transferred'
            return (
              <motion.div key={call.id}
                initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.04 }}
                style={{ position:'relative', marginBottom:'8px' }}>
                <div style={{ position:'absolute', left:'-24px', top:'20px',
                  width:'10px', height:'10px', borderRadius:'50%',
                  background: c, boxShadow:`0 0 10px rgba(${g},0.6)`,
                  border:'2px solid #05050a' }}/>

                <div onClick={() => setExpanded(isOpen ? null : call.id)}
                  style={{ background:'#0e0e1a', border:`1px solid rgba(${g},0.15)`,
                    borderRadius:'14px', padding:'16px 20px', cursor:'pointer', transition:'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=`rgba(${g},0.35)`; e.currentTarget.style.background='#13131f' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=`rgba(${g},0.15)`; e.currentTarget.style.background='#0e0e1a' }}>

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px', flex:1, minWidth:0 }}>
                      <div style={{ width:'42px', height:'42px', borderRadius:'12px', flexShrink:0,
                        background:`rgba(${g},0.12)`, border:`1px solid rgba(${g},0.2)`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'15px', fontWeight:'800', color:c }}>
                        {call.lead_name?.[0] || '?'}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:'14px', fontWeight:'700', color:'#f0f0f8',
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {call.lead_name}
                          {transferred && (
                            <span style={{ marginLeft:8, fontSize:'10px', color:'#a78bfa',
                              background:'rgba(167,139,250,0.1)', padding:'2px 7px',
                              borderRadius:'999px', border:'1px solid rgba(167,139,250,0.25)' }}>
                              👤 Transferred
                            </span>
                          )}
                        </p>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'3px' }}>
                          <span style={{ fontSize:'11px', color:'#33334a', display:'flex', alignItems:'center', gap:'4px' }}>
                            <Clock size={10}/> {call.duration_seconds}s
                          </span>
                          <span style={{ fontSize:'11px', color:'#33334a', textTransform:'capitalize' }}>{call.sentiment}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', flexShrink:0 }}>
                      <span style={{ fontSize:'9px', fontWeight:'800', padding:'3px 9px', borderRadius:'999px',
                        textTransform:'uppercase', letterSpacing:'0.6px',
                        background:`rgba(${g},0.12)`, color:c, border:`1px solid rgba(${g},0.25)` }}>
                        {call.category}
                      </span>
                      <ScoreRing score={call.lead_score}/>
                    </div>
                  </div>

                  {isOpen && (
                    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
                      exit={{ opacity:0, height:0 }} transition={{ duration:0.2 }}
                      style={{ marginTop:'14px', paddingTop:'14px', borderTop:`1px solid rgba(${g},0.1)` }}>

                      {/* AI Summary */}
                      {call.summary && (
                        <div style={{ marginBottom:'12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
                            <FileText size={12} color="#a78bfa" />
                            <span style={{ fontSize:'11px', color:'#a78bfa', fontWeight:'700',
                              textTransform:'uppercase', letterSpacing:'0.5px' }}>AI Summary</span>
                          </div>
                          <p style={{ fontSize:'12px', color:'#8888aa', lineHeight:1.7 }}>{call.summary}</p>
                        </div>
                      )}

                      {/* Recording Player */}
                      {call.recording_url && (
                        <div style={{ display:'flex', alignItems:'center', gap:'10px',
                          background:'#181828', borderRadius:'10px', padding:'10px 14px',
                          border:'1px solid #2b3447' }}>
                          <span style={{ fontSize:'11px', color:'#55556a', fontWeight:'600' }}>🎙️ Recording</span>
                          <audio controls src={call.recording_url}
                            style={{ flex:1, height:'28px', accentColor:'#a78bfa' }} />
                          <a href={call.recording_url} download
                            style={{ color:'#a78bfa', fontSize:'11px', textDecoration:'none',
                              padding:'4px 10px', border:'1px solid rgba(167,139,250,0.3)',
                              borderRadius:'6px', whiteSpace:'nowrap' }}>
                            ⬇ Save
                          </a>
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
