import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { ax, S, PlanBadge } from './shared'

export default function PaymentsView() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    ax.get('/admin/payments').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const payments = data?.payments || []
  const filtered = payments.filter(p =>
    p.company?.toLowerCase().includes(search.toLowerCase()) ||
    p.plan?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h2 style={{ fontSize:'18px', fontWeight:'900', color:'#f0f0f8', marginBottom:'20px' }}>Payments</h2>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'20px' }}>
        <div style={S.card}>
          <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'8px' }}>Total Revenue</p>
          <p style={{ fontSize:'32px', fontWeight:'900', color:'#10b981' }}>&#8377;{((data?.total_revenue||0)/1000).toFixed(1)}K</p>
        </div>
        <div style={S.card}>
          <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'8px' }}>Total Orders</p>
          <p style={{ fontSize:'32px', fontWeight:'900', color:'#a78bfa' }}>{payments.length}</p>
        </div>
        <div style={S.card}>
          <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'8px' }}>Paid Orders</p>
          <p style={{ fontSize:'32px', fontWeight:'900', color:'#4ade80' }}>{payments.filter(p => p.status === 'paid').length}</p>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:'10px', padding:'7px 12px', marginBottom:'14px', width:'fit-content' }}>
        <Search size={12} color="#33334a" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or plan..."
          style={{ background:'none', border:'none', outline:'none', color:'#f0f0f8', fontSize:'12px', width:'200px' }} />
      </div>

      <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['#','Company','Plan','Amount','Status','Date'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={6} style={{ ...S.td, textAlign:'center', padding:'40px', color:'#33334a' }}>Loading...</td></tr>
                : filtered.length === 0
                  ? <tr><td colSpan={6} style={{ ...S.td, textAlign:'center', padding:'40px', color:'#33334a' }}>No payments found</td></tr>
                  : filtered.map(p => (
                    <tr key={p.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#0a0a14'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...S.td, color:'#33334a' }}>#{p.id}</td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#f0f0f8' }}>{p.company}</td>
                      <td style={S.td}><PlanBadge plan={p.plan} /></td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#10b981' }}>&#8377;{((p.amount||0)/1000).toFixed(0)}K</td>
                      <td style={S.td}>
                        <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 8px', borderRadius:'999px',
                          background: p.status==='paid' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: p.status==='paid' ? '#10b981' : '#f87171' }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={S.td}>{p.created_at?.split('T')[0]}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
