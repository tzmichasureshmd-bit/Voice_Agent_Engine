import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { LayoutDashboard, BarChart2, Bot, GitBranch, Phone, Radio, Inbox, Globe, Megaphone, Calendar, Users, ScrollText, Zap, Moon, Sun, ChevronLeft, ChevronRight, LogOut, UsersRound, AudioLines, MessageSquare, MessageCircle, Link2, Settings, Key, Shield } from 'lucide-react'
import { useTheme } from '../ThemeContext'

const menuSections = [
  {
    label: 'OVERVIEW',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
      { icon: BarChart2,       label: 'Analytics',  id: 'analytics' },
    ]
  },
  {
    label: 'VOICE',
    items: [
      { icon: Bot,          label: 'Agents',       id: 'ai-employees' },
      { icon: GitBranch,    label: 'Call Flows',   id: 'callflows' },
      { icon: Phone,        label: 'Web Dialer',   id: 'webdialer' },
      { icon: ScrollText,   label: 'Calls',        id: 'logs' },
      { icon: Radio,        label: 'Live calls',   id: 'livecalls' },
      { icon: Inbox,        label: 'Incoming Bot', id: 'incomingbot' },
      { icon: Globe,        label: 'Website Widget', id: 'widget' },
    ]
  },
  {
    label: 'MESSAGING',
    items: [
      { icon: MessageSquare,  label: 'WhatsApp', id: 'whatsapp' },
      { icon: MessageCircle,  label: 'SMS',      id: 'sms' },
    ]
  },
  {
    label: 'OUTREACH',
    items: [
      { icon: Megaphone, label: 'Campaigns',    id: 'campaigns' },
      { icon: Calendar,  label: 'Appointments', id: 'appointments' },
    ]
  },
  {
    label: 'MANAGE',
    items: [
      { icon: Users,      label: 'Leads',        id: 'leads' },
      { icon: UsersRound, label: 'Team',          id: 'team' },
      { icon: AudioLines, label: 'Voice Lab',     id: 'voicelab' },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { icon: Link2,    label: 'Integrations', id: 'integrations' },
      { icon: Key,      label: 'API Keys',     id: 'api' },
      { icon: Shield,   label: 'Admin',        id: 'clientadmin' },
      { icon: Settings, label: 'Settings',     id: 'settings' },
    ]
  },
]

function StatusDot() {
  const [status, setStatus] = useState('green')

  useEffect(() => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000/' : '/api/'
    const check = () => {
      fetch(apiUrl)
        .then(() => setStatus('green'))
        .catch(() => setStatus('red'))
    }
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])

  const colors = { green: '#22c55e', red: '#ef4444', yellow: '#eab308' }

  return (
    <div style={{ position: 'absolute', bottom: '26px', right: '26px', width: '8px', height: '8px', borderRadius: '50%', background: colors[status], boxShadow: `0 0 6px ${colors[status]}` }}></div>
  )
}

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed, onLogout, clientData }) {
  const { theme, toggleTheme } = useTheme()

  // Permission filtering for team members
  const permissions = clientData?.permissions ? clientData.permissions.split(',') : null
  const isOwner = !clientData?.role || clientData?.role === 'owner'
  const isAdmin = clientData?.role === 'admin'

  const canSee = (id) => {
    if (isOwner || isAdmin) return true  // owners & admins see everything
    if (!permissions) return true
    return ['dashboard', 'profile'].includes(id) || permissions.includes(id)
  }

  return (
    <motion.div
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.35, type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        padding: collapsed ? '16px 10px' : '16px 16px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Collapse/Expand Button - Bold visible tab */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          right: '-14px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '14px',
          height: '80px',
          borderRadius: '0 8px 8px 0',
          background: 'linear-gradient(180deg, #06b6d4, #0891b2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 100,
          color: '#ffffff',
          boxShadow: '3px 0 12px rgba(6,182,212,0.5)',
          border: '2px solid #22d3ee',
          borderLeft: 'none',
        }}
      >
        <motion.div
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
        >
          <ChevronRight size={10} strokeWidth={3} />
        </motion.div>
      </div>

      {/* Brand - Clickable for Profile */}
      <div onClick={() => setActiveTab('profile')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: collapsed ? '0 4px' : '0 14px', marginBottom: '16px', cursor: 'pointer' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={15} color="white" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{clientData?.company_name || 'AI Caller'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>{clientData?.industry || 'Lead Generation'}</p>
              {clientData?.role && (
                <span style={{ fontSize: '8px', fontWeight: '800', padding: '1px 5px', borderRadius: '4px', background: 'rgba(124,58,237,0.2)', color: '#a78bfa', textTransform: 'uppercase', flexShrink: 0 }}>
                  {clientData.role}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
        {menuSections.map((section) => {
          const visibleItems = section.items.filter(item => canSee(item.id))
          if (visibleItems.length === 0) return null
          return (
          <div key={section.label}>
            {!collapsed && (
              <p style={{ fontSize: '9px', fontWeight: '700', color: '#33334a', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '10px 14px 4px' }}>
                {section.label}
              </p>
            )}
            {visibleItems.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(item.id)}
                title={collapsed ? item.label : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: collapsed ? '8px 12px' : '7px 14px',
                  borderRadius: '9px', fontSize: '13px', fontWeight: '500',
                  cursor: 'pointer', transition: 'all 0.15s ease', width: '100%',
                  border: activeTab === item.id ? '1px solid var(--accent-border)' : '1px solid transparent',
                  background: activeTab === item.id ? 'var(--accent-bg)' : 'transparent',
                  color: activeTab === item.id ? 'var(--accent-light)' : 'var(--text-muted)',
                  textAlign: 'left', justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <item.icon size={15} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{item.label}</span>}
              </motion.button>
            ))}
          </div>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: '0 4px' }}>
          {!collapsed && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Theme</span>}
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '9px', background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: '500', justifyContent: collapsed ? 'center' : 'flex-start', width: '100%' }}
        >
          <LogOut size={14} />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </motion.div>
  )
}
