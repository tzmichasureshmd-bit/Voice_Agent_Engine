import axios from 'axios'

const API = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '/api'
export const ax = axios.create({ baseURL: API, headers: { 'x-admin-key': 'superadmin123' } })

export const PLAN_PRICES = { free:0, starter:5000, growth:15000, pro:30000, enterprise:75000 }
export const PLAN_COLOR  = { free:'#6b7280', starter:'#06b6d4', growth:'#a78bfa', pro:'#fbbf24', enterprise:'#f87171' }
export const CAT_COLOR   = { hot:'#f87171', warm:'#fbbf24', cold:'#06b6d4' }

export const S = {
  card: { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'14px', padding:'16px' },
  th:   { textAlign:'left', padding:'9px 12px', fontSize:'10px', fontWeight:'700', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.6px', whiteSpace:'nowrap', borderBottom:'1px solid var(--border)' },
  td:   { padding:'9px 12px', fontSize:'12px', color:'var(--text-secondary)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' },
}

export function PlanBadge({ plan }) {
  const c = PLAN_COLOR[plan] || '#6b7280'
  return <span style={{ fontSize:'10px', fontWeight:'800', padding:'2px 8px', borderRadius:'999px', background:`${c}18`, color:c, border:`1px solid ${c}33`, textTransform:'uppercase' }}>{plan}</span>
}

export function StatusBadge({ active }) {
  return <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 8px', borderRadius:'999px', background:active?'rgba(74,222,128,0.1)':'rgba(239,68,68,0.1)', color:active?'#4ade80':'#f87171' }}>{active?'Active':'Banned'}</span>
}

export function MiniBar({ pct, color }) {
  return (
    <div style={{ flex:1, height:'5px', background:'var(--border)', borderRadius:'999px' }}>
      <div style={{ height:'5px', borderRadius:'999px', background:color, width:`${Math.min(pct||0,100)}%` }} />
    </div>
  )
}
