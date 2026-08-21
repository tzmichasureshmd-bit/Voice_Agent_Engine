import { useState, useEffect } from 'react'
import { ThemeProvider } from './ThemeContext'
import Login from './components/Login'
import { getGoogleRedirectResult } from './firebase'
import axios from 'axios'

const API = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '/api'
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
import Appointments from './components/Appointments'
import Billing from './components/Billing'
import Integrations from './components/Integrations'
import Settings from './components/Settings'
import APIPage from './components/APIPage'
import ClientAdmin from './components/ClientAdmin'
import WhatsAppPage from './components/WhatsAppPage'
import SMSPage from './components/SMSPage'
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

  // Handle Google redirect result (mobile / popup-blocked fallback)
  useEffect(() => {
    getGoogleRedirectResult().then(async (result) => {
      if (!result) return
      try {
        const res = await axios.post(`${API}/auth/google`, { id_token: result.idToken })
        localStorage.setItem('user_role', 'client_admin')
        handleLogin(res.data)
      } catch (e) { console.error('Google redirect login failed', e) }
    }).catch(() => {})
  }, [])

  const handleLogin = (data) => {
    localStorage.setItem('client_id', data.client_id || data.id || '')
    localStorage.setItem('client_data', JSON.stringify(data))
    setClientData(data)
    setLoggedIn(true)
  }
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

  // Permission-based sidebar — team members only see allowed pages
  const userPermissions = clientData?.permissions ? clientData.permissions.split(',') : null

  const renderPage = () => {
    // Block access if team member doesn't have permission
    const blocked = userPermissions &&
      !['dashboard','profile','clientadmin'].includes(activeTab) &&
      !userPermissions.includes(activeTab)
    if (blocked) return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'12px' }}>
        <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:'20px' }}>🔒</span>
        </div>
        <h2 style={{ fontSize:'18px', fontWeight:'700', color:'var(--text-primary)' }}>Access Restricted</h2>
        <p style={{ fontSize:'13px', color:'var(--text-muted)' }}>You don't have permission to view this page. Contact your admin.</p>
      </div>
    )
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
      case 'appointments': return <Appointments />
      case 'billing':      return <Billing />
      case 'callflows':    return <PlaceholderPage title="Call Flows" desc="Visual call flow builder — coming soon" />
      case 'webdialer':    return <PlaceholderPage title="Web Dialer" desc="Browser-based dialer — coming soon" />
      case 'livecalls':    return <PlaceholderPage title="Live Calls" desc="Real-time call monitoring — coming soon" />
      case 'incomingbot':  return <PlaceholderPage title="Incoming Bot" desc="AI handles inbound calls — coming soon" />
      case 'widget':       return <PlaceholderPage title="Website Widget" desc="Embed call widget on your site — coming soon" />
      case 'whatsapp':     return <WhatsAppPage />
      case 'sms':          return <SMSPage />
      case 'workflows':    return <PlaceholderPage title="Workflows" desc="Workflow automation — coming soon" />
      case 'integrations': return <Integrations />
      case 'api':          return <APIPage />
      case 'clientadmin':  return <ClientAdmin />
      case 'settings':     return <Settings />
      default:             return <Dashboard />
    }
  }

  if (showAdmin) {
    return (
      <ThemeProvider>
        <AdminPanel onBack={() => setShowAdmin(false)} />
      </ThemeProvider>
    )
  }

  if (!loggedIn) {
    return (
      <ThemeProvider>
        <Login onLogin={handleLogin} onAdmin={() => setShowAdmin(true)} />
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
