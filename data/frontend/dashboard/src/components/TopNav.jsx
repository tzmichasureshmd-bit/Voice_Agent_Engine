import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AudioLines, Bot, Users, Megaphone, GitBranch, BarChart2,
  MoreHorizontal, Search, Bell, HelpCircle, User, Settings,
  Phone, ScrollText, UsersRound, LogOut, Sun, Moon, ChevronRight
} from 'lucide-react'
import { useTheme } from '../ThemeContext'
import voiceLogo from '../assets/voice_logo.jpeg'

const NAV_ITEMS = [
  { id: 'voicelab',      icon: AudioLines,  label: 'Voice'        },
  { id: 'ai-employees',  icon: Bot,         label: 'AI Employees' },
  { id: 'leads',         icon: Users,       label: 'Leads'        },
  { id: 'calls',         icon: Phone,       label: 'Simulator'    },
  { id: 'campaigns',     icon: Megaphone,   label: 'Campaigns'    },
  { id: 'logs',          icon: ScrollText,  label: 'Call Logs'    },
  { id: 'team',          icon: UsersRound,  label: 'Team'         },
  { id: 'dashboard',     icon: BarChart2,   label: 'Analytics'    },
]

const MORE_ITEMS = [
  { icon: Search,      label: 'Search'         },
  { icon: Bell,        label: 'Notifications'  },
  { icon: HelpCircle,  label: 'Help & Support' },
  { icon: User,        label: 'Profile',        id: 'profile' },
  { icon: Settings,    label: 'Settings'       },
]

export default function TopNav({ activeTab, setActiveTab, onLogout, clientData }) {
  const { theme, toggleTheme } = useTheme()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)

  // Close more menu on outside click
  useEffect(() => {
    const handler = e => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '14px 24px',
      background: 'linear-gradient(180deg, var(--bg-primary) 60%, transparent)',
      pointerEvents: 'none',
    }}>
      {/* Pill Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', alignItems: 'center', gap: '2px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '999px',
          padding: '5px 6px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          pointerEvents: 'all',
        }}
      >
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'4px 10px 4px 6px',
          borderRight:'1px solid var(--border)', marginRight:'4px' }}>
          <img src={voiceLogo} alt="TZMICHA" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover' }} />
          <span style={{ fontSize:'12px', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.3px' }}>TZMICHA</span>
        </div>
        {NAV_ITEMS.map(item => {
          const active = activeTab === item.id
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '999px',
                border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                background: active ? 'rgba(6,182,212,0.12)' : 'transparent',
                color: active ? '#22d3ee' : 'var(--text-muted)',
                transition: 'all 0.18s',
                position: 'relative',
                whiteSpace: 'nowrap',
              }}
            >
              <item.icon size={13} />
              <span>{item.label}</span>
              {active && (
                <motion.div
                  layoutId="nav-active"
                  style={{
                    position: 'absolute', inset: 0, borderRadius: '999px',
                    border: '1px solid rgba(6,182,212,0.3)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </motion.button>
          )
        })}

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

        {/* Theme toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          style={{
            width: '32px', height: '32px', borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', transition: 'color 0.2s',
          }}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </motion.button>

        {/* More */}
        <div ref={moreRef} style={{ position: 'relative' }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setMoreOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '999px',
              border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              background: moreOpen ? 'rgba(6,182,212,0.08)' : 'transparent',
              color: moreOpen ? '#22d3ee' : 'var(--text-muted)',
              transition: 'all 0.18s',
            }}
          >
            <MoreHorizontal size={14} />
            <span>More</span>
          </motion.button>

          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '14px', padding: '6px',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                  minWidth: '200px', zIndex: 200,
                }}
              >
                {MORE_ITEMS.map((item, i) => (
                  <motion.button
                    key={i} whileTap={{ scale: 0.97 }}
                    onClick={() => { if (item.id) setActiveTab(item.id); setMoreOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      width: '100%', padding: '9px 12px', borderRadius: '9px',
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500',
                      transition: 'all 0.15s', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <item.icon size={14} color="var(--text-muted)" />
                    {item.label}
                  </motion.button>
                ))}

                <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onLogout(); setMoreOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '9px 12px', borderRadius: '9px',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: '#f87171', fontSize: '13px', fontWeight: '500',
                    transition: 'all 0.15s', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={14} />
                  Logout
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>
    </div>
  )
}
