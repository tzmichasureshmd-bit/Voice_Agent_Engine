import { useState, useEffect } from 'react'
import { ThemeProvider } from './ThemeContext'
import Login from './components/Login'
import AppShell from './components/AppShell'
import Dashboard from './components/Dashboard'
import Leads from './components/Leads'
import CallSimulator from './components/CallSimulator'
import Campaigns from './components/Campaigns'
import CallLogs from './components/CallLogs'
import Profile from './components/Profile'
import AdminPanel from './components/AdminPanel'
import AIEmployees from './components/AIEmployees'
import Team from './components/Team'
import VoiceLab from './components/VoiceLab'
import KnowledgeBase from './components/KnowledgeBase'
import Billing from './components/Billing'
import {
  LayoutDashboard, Bot, Users, AudioLines, PhoneCall, Activity
} from 'lucide-react'

// PRIMARY nav — always visible, never changes
const NAV_ITEMS = [
  { id: 'dashboard',     icon: LayoutDashboard, label: 'Overview'      },
  { id: 'ai-employees',  icon: Bot,             label: 'Assistants'    },
  { id: 'leads',         icon: Users,           label: 'Leads'         },
  { id: 'voicelab',      icon: AudioLines,      label: 'Voice Lab'     },
  { id: 'calls',         icon: PhoneCall,       label: 'Simulator'     },
  { id: 'logs',          icon: Activity,        label: 'Activity'      },
]

function PlaceholderPage({ title, desc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '20px' }}>🚧</span>
      </div>
      <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{desc}</p>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loggedIn, setLoggedIn]   = useState(!!localStorage.getItem('client_id'))
  const [clientData, setClientData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('client_data') || '{}') } catch { return {} }
  })
  const [showAdmin, setShowAdmin] = useState(false)

  const handleLogin = (data) => { setClientData(data); setLoggedIn(true) }
  const handleLogout = () => {
    localStorage.removeItem('client_id')
    localStorage.removeItem('client_data')
    setLoggedIn(false)
    setClientData({})
  }

  // Test Call from AI Employees → switch to simulator
  useEffect(() => {
    const handler = () => setActiveTab('calls')
    window.addEventListener('open-simulator', handler)
    return () => window.removeEventListener('open-simulator', handler)
  }, [])

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':    return <Dashboard />
      case 'ai-employees': return <AIEmployees />
      case 'leads':        return <Leads />
      case 'logs':         return <CallLogs />
      case 'calls':        return <CallSimulator clientData={clientData} />
      case 'campaigns':    return <Campaigns />
      case 'analytics':    return <Dashboard />
      case 'voicelab':     return <VoiceLab />
      case 'team':         return <Team />
      case 'profile':      return <Profile clientData={clientData} setClientData={setClientData} />
      case 'knowledge':    return <KnowledgeBase />
      case 'billing':      return <Billing />
      case 'workflows':    return <PlaceholderPage title="Workflows" desc="Workflow automation — coming soon" />
      case 'integrations': return <PlaceholderPage title="Integrations" desc="Connect your tools — coming soon" />
      case 'api':          return <PlaceholderPage title="API" desc="Developer API access — coming soon" />
      case 'settings':     return <PlaceholderPage title="Settings" desc="Account settings — coming soon" />
      default:             return <Dashboard />
    }
  }

  if (!loggedIn) {
    return (
      <ThemeProvider>
        <Login onLogin={handleLogin} onAdmin={() => setShowAdmin(true)} />
      </ThemeProvider>
    )
  }

  if (showAdmin) {
    return (
      <ThemeProvider>
        <AdminPanel onBack={() => { setShowAdmin(false) }} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <AppShell
        navItems={NAV_ITEMS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        clientData={clientData}
      >
        {renderPage()}
      </AppShell>
    </ThemeProvider>
  )
}

export default App
