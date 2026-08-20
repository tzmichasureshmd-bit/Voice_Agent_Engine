import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Bot, Phone, Users, TrendingUp, Flame, Snowflake, Sun, Clock, Activity, Zap, Wallet } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import api from '../api'

export default function Dashboard() {
  const [stats,   setStats]   = useState({ total_leads:0, hot_leads:0, warm_leads:0, cold_leads:0, total_calls:0, conversion_rate:'0%' })
  const [calls,   setCalls]   = useState([])
  const [loading, setLoading] = useState(true)
  const [activeEmployees, setActiveEmployees] = useState(0)
  const [timePeriod, setTimePeriod] = useState(7)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {}),
      api.get('/calls').then(r => setCalls(r.data.calls || [])).catch(() => {}),
      api.get('/ai-employees').then(r => setActiveEmployees((r.data.employees || []).filter(e => e.status === 'active').length)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const weekMap = {}
  days.forEach(d => { weekMap[d] = { day: d, calls: 0, qualified: 0 } })
  calls.forEach(c => {
    const d = days[new Date(c.created_at).getDay()]
    if (weekMap[d]) { weekMap[d].calls += 1; if (c.category === 'hot' || c.category === 'warm') weekMap[d].qualified += 1 }
  })
  const weekData = days.map(d => weekMap[d])

  const categoryData = [
    { name: 'Hot',  value: stats.hot_leads,  color: '#f87171' },
    { name: 'Warm', value: stats.warm_leads, color: '#fbbf24' },
    { name: 'Cold', value: stats.cold_leads, color: '#60a5fa' },
  ]

  const recentCalls = calls.slice(0, 6)

  const totalMinutes = calls.reduce((s, c) => s + Math.round((c.duration_seconds || 0) / 60), 0)
  const connected = calls.filter(c => c.call_status === 'completed').length
  const connectRate = calls.length ? ((connected / calls.length) * 100).toFixed(1) : '0.0'
  const avgDur = calls.length ? Math.round(calls.reduce((s,c) => s + (c.duration_seconds||0), 0) / calls.length) : 0

  const workforce = [
    { label: 'TOTAL CALLS',    value: stats.total_calls,  icon: Phone,      color: '#a78bfa', glow: '124,58,237', sub: `Last ${timePeriod} days` },
    { label: 'CONNECT RATE',   value: connectRate + '%',  icon: TrendingUp, color: '#06b6d4', glow: '6,182,212',  sub: `${connected} connected` },
    { label: 'MINUTES USED',   value: totalMinutes,       icon: Clock,      color: '#10b981', glow: '16,185,129', sub: `Avg ${avgDur}s per call` },
    { label: 'WALLET BALANCE', value: '$4,500',            icon: Activity,   color: '#fbbf24', glow: '251,191,36', sub: '$0 spent in 7d' },
  ]

  return (
    <div>
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.8px', lineHeight: 1.1, color: '#f0f0f8' }}>
              Good {getGreeting()}, {getFirstName()}
            </h1>
            <p style={{ fontSize: '13px', color: '#55556a', marginTop: '6px' }}>
              {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} · Here's how your voice operations are performing.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '4px', background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '10px', padding: '4px' }}>
            {[7,14,30].map(d => (
              <button key={d} onClick={() => setTimePeriod(d)} style={{
                padding: '5px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                background: timePeriod === d ? '#7c3aed' : 'transparent',
                color: timePeriod === d ? '#fff' : '#55556a',
                transition: 'all 0.15s',
              }}>{d}d</button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {workforce.map((m, i) => (
          <motion.div key={m.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{
              background: '#0e0e1a', border: `1px solid rgba(${m.glow},0.15)`,
              borderRadius: '16px', padding: '20px',
              boxShadow: `0 0 0 1px rgba(${m.glow},0.06)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: `rgba(${m.glow},0.15)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <m.icon size={16} color={m.color} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{m.label}</span>
              </div>
              <span style={{ fontSize: '18px', color: '#1e1e30' }}>—</span>
            </div>
            <p style={{ fontSize: '30px', fontWeight: '900', color: '#f0f0f8', letterSpacing: '-1px', lineHeight: 1 }}>{m.value}</p>
            <p style={{ fontSize: '11px', color: '#33334a', marginTop: '6px' }}>{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── TZMICHA ENGINE STATUS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
        style={{
          background: '#0e0e1a',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: '14px', padding: '14px 22px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
          boxShadow: '0 0 0 1px rgba(124,58,237,0.06), 0 0 40px rgba(124,58,237,0.04)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={14} color="#a78bfa" />
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1.5px' }}>TZMICHA ENGINE</span>
          <span style={{ fontSize: '10px', color: '#33334a', fontWeight: '500' }}>100% Own · Zero Cost · Zero API</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            { label: 'Edge TTS',    sub: 'Voice Engine',   color: '#a78bfa' },
            { label: 'Whisper',     sub: 'Speech-to-Text', color: '#06b6d4' },
            { label: 'Groq LLaMA', sub: 'AI Brain',        color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#f0f0f8' }}>{s.label}</p>
                <p style={{ fontSize: '9px', color: '#33334a' }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {/* Performance chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }}
          style={{ background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '18px', padding: '24px', boxShadow: '0 0 0 1px rgba(124,58,237,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f8' }}>Conversation Performance</h3>
              <p style={{ fontSize: '11px', color: '#33334a', marginTop: '3px' }}>Weekly calls vs qualified leads</p>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[{ color: '#06b6d4', label: 'Calls' }, { color: '#10b981', label: 'Qualified' }].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#55556a' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, display: 'inline-block' }} />{l.label}
                </span>
              ))}
            </div>
          </div>
          {calls.length === 0 ? <EmptyChart message="Make your first call to see data" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weekData}>
                <defs>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} /><stop offset="100%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gQ" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.2}  /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#1e1e30" tick={{ fill: '#33334a', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#1e1e30" tick={{ fill: '#33334a', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '10px', fontSize: '12px', color: '#f0f0f8' }} />
                <Area type="monotone" dataKey="calls"     stroke="#06b6d4" strokeWidth={2} fill="url(#gC)" />
                <Area type="monotone" dataKey="qualified" stroke="#10b981" strokeWidth={2} fill="url(#gQ)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Lead Pipeline */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '18px', padding: '24px', boxShadow: '0 0 0 1px rgba(124,58,237,0.04)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f8', marginBottom: '4px' }}>Lead Pipeline</h3>
          <p style={{ fontSize: '11px', color: '#33334a', marginBottom: '20px' }}>Qualification breakdown</p>
          {stats.total_leads === 0 ? <EmptyChart message="Add leads to see pipeline" /> : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={categoryData} barSize={32}>
                  <XAxis dataKey="name" stroke="#1e1e30" tick={{ fill: '#33334a', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#1e1e30" tick={{ fill: '#33334a', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '10px', fontSize: '12px', color: '#f0f0f8' }} />
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                {[
                  { icon: Flame,     label: 'Hot',  value: stats.hot_leads,  color: '#f87171', glow: '239,68,68'   },
                  { icon: Sun,       label: 'Warm', value: stats.warm_leads, color: '#fbbf24', glow: '251,191,36'  },
                  { icon: Snowflake, label: 'Cold', value: stats.cold_leads, color: '#60a5fa', glow: '96,165,250'  },
                ].map(s => (
                  <div key={s.label} style={{
                    flex: 1, padding: '10px', borderRadius: '10px',
                    background: `rgba(${s.glow},0.07)`,
                    border: `1px solid rgba(${s.glow},0.15)`,
                    textAlign: 'center',
                  }}>
                    <s.icon size={13} color={s.color} style={{ margin: '0 auto 4px' }} />
                    <p style={{ fontSize: '18px', fontWeight: '800', color: '#f0f0f8' }}>{s.value}</p>
                    <p style={{ fontSize: '10px', color: '#33334a' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── Recent Activity ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.44 }}
        style={{ background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '18px', padding: '24px', boxShadow: '0 0 0 1px rgba(124,58,237,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f8' }}>Recent Activity</h3>
            <p style={{ fontSize: '11px', color: '#33334a', marginTop: '3px' }}>Latest AI conversations</p>
          </div>
          <Activity size={14} color="#1e1e30" />
        </div>

        {recentCalls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Phone size={24} style={{ color: '#1e1e30', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '13px', color: '#33334a' }}>No activity yet</p>
            <p style={{ fontSize: '11px', color: '#1e1e30', marginTop: '4px' }}>Use the Simulator to make your first AI call</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {recentCalls.map((call, i) => (
              <motion.div key={call.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 12px', borderRadius: '12px', cursor: 'default', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '800', color: '#a78bfa',
                  }}>{call.lead_name?.[0] || '?'}</div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#f0f0f8' }}>{call.lead_name}</p>
                    <p style={{ fontSize: '11px', color: '#33334a' }}>
                      {call.summary ? call.summary.slice(0, 52) + (call.summary.length > 52 ? '…' : '') : `${call.sentiment} · ${call.duration_seconds}s`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#33334a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={10} />{call.duration_seconds}s
                  </span>
                  <CategoryBadge cat={call.category} />
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#f0f0f8', minWidth: '32px', textAlign: 'right' }}>{call.lead_score}/10</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

function CategoryBadge({ cat }) {
  const map = { hot: ['#f87171','rgba(248,113,113,0.1)'], warm: ['#fbbf24','rgba(251,191,36,0.1)'], cold: ['#60a5fa','rgba(96,165,250,0.1)'] }
  const [color, bg] = map[cat] || ['#9ca3af','rgba(156,163,175,0.1)']
  return (
    <span style={{ fontSize: '10px', fontWeight: '700', color, background: bg, padding: '3px 9px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {cat}
    </span>
  )
}

function EmptyChart({ message }) {
  return (
    <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #1e1e30', borderRadius: '12px' }}>
      <p style={{ fontSize: '12px', color: '#33334a', textAlign: 'center' }}>{message}</p>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'; if (h < 17) return 'afternoon'; return 'evening'
}

function getFirstName() {
  try { const d = JSON.parse(localStorage.getItem('client_data') || '{}'); return (d.contact_name || d.company_name || 'there').split(' ')[0] } catch { return 'there' }
}
