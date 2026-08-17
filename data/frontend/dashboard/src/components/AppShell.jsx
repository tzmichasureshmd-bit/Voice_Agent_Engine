// AppShell — TZMICHA OS · Senior UI/UX · Violet Glass Design
import { useState, useRef, useEffect } from 'react'
import voiceLogo from '../assets/voice_logo.jpeg'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreHorizontal, LogOut, Sun, Moon,
  Megaphone, UsersRound, User,
  BookOpen, GitBranch, Puzzle, Code2, CreditCard, Settings,
  Sparkles,
} from 'lucide-react'
import { useTheme } from '../ThemeContext'

const MORE_REAL = [
  { id: 'campaigns',    icon: Megaphone,   label: 'Campaigns',     desc: 'Manage calling campaigns'  },
  { id: 'team',         icon: UsersRound,  label: 'Team',          desc: 'Manage team members'       },
  { id: 'knowledge',    icon: BookOpen,    label: 'Knowledge',     desc: 'Upload FAQs & documents'   },
  { id: 'billing',      icon: CreditCard,  label: 'Billing',       desc: 'Plans & usage'             },
  { id: 'profile',      icon: User,        label: 'Profile',       desc: 'Account & AI settings'     },
]

const MORE_SOON = [
  { icon: GitBranch,   label: 'Workflows'    },
  { icon: Puzzle,      label: 'Integrations' },
  { icon: Code2,       label: 'API'          },
  { icon: Settings,    label: 'Settings'     },
]

function Tooltip({ label, children }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 4,  scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
              transform: 'translateX(-50%)',
              background: '#0a0a14', color: 'rgba(255,255,255,0.9)',
              fontSize: '11px', fontWeight: '600', padding: '5px 12px',
              borderRadius: '8px', whiteSpace: 'nowrap', pointerEvents: 'none',
              border: '1px solid rgba(124,58,237,0.25)', zIndex: 99999,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >{label}</motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function AppShell({ navItems = [], activeTab, setActiveTab, onLogout, clientData, children }) {
  const { theme, toggleTheme } = useTheme()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreBtnRef = useRef(null)
  const menuRef    = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (
        moreBtnRef.current && !moreBtnRef.current.contains(e.target) &&
        menuRef.current    && !menuRef.current.contains(e.target)
      ) setMoreOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openMenu = () => setMoreOpen(p => !p)

  const isMoreActive = MORE_REAL.some(m => m.id === activeTab)
  const initial = (clientData?.company_name || clientData?.contact_name || 'T')[0].toUpperCase()
  const companyName = clientData?.company_name || clientData?.contact_name || 'My Account'

  return (
    <div className="appshell-root">

      {/* ── Nav Pill ── */}
      <div className="appshell-nav-wrapper">
        <motion.nav
          className="appshell-pill-nav"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1,  y: 0   }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Brand */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 14px 4px 8px', marginRight: '6px',
            borderRight: '1px solid rgba(124,58,237,0.2)', flexShrink: 0,
          }}>
            <img src={voiceLogo} alt="TZMICHA" style={{ width: '26px', height: '26px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 0 12px rgba(124,58,237,0.5)' }} />
            <span style={{
              fontSize: '12px', fontWeight: '800', letterSpacing: '-0.3px',
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>TZMICHA</span>
          </div>

          {/* Primary nav */}
          {navItems.map((item) => {
            const active = activeTab === item.id
            return (
              <Tooltip key={item.id} label={item.label}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveTab(item.id)}
                  className={`appshell-nav-btn${active ? ' active' : ''}`}
                  style={{ padding: '8px 12px', minWidth: '44px', justifyContent: 'center' }}
                >
                  <item.icon size={19} strokeWidth={active ? 2.2 : 1.7} />
                  {active && (
                    <motion.div layoutId="nav-active-ring" className="appshell-active-ring" />
                  )}
                </motion.button>
              </Tooltip>
            )
          })}

          <div className="appshell-divider" />

          {/* Theme */}
          <Tooltip label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={toggleTheme}
              className="appshell-icon-btn" style={{ padding: '8px 10px' }}>
              {theme === 'dark'
                ? <Sun  size={18} strokeWidth={1.7} />
                : <Moon size={18} strokeWidth={1.7} />}
            </motion.button>
          </Tooltip>

          {/* More ··· */}
          <motion.button
            ref={moreBtnRef}
            whileTap={{ scale: 0.9 }}
            onClick={openMenu}
            className={`appshell-nav-btn${moreOpen || isMoreActive ? ' active' : ''}`}
            style={{ padding: '8px 12px', minWidth: '44px', justifyContent: 'center' }}
          >
            <MoreHorizontal size={19} strokeWidth={1.7} />
            {(moreOpen || isMoreActive) && (
              <motion.div layoutId="nav-active-ring-more" className="appshell-active-ring" />
            )}
          </motion.button>
        </motion.nav>
      </div>

      {/* ── More Menu — hardcoded centre, drops below nav ── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1,  y: 0,   scale: 1    }}
            exit={{    opacity: 0,  y: -10, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', top: '62px', left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 99999, width: '300px',
              background: '#0e0e1a',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: '20px', padding: '6px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.06)',
            }}
          >
            {/* User header — matches nav dark */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px 14px',
              background: '#0a0a14',
              borderRadius: '15px 15px 0 0',
              borderBottom: '1px solid rgba(124,58,237,0.12)',
              margin: '-6px -6px 6px -6px',
            }}>
              <img src={voiceLogo} alt="TZMICHA" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {companyName}
                </p>
                <p style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '600', marginTop: '1px' }}>
                  {clientData?.plan === 'pro' ? '✦ Pro Plan' : 'Free Plan'}
                </p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '600' }}>LIVE</span>
              </div>
            </div>

            {/* Pages */}
            <div style={{ padding: '2px 0' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(124,58,237,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 12px 8px' }}>Pages</p>
              {MORE_REAL.map(item => {
                const active = activeTab === item.id
                return (
                  <motion.button key={item.id} whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveTab(item.id); setMoreOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', padding: '9px 12px', borderRadius: '11px',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                      transition: 'background 0.14s',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(124,58,237,0.12)' : 'transparent' }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                      background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                      border: active ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <item.icon size={14} color={active ? '#a78bfa' : 'rgba(255,255,255,0.4)'} strokeWidth={active ? 2.2 : 1.8} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: active ? '#a78bfa' : 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>{item.label}</p>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>{item.desc}</p>
                    </div>
                    {active && (
                      <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 8px #a78bfa' }} />
                    )}
                  </motion.button>
                )
              })}
            </div>

            {/* Sign Out */}
            <div style={{ padding: '6px 4px' }}>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => { onLogout?.(); setMoreOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  width: '100%', padding: '10px', borderRadius: '12px',
                  border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.07)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  color: '#f87171', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
              >
                <LogOut size={14} strokeWidth={2} /> Sign Out
              </motion.button>
            </div>

            {/* Coming soon */}
            <div style={{ height: '1px', background: 'rgba(124,58,237,0.1)', margin: '2px 6px 6px' }} />
            <div style={{ padding: '0 4px 4px' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(124,58,237,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>Coming Soon</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px' }}>
                {MORE_SOON.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                    padding: '9px 6px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)', opacity: 0.4,
                  }}>
                    <item.icon size={13} color="rgba(255,255,255,0.4)" strokeWidth={1.6} />
                    <span style={{ fontSize: '10px', fontWeight: '500', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="appshell-main">{children}</main>
    </div>
  )
}
