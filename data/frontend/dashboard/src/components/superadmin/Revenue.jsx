import { PLAN_PRICES, PLAN_COLOR, S, PlanBadge, StatusBadge } from './shared'

export default function Revenue({ clients }) {
  const mrr  = clients.reduce((s,c)=>s+(PLAN_PRICES[c.plan]||0),0)
  const paid  = clients.filter(c=>c.plan!=='free')

  return (
    <div>
      <h2 style={{ fontSize:'18px', fontWeight:'900', color:'#f0f0f8', marginBottom:'20px' }}>MRR / Revenue</h2>

      {/* MRR + ARR hero */}
      <div style={{ ...S.card, marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'6px' }}>Total MRR</p>
          <p style={{ fontSize:'40px', fontWeight:'900', color:'#10b981', letterSpacing:'-1px' }}>₹{(mrr/1000).toFixed(1)}K</p>
          <p style={{ fontSize:'12px', color:'#55556a', marginTop:'4px' }}>per month · {paid.length} paying clients</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'6px' }}>ARR</p>
          <p style={{ fontSize:'28px', fontWeight:'900', color:'#a78bfa' }}>₹{(mrr*12/100000).toFixed(1)}L</p>
          <p style={{ fontSize:'11px', color:'#33334a', marginTop:'4px' }}>annualised</p>
        </div>
      </div>

      {/* Per-plan breakdown */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px', marginBottom:'16px' }}>
        {Object.entries(PLAN_PRICES).map(([plan,price])=>{
          const list = clients.filter(c=>c.plan===plan&&c.is_active)
          const rev  = list.length*price
          const col  = PLAN_COLOR[plan]
          return (
            <div key={plan} style={{ background:'#0e0e1a', border:`1px solid ${col}22`, borderRadius:'14px', padding:'16px' }}>
              <p style={{ fontSize:'10px', color:col, fontWeight:'800', textTransform:'uppercase', marginBottom:'8px' }}>{plan}</p>
              <p style={{ fontSize:'22px', fontWeight:'900', color:'#f0f0f8' }}>₹{(rev/1000).toFixed(0)}K</p>
              <p style={{ fontSize:'10px', color:'#33334a', marginTop:'4px' }}>{list.length} × ₹{(price/1000).toFixed(0)}K</p>
            </div>
          )
        })}
      </div>

      {/* All paying clients table */}
      <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #1a1a2e' }}>
          <p style={{ fontSize:'12px', fontWeight:'800', color:'#f0f0f8' }}>All Paying Clients</p>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Company','Email','Plan','Monthly','Calls','Status','Joined'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {paid.sort((a,b)=>(PLAN_PRICES[b.plan]||0)-(PLAN_PRICES[a.plan]||0)).map(c=>(
                <tr key={c.id} onMouseEnter={e=>e.currentTarget.style.background='#0a0a14'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
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
