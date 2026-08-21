import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { ax, PLAN_PRICES, PLAN_COLOR, S, PlanBadge, StatusBadge } from './shared'

export default function Overview({ clients, setSection }) {
  const [stats, setStats] = useState(null)
  useEffect(() => { ax.get('/admin/stats').then(r => setStats(r.data)).catch(() => {}) }, [])

  const mrr        = clients.reduce((s, c) => s + (PLAN_PRICES[c.plan] || 0), 0)
  const totalCalls = clients.reduce((s, c) => s + (c.total_calls || 0), 0)
  const paid       = clients.filter(c => c.plan !== 'free' && c.is_active)
  const active     = clients.filter(c => c.is_active)

  const kpis = [
    { label:'Total Clients', value:clients.length,                color:'#06b6d4', glow:'6,182,212',   section:'clients'  },
    { label:'Paid Clients',  value:paid.length,                   color:'#fbbf24', glow:'251,191,36',  section:'paid'     },
    { label:'MRR',           value:`₹${(mrr/1000).toFixed(1)}K`,  color:'#10b981', glow:'16,185,129',  section:'revenue'  },
    { label:'Total Calls',   value:totalCalls,                    color:'#a78bfa', glow:'167,139,250', section:'allcalls' },
    { label:'Active',        value:active.length,                 color:'#4ade80', glow:'74,222,128',  section:'clients'  },
  ]

  return (
    <div>
      <h2 style={{ fontSize:'18px', fontWeight:'900', color:'#f0f0f8', marginBottom:'20px' }}>Platform Overview</h2>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px', marginBottom:'20px' }}>
        {kpis.map(k => (
          <motion.div key={k.label} whileHover={{ scale:1.02 }} onClick={() => setSection(k.section)}
            style={{ background:'#0e0e1a', border:`1px solid rgba(${k.glow},0.18)`, borderRadius:'14px', padding:'18px', cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.6px' }}>{k.label}</span>
              <ChevronRight size={12} color='#33334a' />
            </div>
            <p style={{ fontSize:'26px', fontWeight:'900', color:k.color, letterSpacing:'-0.5px' }}>{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Plan Distribution */}
      <div style={{ ...S.card, marginBottom:'16px' }}>
        <p style={{ fontSize:'13px', fontWeight:'800', color:'#f0f0f8', marginBottom:'14px' }}>Plan Distribution</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px' }}>
          {Object.entries(PLAN_PRICES).map(([plan, price]) => {
            const count = clients.filter(c => c.plan === plan).length
            const col   = PLAN_COLOR[plan]
            return (
              <div key={plan} style={{ background:'#0a0a14', borderRadius:'12px', padding:'14px', border:`1px solid ${col}22`, textAlign:'center' }}>
                <p style={{ fontSize:'22px', fontWeight:'900', color:col }}>{count}</p>
                <p style={{ fontSize:'10px', color:'#55556a', textTransform:'uppercase', fontWeight:'700', marginTop:'4px' }}>{plan}</p>
                <p style={{ fontSize:'9px', color:'#33334a', marginTop:'2px' }}>₹{(price/1000).toFixed(0)}K/mo</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats from API */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
          <div style={S.card}>
            <p style={{ fontSize:'12px', fontWeight:'800', color:'#f0f0f8', marginBottom:'14px' }}>Lead Quality (Platform)</p>
            {[{l:'Hot 🔥',v:stats.hot_leads,c:'#f87171'},{l:'Warm 🌤️',v:stats.warm_leads,c:'#fbbf24'},{l:'Cold ❄️',v:stats.cold_leads,c:'#06b6d4'}].map(r => (
              <div key={r.l} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                <span style={{ fontSize:'11px', color:'#55556a', width:'65px' }}>{r.l}</span>
                <div style={{ flex:1, height:'6px', background:'#1a1a2e', borderRadius:'999px' }}>
                  <div style={{ height:'6px', borderRadius:'999px', background:r.c, width:`${stats.total_leads ? Math.round((r.v/stats.total_leads)*100) : 0}%` }} />
                </div>
                <span style={{ fontSize:'11px', fontWeight:'700', color:r.c, width:'28px', textAlign:'right' }}>{r.v}</span>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <p style={{ fontSize:'12px', fontWeight:'800', color:'#f0f0f8', marginBottom:'14px' }}>Platform Totals</p>
            {[
              { label:'Total Clients',  val:stats.total_clients,  color:'#06b6d4' },
              { label:'Active Clients', val:stats.active_clients, color:'#4ade80' },
              { label:'Total Leads',    val:stats.total_leads,    color:'#a78bfa' },
              { label:'Total Calls',    val:stats.total_calls,    color:'#fbbf24' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #1a1a2e' }}>
                <span style={{ fontSize:'11px', color:'#55556a' }}>{r.label}</span>
                <span style={{ fontSize:'14px', fontWeight:'900', color:r.color }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Signups */}
      <div style={S.card}>
        <p style={{ fontSize:'13px', fontWeight:'800', color:'#f0f0f8', marginBottom:'14px' }}>Recent Signups</p>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>{['Company','Email','Plan','Calls','Status','Joined'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {[...clients].slice(-8).reverse().map(c => (
              <tr key={c.id} onClick={() => setSection('clients')} style={{ cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0a0a14'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...S.td, fontWeight:'700', color:'#f0f0f8' }}>{c.company}</td>
                <td style={S.td}>{c.email}</td>
                <td style={S.td}><PlanBadge plan={c.plan} /></td>
                <td style={{ ...S.td, fontWeight:'700', color:'#a78bfa' }}>{c.total_calls}</td>
                <td style={S.td}><StatusBadge active={c.is_active} /></td>
                <td style={S.td}>{c.created?.split('T')[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
