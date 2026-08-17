import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Plus, Search, X, UserPlus, Upload, Download } from 'lucide-react'
import api from '../api'

const GLOW = { hot:'239,68,68', warm:'245,158,11', cold:'59,130,246' }
const CCOLOR = { hot:'#f87171', warm:'#fbbf24', cold:'#60a5fa' }

export default function Leads() {
  const [leads,     setLeads]     = useState([])
  const [showModal, setShowModal] = useState(false)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')
  const [form, setForm] = useState({ name:'', phone:'', email:'', company:'' })

  useEffect(() => { fetchLeads() }, [])

  const fetchLeads = async () => {
    try { const r = await api.get('/leads'); setLeads(r.data.leads || []) } catch {}
  }

  const addLead = async () => {
    if (!form.name || !form.phone) return
    await api.post('/leads', form).catch(() => {})
    setForm({ name:'', phone:'', email:'', company:'' })
    setShowModal(false); fetchLeads()
  }

  const uploadCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file)
    try { const r = await api.post('/leads/upload-csv', fd); alert(r.data.message); fetchLeads() }
    catch { alert('Upload failed. CSV needs: name, phone, email, company') }
    e.target.value = ''
  }

  const filtered = leads.filter(l => {
    const mf = filter === 'all' || l.category === filter
    const ms = l.name?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search)
    return mf && ms
  })

  const counts = {
    all:  leads.length,
    hot:  leads.filter(l => l.category === 'hot').length,
    warm: leads.filter(l => l.category === 'warm').length,
    cold: leads.filter(l => l.category === 'cold').length,
  }

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'28px' }}>
        <div>
          <h1 style={{ fontSize:'26px', fontWeight:'900', color:'#f0f0f8', letterSpacing:'-0.5px' }}>Leads</h1>
          <p style={{ fontSize:'13px', color:'#55556a', marginTop:'4px' }}>{leads.length} contacts in pipeline</p>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <a href="#" onClick={e => { e.preventDefault(); const base = window.location.hostname==='localhost'?'http://localhost:8000':'/api'; const clientId = localStorage.getItem('client_id'); fetch(`${base}/export/leads`, { headers:{'x-client-id': clientId} }).then(r=>r.blob()).then(b=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='leads.csv'; a.click() }) }}
            className="btn btn-ghost" style={{ textDecoration:'none', fontSize:'12px' }}>
            <Download size={13}/> Export
          </a>
          <label className="btn btn-ghost" style={{ cursor:'pointer', fontSize:'12px' }}>
            <Upload size={13}/> CSV <input type="file" accept=".csv" onChange={uploadCSV} style={{ display:'none' }}/>
          </label>
          <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={14}/> Add Lead
          </motion.button>
        </div>
      </motion.div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom:'24px', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, maxWidth:'300px' }}>
          <Search size={14} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#33334a' }}/>
          <input type="text" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)}
            className="input" style={{ paddingLeft:'38px' }}/>
        </div>
        <div style={{ display:'flex', gap:'4px', background:'#0e0e1a', borderRadius:'12px', padding:'4px', border:'1px solid #1e1e30' }}>
          {['all','hot','warm','cold'].map(f => {
            const active = filter === f
            const g = GLOW[f] || '124,58,237'
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding:'7px 14px', borderRadius:'9px', fontSize:'11px', fontWeight:'700',
                textTransform:'uppercase', letterSpacing:'0.5px', border:'none', cursor:'pointer',
                background: active ? `rgba(${g},0.18)` : 'transparent',
                color: active ? (CCOLOR[f] || '#a78bfa') : '#33334a',
                outline: active ? `1px solid rgba(${g},0.3)` : 'none',
                transition:'all 0.15s',
              }}>
                {f} <span style={{ fontSize:'10px', fontWeight:'600', opacity:0.7 }}>({counts[f]})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 0' }}>
          <UserPlus size={32} style={{ color:'#1e1e30', margin:'0 auto 14px' }}/>
          <p style={{ fontSize:'14px', color:'#33334a', fontWeight:'600' }}>No leads found</p>
          <p style={{ fontSize:'12px', color:'#1e1e30', marginTop:'4px' }}>Add your first lead to get started</p>
          <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowModal(true)}
            className="btn btn-primary" style={{ marginTop:'16px' }}>
            <Plus size={14}/> Add Lead
          </motion.button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px,1fr))', gap:'12px' }}>
          {filtered.map((lead, i) => {
            const g = GLOW[lead.category] || '124,58,237'
            const c = CCOLOR[lead.category] || '#a78bfa'
            return (
              <motion.div key={lead.id}
                initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.04 }}
                style={{
                  background:'#0e0e1a', borderRadius:'16px', padding:'20px',
                  border:`1px solid rgba(${g},0.18)`,
                  boxShadow:`0 0 0 1px rgba(${g},0.04), 0 8px 24px rgba(0,0,0,0.3)`,
                  transition:'all 0.2s', cursor:'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=`rgba(${g},0.4)`; e.currentTarget.style.boxShadow=`0 0 0 1px rgba(${g},0.1), 0 16px 40px rgba(0,0,0,0.4), 0 0 20px rgba(${g},0.06)` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=`rgba(${g},0.18)`; e.currentTarget.style.boxShadow=`0 0 0 1px rgba(${g},0.04), 0 8px 24px rgba(0,0,0,0.3)` }}
              >
                {/* Top row */}
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                  <div style={{
                    width:'44px', height:'44px', borderRadius:'13px', flexShrink:0,
                    background:`linear-gradient(135deg, rgba(${g},0.25), rgba(${g},0.08))`,
                    border:`1px solid rgba(${g},0.25)`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'17px', fontWeight:'900', color:c,
                  }}>{lead.name?.[0]?.toUpperCase() || '?'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:'14px', fontWeight:'700', color:'#f0f0f8', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lead.name}</p>
                    <p style={{ fontSize:'11px', color:'#33334a', marginTop:'2px' }}>{lead.email || '—'}</p>
                  </div>
                  <span style={{
                    fontSize:'9px', fontWeight:'800', padding:'3px 9px', borderRadius:'999px',
                    textTransform:'uppercase', letterSpacing:'0.6px',
                    background:`rgba(${g},0.12)`, color:c,
                    border:`1px solid rgba(${g},0.25)`,
                    boxShadow:`0 0 10px rgba(${g},0.1)`,
                    flexShrink:0,
                  }}>{lead.category}</span>
                </div>

                {/* Phone */}
                <p style={{ fontSize:'12px', color:'#55556a', marginBottom:'14px', fontFamily:'monospace' }}>{lead.phone}</p>

                {/* Score bar */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                    <span style={{ fontSize:'9px', fontWeight:'700', color:'#33334a', textTransform:'uppercase', letterSpacing:'0.8px' }}>Score</span>
                    <span style={{ fontSize:'12px', fontWeight:'900', color:'#f0f0f8' }}>{lead.score}<span style={{ fontSize:'9px', color:'#33334a' }}>/10</span></span>
                  </div>
                  <div style={{ height:'4px', borderRadius:'999px', background:'#1e1e30', overflow:'hidden' }}>
                    <motion.div
                      initial={{ width:0 }} animate={{ width:`${(lead.score||0)*10}%` }} transition={{ duration:0.7, ease:'easeOut', delay: i*0.04+0.2 }}
                      style={{ height:'100%', borderRadius:'999px', background:`rgb(${g})`, boxShadow:`0 0 6px rgba(${g},0.5)` }}
                    />
                  </div>
                </div>

                {/* Status */}
                <p style={{ fontSize:'10px', color:'#33334a', marginTop:'10px', textTransform:'capitalize' }}>{lead.status}</p>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale:0.94, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.94, y:20 }}
              transition={{ type:'spring', stiffness:300, damping:28 }}
              onClick={e => e.stopPropagation()}
              style={{
                background:'#0e0e1a', border:'1px solid rgba(124,58,237,0.25)',
                borderRadius:'20px', padding:'28px', width:'100%', maxWidth:'400px',
                boxShadow:'0 0 0 1px rgba(124,58,237,0.08), 0 40px 80px rgba(0,0,0,0.7)',
              }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
                <h2 style={{ fontSize:'18px', fontWeight:'800', color:'#f0f0f8' }}>New Lead</h2>
                <button onClick={() => setShowModal(false)}
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid #1e1e30', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'#55556a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <X size={15}/>
                </button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {[
                  { placeholder:'Full Name *',  key:'name',    type:'text'  },
                  { placeholder:'Phone *',       key:'phone',   type:'text'  },
                  { placeholder:'Email',         key:'email',   type:'email' },
                  { placeholder:'Company',       key:'company', type:'text'  },
                ].map(f => (
                  <input key={f.key} type={f.type} placeholder={f.placeholder}
                    value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="input"/>
                ))}
                <motion.button whileTap={{ scale:0.97 }} onClick={addLead}
                  className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'13px', marginTop:'6px', fontSize:'14px' }}>
                  <Plus size={15}/> Add Lead
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
