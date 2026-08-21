import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Lock, UserPlus, Eye, EyeOff, Building, Users, Zap, ArrowRight } from 'lucide-react'
import axios from 'axios'
import { signInWithGoogle } from '../firebase'
import voiceLogo from '../assets/voice_logo.jpeg'

const API = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '/api'

/* ── Floating orb ── */
function Orb({ style }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 6 + Math.random() * 4, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.6) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none', ...style,
      }}
    />
  )
}

export default function Login({ onLogin, onAdmin }) {
  const [mode,          setMode]          = useState('login')
  const [loginType,     setLoginType]     = useState('client')
  const [error,         setError]         = useState('')
  const [showPass,      setShowPass]      = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [showAdminInput, setShowAdminInput] = useState(false)
  const [adminKeyInput,  setAdminKeyInput]  = useState('')
  const [adminError,     setAdminError]     = useState('')
  const [reg, setReg] = useState({
    company_name: '', industry: '', contact_name: '',
    email: '', phone: '', password: '', product_info: '', ai_name: 'Misha'
  })

  const handleAdminSubmit = () => {
    if (adminKeyInput === 'superadmin123') { onAdmin() }
    else { setAdminError('Invalid key'); setTimeout(() => setAdminError(''), 2000) }
  }

  const handleClientLogin = async () => {
    if (!email || !password) return setError('Fill all fields')
    setLoading(true)
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password })
      localStorage.setItem('client_id',   res.data.client_id)
      localStorage.setItem('client_data', JSON.stringify(res.data))
      localStorage.setItem('user_role',   'client_admin')
      onLogin(res.data)
    } catch (err) { setError(err.response?.data?.detail || 'Login failed') }
    setLoading(false); setTimeout(() => setError(''), 3000)
  }

  const handleTeamLogin = async () => {
    if (!email || !password) return setError('Fill all fields')
    setLoading(true)
    try {
      const res = await axios.post(`${API}/auth/team-login`, { email, password })
      localStorage.setItem('client_id',        res.data.client_id)
      localStorage.setItem('client_data',      JSON.stringify(res.data))
      localStorage.setItem('user_role',        res.data.role)
      localStorage.setItem('user_permissions', res.data.permissions)
      onLogin(res.data)
    } catch (err) { setError(err.response?.data?.detail || 'Login failed') }
    setLoading(false); setTimeout(() => setError(''), 3000)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError('')
    try {
      const result = await signInWithGoogle()
      if (!result) return // redirect flow — page will reload, App.jsx handles it
      const res = await axios.post(`${API}/auth/google`, { id_token: result.idToken })
      localStorage.setItem('client_id',   res.data.client_id)
      localStorage.setItem('client_data', JSON.stringify(res.data))
      localStorage.setItem('user_role',   'client_admin')
      onLogin(res.data)
    } catch (err) { setError(err.response?.data?.detail || 'Google sign-in failed'); setTimeout(() => setError(''), 3000) }
    setGoogleLoading(false)
  }

  const handleRegister = async () => {
    if (!reg.company_name || !reg.email || !reg.password || !reg.product_info) return setError('Fill required fields')
    if (!reg.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)) return setError('Enter a valid email')
    if (reg.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      await axios.post(`${API}/auth/register`, reg)
      setMode('login'); setEmail(reg.email)
      alert('Registration successful! Please login.')
    } catch (err) { setError(err.response?.data?.detail || 'Registration failed') }
    setLoading(false); setTimeout(() => setError(''), 3000)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#05050a', overflow: 'hidden' }}>

      {/* ── LEFT — Brand Panel ── */}
      <div style={{
        flex: '0 0 48%', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px',
        background: 'linear-gradient(135deg, #0a0a18 0%, #0d0a1f 50%, #08080f 100%)',
      }}>
        {/* Orbs */}
        <Orb style={{ width: 360, height: 360, top: '-80px', left: '-80px' }} />
        <Orb style={{ width: 280, height: 280, bottom: '60px', right: '-60px', background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }} />
        <Orb style={{ width: 200, height: 200, top: '55%', left: '10%' }} />

        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(124,58,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '420px' }}
        >
          {/* Logo */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ margin: '0 auto 32px', width: '80px', height: '80px' }}
          >
            <img src={voiceLogo} alt="TZMICHA" style={{ width: '80px', height: '80px', borderRadius: '24px', objectFit: 'cover', boxShadow: '0 0 60px rgba(124,58,237,0.5), 0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(167,139,250,0.3)' }} />
          </motion.div>

          <h1 style={{
            fontSize: '42px', fontWeight: '900', letterSpacing: '-1.5px',
            background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 200%', animation: 'gradient-shift 4s ease infinite',
            marginBottom: '16px',
          }}>
            TZMICHA
          </h1>

          <p style={{
            fontSize: '16px', fontWeight: '500', color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6, marginBottom: '40px',
          }}>
            Your AI Workforce.<br />
            <span style={{ color: '#a78bfa' }}>Zero Cost.</span> Infinite Scale.
          </p>

          {/* Feature pills */}
          {[
            { icon: '🎙️', text: 'Edge TTS · Telugu / Hindi / English' },
            { icon: '⚡', text: 'Whisper · Real-time STT · Free' },
            { icon: '🤖', text: 'Groq LLaMA · Sub-second AI · Free' },
          ].map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.12 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 16px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(124,58,237,0.2)',
                marginBottom: '8px', textAlign: 'left',
              }}>
              <span style={{ fontSize: '16px' }}>{f.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{f.text}</span>
              <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── RIGHT — Auth Card ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px', background: '#05050a',
      }}>
        <motion.div
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            width: '100%', maxWidth: mode === 'register' ? '440px' : '400px',
            background: 'rgba(14,14,26,0.9)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: '24px', padding: '36px',
            boxShadow: '0 0 0 1px rgba(124,58,237,0.08), 0 40px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#f0f0f8', letterSpacing: '-0.5px' }}>
              {mode === 'register' ? 'Create account' : 'Welcome back'}
            </h2>
            <p style={{ fontSize: '13px', color: '#55556a', marginTop: '4px' }}>
              {mode === 'register' ? 'Start your AI workforce today' : 'Sign in to your dashboard'}
            </p>
          </div>

          {/* LOGIN */}
          {mode === 'login' && (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '4px', background: '#13131f', borderRadius: '12px', padding: '4px', marginBottom: '22px', border: '1px solid #1e1e30' }}>
                {[{ id: 'client', label: 'Company', icon: Building }, { id: 'team', label: 'Team', icon: Users }].map(tab => (
                  <button key={tab.id} onClick={() => { setLoginType(tab.id); setError('') }}
                    style={{
                      flex: 1, padding: '9px 4px', borderRadius: '9px', fontSize: '12px',
                      fontWeight: '600', cursor: 'pointer', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      background: loginType === tab.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                      color: loginType === tab.id ? '#a78bfa' : '#55556a',
                      outline: loginType === tab.id ? '1px solid rgba(124,58,237,0.3)' : 'none',
                      transition: 'all 0.15s',
                    }}>
                    <tab.icon size={12} /> {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="email" placeholder="Email address" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (loginType === 'client' ? handleClientLogin() : handleTeamLogin())}
                  className="input" />
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} placeholder="Password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (loginType === 'client' ? handleClientLogin() : handleTeamLogin())}
                    className="input" style={{ paddingRight: '44px' }} />
                  <button onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#55556a' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <AnimatePresence>
                  {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ fontSize: '12px', color: '#f87171', textAlign: 'center', padding: '8px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)' }}>{error}</motion.p>}
                </AnimatePresence>

                <motion.button whileTap={{ scale: 0.98 }}
                  onClick={loginType === 'client' ? handleClientLogin : handleTeamLogin}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '999px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    background: loading ? '#1e1e30' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                    color: 'white', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.4)', transition: 'all 0.2s', marginTop: '4px',
                  }}>
                  {loading ? 'Signing in...' : <><Lock size={14} /> Sign In <ArrowRight size={14} /></>}
                </motion.button>
              </div>

              {loginType === 'client' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '18px 0 4px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#1e1e30' }} />
                    <span style={{ fontSize: '11px', color: '#33334a' }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: '#1e1e30' }} />
                  </div>

                  <motion.button whileTap={{ scale: 0.98 }} onClick={handleGoogleLogin} disabled={googleLoading}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      padding: '12px', borderRadius: '999px', border: '1px solid #1e1e30',
                      background: '#13131f', color: '#f0f0f8', fontSize: '13px', fontWeight: '600',
                      cursor: googleLoading ? 'not-allowed' : 'pointer', opacity: googleLoading ? 0.6 : 1,
                      transition: 'all 0.2s', marginTop: '12px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e30'}>
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {googleLoading ? 'Signing in...' : 'Continue with Google'}
                  </motion.button>

                  <p style={{ fontSize: '12px', color: '#33334a', textAlign: 'center', marginTop: '20px' }}>
                    New here?{' '}
                    <span onClick={() => setMode('register')} style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: '600' }}>
                      Create account
                    </span>
                  </p>
                </>
              )}
            </>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Company Name *" value={reg.company_name} onChange={e => setReg({...reg, company_name: e.target.value})} className="input" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input type="text" placeholder="Your Name *" value={reg.contact_name} onChange={e => setReg({...reg, contact_name: e.target.value})} className="input" />
                <select value={reg.industry} onChange={e => setReg({...reg, industry: e.target.value})} className="input">
                  <option value="">Industry *</option>
                  {['Education','Real Estate','Insurance','Healthcare','Finance','E-Commerce','SaaS/Tech','Other'].map(i => <option key={i} value={i.toLowerCase()}>{i}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input type="email" placeholder="Email *" value={reg.email} onChange={e => setReg({...reg, email: e.target.value})} className="input" />
                <input type="text" placeholder="Phone" value={reg.phone} onChange={e => setReg({...reg, phone: e.target.value})} className="input" />
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} placeholder="Password *" value={reg.password} onChange={e => setReg({...reg, password: e.target.value})} className="input" style={{ paddingRight: '44px' }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#55556a' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <textarea placeholder="What does your company offer? *" value={reg.product_info} onChange={e => setReg({...reg, product_info: e.target.value})} className="input" style={{ height: '70px', resize: 'none' }} />
              <input type="text" placeholder="AI Caller Name (default: Misha)" value={reg.ai_name} onChange={e => setReg({...reg, ai_name: e.target.value})} className="input" />

              <AnimatePresence>
                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ fontSize: '12px', color: '#f87171', textAlign: 'center', padding: '8px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)' }}>{error}</motion.p>}
              </AnimatePresence>

              <motion.button whileTap={{ scale: 0.98 }} onClick={handleRegister} disabled={loading}
                style={{
                  width: '100%', padding: '13px', borderRadius: '999px', border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: 'white',
                  fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.4)', marginTop: '4px', opacity: loading ? 0.6 : 1,
                }}>
                <UserPlus size={14} /> {loading ? 'Creating...' : 'Create Account'}
              </motion.button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#1e1e30' }} />
                <span style={{ fontSize: '11px', color: '#33334a' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#1e1e30' }} />
              </div>

              <motion.button whileTap={{ scale: 0.98 }} onClick={handleGoogleLogin} disabled={googleLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', borderRadius: '999px', border: '1px solid #1e1e30', background: '#13131f', color: '#f0f0f8', fontSize: '13px', fontWeight: '600', cursor: googleLoading ? 'not-allowed' : 'pointer', opacity: googleLoading ? 0.6 : 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {googleLoading ? 'Signing in...' : 'Continue with Google'}
              </motion.button>

              <p style={{ fontSize: '12px', color: '#33334a', textAlign: 'center', marginTop: '8px' }}>
                Already have an account?{' '}
                <span onClick={() => setMode('login')} style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: '600' }}>Sign In</span>
              </p>
            </div>
          )}

          {/* Admin */}
          {mode === 'login' && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1e1e30', textAlign: 'center' }}>
              <button onClick={() => { setShowAdminInput(p => !p); setAdminKeyInput(''); setAdminError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#33334a', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onMouseEnter={e => e.currentTarget.style.color = '#55556a'}
                onMouseLeave={e => e.currentTarget.style.color = '#33334a'}>
                <Lock size={10} /> Super Admin Access
              </button>
              <AnimatePresence>
                {showAdminInput && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="password" placeholder="Admin key" value={adminKeyInput}
                        onChange={e => setAdminKeyInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdminSubmit()}
                        className="input" style={{ flex: 1 }} autoFocus />
                      <button onClick={handleAdminSubmit} className="btn btn-primary" style={{ padding: '9px 16px' }}>Go</button>
                    </div>
                    {adminError && <p style={{ fontSize: '11px', color: '#f87171' }}>{adminError}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
