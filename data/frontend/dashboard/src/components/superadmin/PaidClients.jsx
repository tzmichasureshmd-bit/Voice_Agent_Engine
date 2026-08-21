import { PLAN_PRICES, PLAN_COLOR, S, PlanBadge, StatusBadge } from './shared'

export default function PaidClients({ clients }) {
  const paid = clients.filter(c => c.plan !== 'free')
  return (
    <div>
      <h2 style={{ fontSize:'18px', fontWeight:'900', color:'#f0f0f8', marginBottom:'20px' }}>
        Paid Clients <span style={{ color:'#33334a', fontSize:'14px' }}>({paid.length})</span>
      </h2>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'20px' }}>
        {['starter','growth','pro','enterprise'].map(plan => {
          const list = clients.filter(c => c.plan === plan)
          const col  = PLAN_COLOR[plan]
          return (
            <div key={plan} style={{ background:'#0e0e1a', border:`1px solid ${col}22`, borderRadius:'14px', padding:'16px' }}>
              <p style={{ fontSize:'10px', color:col, fontWeight:'800', textTransform:'uppercase', marginBottom:'6px' }}>{plan}</p>
              <p style={{ fontSize:'28px', fontWeight:'900', color:'#f0f0f8' }}>{list.length}</p>
              <p style={{ fontSize:'11px', color:'#33334a', marginTop:'4px' }}>₹{((list.length*(PLAN_PRICES[plan]||0))/1000).toFixed(0)}K MRR</p>
            </div>
          )
        })}
      </div>

      <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['#','Company','Email','Plan','Monthly','Calls','Status','Joined'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {paid.map(c => (
                <tr key={c.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#0a0a14'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...S.td, color:'#33334a' }}>#{c.id}</td>
                  <td style={{ ...S.td, fontWeight:'700', color:'#f0f0f8' }}>{c.company}</td>
                  <td style={S.td}>{c.email}</td>
                  <td style={S.td}><PlanBadge plan={c.plan} /></td>
                  <td style={{ ...S.td, fontWeight:'700', color:'#10b981' }}>₹{((PLAN_PRICES[c.plan]||0)/1000).toFixed(0)}K</td>
                  <td style={{ ...S.td, fontWeight:'700', color:'#a78bfa' }}>{c.total_calls}</td>
                  <td style={S.td}><StatusBadge active={c.is_active} /></td>
                  <td style={S.td}>{c.created?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
