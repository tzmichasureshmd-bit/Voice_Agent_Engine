import { useState, useEffect } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { ax, CAT_COLOR, S } from './shared'

export default function AllLeads() {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  const load = () => {
    setLoading(true)
    ax.get('/admin/leads?limit=300')
      .then(r => setLeads(r.data.leads || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = leads.filter(l =>
    l.company?.toLowerCase().includes(search.toLowerCase()) ||
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search)
  )

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <h2 style={{ fontSize:'18px', fontWeight:'900', color:'#f0f0f8' }}>
          All Leads <span style={{ color:'#33334a', fontSize:'14px' }}>({filtered.length})</span>
        </h2>
        <div style={{ display:'flex', gap:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#0e0e1a', border:'1px solid #1e1e30', borderRadius:'10px', padding:'7px 12px' }}>
            <Search size={12} color="#33334a" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company, phone..."
              style={{ background:'none', border:'none', outline:'none', color:'#f0f0f8', fontSize:'12px', width:'200px' }} />
          </div>
          <button onClick={load} style={{ background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:'10px', padding:'7px 12px', cursor:'pointer', color:'#a78bfa', display:'flex', alignItems:'center', gap:'5px', fontSize:'11px' }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['#','Company','Name','Phone','Email','Score','Category','Status','Date'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={9} style={{ ...S.td, textAlign:'center', padding:'40px', color:'#33334a' }}>Loading...</td></tr>
                : filtered.length === 0
                  ? <tr><td colSpan={9} style={{ ...S.td, textAlign:'center', padding:'40px', color:'#33334a' }}>No leads found</td></tr>
                  : filtered.map(l => (
                    <tr key={l.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#0a0a14'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...S.td, color:'#33334a' }}>#{l.id}</td>
                      <td style={{ ...S.td, fontWeight:'700', color:'#f0f0f8' }}>{l.company}</td>
                      <td style={S.td}>{l.name}</td>
                      <td style={S.td}>{l.phone}</td>
                      <td style={S.td}>{l.email || '--'}</td>
                      <td style={{ ...S.td, fontWeight:'800', color:'#a78bfa' }}>{l.score || 0}/10</td>
                      <td style={S.td}>
                        {l.category
                          ? <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 7px', borderRadius:'999px',
                              background:`${CAT_COLOR[l.category]||'#6b7280'}18`, color:CAT_COLOR[l.category]||'#6b7280' }}>
                              {l.category}
                            </span>
                          : '--'}
                      </td>
                      <td style={S.td}>{l.status || '--'}</td>
                      <td style={S.td}>{l.created_at?.split('T')[0]}</td>
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
