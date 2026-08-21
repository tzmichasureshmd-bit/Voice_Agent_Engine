import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { ax, S } from './shared'

export default function CampaignsView() {
  const [camps,   setCamps]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    ax.get('/admin/campaigns').then(r => setCamps(r.data.campaigns || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = camps.filter(c =>
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
        <h2 style={{ fontSize:'18px', fontWeight:'900', color:'#f0f0f8' }}>
          Campaigns <span style={{ color:'#33334a', fontSize:'14px' }}>({filtered.length})</span>
        </h2>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:'10px', padding:'7px 12px' }}>
          <Search size={12} color="#33334a" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaign or company..."
            style={{ background:'none', border:'none', outline:'none', color:'#f0f0f8', fontSize:'12px', width:'180px' }} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          { l:'Total Campaigns', v:camps.length,                                       c:'#a78bfa' },
          { l:'Total Calls Run', v:camps.reduce((s, c) => s + (c.total_calls||0), 0), c:'#06b6d4' },
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
            <thead><tr>{['#','Company','Campaign Name','Calls Run','Created'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={5} style={{ ...S.td, textAlign:'center', padding:'40px', color:'#33334a' }}>Loading...</td></tr>
                : filtered.length === 0
                  ? <tr><td colSpan={5} style={{ ...S.td, textAlign:'center', padding:'40px', color:'#33334a' }}>No campaigns found</td></tr>
                  : filtered.map(c => (
                    <tr key={c.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#0a0a14'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...S.td, color:'#33334a' }}>#{c.id}</td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#f0f0f8' }}>{c.company}</td>
                      <td style={{ ...S.td, color:'#a78bfa', fontWeight:'700' }}>{c.name}</td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#06b6d4' }}>{c.total_calls || 0}</td>
                      <td style={S.td}>{c.created_at?.split('T')[0]}</td>
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
