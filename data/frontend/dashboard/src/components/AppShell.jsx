// AppShell — TZMICHA OS · Senior UI/UX · Violet Glass Design
import { useState, useRef, useEffect } from 'react'
import voiceLogo from '../assets/voice_logo.jpeg'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreHorizontal, LogOut, Sun, Moon,
  Megaphone, UsersRound, User,
  BookOpen, GitBranch, Puzzle, Code2, CreditCard, Settings,
  Link2, Key, Shield,
} from 'lucide-react'
import { useTheme } from '../ThemeContext'

const MORE_REAL = [
  { id: 'campaigns',    icon: Megaphone,   label: 'Campaigns',     desc: 'Manage calling campaigns'  },
  { id: 'team',         icon: UsersRound,  label: 'Team',          desc: 'Manage team members'       },
  { id: 'knowledge',    icon: BookOpen,    label: 'Knowledge',     desc: 'Upload FAQs & documents'   },
  { id: 'billing',      icon: CreditCard,  label: 'Billing',       desc: 'Plans & usage'             },
  { id: 'integrations', icon: Link2,       label: 'Integrations',  desc: 'Connect CRM & tools'       },
  { id: 'api',          icon: Key,         label: 'API Keys',      desc: 'Developer access'          },
  { id: 'clientadmin',  icon: Shield,      label: 'Admin',         desc: 'Team & permissions'        },
  { id: 'settings',     icon: Settings,    label: 'Settings',      desc: 'Configure AI engine'       },
  { id: 'profile',      icon: User,        label: 'Profile',       desc: 'Account & AI settings'     },
]

const MORE_SOON = [
  { icon: GitBranch, label: 'Call Flows' },
  { icon: Puzzle,    label: 'Webhooks'   },
  { icon: Code2,     label: 'Analytics'  },
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
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              fontSize: '11px', fontWeight: '600', padding: '5px 12px',
              borderRadius: '8px', whiteSpace: 'nowrap', pointerEvents: 'none',
              border: '1px solid var(--accent-border)', zIndex: 99999,
              boxShadow: 'var(--shadow)',
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
            borderRight: `1px solid ${theme === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(64,224,208,0.3)'}`,
            flexShrink: 0,
          }}>
            <img src={voiceLogo} alt="TZMICHA" style={{ width: '26px', height: '26px', borderRadius: '8px', objectFit: 'cover' }} />
            <span style={{
              fontSize: '12px', fontWeight: '800', letterSpacing: '-0.3px',
              background: theme === 'dark'
                ? 'linear-gradient(135deg, #7c3aed, #5b21b6)'
                : 'linear-gradient(135deg, #40e0d0, #20c8b8)',
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
                  style={{
                    padding: '8px',
                    width: '40px', height: '40px',
                    borderRadius: '50%',
                    justifyContent: 'center',
                    background: active
                      ? (theme === 'dark' ? 'rgba(124,58,237,0.15)' : 'rgba(64,224,208,0.15)')
                      : 'transparent',
                    color: active
                      ? (theme === 'dark' ? '#7c3aed' : '#40e0d0')
                      : (theme === 'dark' ? '#3a3a5c' : '#3a3a5c'),
                    border: 'none',
                    transition: 'all 0.18s',
                  }}
                >
                  <item.icon size={19} strokeWidth={active ? 2.2 : 1.7} />
                </motion.button>
              </Tooltip>
            )
          })}

          <div style={{ width: '1px', height: '20px', background: theme === 'dark' ? 'rgba(0,0,0,0.12)' : 'rgba(64,224,208,0.4)', margin: '0 4px', flexShrink: 0 }} />

          {/* Theme */}
          <Tooltip label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={toggleTheme}
              style={{
                width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme === 'dark' ? '#3a3a5c' : '#40e0d0',
                transition: 'all 0.2s',
              }}>
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
            style={{
              width: '40px', height: '40px', borderRadius: '50%', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: (moreOpen || isMoreActive)
                ? (theme === 'dark' ? 'rgba(124,58,237,0.15)' : 'rgba(64,224,208,0.15)')
                : 'transparent',
              color: (moreOpen || isMoreActive)
                ? (theme === 'dark' ? '#7c3aed' : '#40e0d0')
                : (theme === 'dark' ? '#3a3a5c' : '#3a3a5c'),
              transition: 'all 0.18s',
            }}
          >
            <MoreHorizontal size={19} strokeWidth={1.7} />
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
              background: 'var(--bg-card)',
              border: '1px solid var(--accent-border)',
              borderRadius: '20px', padding: '6px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* User header — matches nav dark */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px 14px',
              background: 'var(--bg-secondary)',
              borderRadius: '15px 15px 0 0',
              borderBottom: '1px solid var(--accent-border)',
              margin: '-6px -6px 6px -6px',
            }}>
              <img src={voiceLogo} alt="TZMICHA" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {companyName}
                </p>
                <p style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '600', marginTop: '1px' }}>
                  {clientData?.plan === 'enterprise' ? '✦ Enterprise' : clientData?.plan === 'pro' ? '✦ Pro Plan' : clientData?.plan === 'growth' ? '✦ Growth Plan' : clientData?.plan === 'starter' ? '✦ Starter Plan' : 'Free Plan'}
                </p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '600' }}>LIVE</span>
              </div>
            </div>

            {/* Pages */}
            <div style={{ padding: '2px 0' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', color: 'var(--accent-light)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 12px 8px' }}>Pages</p>
              {MORE_REAL.map(item => {
                const active = activeTab === item.id
                return (
                  <motion.button key={item.id} whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveTab(item.id); setMoreOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', padding: '9px 12px', borderRadius: '11px',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: active ? 'var(--accent-bg)' : 'transparent',
                      transition: 'background 0.14s',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = active ? 'var(--accent-bg)' : 'transparent' }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                      background: active ? 'var(--accent-bg)' : 'var(--bg-input)',
                      border: active ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <item.icon size={14} color={active ? 'var(--accent-light)' : 'var(--text-muted)'} strokeWidth={active ? 2.2 : 1.8} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: active ? 'var(--accent-light)' : 'var(--text-primary)', lineHeight: 1.2 }}>{item.label}</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{item.desc}</p>
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
            <div style={{ height: '1px', background: 'var(--border)', margin: '2px 6px 6px' }} />
            <div style={{ padding: '0 4px 4px' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>Coming Soon</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px' }}>
                {MORE_SOON.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                    padding: '9px 6px', borderRadius: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)', opacity: 0.5,
                  }}>
                    <item.icon size={13} color="var(--text-muted)" strokeWidth={1.6} />
                    <span style={{ fontSize: '10px', fontWeight: '500', color: 'var(--text-muted)', textAlign: 'center' }}>{item.label}</span>
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
