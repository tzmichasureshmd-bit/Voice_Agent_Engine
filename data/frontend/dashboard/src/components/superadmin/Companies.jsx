import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Ban, CheckCircle2, Key } from 'lucide-react'
import { ax, PLAN_PRICES, PLAN_COLOR, CAT_COLOR, S, PlanBadge, StatusBadge, MiniBar } from './shared'

function CompanyDetail({ detail, onRefresh }) {
  const [tab, setTab] = useState('overview')
  const { company, team, call_stats, recent_calls, leads, payments, total_paid, monthly_usage } = detail

  const changePlan = async (plan) => {
    await ax.put(`/admin/clients/${company.id}/plan?plan=${plan}`)
    onRefresh()
  }
  const toggleClient = async () => {
    await ax.put(`/admin/clients/${company.id}/toggle`)
    onRefresh()
  }
  const resetPassword = async () => {
    const pwd = prompt('New password:')
    if (pwd) { await ax.put(`/admin/clients/${company.id}/reset-password?new_password=${pwd}`); alert('Done!') }
  }

  const TABS = ['overview','team','calls','leads','payments']

  return (
    <div style={{ flex:1, overflowY:'auto', paddingLeft:'20px' }}>
      {/* Header */}
      <div style={{ marginBottom:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
          <h2 style={{ fontSize:'18px', fontWeight:'900', color:'#f0f0f8' }}>{company.name}</h2>
          <PlanBadge plan={company.plan} />
          <StatusBadge active={company.is_active} />
        </div>
        <p style={{ fontSize:'11px', color:'#33334a' }}>{company.industry} · {company.email} · {company.phone||'—'} · Joined {company.joined?.split('T')[0]}</p>
        <div style={{ display:'flex', gap:'6px', marginTop:'8px' }}>
          <select defaultValue={company.plan} onChange={e=>changePlan(e.target.value)}
            style={{ background:'#0e0e1a', border:'1px solid #1e1e30', color:'#a78bfa', borderRadius:'7px', padding:'4px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer', outline:'none' }}>
            {Object.keys(PLAN_PRICES).map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={toggleClient} style={{ background:company.is_active?'rgba(239,68,68,0.1)':'rgba(74,222,128,0.1)', border:'none', borderRadius:'7px', padding:'4px 12px', cursor:'pointer', color:company.is_active?'#f87171':'#4ade80', fontSize:'11px', fontWeight:'700' }}>
            {company.is_active?'Ban':'Activate'}
          </button>
          <button onClick={resetPassword} style={{ background:'rgba(167,139,250,0.1)', border:'none', borderRadius:'7px', padding:'4px 12px', cursor:'pointer', color:'#a78bfa', fontSize:'11px', fontWeight:'700' }}>
            Reset Password
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'2px', borderBottom:'1px solid #1a1a2e', marginBottom:'14px' }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'6px 14px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:'700', textTransform:'capitalize', background:'transparent', color:tab===t?'#a78bfa':'#33334a', borderBottom:tab===t?'2px solid #a78bfa':'2px solid transparent' }}>
            {t}{t==='team'?` (${team.length})`:''}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==='overview' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'12px' }}>
            {[{l:'Calls',v:call_stats.total,c:'#a78bfa'},{l:'Leads',v:leads.total,c:'#06b6d4'},{l:'Team',v:team.length,c:'#fbbf24'},{l:'Talk',v:`${call_stats.total_duration_min}m`,c:'#10b981'}].map(k=>(
              <div key={k.l} style={{ background:'#0e0e1a', border:`1px solid ${k.c}22`, borderRadius:'10px', padding:'12px' }}>
                <p style={{ fontSize:'9px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>{k.l}</p>
                <p style={{ fontSize:'20px', fontWeight:'900', color:k.c }}>{k.v}</p>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
            <div style={S.card}>
              <p style={{ fontSize:'11px', fontWeight:'800', color:'#f0f0f8', marginBottom:'10px' }}>Call Direction</p>
              {[{l:'Outbound',v:call_stats.outbound,p:call_stats.outbound_pct,c:'#a78bfa'},{l:'Inbound',v:call_stats.inbound,p:call_stats.inbound_pct,c:'#06b6d4'}].map(r=>(
                <div key={r.l} style={{ marginBottom:'8px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                    <span style={{ fontSize:'10px', color:'#55556a' }}>{r.l}</span>
                    <span style={{ fontSize:'10px', fontWeight:'700', color:r.c }}>{r.v} ({r.p}%)</span>
                  </div>
                  <MiniBar pct={r.p} color={r.c} />
                </div>
              ))}
              <p style={{ fontSize:'10px', color:'#33334a', marginTop:'6px' }}>Avg: {call_stats.avg_duration_sec}s/call</p>
            </div>
            <div style={S.card}>
              <p style={{ fontSize:'11px', fontWeight:'800', color:'#f0f0f8', marginBottom:'10px' }}>Lead Quality</p>
              {[{l:'Hot 🔥',v:leads.hot,c:'#f87171'},{l:'Warm 🌤️',v:leads.warm,c:'#fbbf24'},{l:'Cold ❄️',v:leads.cold,c:'#06b6d4'}].map(r=>(
                <div key={r.l} style={{ marginBottom:'8px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                    <span style={{ fontSize:'10px', color:'#55556a' }}>{r.l}</span>
                    <span style={{ fontSize:'10px', fontWeight:'700', color:r.c }}>{r.v}</span>
                  </div>
                  <MiniBar pct={leads.total?Math.round(r.v/leads.total*100):0} color={r.c} />
                </div>
              ))}
            </div>
          </div>
          <div style={S.card}>
            <p style={{ fontSize:'11px', fontWeight:'800', color:'#f0f0f8', marginBottom:'10px' }}>Monthly Calls</p>
            <div style={{ display:'flex', gap:'6px', alignItems:'flex-end', height:'60px' }}>
              {monthly_usage.map(m=>{
                const max=Math.max(...monthly_usage.map(x=>x.calls),1)
                const h=Math.round((m.calls/max)*50)
                return (
                  <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
                    <span style={{ fontSize:'9px', fontWeight:'700', color:'#a78bfa' }}>{m.calls}</span>
                    <div style={{ width:'100%', height:`${h}px`, background:'rgba(167,139,250,0.25)', borderRadius:'3px 3px 0 0' }} />
                    <span style={{ fontSize:'8px', color:'#33334a' }}>{m.month.split(' ')[0]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* TEAM */}
      {tab==='team' && (
        <div>
          {team.length===0
            ? <div style={{ ...S.card, textAlign:'center', padding:'40px', color:'#33334a' }}>No team members yet</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {team.map(u=>(
                  <div key={u.id} style={{ ...S.card, display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:'rgba(124,58,237,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'800', color:'#a78bfa', flexShrink:0 }}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:'13px', fontWeight:'700', color:'#f0f0f8' }}>{u.name}</p>
                      <p style={{ fontSize:'10px', color:'#33334a' }}>{u.email}</p>
                      <p style={{ fontSize:'9px', color:'#55556a', marginTop:'2px' }}>Permissions: {u.permissions}</p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
                      <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 8px', borderRadius:'999px', background:'rgba(124,58,237,0.12)', color:'#a78bfa', textTransform:'capitalize' }}>{u.role}</span>
                      <StatusBadge active={u.is_active} />
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* CALLS */}
      {tab==='calls' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'12px' }}>
            {[{l:'Total',v:call_stats.total,c:'#a78bfa'},{l:'Outbound',v:call_stats.outbound,c:'#06b6d4'},{l:'Inbound',v:call_stats.inbound,c:'#fbbf24'},{l:'Hot',v:call_stats.hot,c:'#f87171'},{l:'Avg Dur',v:`${call_stats.avg_duration_sec}s`,c:'#10b981'},{l:'Talk Time',v:`${call_stats.total_duration_min}m`,c:'#4ade80'}].map(k=>(
              <div key={k.l} style={{ background:'#0e0e1a', border:`1px solid ${k.c}22`, borderRadius:'9px', padding:'10px' }}>
                <p style={{ fontSize:'9px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'3px' }}>{k.l}</p>
                <p style={{ fontSize:'18px', fontWeight:'900', color:k.c }}>{k.v}</p>
              </div>
            ))}
          </div>
          <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Lead','Dur','Score','Cat','Sentiment','Dir','Date'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {recent_calls.map(c=>(
                    <tr key={c.id} onMouseEnter={e=>e.currentTarget.style.background='#0a0a14'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ ...S.td, fontWeight:'700', color:'#f0f0f8' }}>{c.lead_name}</td>
                      <td style={S.td}>{c.duration?`${Math.floor(c.duration/60)}m${c.duration%60}s`:'—'}</td>
                      <td style={{ ...S.td, fontWeight:'800', color:'#a78bfa' }}>{c.score}/10</td>
                      <td style={S.td}><span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 7px', borderRadius:'999px', background:`${CAT_COLOR[c.category]||'#6b7280'}18`, color:CAT_COLOR[c.category]||'#6b7280' }}>{c.category}</span></td>
                      <td style={S.td}>{c.sentiment}</td>
                      <td style={S.td}>{c.direction}</td>
                      <td style={S.td}>{c.date?.split('T')[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LEADS */}
      {tab==='leads' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px' }}>
          {[{l:'Total',v:leads.total,c:'#06b6d4'},{l:'Hot 🔥',v:leads.hot,c:'#f87171'},{l:'Warm 🌤️',v:leads.warm,c:'#fbbf24'},{l:'Cold ❄️',v:leads.cold,c:'#6b7280'}].map(k=>(
            <div key={k.l} style={{ background:'#0e0e1a', border:`1px solid ${k.c}22`, borderRadius:'12px', padding:'18px', textAlign:'center' }}>
              <p style={{ fontSize:'9px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'8px' }}>{k.l}</p>
              <p style={{ fontSize:'30px', fontWeight:'900', color:k.c }}>{k.v}</p>
              {k.l!=='Total' && <p style={{ fontSize:'10px', color:'#33334a', marginTop:'4px' }}>{leads.total?Math.round(k.v/leads.total*100):0}%</p>}
            </div>
          ))}
        </div>
      )}

      {/* PAYMENTS */}
      {tab==='payments' && (
        <div>
          <div style={{ ...S.card, marginBottom:'12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>Total Revenue</p>
              <p style={{ fontSize:'28px', fontWeight:'900', color:'#10b981' }}>₹{(total_paid/1000).toFixed(1)}K</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <PlanBadge plan={company.plan} />
              <p style={{ fontSize:'11px', color:'#55556a', marginTop:'4px' }}>₹{((company.monthly_value||0)/1000).toFixed(0)}K/mo</p>
            </div>
          </div>
          {payments.length===0
            ? <div style={{ ...S.card, textAlign:'center', padding:'30px', color:'#33334a' }}>No payment history</div>
            : <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Plan','Amount','Status','Date'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {payments.map((p,i)=>(
                      <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#0a0a14'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={S.td}><PlanBadge plan={p.plan} /></td>
                        <td style={{ ...S.td, fontWeight:'700', color:'#10b981' }}>₹{((p.amount||0)/1000).toFixed(0)}K</td>
                        <td style={S.td}><span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 8px', borderRadius:'999px', background:p.status==='paid'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', color:p.status==='paid'?'#10b981':'#f87171' }}>{p.status}</span></td>
                        <td style={S.td}>{p.date?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>
      )}
    </div>
  )
}

export default function Companies({ clients, onRefresh }) {
  const [selected, setSelected] = useState(null)
  const [detail,   setDetail]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')

  const filtered = clients.filter(c =>
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const select = async (c) => {
    setSelected(c.id)
    setLoading(true)
    try { const r = await ax.get(`/admin/clients/${c.id}/detail`); setDetail(r.data) } catch {}
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', height:'calc(100vh - 120px)', overflow:'hidden' }}>
      {/* LEFT LIST */}
      <div style={{ width:selected?'300px':'100%', minWidth:'260px', display:'flex', flexDirection:'column', paddingRight:'16px', borderRight:selected?'1px solid #1a1a2e':'none', transition:'width 0.2s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:'10px', padding:'8px 12px', marginBottom:'10px' }}>
          <Search size={12} color="#33334a" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
            style={{ background:'none', border:'none', outline:'none', color:'#f0f0f8', fontSize:'12px', flex:1 }} />
          <span style={{ fontSize:'10px', color:'#33334a' }}>{filtered.length}</span>
        </div>
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'5px' }}>
          {filtered.map(c=>(
            <div key={c.id} onClick={()=>select(c)}
              style={{ padding:'10px 12px', borderRadius:'10px', cursor:'pointer', border:`1px solid ${selected===c.id?'rgba(124,58,237,0.4)':'#1a1a2e'}`, background:selected===c.id?'rgba(124,58,237,0.1)':'#0e0e1a', transition:'all 0.15s' }}
              onMouseEnter={e=>{ if(selected!==c.id) e.currentTarget.style.background='#0a0a14' }}
              onMouseLeave={e=>{ if(selected!==c.id) e.currentTarget.style.background='#0e0e1a' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
                <span style={{ fontSize:'13px', fontWeight:'700', color:selected===c.id?'#a78bfa':'#f0f0f8' }}>{c.company}</span>
                <PlanBadge plan={c.plan} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'10px', color:'#33334a', textTransform:'capitalize' }}>{c.industry}</span>
                <span style={{ fontSize:'10px', color:'#a78bfa', fontWeight:'700' }}>{c.total_calls} calls</span>
                <span style={{ fontSize:'10px', color:'#06b6d4', fontWeight:'700' }}>{c.team_count||0} team</span>
                <span style={{ marginLeft:'auto' }}><StatusBadge active={c.is_active} /></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT DETAIL */}
      {selected && (
        loading
          ? <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><p style={{ color:'#33334a' }}>Loading...</p></div>
          : detail && <CompanyDetail detail={detail} onRefresh={()=>{ onRefresh() }} />
      )}
    </div>
  )
}
