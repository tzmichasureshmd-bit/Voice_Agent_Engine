import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  Phone, Users, TrendingUp, Clock, Trophy, Star, Target,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, Timer, Activity, Medal
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid
} from 'recharts'
import api from '../api'

// ── helpers ──────────────────────────────────────────────
function fmtDuration(sec) {
  const s = Math.round(sec || 0)
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m === 0) return `${r}s`
  return `${m}m ${r}s`
}

function relativeDay(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(d); target.setHours(0, 0, 0, 0)
  const diff = Math.floor((today - target) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CARD = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '24px', boxShadow: 'var(--shadow-card)' }

export default function SalesMonitor() {
  const [calls, setCalls] = useState([])
  const [team, setTeam]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/calls').then(r => setCalls(r.data.calls || [])).catch(() => {}),
      api.get('/team').then(r => setTeam(r.data.team || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // ── This-week filter ──
  const now = new Date()
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const weekCalls = calls.filter(c => c.created_at && new Date(c.created_at) >= weekAgo)

  // ── Top-line KPIs ──
  const totalCalls = calls.length
  const connected  = calls.filter(c => c.call_status === 'completed' || c.call_status === 'transferred').length
  const missed     = calls.filter(c => ['failed', 'no-answer', 'busy'].includes(c.call_status)).length
  const totalTalkSec = calls.reduce((s, c) => s + (c.duration_seconds || 0), 0)
  const connectRate = totalCalls ? Math.round((connected / totalCalls) * 100) : 0

  // ── Opportunities (hot/warm leads with score) sorted by score ──
  const opportunities = [...calls]
    .filter(c => c.lead_score >= 4)
    .sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0))
    .slice(0, 8)

  const hotLeads = calls.filter(c => c.category === 'hot')

  // Connects buckets (how many calls per lead)
  const callsByLead = {}
  calls.forEach(c => {
    const key = c.lead_name || c.phone || 'Unknown'
    callsByLead[key] = (callsByLead[key] || 0) + 1
  })
  const connectsCounts = Object.values(callsByLead)
  const bucket2 = connectsCounts.filter(n => n >= 2).length
  const bucket3 = connectsCounts.filter(n => n >= 3).length
  const bucket5 = connectsCounts.filter(n => n >= 5).length
  const avgTalk = totalCalls ? totalTalkSec / totalCalls : 0

  // ── Team leaderboard (from call data — attribute AI + agents) ──
  // Since calls are made by the AI engine, we build a leaderboard by AI agent name if present,
  // otherwise show team members with their share. We use lead_name grouping fallback.
  const leaderboard = buildLeaderboard(calls, team)

  const topPerson = leaderboard[0]

  // ── Call outcome breakdown by day (incoming/outgoing/missed) ──
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const last2 = []
  for (let i = 1; i >= 0; i--) {
    const d = new Date(); d.setDate(now.getDate() - i)
    last2.push({ key: days[d.getDay()], date: d.toDateString() })
  }
  const outcomeData = last2.map(({ key, date }) => {
    const dayCalls = calls.filter(c => c.created_at && new Date(c.created_at).toDateString() === date)
    return {
      day: key,
      Incoming: dayCalls.filter(c => c.direction === 'inbound').length,
      Outgoing: dayCalls.filter(c => (c.direction || 'outbound') === 'outbound').length,
      Missed: dayCalls.filter(c => ['failed', 'no-answer', 'busy'].includes(c.call_status)).length,
    }
  })

  // ── Daily call metrics (last 7 days) ──
  const metrics7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(now.getDate() - i)
    const dayCalls = calls.filter(c => c.created_at && new Date(c.created_at).toDateString() === d.toDateString())
    metrics7.push({
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Total: dayCalls.length,
      Connected: dayCalls.filter(c => c.call_status === 'completed' || c.call_status === 'transferred').length,
      Missed: dayCalls.filter(c => ['failed', 'no-answer', 'busy'].includes(c.call_status)).length,
    })
  }

  // ── Duration distribution (donut) ──
  const durBuckets = [
    { name: '0-1 min',  value: calls.filter(c => (c.duration_seconds || 0) < 60).length,                                   color: '#60a5fa' },
    { name: '1-3 min',  value: calls.filter(c => (c.duration_seconds || 0) >= 60 && (c.duration_seconds || 0) < 180).length, color: '#fbbf24' },
    { name: '3-5 min',  value: calls.filter(c => (c.duration_seconds || 0) >= 180 && (c.duration_seconds || 0) < 300).length,color: '#10b981' },
    { name: '5+ min',   value: calls.filter(c => (c.duration_seconds || 0) >= 300).length,                                  color: '#f87171' },
  ].filter(b => b.value > 0)

  return (
    <div>
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} color="#a78bfa" />
          <h1 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.6px', color: 'var(--text-primary)' }}>Sales Monitor</h1>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
          Live call tracking, pipeline & team performance · powered by your AI Voice Engine
        </p>
      </motion.div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'TOTAL CALLS',  value: totalCalls,               icon: Phone,       color: '#a78bfa', glow: '124,58,237', sub: 'All time' },
          { label: 'CONNECTED',    value: `${connected} (${connectRate}%)`, icon: TrendingUp, color: '#10b981', glow: '16,185,129', sub: `${missed} missed` },
          { label: 'TALK TIME',    value: fmtDuration(totalTalkSec), icon: Clock,      color: '#06b6d4', glow: '6,182,212',  sub: `Avg ${fmtDuration(avgTalk)}` },
          { label: 'HOT LEADS',    value: hotLeads.length,          icon: Target,      color: '#f87171', glow: '239,68,68',  sub: 'Ready to close' },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: 'var(--bg-card)', border: `1px solid rgba(${m.glow},0.18)`, borderRadius: '16px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `rgba(${m.glow},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <m.icon size={15} color={m.color} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{m.label}</span>
            </div>
            <p style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>{m.value}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Row 1: Top Opportunities + Pipeline table ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '12px', marginBottom: '16px' }}>
        {/* Top Opportunities This Week */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Target size={15} color="#a78bfa" />
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Top Opportunities – This Week</h3>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '18px' }}>High-value opportunities with multiple connects</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: '2+ Connects', value: bucket2, icon: '🌿' },
              { label: '3+ Connects', value: bucket3, icon: '🔆' },
              { label: '5+ Connects', value: bucket5, icon: '⭐' },
              { label: 'Avg Talk Time', value: fmtDuration(avgTalk), icon: '⏱️' },
            ].map(b => (
              <div key={b.label} style={{ background: 'var(--bg-input, rgba(124,58,237,0.04))', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>{b.icon} {b.label}</p>
                <p style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)' }}>{b.value}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>Hot Leads</p>
          {hotLeads.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '16px 0' }}>No hot leads available</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {hotLeads.slice(0, 5).map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '9px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{l.lead_name}</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#f87171' }}>{l.lead_score}/10</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Opportunities Pipeline — Full table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }} style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <TrendingUp size={15} color="#06b6d4" />
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Opportunities Pipeline</h3>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '16px' }}>Ranked by lead score & engagement</p>

          {opportunities.length === 0 ? (
            <EmptyRow message="No opportunities yet — make calls to build your pipeline" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '8px 6px' }}>Lead</th>
                    <th style={{ padding: '8px 6px' }}>Connects</th>
                    <th style={{ padding: '8px 6px' }}>Talk Time</th>
                    <th style={{ padding: '8px 6px' }}>Last Contact</th>
                    <th style={{ padding: '8px 6px' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((o, i) => (
                    <tr key={o.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Star size={12} color={o.category === 'hot' ? '#10b981' : 'var(--text-dim)'} fill={o.category === 'hot' ? '#10b981' : 'none'} />
                          <div>
                            <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{o.lead_name}</p>
                            <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{o.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 6px', color: 'var(--text-muted)' }}>{callsByLead[o.lead_name || o.phone] || 1}x</td>
                      <td style={{ padding: '10px 6px', color: 'var(--text-muted)' }}>{fmtDuration(o.duration_seconds)}</td>
                      <td style={{ padding: '10px 6px', color: 'var(--text-muted)' }}>{relativeDay(o.created_at)}</td>
                      <td style={{ padding: '10px 6px' }}><CategoryBadge cat={o.category} score={o.lead_score} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Row 2: Top Salesperson + Team Leaderboard ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '12px', marginBottom: '16px' }}>
        {/* Top Salesperson */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Trophy size={15} color="#fbbf24" />
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Top Performer – This Week</h3>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '16px' }}>Highest calls & talk time</p>

          {!topPerson ? (
            <EmptyRow message="No performance data yet" />
          ) : (
            <>
              <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: '14px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-primary)' }}>{topPerson.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Rank #1 in team</p>
                </div>
                <span style={{ fontSize: '30px', fontWeight: '900', color: '#a78bfa' }}>{topPerson.calls}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Calls', value: topPerson.calls, icon: Phone, color: '#a78bfa' },
                  { label: 'Connected', value: `${topPerson.connected} (${topPerson.rate}%)`, icon: TrendingUp, color: '#10b981' },
                  { label: 'Talk Time', value: fmtDuration(topPerson.talkSec), icon: Clock, color: '#06b6d4' },
                  { label: 'Missed', value: topPerson.missed, icon: PhoneMissed, color: '#f87171' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-input, rgba(124,58,237,0.04))', border: '1px solid var(--border)', borderRadius: '11px', padding: '11px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                      <s.icon size={12} color={s.color} />
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.label}</span>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Team Leaderboard */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }} style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Medal size={15} color="#fbbf24" />
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Team Leaderboard</h3>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '16px' }}>All performers ranked by activity</p>

          {leaderboard.length === 0 ? (
            <EmptyRow message="No agents ranked yet" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '8px 6px' }}>Rank</th>
                  <th style={{ padding: '8px 6px' }}>Agent</th>
                  <th style={{ padding: '8px 6px' }}>Calls</th>
                  <th style={{ padding: '8px 6px' }}>Connected</th>
                  <th style={{ padding: '8px 6px' }}>Talk Time</th>
                  <th style={{ padding: '8px 6px' }}>Missed</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((a, i) => (
                  <tr key={a.name} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 6px' }}>
                      <span style={{ display: 'inline-flex', width: '22px', height: '22px', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800',
                        background: i === 0 ? 'rgba(251,191,36,0.15)' : 'var(--border)', color: i === 0 ? '#fbbf24' : 'var(--text-muted)' }}>{i + 1}</span>
                    </td>
                    <td style={{ padding: '10px 6px', fontWeight: '600', color: 'var(--text-primary)' }}>{a.name}</td>
                    <td style={{ padding: '10px 6px', color: 'var(--text-muted)' }}>{a.calls}</td>
                    <td style={{ padding: '10px 6px', color: '#10b981', fontWeight: '600' }}>{a.connected}</td>
                    <td style={{ padding: '10px 6px', color: 'var(--text-muted)' }}>{fmtDuration(a.talkSec)}</td>
                    <td style={{ padding: '10px 6px', color: a.missed ? '#f87171' : 'var(--text-dim)' }}>{a.missed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </div>

      {/* ── Row 3: Call Performance Insights ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }} style={{ ...CARD, marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Call Performance Insights</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Daily Call Metrics */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>📈 Daily Call Metrics</p>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '12px' }}>Last 7 days</p>
            {calls.length === 0 ? <EmptyChart message="No call data yet" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={metrics7}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-primary)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Connected" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Missed" stroke="#f87171" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Call Outcome Breakdown */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>📊 Call Outcome Breakdown</p>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '12px' }}>Recent days</p>
            {calls.length === 0 ? <EmptyChart message="No call data yet" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={outcomeData} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-primary)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Incoming" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Outgoing" stackId="a" fill="#fbbf24" />
                  <Bar dataKey="Missed" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Duration Distribution */}
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>⏱️ Duration Distribution</p>
          <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '12px' }}>All calls by length</p>
          {durBuckets.length === 0 ? <EmptyChart message="No call data yet" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={durBuckets} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {durBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Build leaderboard: attribute calls to team agents; fallback to AI Agent ──
function buildLeaderboard(calls, team) {
  const rows = {}

  // Seed with team members so they appear even with zero calls
  team.forEach(u => {
    rows[u.name] = { name: u.name, calls: 0, connected: 0, missed: 0, talkSec: 0 }
  })

  // Attribute each call. If the call log carries an agent field use it, else group under "AI Agent".
  calls.forEach(c => {
    const agent = c.agent || c.handled_by || 'AI Agent'
    if (!rows[agent]) rows[agent] = { name: agent, calls: 0, connected: 0, missed: 0, talkSec: 0 }
    rows[agent].calls += 1
    rows[agent].talkSec += (c.duration_seconds || 0)
    if (c.call_status === 'completed' || c.call_status === 'transferred') rows[agent].connected += 1
    if (['failed', 'no-answer', 'busy'].includes(c.call_status)) rows[agent].missed += 1
  })

  return Object.values(rows)
    .map(r => ({ ...r, rate: r.calls ? Math.round((r.connected / r.calls) * 100) : 0 }))
    .sort((a, b) => b.calls - a.calls || b.talkSec - a.talkSec)
}

function CategoryBadge({ cat, score }) {
  const map = { hot: ['#f87171', 'rgba(248,113,113,0.12)'], warm: ['#fbbf24', 'rgba(251,191,36,0.12)'], cold: ['#60a5fa', 'rgba(96,165,250,0.12)'] }
  const [color, bg] = map[cat] || ['#9ca3af', 'rgba(156,163,175,0.12)']
  return (
    <span style={{ fontSize: '10px', fontWeight: '800', color, background: bg, padding: '3px 9px', borderRadius: '999px' }}>
      {score != null ? `${score}/10` : (cat || '—').toUpperCase()}
    </span>
  )
}

function EmptyRow({ message }) {
  return (
    <div style={{ padding: '30px 0', textAlign: 'center' }}>
      <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{message}</p>
    </div>
  )
}

function EmptyChart({ message }) {
  return (
    <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '12px' }}>
      <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>{message}</p>
    </div>
  )
}
