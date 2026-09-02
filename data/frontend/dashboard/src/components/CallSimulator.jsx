import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { Phone, PhoneOff, Send, Bot, User, Volume2, VolumeX, PhoneCall, Mic, MicOff, Loader2 } from 'lucide-react'
import api from '../api'

export default function CallSimulator({ clientData }) {
  const [callActive,      setCallActive]      = useState(false)
  const [conversationId,  setConversationId]  = useState(null)
  const [messages,        setMessages]        = useState([])
  const [input,           setInput]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [analysis,        setAnalysis]        = useState(null)
  const [leadId,          setLeadId]          = useState('')
  const [leadSearch,      setLeadSearch]      = useState('')
  const [leads,           setLeads]           = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [product,         setProduct]         = useState('AI-powered CRM software that helps businesses grow')
  const [voiceOn,         setVoiceOn]         = useState(true)
  const [voiceCallStatus, setVoiceCallStatus] = useState(null)
  const [voiceCallId,     setVoiceCallId]     = useState(null)
  const [micListening,    setMicListening]    = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const chatRef  = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      const emp = e.detail
      if (emp) { setProduct(emp.script || emp.company_info || 'AI calling agent'); setLeadSearch(''); setLeadId('') }
    }
    window.addEventListener('open-simulator', handler)
    return () => window.removeEventListener('open-simulator', handler)
  }, [])

  const speakText = async (text) => {
    if (!voiceOn || !text.trim()) return
    try {
      const res = await api.post('/voicelab/tts/tzmicha', { text: text.trim().slice(0,490), language:'en' }, { responseType:'blob' })
      new Audio(URL.createObjectURL(new Blob([res.data], { type:'audio/mpeg' }))).play().catch(() => {})
    } catch {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text.trim()); u.lang='en-IN'; u.rate=1.15
      window.speechSynthesis.speak(u)
    }
  }

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [messages, loading])
  useEffect(() => { api.get('/leads').then(r => setLeads(r.data.leads || [])).catch(() => {}) }, [])

  const filteredLeads = leads.filter(l => l.name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone?.includes(leadSearch))
  const selectLead = (lead) => { setLeadId(lead.id); setLeadSearch(`${lead.name} (${lead.phone})`); setShowSuggestions(false) }

  const startCall = async () => {
    if (!leadId) return; setLoading(true)
    try {
      const res = await api.post('/call/start', { lead_id: parseInt(leadId) })
      setConversationId(res.data.conversation_id); setCallActive(true)
      setMessages([{ role:'ai', content: res.data.ai_message }]); speakText(res.data.ai_message); setAnalysis(null)
    } catch { setMessages([{ role:'system', content:'Error: Lead not found. Add a lead first!' }]) }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || loading) return
    const userMsg = input.trim(); setInput('')
    setMessages(prev => [...prev, { role:'human', content: userMsg }]); setLoading(true); inputRef.current?.focus()
    try {
      const res = await api.post(`/call/respond?conversation_id=${conversationId}`, { message: userMsg })
      const aiMsg = res.data.ai_message
      setMessages(prev => [...prev, { role:'ai', content: aiMsg }]); speakText(aiMsg)
      const endWords = ['bye','goodbye','talk later','have a great day','take care']
      if (endWords.some(w => userMsg.toLowerCase().includes(w) || aiMsg.toLowerCase().includes(w))) { setLoading(false); setTimeout(() => endCall(), 800); return }
    } catch { setMessages(prev => [...prev, { role:'system', content:'Error — try again' }]) }
    setLoading(false)
  }

  const endCall = async () => {
    if (!conversationId) return; setLoading(true)
    try { const res = await api.post(`/call/end?conversation_id=${conversationId}`, {}); setAnalysis(res.data) } catch {}
    setCallActive(false); setConversationId(null); setLoading(false)
  }

  const toggleMic = async () => {
    if (!callActive || loading) return
    if (micListening) { mediaRecorderRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true })
      const recorder = new MediaRecorder(stream, { mimeType:'audio/webm' })
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); setMicListening(false)
        const blob = new Blob(audioChunksRef.current, { type:'audio/webm' })
        const fd = new FormData(); fd.append('file', blob, 'audio.webm'); setLoading(true)
        try {
          const r = await api.post('/voicelab/stt/tzmicha', fd, { headers:{ 'Content-Type':'multipart/form-data' } })
          const transcript = r.data.transcript?.trim()
          if (transcript && conversationId) {
            setMessages(prev => [...prev, { role:'human', content: transcript }])
            const res = await api.post(`/call/respond?conversation_id=${conversationId}`, { message: transcript })
            setMessages(prev => [...prev, { role:'ai', content: res.data.ai_message }]); speakText(res.data.ai_message)
          }
        } catch { setMessages(prev => [...prev, { role:'system', content:'Mic transcription failed' }]) }
        setLoading(false)
      }
      mediaRecorderRef.current = recorder; recorder.start(); setMicListening(true)
    } catch { setMessages(prev => [...prev, { role:'system', content:'Mic access denied' }]) }
  }

  const startVoiceCall = async () => {
    if (!leadId) return; setLoading(true)
    try {
      const res = await api.post('/voice/call', { lead_id: parseInt(leadId) })
      if (res.data.status === 'demo_mode') {
        setMessages([{ role:'system', content:'📞 Plivo credentials not set. Add PLIVO_AUTH_ID to .env or recharge Exotel ₹500.' }])
      } else {
        setVoiceCallId(res.data.call_id)
        setVoiceCallStatus('Ringing...')
        setMessages([{ role:'system', content:`📞 Calling ${res.data.lead_name} (${res.data.phone})...` }])
      }
    } catch (e) {
      setMessages([{ role:'system', content:'📞 Voice call failed: ' + (e.response?.data?.detail || e.message) }])
    }
    setLoading(false)
  }

  const endVoiceCall = async () => {
    if (!voiceCallId) return; setLoading(true)
    try { const res = await api.post(`/voice/end?call_id=${voiceCallId}`); setAnalysis(res.data.analysis ? { analysis: res.data.analysis } : null); setMessages(prev => [...prev, { role:'system', content:'📞 Voice call ended.' }]) } catch {}
    setVoiceCallStatus(null); setVoiceCallId(null); setLoading(false)
  }

  const SCORE_GLOW = { hot:'239,68,68', warm:'245,158,11', cold:'59,130,246' }
  const SCORE_COLOR = { hot:'#f87171', warm:'#fbbf24', cold:'#60a5fa' }

  return (
    <div>
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:'20px' }}>
        <h1 style={{ fontSize:'26px', fontWeight:'900', color:'var(--text-primary)', letterSpacing:'-0.5px' }}>Call Simulator</h1>
        <p style={{ fontSize:'13px', color:'var(--text-muted)', marginTop:'4px' }}>Test AI conversations without real calls</p>
      </motion.div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'12px' }}>

        {/* ── Left Panel ── */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'18px',
          padding:'20px', display:'flex', flexDirection:'column',
          height:'calc(100vh - 120px)', overflow:'auto',
          boxShadow:'0 0 0 1px rgba(124,58,237,0.04)',
        }}>
          <p style={{ fontSize:'10px', fontWeight:'700', color:'rgba(124,58,237,0.5)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:'18px' }}>Call Setup</p>

          <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'16px' }}>
            <div>
              <label style={{ fontSize:'11px', color:'var(--text-dim)', marginBottom:'6px', display:'block', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>Select Lead</label>
              <div style={{ position:'relative' }}>
                <input type="text" placeholder="Search name or phone…" value={leadSearch}
                  onChange={e => { setLeadSearch(e.target.value); setShowSuggestions(true); setLeadId('') }}
                  onFocus={() => setShowSuggestions(true)}
                  className="input" disabled={callActive} style={{ fontSize:'12px' }}/>
                {showSuggestions && leadSearch && !callActive && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:'4px', background:'var(--bg-card)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:'12px', maxHeight:'160px', overflowY:'auto', zIndex:10, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
                    {filteredLeads.length > 0 ? filteredLeads.map(lead => (
                      <div key={lead.id} onClick={() => selectLead(lead)}
                        style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', fontSize:'12px', transition:'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(124,58,237,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <p style={{ fontWeight:'600', color:'var(--text-primary)' }}>{lead.name}</p>
                        <p style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'1px' }}>{lead.phone}</p>
                      </div>
                    )) : (
                      <div style={{ padding:'12px', fontSize:'11px', color:'var(--text-dim)', textAlign:'center' }}>No leads found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={{ fontSize:'11px', color:'var(--text-dim)', marginBottom:'6px', display:'block', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>Product Info</label>
              <textarea placeholder="What should AI pitch?" value={product} onChange={e => setProduct(e.target.value)}
                className="input" style={{ height:'80px', resize:'none', fontSize:'12px' }} disabled={callActive}/>
            </div>
          </div>

          {!callActive && !voiceCallStatus ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <motion.button whileTap={{ scale:0.97 }} onClick={startCall} disabled={loading||!leadId}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'12px', borderRadius:'999px', border:'none', cursor:(!leadId||loading)?'not-allowed':'pointer', opacity:(!leadId||loading)?0.4:1, background:'linear-gradient(135deg,#10b981,#059669)', color:'white', fontSize:'13px', fontWeight:'700', boxShadow: !leadId||loading?'none':'0 4px 16px rgba(16,185,129,0.3)', fontFamily:'inherit' }}>
                {loading ? <Loader2 size={15} style={{ animation:'spin 1s linear infinite' }}/> : <Phone size={15}/>} Simulate Call
              </motion.button>
              <motion.button whileTap={{ scale:0.97 }} onClick={startVoiceCall} disabled={loading||!leadId}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'12px', borderRadius:'999px', border:'none', cursor:(!leadId||loading)?'not-allowed':'pointer', opacity:(!leadId||loading)?0.4:1, background:'linear-gradient(135deg,#7c3aed,#5b21b6)', color:'white', fontSize:'13px', fontWeight:'700', boxShadow: !leadId||loading?'none':'0 4px 16px rgba(124,58,237,0.3)', fontFamily:'inherit' }}>
                {loading ? <Loader2 size={15} style={{ animation:'spin 1s linear infinite' }}/> : <PhoneCall size={15}/>} Real Voice Call
              </motion.button>
            </div>
          ) : voiceCallStatus ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ padding:'10px', borderRadius:'10px', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', textAlign:'center' }}>
                <p style={{ fontSize:'11px', color:'#a78bfa', fontWeight:'600' }}>🔊 {voiceCallStatus}</p>
              </div>
              <motion.button whileTap={{ scale:0.97 }} onClick={endVoiceCall}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'12px', borderRadius:'999px', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'white', fontSize:'13px', fontWeight:'700', fontFamily:'inherit' }}>
                <PhoneOff size={15}/> End Voice Call
              </motion.button>
            </div>
          ) : (
            <motion.button whileTap={{ scale:0.97 }} onClick={endCall}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'12px', borderRadius:'999px', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'white', fontSize:'13px', fontWeight:'700', boxShadow:'0 4px 16px rgba(239,68,68,0.3)', fontFamily:'inherit' }}>
              <PhoneOff size={15}/> End Call
            </motion.button>
          )}

          {/* Analysis */}
          <AnimatePresence>
            {analysis && (
              <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                style={{ marginTop:'14px', padding:'14px', borderRadius:'12px', background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)' }}>
                <p style={{ fontSize:'11px', fontWeight:'700', color:'#a78bfa', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.8px' }}>Analysis</p>
                {[
                  { label:'Sentiment', value: analysis.analysis?.sentiment, capitalize:true },
                  { label:'Score',     value: `${analysis.analysis?.score}/10`, bold:true },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
                    <span style={{ color:'var(--text-dim)' }}>{row.label}</span>
                    <span style={{ color:'var(--text-primary)', fontWeight: row.bold?'800':'500', textTransform: row.capitalize?'capitalize':'none' }}>{row.value}</span>
                  </div>
                ))}
                {analysis.analysis?.category && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', alignItems:'center' }}>
                    <span style={{ color:'var(--text-dim)' }}>Category</span>
                    <span style={{
                      fontSize:'9px', fontWeight:'800', padding:'3px 9px', borderRadius:'999px', textTransform:'uppercase',
                      background:`rgba(${SCORE_GLOW[analysis.analysis.category]||'124,58,237'},0.12)`,
                      color: SCORE_COLOR[analysis.analysis.category]||'#a78bfa',
                      border:`1px solid rgba(${SCORE_GLOW[analysis.analysis.category]||'124,58,237'},0.25)`,
                    }}>{analysis.analysis.category}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right — Chat ── */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'18px',
          height:'calc(100vh - 120px)', display:'flex', flexDirection:'column', overflow:'hidden',
          boxShadow:'0 0 0 1px rgba(124,58,237,0.04)',
        }}>
          {/* Chat header */}
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              {callActive ? (
                <><div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 8px #10b981', animation:'pulse 2s infinite' }}/><span style={{ fontSize:'12px', fontWeight:'600', color:'#10b981' }}>Call Active</span></>
              ) : (
                <><div style={{ width:8, height:8, borderRadius:'50%', background:'var(--border)' }}/><span style={{ fontSize:'12px', color:'var(--text-dim)' }}>No Active Call</span></>
              )}
            </div>
            <motion.button whileTap={{ scale:0.95 }}
              onClick={() => { setVoiceOn(!voiceOn); if (voiceOn) window.speechSynthesis.cancel() }}
              style={{ background:'transparent', border:`1px solid ${voiceOn?'rgba(124,58,237,0.3)':'var(--border)'}`, borderRadius:'999px', padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', fontWeight:'600', color: voiceOn?'#a78bfa':'var(--text-dim)', transition:'all 0.15s' }}>
              {voiceOn ? <Volume2 size={13}/> : <VolumeX size={13}/>} {voiceOn?'Voice On':'Voice Off'}
            </motion.button>
          </div>

          {/* Messages */}
          <div ref={chatRef} style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:'12px' }}>
            {messages.length === 0 && (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ width:56, height:56, borderRadius:'18px', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                    <Phone size={22} color="#a78bfa"/>
                  </div>
                  <p style={{ fontSize:'13px', color:'var(--text-dim)', fontWeight:'600' }}>Start a call to begin</p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                style={{ display:'flex', gap:'10px', justifyContent: msg.role==='human'?'flex-end':'flex-start', alignItems:'flex-end' }}>
                {msg.role === 'ai' && (
                  <div style={{ width:30, height:30, borderRadius:'9px', background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Bot size={14} color="#a78bfa"/>
                  </div>
                )}
                <div style={{
                  maxWidth:'72%', padding:'10px 14px', borderRadius: msg.role==='human'?'14px 14px 4px 14px':'14px 14px 14px 4px',
                  fontSize:'13px', lineHeight:'1.55',
                  background: msg.role==='ai' ? 'rgba(124,58,237,0.1)' : msg.role==='human' ? 'var(--bg-input)' : 'rgba(239,68,68,0.08)',
                  border: msg.role==='ai' ? '1px solid rgba(124,58,237,0.2)' : msg.role==='human' ? '1px solid var(--border)' : '1px solid rgba(239,68,68,0.2)',
                  color: msg.role==='system' ? '#f87171' : 'var(--text-primary)',
                }}>{msg.content}</div>
                {msg.role === 'human' && (
                  <div style={{ width:30, height:30, borderRadius:'9px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <User size={14} color="#34d399"/>
                  </div>
                )}
              </motion.div>
            ))}
            {loading && (
              <div style={{ display:'flex', gap:'10px', alignItems:'flex-end' }}>
                <div style={{ width:30, height:30, borderRadius:'9px', background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Bot size={14} color="#a78bfa"/>
                </div>
                <div style={{ padding:'12px 16px', borderRadius:'14px 14px 14px 4px', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)', display:'flex', gap:'4px', alignItems:'center' }}>
                  {[0,1,2].map(j => (
                    <span key={j} style={{ width:6, height:6, borderRadius:'50%', background:'#a78bfa', display:'inline-block', animation:`bounce 0.9s ${j*0.15}s infinite` }}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding:'16px 20px', borderTop:'1px solid var(--border)', flexShrink:0, background:'var(--bg-card)' }}>
            {callActive && (
              <p style={{ fontSize:'11px', color: micListening?'#ef4444':'var(--text-dim)', marginBottom:'8px', textAlign:'center' }}>
                {micListening ? '🔴 Listening — tap mic to stop' : 'Type or tap mic to speak as the lead'}
              </p>
            )}
            <div style={{ display:'flex', gap:'8px' }}>
              <input ref={inputRef} type="text"
                placeholder={callActive?'Type what the lead says…':'Start a call first…'}
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && sendMessage()}
                disabled={!callActive||loading||micListening}
                className="input" style={{ opacity: callActive?1:0.3, fontSize:'13px' }}/>
              <motion.button whileTap={{ scale:0.93 }} onClick={toggleMic} disabled={!callActive||loading}
                style={{
                  padding:'10px 14px', borderRadius:'12px', border:'none', cursor:(!callActive||loading)?'not-allowed':'pointer',
                  background: micListening?'linear-gradient(135deg,#ef4444,#dc2626)':'rgba(16,185,129,0.15)',
                  color: micListening?'white':'#34d399',
                  border: micListening?'none':'1px solid rgba(16,185,129,0.3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  opacity:(!callActive||loading)?0.3:1,
                  boxShadow: micListening?'0 0 16px rgba(239,68,68,0.4)':'none', transition:'all 0.2s',
                }}>
                {micListening ? <MicOff size={15}/> : <Mic size={15}/>}
              </motion.button>
              <motion.button whileTap={{ scale:0.93 }} onClick={sendMessage}
                disabled={!callActive||loading||!input.trim()||micListening}
                style={{
                  padding:'10px 14px', borderRadius:'12px', border:'none',
                  background:'linear-gradient(135deg,#7c3aed,#5b21b6)', color:'white',
                  cursor:(!callActive||!input.trim())?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  opacity:(!callActive||!input.trim())?0.3:1,
                  boxShadow:(!callActive||!input.trim())?'none':'0 4px 14px rgba(124,58,237,0.3)',
                }}>
                <Send size={14}/>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
