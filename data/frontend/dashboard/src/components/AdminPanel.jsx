import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, Crown, DollarSign, Phone, Activity,
  TrendingUp, BarChart2, RefreshCw, LogOut, Bot, Megaphone, CreditCard
} from 'lucide-react'
import { ax } from './superadmin/shared'
import Overview       from './superadmin/Overview'
import Companies      from './superadmin/Companies'
import PaidClients    from './superadmin/PaidClients'
import CallAnalytics  from './superadmin/CallAnalytics'
import PlatformStats  from './superadmin/PlatformStats'
import Revenue        from './superadmin/Revenue'
import AIAgents       from './superadmin/AIAgents'
import CampaignsView  from './superadmin/CampaignsView'
import PaymentsView   from './superadmin/PaymentsView'
import AllCalls       from './superadmin/AllCalls'
import AllLeads       from './superadmin/AllLeads'

const S = {
  page:    { display:'flex', flexDirection:'column', height:'100vh', background:'#05050a', overflow:'hidden' },
  topbar:  { height:'52px', minHeight:'52px', background:'#0a0a14', borderBottom:'1px solid #1a1a2e', display:'flex', alignItems:'center', padding:'0 24px', gap:'14px', zIndex:10 },
  body:    { display:'flex', flex:1, overflow:'hidden' },
  sidebar: { width:'210px', minWidth:'210px', background:'#08080f', borderRight:'1px solid #1a1a2e', display:'flex', flexDirection:'column', padding:'14px 10px', gap:'3px', overflowY:'auto' },
  main:    { flex:1, overflowY:'auto', padding:'20px 24px' },
}

function NavItem({ icon:Icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px',
      borderRadius:'10px', border:'none', cursor:'pointer', width:'100%', textAlign:'left',
      background: active ? 'rgba(124,58,237,0.18)' : 'transparent',
      color: active ? '#a78bfa' : '#55556a',
      outline: active ? '1px solid rgba(124,58,237,0.3)' : 'none',
      transition:'all 0.15s',
    }}>
      <Icon size={14} />
      <span style={{ fontSize:'12px', fontWeight:'600', flex:1 }}>{label}</span>
      {badge != null && (
        <span style={{ fontSize:'10px', fontWeight:'800', background:'rgba(124,58,237,0.2)', color:'#a78bfa', borderRadius:'999px', padding:'1px 7px' }}>{badge}</span>
      )}
    </button>
  )
}

const NAV_GROUPS = [
  { label:'MAIN', items:[
    { id:'overview',   icon:BarChart2,  label:'Overview'        },
    { id:'clients',    icon:Users,      label:'Companies'       },
    { id:'stats',      icon:Activity,   label:'Platform Stats'  },
    { id:'agents',     icon:Bot,        label:'AI Agents'       },
    { id:'campaigns',  icon:Megaphone,  label:'Campaigns'       },
  ]},
  { label:'FINANCE', items:[
    { id:'paid',       icon:Crown,      label:'Paid Clients'    },
    { id:'revenue',    icon:DollarSign, label:'MRR / Revenue'   },
    { id:'calls',      icon:Phone,      label:'Call Analytics'  },
    { id:'payments',   icon:CreditCard, label:'Payments'        },
  ]},
  { label:'DATA', items:[
    { id:'allcalls',   icon:Phone,      label:'All Calls'       },
    { id:'allleads',   icon:TrendingUp, label:'All Leads'       },
  ]},
]

export default function AdminPanel({ onBack }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('overview')

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    setLoading(true)
    try { const r = await ax.get('/admin/clients'); setClients(r.data.clients || []) } catch {}
    setLoading(false)
  }

  const renderSection = () => {
    if (loading) return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
        <p style={{ color:'#33334a' }}>Loading...</p>
      </div>
    )
    switch (section) {
      case 'overview':  return <Overview      clients={clients} setSection={setSection} />
      case 'clients':   return <Companies     clients={clients} onRefresh={fetchClients} />
      case 'stats':     return <PlatformStats clients={clients} />
      case 'agents':    return <AIAgents />
      case 'campaigns': return <CampaignsView />
      case 'paid':      return <PaidClients   clients={clients} />
      case 'revenue':   return <Revenue       clients={clients} />
      case 'calls':     return <CallAnalytics clients={clients} />
      case 'payments':  return <PaymentsView />
      case 'allcalls':  return <AllCalls />
      case 'allleads':  return <AllLeads />
      default:          return <Overview      clients={clients} setSection={setSection} />
    }
  }

  const paidCount = clients.filter(c => c.plan !== 'free').length

  return (
    <div style={S.page}>
      {/* TOP BAR */}
      <div style={S.topbar}>
        <div style={{ width:'30px', height:'30px', borderRadius:'9px', background:'linear-gradient(135deg,#7c3aed,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Shield size={14} color="white" />
        </div>
        <span style={{ fontSize:'14px', fontWeight:'900', color:'#f0f0f8' }}>Super Admin</span>
        <span style={{ fontSize:'11px', color:'#33334a' }}>— TZMICHA Platform</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
          <button onClick={fetchClients} style={{ background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:'8px', padding:'5px 10px', cursor:'pointer', color:'#a78bfa', display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', fontWeight:'600' }}>
            <RefreshCw size={11} /> Refresh
          </button>
          <button onClick={onBack} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'8px', padding:'5px 12px', cursor:'pointer', color:'#f87171', display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', fontWeight:'600' }}>
            <LogOut size={11} /> Exit
          </button>
        </div>
      </div>

      <div style={S.body}>
        {/* SIDEBAR */}
        <div style={S.sidebar}>
          {NAV_GROUPS.map(g => (
            <div key={g.label} style={{ marginBottom:'8px' }}>
              <p style={{ fontSize:'9px', fontWeight:'800', color:'#33334a', textTransform:'uppercase', letterSpacing:'0.8px', padding:'4px 12px 6px' }}>{g.label}</p>
              {g.items.map(n => (
                <NavItem key={n.id} icon={n.icon} label={n.label}
                  badge={n.id==='clients' ? clients.length : n.id==='paid' ? paidCount : undefined}
                  active={section === n.id}
                  onClick={() => setSection(n.id)} />
              ))}
            </div>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div style={S.main}>
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}>
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
