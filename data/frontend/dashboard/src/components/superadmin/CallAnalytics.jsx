import { S, PlanBadge, StatusBadge } from './shared'

export default function CallAnalytics({ clients }) {
  const sorted = [...clients].sort((a, b) => (b.total_calls||0) - (a.total_calls||0))
  const total  = clients.reduce((s, c) => s + (c.total_calls||0), 0)
  const top    = sorted[0]

  return (
    <div>
      <h2 style={{ fontSize:'18px', fontWeight:'900', color:'#f0f0f8', marginBottom:'20px' }}>Call Analytics</h2>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'20px' }}>
        <div style={S.card}>
          <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'8px' }}>Total Calls (All Clients)</p>
          <p style={{ fontSize:'36px', fontWeight:'900', color:'#a78bfa' }}>{total.toLocaleString()}</p>
        </div>
        <div style={S.card}>
          <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'8px' }}>Avg Calls / Client</p>
          <p style={{ fontSize:'36px', fontWeight:'900', color:'#06b6d4' }}>{clients.length ? Math.round(total/clients.length) : 0}</p>
        </div>
        <div style={S.card}>
          <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'8px' }}>Top Client</p>
          <p style={{ fontSize:'18px', fontWeight:'900', color:'#fbbf24' }}>{top?.company || '—'}</p>
          <p style={{ fontSize:'12px', color:'#55556a', marginTop:'4px' }}>{top?.total_calls || 0} calls</p>
        </div>
      </div>

      <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #1a1a2e' }}>
          <p style={{ fontSize:'12px', fontWeight:'800', color:'#f0f0f8' }}>Calls by Client (Highest First)</p>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Rank','Company','Plan','Total Calls','% of All','Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {sorted.map((c, i) => (
                <tr key={c.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#0a0a14'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...S.td, color:i===0?'#fbbf24':i===1?'#9ca3af':i===2?'#b45309':'#33334a', fontWeight:'800' }}>#{i+1}</td>
                  <td style={{ ...S.td, fontWeight:'700', color:'#f0f0f8' }}>{c.company}</td>
                  <td style={S.td}><PlanBadge plan={c.plan} /></td>
                  <td style={{ ...S.td, fontWeight:'900', color:'#a78bfa', fontSize:'14px' }}>{c.total_calls}</td>
                  <td style={S.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <div style={{ width:'80px', height:'4px', background:'#1a1a2e', borderRadius:'999px' }}>
                        <div style={{ height:'4px', borderRadius:'999px', background:'#a78bfa', width:`${total ? Math.round((c.total_calls/total)*100) : 0}%` }} />
                      </div>
                      <span style={{ fontSize:'11px', color:'#55556a' }}>{total ? Math.round((c.total_calls/total)*100) : 0}%</span>
                    </div>
                  </td>
                  <td style={S.td}><StatusBadge active={c.is_active} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
