import { useState, useEffect } from 'react'
import { ax, S, PlanBadge } from './shared'

const PLAN_LIMITS = { free:50, starter:500, growth:2000, pro:5000, enterprise:15000 }

export default function PlatformStats({ clients }) {
  const [stats, setStats] = useState(null)
  useEffect(() => { ax.get('/admin/stats').then(r => setStats(r.data)).catch(() => {}) }, [])

  return (
    <div>
      <h2 style={{ fontSize:'18px', fontWeight:'900', color:'#f0f0f8', marginBottom:'20px' }}>Platform Stats</h2>
      {!stats ? <p style={{ color:'#33334a' }}>Loading...</p> : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
            {[
              { label:'Total Clients',  val:stats.total_clients,  color:'#06b6d4', glow:'6,182,212'   },
              { label:'Active Clients', val:stats.active_clients, color:'#4ade80', glow:'74,222,128'  },
              { label:'Total Leads',    val:stats.total_leads,    color:'#a78bfa', glow:'167,139,250' },
              { label:'Total Calls',    val:stats.total_calls,    color:'#fbbf24', glow:'251,191,36'  },
            ].map(k => (
              <div key={k.label} style={{ background:'#0e0e1a', border:`1px solid rgba(${k.glow},0.18)`, borderRadius:'14px', padding:'18px' }}>
                <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'8px' }}>{k.label}</p>
                <p style={{ fontSize:'26px', fontWeight:'900', color:k.color }}>{k.val}</p>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div style={S.card}>
              <p style={{ fontSize:'12px', fontWeight:'800', color:'#f0f0f8', marginBottom:'14px' }}>Lead Quality Breakdown</p>
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
              <p style={{ fontSize:'12px', fontWeight:'800', color:'#f0f0f8', marginBottom:'14px' }}>Plan Limits Reference</p>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Plan','Limit','Clients'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {Object.entries(PLAN_LIMITS).map(([plan, limit]) => (
                    <tr key={plan}>
                      <td style={S.td}><PlanBadge plan={plan} /></td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#f0f0f8' }}>{limit.toLocaleString()} calls/mo</td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#a78bfa' }}>{stats.plan_breakdown?.[plan] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
