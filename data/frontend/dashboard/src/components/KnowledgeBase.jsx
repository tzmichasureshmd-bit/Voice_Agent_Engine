import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Plus, BookOpen, X, Trash2, Search, Tag } from 'lucide-react'
import api from '../api'

const CATEGORIES = ['general', 'faq', 'pricing', 'objections', 'product', 'location', 'hours']

export default function KnowledgeBase() {
  const [items, setItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [form, setForm] = useState({ title: '', content: '', category: 'general' })

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    try {
      const res = await api.get('/knowledge')
      setItems(res.data.items || [])
    } catch {}
  }

  const addItem = async () => {
    if (!form.title || !form.content) return
    await api.post('/knowledge', form).catch(() => {})
    setForm({ title: '', content: '', category: 'general' })
    setShowModal(false)
    fetchItems()
  }

  const deleteItem = async (id) => {
    await api.delete(`/knowledge/${id}`).catch(() => {})
    fetchItems()
  }

  const filtered = items.filter(i => {
    const matchCat = filterCat === 'all' || i.category === filterCat
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.content.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const catColors = { general: '#06b6d4', faq: '#8b5cf6', pricing: '#f59e0b', objections: '#ef4444', product: '#10b981', location: '#3b82f6', hours: '#ec4899' }

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>Knowledge Base</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Feed your AI with company info — it uses this during calls</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={14} /> Add Knowledge</button>
      </motion.div>

      {/* How it works */}
      <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', marginBottom: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
        💡 AI reads this knowledge base during calls. Add FAQs, pricing, objection handling, location, working hours — AI will answer naturally.
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search knowledge..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ paddingLeft: '32px' }} />
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {['all', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setFilterCat(c)} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', border: filterCat === c ? `1px solid ${catColors[c] || '#06b6d4'}` : '1px solid var(--border)', background: filterCat === c ? `${catColors[c] || '#06b6d4'}15` : 'transparent', color: filterCat === c ? (catColors[c] || '#06b6d4') : 'var(--text-muted)', cursor: 'pointer', textTransform: 'capitalize' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center', gridColumn: '1 / -1' }}>
            <BookOpen size={28} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No knowledge added yet</p>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Add FAQs, pricing, objections — AI will use them on calls</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ marginTop: '16px' }}><Plus size={14} /> Add First Entry</button>
          </div>
        ) : (
          filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '5px', background: `${catColors[item.category] || '#06b6d4'}15`, color: catColors[item.category] || '#06b6d4', border: `1px solid ${catColors[item.category] || '#06b6d4'}30`, textTransform: 'capitalize' }}>
                    {item.category}
                  </span>
                </div>
                <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
              <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.content}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '10px' }}>{item.created_at?.split('T')[0]}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="card" style={{ padding: '28px', width: '100%', maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Add Knowledge</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="Title * (e.g. What is your pricing?)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" />
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input">
                  {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
                <textarea placeholder="Content * (e.g. Our pricing starts at ₹5,000/month for 500 calls...)" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="input" style={{ height: '120px', resize: 'none' }} />
                <button onClick={addItem} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}>
                  <BookOpen size={14} /> Add to Knowledge Base
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
