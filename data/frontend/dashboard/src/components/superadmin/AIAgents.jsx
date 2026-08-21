import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { ax, S } from './shared'

export default function AIAgents() {
  const [emps,    setEmps]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    ax.get('/admin/ai-employees').then(r => setEmps(r.data.employees || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = emps.filter(e =>
    e.company?.toLowerCase().includes(search.toLowerCase()) ||
    e.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
        <h2 style={{ fontSize:'18px', fontWeight:'900', color:'#f0f0f8' }}>
          AI Agents <span style={{ color:'#33334a', fontSize:'14px' }}>({filtered.length})</span>
        </h2>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:'10px', padding:'7px 12px' }}>
          <Search size={12} color="#33334a" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agent or company..."
            style={{ background:'none', border:'none', outline:'none', color:'#f0f0f8', fontSize:'12px', width:'180px' }} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          { l:'Total Agents',    v:emps.length,                                          c:'#a78bfa' },
          { l:'Active',          v:emps.filter(e => e.status === 'active').length,        c:'#4ade80' },
          { l:'Total Calls Made',v:emps.reduce((s, e) => s + (e.total_calls||0), 0),     c:'#06b6d4' },
        ].map(k => (
          <div key={k.l} style={S.card}>
            <p style={{ fontSize:'10px', color:'#33334a', fontWeight:'700', textTransform:'uppercase', marginBottom:'8px' }}>{k.l}</p>
            <p style={{ fontSize:'32px', fontWeight:'900', color:k.c }}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['#','Company','Agent Name','Role','Industry','Status','Calls','Leads','Created'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={9} style={{ ...S.td, textAlign:'center', padding:'40px', color:'#33334a' }}>Loading...</td></tr>
                : filtered.length === 0
                  ? <tr><td colSpan={9} style={{ ...S.td, textAlign:'center', padding:'40px', color:'#33334a' }}>No agents found</td></tr>
                  : filtered.map(e => (
                    <tr key={e.id}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#0a0a14'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...S.td, color:'#33334a' }}>#{e.id}</td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#f0f0f8' }}>{e.company}</td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#a78bfa' }}>{e.name}</td>
                      <td style={S.td}>{e.role}</td>
                      <td style={S.td}>{e.industry || '--'}</td>
                      <td style={S.td}>
                        <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 8px', borderRadius:'999px',
                          background: e.status==='active' ? 'rgba(74,222,128,0.1)' : 'rgba(107,114,128,0.1)',
                          color: e.status==='active' ? '#4ade80' : '#6b7280' }}>
                          {e.status || 'active'}
                        </span>
                      </td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#06b6d4' }}>{e.total_calls || 0}</td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#10b981' }}>{e.leads_qualified || 0}</td>
                      <td style={S.td}>{e.created_at?.split('T')[0]}</td>
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
