import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'
import { TrendingUp, Phone, Clock, Target, Flame, Snowflake, Sun } from 'lucide-react'
import api from '../api'

const CARD = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: '18px', padding: '24px', boxShadow: 'var(--shadow-card)',
}

const TT_STYLE = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: '10px', fontSize: '12px', color: 'var(--text-primary)',
}

export default function Analytics() {
  const [calls,   setCalls]   = useState([])
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/calls').then(r => setCalls(r.data.calls || [])).catch(() => {}),
      api.get('/leads').then(r => setLeads(r.data.leads || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // ── KPIs ──
  const totalCalls    = calls.length
  const connected     = calls.filter(c => c.call_status === 'completed' || c.call_status === 'transferred').length
  const connectRate   = totalCalls ? Math.round((connected / totalCalls) * 100) : 0
  const totalSec      = calls.reduce((s, c) => s + (c.duration_seconds || 0), 0)
  const avgDur        = totalCalls ? Math.round(totalSec / totalCalls) : 0
  const hotLeads      = leads.filter(l => l.category === 'hot').length
  const warmLeads     = leads.filter(l => l.category === 'warm').length
  const coldLeads     = leads.filter(l => l.category === 'cold').length
  const convRate      = leads.length ? ((hotLeads / leads.length) * 100).toFixed(1) : '0.0'

  // ── Last 14 days daily calls ──
  const daily = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const ds = d.toDateString()
    const dayCalls = calls.filter(c => c.created_at && new Date(c.created_at).toDateString() === ds)
    daily.push({
      label,
      Calls:     dayCalls.length,
      Connected: dayCalls.filter(c => c.call_status === 'completed' || c.call_status === 'transferred').length,
      Hot:       dayCalls.filter(c => c.category === 'hot').length,
    })
  }

  // ── Sentiment breakdown ──
  const sentMap = {}
  calls.forEach(c => { const s = c.sentiment || 'neutral'; sentMap[s] = (sentMap[s] || 0) + 1 })
  const sentData = Object.entries(sentMap).map(([name, value]) => ({ name, value }))
  const SENT_COLORS = { positive: '#10b981', neutral: '#06b6d4', negative: '#f87171' }

  // ── Lead score distribution ──
  const scoreBuckets = [
    { range: '1-3',  value: calls.filter(c => (c.lead_score || 0) >= 1 && (c.lead_score || 0) <= 3).length, color: '#60a5fa' },
    { range: '4-6',  value: calls.filter(c => (c.lead_score || 0) >= 4 && (c.lead_score || 0) <= 6).length, color: '#fbbf24' },
    { range: '7-8',  value: calls.filter(c => (c.lead_score || 0) >= 7 && (c.lead_score || 0) <= 8).length, color: '#10b981' },
    { range: '9-10', value: calls.filter(c => (c.lead_score || 0) >= 9).length,                             color: '#f87171' },
  ]

  // ── Category pie ──
  const catData = [
    { name: 'Hot 🔥',  value: hotLeads,  color: '#f87171' },
    { name: 'Warm 🌤️', value: warmLeads, color: '#fbbf24' },
    { name: 'Cold ❄️', value: coldLeads, color: '#60a5fa' },
  ].filter(d => d.value > 0)

  // ── Intent breakdown ──
  const intentMap = {}
  calls.forEach(c => { if (c.intent) intentMap[c.intent] = (intentMap[c.intent] || 0) + 1 })
  const intentData = Object.entries(intentMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))

  const fmtSec = (s) => {
    const m = Math.floor(s / 60), r = s % 60
    return m ? `${m}m ${r}s` : `${r}s`
  }

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp size={20} color="#a78bfa" />
          <h1 style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '-0.6px', color: 'var(--text-primary)' }}>Analytics</h1>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
          Full performance breakdown — calls, leads, sentiment, scores
        </p>
      </motion.div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'TOTAL CALLS',    value: totalCalls,          sub: `${connected} connected`,    color: '#a78bfa', glow: '124,58,237', icon: Phone },
          { label: 'CONNECT RATE',   value: `${connectRate}%`,   sub: `${totalCalls - connected} missed`, color: '#10b981', glow: '16,185,129', icon: TrendingUp },
          { label: 'AVG DURATION',   value: fmtSec(avgDur),      sub: `${fmtSec(totalSec)} total`, color: '#06b6d4', glow: '6,182,212',  icon: Clock },
          { label: 'CONVERSION',     value: `${convRate}%`,      sub: `${hotLeads} hot leads`,     color: '#f87171', glow: '239,68,68',  icon: Target },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ background: 'var(--bg-card)', border: `1px solid rgba(${m.glow},0.18)`, borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `rgba(${m.glow},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <m.icon size={15} color={m.color} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{m.label}</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>{m.value}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Daily Trend */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
        style={{ ...CARD, marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Daily Call Trend — Last 14 Days</h3>
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '20px' }}>Total calls, connected, and hot leads per day</p>
        {calls.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} /><stop offset="100%" stopColor="#a78bfa" stopOpacity={0} /></linearGradient>
                <linearGradient id="gK" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity={0.2}  /><stop offset="100%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.2}  /><stop offset="100%" stopColor="#f87171" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="Calls"     stroke="#a78bfa" strokeWidth={2} fill="url(#gC)" />
              <Area type="monotone" dataKey="Connected" stroke="#06b6d4" strokeWidth={2} fill="url(#gK)" />
              <Area type="monotone" dataKey="Hot"       stroke="#f87171" strokeWidth={2} fill="url(#gH)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Row 2: Score dist + Sentiment + Category */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Lead Score Distribution */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }} style={CARD}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Lead Score Distribution</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '18px' }}>Calls grouped by AI score</p>
          {calls.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={scoreBuckets} barSize={36}>
                <XAxis dataKey="range" stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TT_STYLE} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {scoreBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Sentiment Pie */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }} style={CARD}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Sentiment</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '18px' }}>Call sentiment breakdown</p>
          {sentData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3}>
                  {sentData.map((s, i) => <Cell key={i} fill={SENT_COLORS[s.name] || '#a78bfa'} />)}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Lead Category Pie */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={CARD}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Lead Pipeline</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '18px' }}>Hot / Warm / Cold split</p>
          {catData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3}>
                  {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Mini stat row */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '14px' }}>
            {[
              { icon: Flame,     label: 'Hot',  value: hotLeads,  color: '#f87171' },
              { icon: Sun,       label: 'Warm', value: warmLeads, color: '#fbbf24' },
              { icon: Snowflake, label: 'Cold', value: coldLeads, color: '#60a5fa' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <s.icon size={12} color={s.color} style={{ margin: '0 auto 3px' }} />
                <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{s.value}</p>
                <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Intent Breakdown */}
      {intentData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.44 }} style={CARD}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Top Call Intents</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '18px' }}>What leads are talking about most</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={intentData} layout="vertical" barSize={18}>
              <XAxis type="number" stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey="value" fill="#a78bfa" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  )
}

function Empty() {
  return (
    <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '12px' }}>
      <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>No data yet — make calls to see analytics</p>
    </div>
  )
}
