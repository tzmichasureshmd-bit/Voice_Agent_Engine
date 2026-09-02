import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { CURRENCIES } from './currency'

export default function CurrencyPicker({ cur, setCur }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(p => !p)} style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
        borderRadius: '10px', cursor: 'pointer', background: 'var(--bg-card)',
        border: '1px solid rgba(124,58,237,0.3)', color: 'var(--text-primary)',
        fontSize: '13px', fontWeight: '600',
      }}>
        {cur.flag} {cur.code} <ChevronDown size={12} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', top: '38px', right: 0, zIndex: 999,
              background: 'var(--bg-card)', border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: '12px', overflow: 'hidden', minWidth: '140px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}>
            {CURRENCIES.map(c => (
              <button key={c.code} onClick={() => { setCur(c); setOpen(false) }} style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                padding: '9px 14px', border: 'none', cursor: 'pointer',
                background: c.code === cur.code ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: c.code === cur.code ? '#a78bfa' : 'var(--text-primary)',
                fontSize: '13px', fontWeight: '500',
              }}>
                {c.flag} {c.code}
                <span style={{ marginLeft: 'auto', color: '#55556a', fontSize: '11px' }}>{c.symbol}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
