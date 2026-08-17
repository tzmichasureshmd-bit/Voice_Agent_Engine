// VoiceLab — Tab switcher layout (TTS / STT / Agent), fits in viewport, no scroll
// All logic (speak, download, STT, agent, humanize, grammar) preserved exactly.
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Volume2, Mic, MicOff, Play, Square, Download, Sparkles,
  Trash2, Copy, Check, Loader2, Wand2, Radio, AudioLines, Phone, PhoneOff
} from 'lucide-react'
import api from '../api'

const MODEL = {
  color: '#a78bfa',
  rgb: '167,139,250',
  ttsEndpoint: '/voicelab/tts/tzmicha',
  sttEndpoint: '/voicelab/stt/tzmicha',
  voices: [
    { id: 'default', label: 'Mix', lang: 'mix', type: 'Telugu + Hindi + English' },
  ],
}

const TABS = [
  { id: 'tts',   icon: Volume2,   label: 'Text → Speech' },
  { id: 'stt',   icon: Mic,       label: 'Speech → Text' },
  { id: 'agent', icon: Radio,     label: 'Live Agent'    },
]

export default function VoiceLab() {
  const [activeTab,       setActiveTab]   = useState('tts')
  const activeModel = MODEL
  const [text,            setText]        = useState('')
  const [selectedVoice,   setSelectedVoice] = useState(MODEL.voices[0])
  const [pace,            setPace]        = useState(1.2)
  const [audioBlob,       setAudioBlob]   = useState(null)
  const [audioUrl,        setAudioUrl]    = useState(null)
  const [playing,         setPlaying]     = useState(false)
  const [generating,      setGenerating]  = useState(false)
  const [humanizing,      setHumanizing]  = useState(false)
  const [fixing,          setFixing]      = useState(false)
  const [copied,          setCopied]      = useState(false)
  const [status,          setStatus]      = useState('')
  const audioRef = useRef(new Audio())

  // STT
  const [sttText,   setSttText]   = useState('')
  const [interim,   setInterim]   = useState('')
  const [listening, setListening] = useState(false)
  const recRef           = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])

  // Agent
  const [agentActive, setAgentActive] = useState(false)
  const [agentStatus, setAgentStatus] = useState('')
  const [agentVoiceName, setAgentVoiceName] = useState('Suhani')
  const [agentEmployee, setAgentEmployee] = useState(null)
  const [employees, setEmployees] = useState([])
  const agentWsRef  = useRef(null)
  const agentCtxRef = useRef(null)

  // Stale-closure refs — kept in sync immediately (no useEffect delay)
  const selectedVoiceRef = useRef(selectedVoice)
  const activeModelRef   = useRef(MODEL)
  const paceRef          = useRef(pace)

  useEffect(() => { selectedVoiceRef.current = selectedVoice }, [selectedVoice])
  useEffect(() => { paceRef.current          = pace          }, [pace])

  useEffect(() => { setAudioBlob(null); setAudioUrl(null); setStatus('') }, [selectedVoice, pace])
  useEffect(() => {
    api.get('/ai-employees').then(r => setEmployees(r.data.employees || [])).catch(() => {})
    return () => cleanupVoiceResources()
  }, [])

  const cleanupVoiceResources = () => {
    // Stop audio
    audioRef.current.pause()
    audioRef.current.src = ''
    window.speechSynthesis.cancel()
    // Stop agent audio
    if (agentAudioRef.current) { agentAudioRef.current.pause(); agentAudioRef.current = null }
    // Stop mic streams
    try { recRef.current?.stop() } catch {}
    try { mediaRecorderRef.current?.stop() } catch {}
    try { agentMicRef.current?.stop() } catch {}
    // Abort pending requests
    if (abortCtrlRef.current) abortCtrlRef.current.abort()
    // Stop barge-in watcher
    try { bargeInRecRef.current?.stop() } catch {}
    bargeInRecRef.current = null
    // Kill agent loop
    agentStopRef.current = true
    // End session
    if (agentSessionRef.current) {
      api.post(`/agent/session/end`, { session_id: agentSessionRef.current }).catch(() => {})
      agentSessionRef.current = null
    }
  }


  // Detect language from script characters
  const detectLang = (s) => {
    if (/[\u0C00-\u0C7F]/.test(s)) return 'te'  // Telugu script
    if (/[\u0900-\u097F]/.test(s)) return 'hi'  // Hindi/Devanagari script
    return 'en'
  }

  // Split text into segments by script, merge same-lang consecutive segments
  const splitByScript = (txt) => {
    const words = txt.split(/\s+/).filter(Boolean)
    const segs = []
    for (const w of words) {
      const lang = detectLang(w)
      if (segs.length && segs[segs.length - 1].lang === lang) {
        segs[segs.length - 1].text += ' ' + w
      } else {
        segs.push({ lang, text: w })
      }
    }
    return segs
  }
  const speak = async () => {
    if (!text.trim()) return
    const voice = selectedVoiceRef.current
    const model = activeModelRef.current
    const speed = paceRef.current
    setGenerating(true); setStatus('Generating voice...')
    try {
      if (voice.lang === 'mix') {
        const segments = splitByScript(text.trim())
        setPlaying(true); setStatus('🔊 Mix · Telugu + Hindi + English')
        for (const seg of segments) {
          const r = await api.post(model.ttsEndpoint,
            { text: seg.text, language: seg.lang, speaker: 'default', pace: speed },
            { responseType: 'blob' })
          const u = URL.createObjectURL(new Blob([r.data], { type: 'audio/mpeg' }))
          await new Promise((res2) => { const a = new Audio(u); a.onended = res2; a.onerror = res2; a.play().catch(res2) })
          URL.revokeObjectURL(u)
        }
        setPlaying(false); setStatus('✅ Done'); setGenerating(false); return
      }
      const res = await api.post(model.ttsEndpoint,
        { text: text.trim(), language: voice.lang, speaker: voice.id, pace: speed },
        { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'audio/mpeg' })
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      const url  = URL.createObjectURL(blob)
      setAudioBlob(blob); setAudioUrl(url)
      audioRef.current.pause()
      audioRef.current.src = url
      audioRef.current.onplay  = () => { setPlaying(true);  setStatus(`🔊 ${voice.label} · ${voice.type}`) }
      audioRef.current.onended = () => { setPlaying(false); setStatus('✅ Done — click ⬇ to save') }
      audioRef.current.onerror = () => { setPlaying(false); setStatus('') }
      await audioRef.current.play()
    } catch (err) {
      // responseType:'blob' means error bodies come back as Blobs — decode them
      let detail = err?.message || 'Unknown error'
      const rawData = err?.response?.data
      if (rawData instanceof Blob) {
        try {
          const text = await rawData.text()
          const parsed = JSON.parse(text)
          detail = parsed?.detail || parsed?.message || text
        } catch { /* leave detail as-is */ }
      } else {
        detail = rawData?.detail || rawData?.message || detail
      }
      const httpStatus = err?.response?.status ? ` (${err.response.status})` : ''
      console.error('[VoiceLab TTS] API error:', httpStatus, detail)
      setStatus(`⚠️ API error${httpStatus}: ${detail} — using browser TTS`)

      window.speechSynthesis.cancel()
      const utter   = new SpeechSynthesisUtterance(text)
      utter.lang    = voice.lang; utter.rate = speed
      const voices  = window.speechSynthesis.getVoices()
      const match   = voices.find(v => v.lang === voice.lang) || voices.find(v => v.lang.startsWith('en')) || voices[0]
      if (match) utter.voice = match
      utter.onstart = () => setPlaying(true)
      utter.onend   = () => { setPlaying(false); setStatus('') }
      window.speechSynthesis.speak(utter)
    }
    setGenerating(false)
  }

  const stopAudio = () => {
    audioRef.current.pause(); audioRef.current.currentTime = 0
    window.speechSynthesis.cancel(); setPlaying(false); setStatus('')
  }

  // ── DOWNLOAD ───────────────────────────────────────────────
  const download = async () => {
    const voice = selectedVoiceRef.current
    const model = activeModelRef.current
    const speed = paceRef.current
    const ext   = 'mp3'
    if (audioBlob) {
      const dlUrl = URL.createObjectURL(audioBlob)
      const a = document.createElement('a')
      a.href = dlUrl
      a.download = `${voice.id}_${Date.now()}.${ext}`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(dlUrl)
      setStatus('⬇️ Downloaded!')
      return
    }
    if (!text.trim()) return
    setGenerating(true); setStatus('Generating for download...')
    try {
      const res = await api.post(model.ttsEndpoint,
        { text: text.trim(), language: voice.lang, speaker: voice.id, pace: speed },
        { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'audio/mpeg' })
      setAudioBlob(blob)
      const dlUrl2 = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = dlUrl2; a.download = `${voice.id}_${Date.now()}.mp3`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(dlUrl2)
      setStatus('⬇️ Downloaded!')
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error'
      console.error('[VoiceLab Download] API error:', detail, err?.response?.data)
      setStatus(`❌ Download failed: ${detail}`)
    }
    setGenerating(false)
  }

  // ── FIX / HUMANIZE ─────────────────────────────────────────
  const fixGrammar = async () => {
    if (!text.trim()) return
    setFixing(true); setStatus('Fixing grammar...')
    try {
      const r = await api.post('/voicelab/fix-grammar', { text: text.trim() })
      setText(r.data.fixed); setAudioBlob(null); setStatus('✅ Grammar fixed!')
    } catch (e) {
      setStatus(`❌ Grammar fix failed: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`)
    }
    setFixing(false)
  }
  const humanize = async () => {
    if (!text.trim()) return
    setHumanizing(true); setStatus('Humanizing...')
    try {
      const r = await api.post('/voicelab/humanize', { text: text.trim() })
      setText(r.data.humanized); setAudioBlob(null); setStatus('✅ Humanized! Click Speak.')
    } catch (e) {
      setStatus(`❌ Humanize failed: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`)
    }
    setHumanizing(false)
  }


  // ── STT ────────────────────────────────────────────────────
  const toggleListen = () => {
    if (listening) { recRef.current?.stop(); mediaRecorderRef.current?.stop(); setListening(false); setInterim(''); return }
    startWhisperSTT()
  }

  const startWhisperSTT = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const fd   = new FormData(); fd.append('file', blob, 'audio.webm')
        setInterim('Transcribing with Whisper...')
        try {
          const r = await api.post('/voicelab/stt/tzmicha', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          if (r.data.transcript) setSttText(p => p + r.data.transcript + ' ')
        } catch { setSttText(p => p + '[Transcription failed] ') }
        setInterim(''); setListening(false)
      }
      mediaRecorderRef.current = recorder; recorder.start(); setListening(true)
    } catch { setSttText('❌ Mic access denied.'); setListening(false) }
  }
  const startDeepgramSTT = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const fd   = new FormData(); fd.append('file', blob, 'audio.webm')
        setInterim('Transcribing...')
        try {
          const r = await api.post('/voicelab/stt/deepgram', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          if (r.data.transcript) setSttText(p => p + r.data.transcript + ' ')
        } catch { setSttText(p => p + '[Transcription failed] ') }
        setInterim(''); setListening(false)
      }
      mediaRecorderRef.current = recorder; recorder.start(); setListening(true)
    } catch { setSttText('❌ Mic access denied.'); setListening(false) }
  }
  const startBrowserSTT = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSttText('❌ Use Chrome for mic support.'); return }
    const r = new SR(); r.lang = 'en-US'; r.continuous = true; r.interimResults = true
    recRef.current = r
    r.onresult = e => {
      let fin = '', int = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + ' '; else int += e.results[i][0].transcript
      }
      if (fin) setSttText(p => p + fin); setInterim(int)
    }
    r.onerror = () => setListening(false)
    r.onend   = () => { setListening(false); setInterim('') }
    r.start(); setListening(true)
  }
  const sendToTTS = () => { if (sttText.trim()) { setText(sttText.trim()); setAudioBlob(null); setActiveTab('tts') } }
  const copySTT   = () => { navigator.clipboard.writeText(sttText); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const agentConvRef    = useRef([])    // local history mirror
  const agentAudioRef   = useRef(null)  // current Audio object
  const agentStopRef    = useRef(false) // kill switch
  const agentMicRef     = useRef(null)  // SpeechRecognition instance
  const agentSessionRef = useRef(null)  // orchestrator session_id
  const sttStartRef     = useRef(0)     // timestamp when mic opened
  const turnIdRef       = useRef(0)     // monotonic turn counter — discard stale responses
  const abortCtrlRef    = useRef(null)  // AbortController for active LLM/TTS request

  const [agentEmotion,  setAgentEmotion]  = useState('neutral')
  const [agentIntent,   setAgentIntent]   = useState('')
  const [agentLang,     setAgentLang]     = useState('english')
  const [agentLatency,  setAgentLatency]  = useState(null)  // {llm_ms, total_ms}

  const EMOTION_COLOR = { angry:'#ef4444', happy:'#22c55e', confused:'#f59e0b', uncertain:'#a78bfa', neutral:'#06b6d4' }
  const EMOTION_EMOJI = { angry:'😤', happy:'😊', confused:'🤔', uncertain:'😐', neutral:'😶' }

  // ── Kill audio instantly ────────────────────────────────────
  const interruptAI = () => {
    if (agentAudioRef.current) {
      agentAudioRef.current.pause()
      agentAudioRef.current.currentTime = 0
      agentAudioRef.current = null
    }
    window.speechSynthesis.cancel()
  }

  // ── Layer 4: True Barge-in Controller ─────────────────────
  // Runs a background VAD while agent is speaking
  // The moment user speaks → kills audio instantly → starts listening
  const bargeInRef = useRef(false)
  const bargeInRecRef = useRef(null)

  const startBargeInWatcher = (onBargeIn) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    try {
      const rec = new SR()
      rec.lang = 'en-US'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = () => {
        if (!bargeInRef.current) {
          bargeInRef.current = true
          try { rec.stop() } catch {}
          onBargeIn()
        }
      }
      rec.onerror = () => {}
      rec.onend = () => {}
      rec.start()
      bargeInRecRef.current = rec
    } catch {}
  }

  const stopBargeInWatcher = () => {
    bargeInRef.current = false
    try { bargeInRecRef.current?.stop() } catch {}
    bargeInRecRef.current = null
  }

  // ── Agent TTS — Sarvam AI, parallel fetch = no gaps ────────
  const agentSpeak = (text) => new Promise(async (resolve) => {
    if (agentStopRef.current) { resolve(); return }
    const voiceId = agentEmployee?.voice || 'suhani'
    setAgentVoiceName(voiceId.charAt(0).toUpperCase() + voiceId.slice(1))
    setAgentStatus('speaking')

    const langMap    = { telugu: 'te', hindi: 'hi', english: 'en', mixed: 'te' }
    const ttsLang    = langMap[agentLang] || 'en'
    const ttsVoice   = 'default'
    const ttsEndpoint = activeModelRef.current.ttsEndpoint

    const sentences = text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) || [text]

    const fetchAudio = (chunk) => api.post(ttsEndpoint,
      { text: chunk.slice(0, 490), language: detectLang(chunk) || ttsLang, speaker: ttsVoice },
      { responseType: 'blob' }
    ).then(r => URL.createObjectURL(new Blob([r.data], { type: 'audio/mpeg' })))
     .catch(() => null)

    // Fetch sentence 0 immediately, prefetch sentence 1 in parallel
    let nextFetch = fetchAudio(sentences[0])

    let bargedIn = false
    // Delay barge-in watcher by 600ms so agent's own audio doesn't trigger it
    const bargeInTimer = setTimeout(() => {
      startBargeInWatcher(() => { bargedIn = true; interruptAI(); resolve('__barge_in__') })
    }, 600)

    for (let i = 0; i < sentences.length; i++) {
      if (agentStopRef.current || bargedIn) break

      const url = await nextFetch
      // Start fetching NEXT sentence while current one plays
      if (i + 1 < sentences.length) nextFetch = fetchAudio(sentences[i + 1])

      if (!url) { await new Promise(r => browserSpeak(sentences[i], r)); continue }

      await new Promise((res2) => {
        const audio = new Audio(url)
        agentAudioRef.current = audio
        audio.onended = res2
        audio.onerror = () => browserSpeak(sentences[i], res2)
        audio.play().catch(() => browserSpeak(sentences[i], res2))
      })
      URL.revokeObjectURL(url)
      if (bargedIn) break
    }

    stopBargeInWatcher()
    clearTimeout(bargeInTimer)
    if (!bargedIn) resolve()
  })

  const browserSpeak = (text, resolve) => {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text.slice(0, 300))
    u.lang = 'en-IN'; u.rate = 1.1
    u.onend = resolve; u.onerror = resolve
    window.speechSynthesis.speak(u)
  }

  // ── VAD-aware STT — auto-stops after silence, interrupts AI on speech ──
  // ── Agent STT — Deepgram (fast, accurate) with browser fallback —
  const agentListen = () => new Promise((resolve) => {
    if (agentStopRef.current) { resolve(''); return }

    let got = false
    let finalText = ''
    let silenceTimer = null
    sttStartRef.current = Date.now()

    const finish = (text) => {
      if (got) return
      got = true
      clearTimeout(silenceTimer)
      try { agentMicRef.current?.stop() } catch {}
      interruptAI()
      resolve(text.trim())
    }

    // Try Deepgram via MediaRecorder first
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (chunks.length === 0) { finish(''); return }
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const fd = new FormData()
        fd.append('file', blob, 'audio.webm')
        try {
          const r = await api.post('/voicelab/stt/tzmicha', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          const transcript = r.data.transcript || ''
          const detectedLang = r.data.detected_language || 'en'
          const langHint = detectedLang.startsWith('te') ? '[lang:telugu] ' :
                           detectedLang.startsWith('hi') ? '[lang:hindi] ' : ''
          const best = transcript.trim() || finalText.trim()
          finish(best ? langHint + best : '')
        } catch {
          finish(finalText)
        }
      }

      // Auto-stop after 8s max or 1.5s silence via VAD
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SR) {
        // Use browser STT just for VAD (silence detection) — Deepgram for actual transcript
        const vad = new SR()
        vad.lang = 'en-US'; vad.continuous = true; vad.interimResults = true
        vad.onresult = (e) => {
          clearTimeout(silenceTimer)
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
          }
          silenceTimer = setTimeout(() => {
            try { vad.stop() } catch {}
            recorder.stop()
          }, 1500)
        }
        vad.onerror = () => recorder.stop()
        vad.onend = () => { if (!got) recorder.stop() }
        vad.start()
        agentMicRef.current = vad
      } else {
        // No VAD — stop after 6s
        setTimeout(() => recorder.stop(), 6000)
      }

      recorder.start()
      setAgentStatus('listening')

      // Hard timeout 12s
      setTimeout(() => { if (!got) recorder.stop() }, 12000)

    }).catch(() => {
      // Fallback to browser STT only
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) { finish(''); return }
      const rec = new SR()
      rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true
      let interim = ''
      rec.onresult = (e) => {
        clearTimeout(silenceTimer)
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
          else interim = e.results[i][0].transcript
        }
        silenceTimer = setTimeout(() => finish(finalText || interim), 1500)
      }
      rec.onerror = () => finish(finalText)
      rec.onend = () => { if (!got) finish(finalText) }
      agentMicRef.current = rec
      rec.start()
      setAgentStatus('listening')
    })
  })

  const agentThink = async (userText, bargeIn = false) => {
    setAgentStatus('thinking')
    const stt_ms = Date.now() - sttStartRef.current
    const myTurn = ++turnIdRef.current
    if (abortCtrlRef.current) abortCtrlRef.current.abort()
    abortCtrlRef.current = new AbortController()
    try {
      const res = await api.post('/agent/session/turn', {
        session_id: agentSessionRef.current,
        user_text:  userText,
        stt_ms,
        barge_in:   bargeIn,
      }, { signal: abortCtrlRef.current.signal })
      if (myTurn !== turnIdRef.current) return null
      const d = res.data
      setAgentEmotion(d.emotion  || 'neutral')
      setAgentIntent(d.intent   || '')
      setAgentLang(d.language  || 'english')
      setAgentLatency(d.latency || null)
      return d.tts_reply || d.reply || "Yeah, go on!"
    } catch (e) {
      if (e?.name === 'CanceledError' || e?.name === 'AbortError') return null
      return "Hmm, tell me more!"
    }
  }

  const toggleAgent = async () => {
    if (agentActive) {
      agentStopRef.current = true
      interruptAI()
      stopBargeInWatcher()
      try { agentMicRef.current?.stop() } catch {}
      if (agentSessionRef.current) {
        api.post('/agent/session/end', { session_id: agentSessionRef.current }).catch(() => {})
        agentSessionRef.current = null
      }
      agentConvRef.current = []
      setAgentActive(false); setAgentStatus('')
      setAgentEmotion('neutral'); setAgentIntent(''); setAgentLatency(null)
      return
    }

    agentStopRef.current = false
    agentConvRef.current = []
    setAgentActive(true)
    setAgentEmotion('neutral'); setAgentIntent(''); setAgentLatency(null)

    let greeting = "Hi! How are you doing today?"
    try {
      const res = await api.post('/agent/session/start', {
        agent_name:   agentEmployee?.name        || 'Alex',
        product_info: agentEmployee?.company_info || '',
        script:       agentEmployee?.script       || '',
        goals:        agentEmployee?.goals        || '',
        languages:    agentEmployee?.languages    || 'English',
        greeting:     agentEmployee?.greeting     || '',
        emp_id:       agentEmployee?.id           || null,
      })
      agentSessionRef.current = res.data.session_id
      greeting = res.data.greeting
    } catch {}

    await agentSpeak(greeting)
    if (agentStopRef.current) { setAgentActive(false); setAgentStatus(''); return }

    while (!agentStopRef.current) {
      const userText = await agentListen()
      if (agentStopRef.current) break
      // Skip if empty or too short (noise/silence)
      if (!userText || userText.replace(/\[lang:\w+\]\s*/g, '').trim().length < 3) continue

      const endWords = ['bye','goodbye','stop','end call','ok bye','thank you bye','disconnect']
      if (endWords.some(w => userText.toLowerCase().includes(w))) {
        const lang = agentLang
        const bye = lang === 'telugu' ? 'Sare! Mee tho matladataniki chala happy ga undi. Take care!' :
                    lang === 'hindi'  ? 'Bahut accha! Aapse baat karke bahut accha laga. Take care!' :
                    'It was great talking to you! Have a wonderful day. Take care!'
        await agentSpeak(bye)
        break
      }

      const reply = await agentThink(userText)
      if (agentStopRef.current || reply === null) break

      const speakResult = await agentSpeak(reply)
      if (speakResult === '__barge_in__') {
        const bargeText = await agentListen()
        if (agentStopRef.current || !bargeText) continue
        const bargeReply = await agentThink(bargeText, true)
        if (!agentStopRef.current) await agentSpeak(bargeReply)
      }
    }

    setAgentActive(false); setAgentStatus('')
    agentConvRef.current = []
  }


  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div className="vl-page">

      {/* ── Hero Header ── */}
      <div className="vl-toprow">
        <div className="vl-header">
          <div className="vl-header-icon">
            <AudioLines size={22} color="#a78bfa" />
          </div>
          <div>
            <h1 style={{
              fontSize:'26px', fontWeight:'900', letterSpacing:'-0.6px',
              background:'linear-gradient(135deg,#a78bfa 0%,#7c3aed 40%,#06b6d4 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>TZMICHA ENGINE</h1>
            <p style={{ fontSize:'11px', color:'#55556a', marginTop:'3px' }}>
              Edge TTS · Whisper Large v3 · Groq LLaMA · <span style={{ color:'#10b981' }}>100% Own · Zero Cost</span>
            </p>
          </div>
        </div>

      </div>

      {/* Tab Bar */}
      <div className="vl-tab-bar" style={{ background:'#0e0e1a', border:'1px solid #1e1e30' }}>
        {TABS.map(t => (
          <motion.button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`vl-tab${activeTab === t.id ? ' active' : ''}`}
            whileTap={{ scale: 0.96 }}
            style={{ '--tc': activeTab === t.id ? activeModel.color : undefined }}>
            <t.icon size={15} />
            <span>{t.label}</span>
            {activeTab === t.id && (
              <motion.div layoutId="vl-tab-indicator" className="vl-tab-indicator"
                style={{ background: activeModel.color }} />
            )}
          </motion.button>
        ))}
      </div>

      {/* Panel */}
      <div className="vl-panel-wrap" style={{ background:'#0e0e1a', border:'1px solid #1e1e30', boxShadow:'0 0 0 1px rgba(124,58,237,0.04)' }}>
        <AnimatePresence mode="wait" initial={false}>

          {/* ════ TTS PANEL — two columns ════ */}
          {activeTab === 'tts' && (
            <motion.div key="tts" className="vl-panel"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22 }}>
              <div className="vl-tts-grid">

                {/* LEFT — voice + speed */}
                <div className="vl-tts-left">
                  <p className="vl-section-label">Voice Selection</p>
                  <div>
                    <p className="vl-label vl-mb-8">
                      Active &nbsp;
                      <span style={{ color: activeModel.color, textTransform: 'none', fontWeight: 600 }}>
                        {selectedVoice.label} · {selectedVoice.type}
                      </span>
                    </p>
                    <div className="vl-voice-grid">
                      {activeModel.voices.map(v => (
                        <motion.button key={v.label} whileTap={{ scale: 0.93 }}
                          onClick={() => { setSelectedVoice(v); selectedVoiceRef.current = v; setAudioBlob(null) }}
                          className={`vl-voice-btn${selectedVoice.label === v.label ? ' active' : ''}`}
                          style={{ '--vc': activeModel.color, '--vrgb': activeModel.rgb }}>
                          <span className="vl-voice-flag">
                            {v.lang === 'en' ? '🇬🇧' : v.lang === 'mix' ? '🌐' : '🇮🇳'}
                          </span>
                          <span className="vl-voice-name">{v.label}</span>
                          <span className="vl-voice-lang">{v.lang.toUpperCase()}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="vl-section-label" style={{ marginTop: '8px' }}>Speed</p>
                    <div className="vl-row-between vl-mb-4">
                      <p className="vl-label">Pace</p>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: activeModel.color }}>{pace}×</span>
                    </div>
                    <input type="range" min="0.8" max="1.8" step="0.1" value={pace}
                      onChange={e => setPace(parseFloat(e.target.value))}
                      className="vl-slider" style={{ accentColor: activeModel.color }} />
                    <div className="vl-row-between" style={{ marginTop: '4px' }}>
                      <span className="vl-dim">0.8× Slow</span>
                      <span className="vl-dim">1.2× Normal</span>
                      <span className="vl-dim">1.8× Fast</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT — text + actions */}
                <div className="vl-tts-right">
                  <p className="vl-section-label">Text Input</p>
                  <textarea value={text}
                    onChange={e => { setText(e.target.value); setAudioBlob(null) }}
                    placeholder={`Type in ${selectedVoice.type.split(' ')[0]}...\n\ne.g. Hello! I'm your AI calling assistant. How can I help you today?`}
                    className="vl-textarea" />
                  <div className="vl-row-between" style={{ marginTop: '6px', marginBottom: '14px' }}>
                    <span className={`vl-char-count${text.length > 500 ? ' over' : ''}`}>{text.length} / 500</span>
                    {text && <button onClick={() => { setText(''); setAudioBlob(null); setStatus('') }} className="vl-clear-btn">Clear</button>}
                  </div>

                  <div className="vl-action-row">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={fixGrammar}
                      disabled={!text.trim() || fixing || humanizing} className="vl-enhance-btn grammar">
                      {fixing ? <Loader2 size={13} className="vl-spin" /> : <Sparkles size={13} />}
                      {fixing ? 'Fixing…' : 'Fix Grammar'}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={humanize}
                      disabled={!text.trim() || humanizing || fixing} className="vl-enhance-btn humanize">
                      {humanizing ? <Loader2 size={13} className="vl-spin" /> : <Wand2 size={13} />}
                      {humanizing ? 'Humanizing…' : 'Humanize'}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={playing ? stopAudio : speak}
                      disabled={!text.trim() || generating || text.length > 500} className="vl-speak-btn"
                      style={{
                        background: playing
                          ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                          : `linear-gradient(135deg,${activeModel.color},${activeModel.id === 'A' ? '#7c3aed' : '#0891b2'})`,
                        opacity: !text.trim() ? 0.4 : 1,
                        boxShadow: (!text.trim()||generating) ? 'none' : `0 4px 20px rgba(${activeModel.rgb},0.35)`,
                      }}>
                      {generating ? <Loader2 size={14} className="vl-spin" /> : playing ? <Square size={14} /> : <Play size={14} />}
                      {generating ? 'Generating…' : playing ? 'Stop' : `Speak as ${selectedVoice.label}`}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={download}
                      disabled={!text.trim() || generating} className="vl-download-btn"
                      style={{ opacity: !text.trim() ? 0.4 : 1 }} title="Download">
                      {generating ? <Loader2 size={14} className="vl-spin" /> : <Download size={14} />}
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {status && (
                      <motion.div className={`vl-status${playing ? ' playing' : ''}`}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {playing && <WaveBars color={activeModel.color} />}
                        <span>{status}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}


          {/* ════ STT PANEL — two columns ════ */}
          {activeTab === 'stt' && (
            <motion.div key="stt" className="vl-panel"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}>
              <div className="vl-stt-grid">

                {/* LEFT — big mic */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <p className="vl-section-label" style={{ alignSelf: 'flex-start', marginBottom: '16px' }}>
                    Whisper Large v3 · Own Engine
                  </p>
                  <div className="vl-mic-center">
                    {listening && (
                      <>
                        <motion.div className="vl-mic-ring r1"
                          animate={{ scale: [1,1.7,1], opacity: [0.35,0,0.35] }}
                          transition={{ duration: 1.8, repeat: Infinity }} />
                        <motion.div className="vl-mic-ring r2"
                          animate={{ scale: [1,2.2,1], opacity: [0.2,0,0.2] }}
                          transition={{ duration: 1.8, repeat: Infinity, delay: 0.45 }} />
                      </>
                    )}
                    <motion.button className="vl-mic-btn" whileTap={{ scale: 0.9 }} onClick={toggleListen}
                      style={{
                        background: listening ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)',
                        boxShadow: listening ? '0 0 40px rgba(239,68,68,0.45)' : '0 0 28px rgba(16,185,129,0.3)',
                      }}>
                      {listening ? <MicOff size={36} color="#fff" /> : <Mic size={36} color="#fff" />}
                    </motion.button>
                    <p className={`vl-mic-label${listening ? ' active' : ''}`}>
                      {listening ? '🔴 Listening — tap to stop' : 'Tap to record'}
                    </p>
                    {listening && <WaveBars color="#ef4444" />}
                  </div>
                </div>

                {/* RIGHT — transcript */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p className="vl-section-label">Transcript</p>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <div className={`vl-transcript${listening ? ' listening' : ''}`}>
                      {sttText || <span className="vl-transcript-placeholder">Your speech will appear here as you speak…</span>}
                      {interim && <span className="vl-interim"> {interim}</span>}
                    </div>
                    {sttText && (
                      <div className="vl-transcript-actions">
                        <button onClick={copySTT} className="vl-transcript-btn" title="Copy">
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                        <button onClick={() => { setSttText(''); setInterim('') }} className="vl-transcript-btn" title="Clear">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  {sttText && (
                    <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      whileTap={{ scale: 0.97 }} onClick={sendToTTS} className="vl-send-tts-btn">
                      <Volume2 size={14} />
                      Send to Text → Speech &amp; hear it back
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ AGENT PANEL — MICHA Live Layout ════ */}
          {activeTab === 'agent' && (
            <motion.div key="agent" className="vl-panel vl-agent-panel"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              style={{ padding: 0, overflow: 'hidden' }}>

              {/* Top bar */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'13px 18px', borderBottom:'1px solid #2b3447' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'9px', fontWeight:700, fontSize:'14px' }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:'#a78bfa',
                    boxShadow:'0 0 15px #a78bfa', display:'inline-block' }} />
                  VoiceLab <span style={{ color:'#55556a', fontWeight:400 }}>/ {agentEmployee?.name || 'MICHA'}</span>
                </div>
                <span style={{ color:'#c4b5fd', fontSize:'12px' }}>
                  ● {agentActive
                    ? agentStatus === 'listening' ? 'Listening — agent interrupted'
                    : agentStatus === 'speaking'  ? 'Live session · Speaking'
                    : agentStatus === 'thinking'  ? 'Live session · Thinking'
                    : 'Live session'
                    : 'Ready'}
                </span>
              </div>

              {/* Employee selector (only when idle) */}
              {!agentActive && (
                <div style={{ padding:'10px 18px', borderBottom:'1px solid #2b3447',
                  display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
                  <span style={{ fontSize:'11px', color:'#55556a', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginRight:4 }}>Agent:</span>
                  <button onClick={() => setAgentEmployee(null)}
                    style={{ padding:'4px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:600, cursor:'pointer', border: !agentEmployee ? '1px solid #a78bfa' : '1px solid #2b3447',
                      background: !agentEmployee ? 'rgba(167,139,250,0.15)' : 'transparent', color: !agentEmployee ? '#a78bfa' : '#55556a' }}>Default</button>
                  {employees.map(emp => (
                    <button key={emp.id} onClick={() => setAgentEmployee(emp)}
                      style={{ padding:'4px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:600, cursor:'pointer',
                        border: agentEmployee?.id === emp.id ? '1px solid #a78bfa' : '1px solid #2b3447',
                        background: agentEmployee?.id === emp.id ? 'rgba(167,139,250,0.15)' : 'transparent',
                        color: agentEmployee?.id === emp.id ? '#a78bfa' : '#55556a' }}>{emp.name}</button>
                  ))}
                </div>
              )}

              {/* Main grid */}
              <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.6fr) minmax(220px,.8fr)',
                gap:'18px', padding:'18px' }}>

                {/* LEFT — chat */}
                <div style={{ display:'flex', flexDirection:'column' }}>

                  {/* Agent row */}
                  <div style={{ display:'flex', alignItems:'center', gap:'11px', marginBottom:'16px' }}>
                    <div style={{ position:'relative' }}>
                      {agentActive && agentStatus === 'speaking' && (
                        <>
                          <motion.div animate={{ scale:[1,1.6,1], opacity:[0.4,0,0.4] }} transition={{ duration:1.4, repeat:Infinity }}
                            style={{ position:'absolute', inset:'-10px', borderRadius:'50%', background:'rgba(167,139,250,0.3)' }} />
                          <motion.div animate={{ scale:[1,2,1], opacity:[0.2,0,0.2] }} transition={{ duration:1.4, repeat:Infinity, delay:0.3 }}
                            style={{ position:'absolute', inset:'-20px', borderRadius:'50%', background:'rgba(167,139,250,0.15)' }} />
                        </>
                      )}
                      {agentActive && agentStatus === 'listening' && (
                        <motion.div animate={{ scale:[1,1.3,1], opacity:[0.6,0.2,0.6] }} transition={{ duration:1, repeat:Infinity }}
                          style={{ position:'absolute', inset:'-8px', borderRadius:'50%', border:'2px solid #10b981' }} />
                      )}
                      <div style={{ width:44, height:44, borderRadius:'50%',
                        background:'linear-gradient(135deg,#8b5cf6,#ec4899)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color:'white', fontWeight:800, fontSize:'18px', position:'relative' }}>
                        {(agentEmployee?.name || 'M')[0].toUpperCase()}
                      </div>
                      {agentActive && (
                        <div style={{ position:'absolute', bottom:0, right:0, width:12, height:12, borderRadius:'50%',
                          background: agentStatus==='listening' ? '#10b981' : agentStatus==='speaking' ? '#a78bfa' : '#f59e0b',
                          border:'2px solid #121724', transition:'background 0.3s' }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'14px' }}>
                        {agentEmployee?.name || 'MICHA'}
                        <span style={{ color:'#55556a', fontWeight:400 }}> · {agentVoiceName}</span>
                      </div>
                      <div style={{ color:'#c4b5fd', fontSize:'12px', marginTop:'2px' }}>
                        {agentActive
                          ? agentStatus === 'listening' ? 'Listening to customer...'
                          : agentStatus === 'thinking'  ? 'Thinking...'
                          : `Speaking naturally · ${agentLang}`
                          : (agentEmployee?.role || 'AI Sales Agent') + ' · English / Telugu / Hindi'}
                      </div>
                    </div>
                  </div>

                  {/* Chat bubbles */}
                  <div style={{ flex:1, minHeight:'160px', display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
                    {agentActive ? (
                      <>
                        {agentStatus === 'listening' && (
                          <div style={{ maxWidth:'82%', padding:'11px 14px', borderRadius:'15px',
                            background:'#243047', marginLeft:'auto', fontSize:'13px', color:'#aeb8ca', fontStyle:'italic' }}>
                            Listening...
                          </div>
                        )}
                        {agentStatus === 'speaking' && (
                          <div style={{ maxWidth:'82%', padding:'11px 14px', borderRadius:'15px', background:'#29223c', fontSize:'13px' }}>
                            <span style={{ color:'#c4b5fd' }}>Speaking</span>
                            <div style={{ display:'flex', alignItems:'center', gap:'3px', height:'20px', marginTop:'8px' }}>
                              {agentActive && <WaveBars color="#a78bfa" />}
                            </div>
                          </div>
                        )}
                        {agentStatus === 'thinking' && (
                          <div style={{ maxWidth:'82%', padding:'11px 14px', borderRadius:'15px', background:'#29223c',
                            fontSize:'13px', display:'flex', alignItems:'center', gap:'8px' }}>
                            <Loader2 size={13} color="#f59e0b" className="vl-spin" />
                            <span style={{ color:'#f59e0b' }}>Thinking...</span>
                          </div>
                        )}
                        {!agentStatus && (
                          <div style={{ maxWidth:'82%', padding:'11px 14px', borderRadius:'15px', background:'#29223c', fontSize:'13px', color:'#55556a' }}>
                            Starting session...
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ maxWidth:'82%', padding:'11px 14px', borderRadius:'15px',
                          background:'#243047', marginLeft:'auto', fontSize:'13px' }}>
                          Can you tell me the pricing in Telugu?
                        </div>
                        <div style={{ maxWidth:'82%', padding:'11px 14px', borderRadius:'15px', background:'#29223c', fontSize:'13px' }}>
                          Sure — mana plans ₹… nundi start avuthayi. Mee team size chepthe, correct option suggest chesthanu.
                          <div style={{ display:'flex', alignItems:'center', gap:'3px', height:'20px', marginTop:'8px' }}>
                            <WaveBars color="#a78bfa" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Barge-in control */}
                  <div style={{ display:'flex', alignItems:'center', gap:'11px',
                    paddingTop:'14px', borderTop:'1px solid #2b3447' }}>
                    <motion.button whileTap={{ scale:0.93 }} onClick={agentActive ? toggleAgent : toggleAgent}
                      style={{ width:46, height:46, borderRadius:'50%', border:'none', cursor:'pointer',
                        background: agentActive
                          ? agentStatus === 'listening' ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                          : 'linear-gradient(135deg,#a78bfa,#7c3aed)'
                          : 'linear-gradient(135deg,#a78bfa,#7c3aed)',
                        boxShadow: agentActive ? '0 0 24px rgba(167,139,250,0.5)' : '0 0 24px rgba(167,139,250,0.3)',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {agentActive ? <PhoneOff size={20} color="#fff" /> : <Phone size={20} color="#fff" />}
                    </motion.button>
                    <div>
                      <strong style={{ fontSize:'13px' }}>
                        {agentActive ? (agentStatus === 'listening' ? 'Listening to you...' : 'Tap to end call') : 'Tap to start live call'}
                      </strong>
                      <div style={{ color:'#55556a', fontSize:'12px', marginTop:'2px' }}>
                        {agentActive ? 'Barge-in stops agent playback immediately' : 'Multilingual · Telugu / Hindi / English'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT — side cards */}
                <div style={{ display:'grid', alignContent:'start', gap:'10px' }}>

                  {/* Conversation state */}
                  <div style={{ padding:'13px', border:'1px solid #2b3447', borderRadius:'13px', background:'#181f2d' }}>
                    <div style={{ fontSize:'11px', color:'#55556a', marginBottom:'7px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Conversation state</div>
                    <div style={{ fontWeight:700, fontSize:'13px' }}>
                      {agentIntent && agentIntent !== 'unknown' ? agentIntent.replace('_',' ') : 'Idle'}
                    </div>
                    <div style={{ color:'#55556a', fontSize:'12px', marginTop:'3px' }}>
                      Emotion: <span style={{ color: EMOTION_COLOR[agentEmotion] || '#06b6d4' }}>{EMOTION_EMOJI[agentEmotion]} {agentEmotion}</span>
                      {agentLatency && <span> · Turn {turnIdRef.current}</span>}
                    </div>
                  </div>

                  {/* Audio pipeline */}
                  <div style={{ padding:'13px', border:'1px solid #2b3447', borderRadius:'13px', background:'#181f2d' }}>
                    <div style={{ fontSize:'11px', color:'#55556a', marginBottom:'7px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Live audio pipeline</div>
                    {[
                      { label:'Streaming STT',  done: agentActive },
                      { label:'Turn detection', done: agentActive },
                      { label:'Streaming TTS',  done: false, current: agentActive && agentStatus === 'speaking' },
                      { label:'Barge-in ready', done: false, current: agentActive && agentStatus === 'listening' },
                    ].map((s, i) => (
                      <div key={i} style={{ display:'flex', gap:'8px', marginTop:'8px', fontSize:'13px',
                        color: s.current ? '#c4b5fd' : s.done ? '#4ade80' : '#55556a',
                        fontWeight: s.current ? 700 : 400 }}>
                        {s.current ? <AudioLines size={14} /> : s.done ? '✓' : '○'} {s.label}
                      </div>
                    ))}
                  </div>

                  {/* Latency */}
                  <div style={{ padding:'13px', border:'1px solid #2b3447', borderRadius:'13px', background:'#181f2d' }}>
                    <div style={{ fontSize:'11px', color:'#55556a', marginBottom:'7px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Turn latency</div>
                    {[
                      { label:'STT partial',    val: agentLatency?.stt_ms   ? `${agentLatency.stt_ms}ms`   : '—' },
                      { label:'LLM first token',val: agentLatency?.llm_ms   ? `${agentLatency.llm_ms}ms`   : '—' },
                      { label:'First audio',    val: agentLatency?.total_ms ? `${agentLatency.total_ms}ms` : '—' },
                    ].map((r, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', marginTop:'7px', fontSize:'13px' }}>
                        <span style={{ color:'#aeb8ca' }}>{r.label}</span>
                        <strong style={{ color: agentLatency ? '#a78bfa' : '#2b3447' }}>{r.val}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Language badge */}
                  <div style={{ padding:'10px 13px', border:'1px solid #2b3447', borderRadius:'13px', background:'#181f2d',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'11px', color:'#55556a', textTransform:'uppercase', letterSpacing:'0.5px' }}>Language</span>
                    <span style={{ fontSize:'12px', fontWeight:700, padding:'3px 10px', borderRadius:'20px',
                      background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.25)' }}>
                      🌍 {agentLang}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Wave Bars ──────────────────────────────────────────────────
function WaveBars({ color = '#06b6d4' }) {
  return (
    <div className="vl-wave-bars">
      {[0.6,1,0.7,1.4,0.8,1.2,0.5,1,0.7].map((h, i) => (
        <motion.div key={i}
          animate={{ scaleY: [1, h*2, 0.4, h, 1] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i*0.07, ease: 'easeInOut' }}
          style={{ width: '3px', height: '14px', borderRadius: '2px', background: color, transformOrigin: 'center', opacity: 0.85 }}
        />
      ))}
    </div>
  )
}
