import { motion } from 'framer-motion'
import { Calendar, Plus, Clock, Phone, User, Bot, Globe } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../api'

const TYPE_COLORS = {
  callback:   ['#a78bfa', 'rgba(124,58,237,0.1)'],
  demo:       ['#34d399', 'rgba(16,185,129,0.1)'],
  'follow-up':['#fbbf24', 'rgba(251,191,36,0.1)'],
}

export default function Appointments() {
  const [view, setView] = useState('list')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    setLoading(true)
    try {
      const r = await api.get('/appointments')
      if (r.data?.appointments) setAppointments(r.data.appointments)
    } catch {}
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status?status=${status}`)
      loadAppointments()
    } catch {}
  }

  const deleteAppt = async (id) => {
    if (!confirm('Delete this appointment?')) return
    try {
      await api.delete(`/appointments/${id}`)
      loadAppointments()
    } catch {}
  }

  const stats = {
    total: appointments.length,
    today: appointments.filter(a => a.date === 'Today').length,
    tomorrow: appointments.filter(a => a.date === 'Tomorrow').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#f0f0f8' }}>Appointments</h1>
          <p style={{ fontSize: '13px', color: '#55556a', marginTop: '4px' }}>
            Bookings captured by your AI agents, website widget or added by hand — in one calendar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '10px', padding: '3px' }}>
            {['list', 'calendar'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: '600', textTransform: 'capitalize',
                background: view === v ? '#7c3aed' : 'transparent',
                color: view === v ? '#fff' : '#55556a',
              }}>{v}</button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ gap: '6px' }}>
            <Plus size={14} /> New appointment
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total',     value: stats.total, color: '#a78bfa', glow: '124,58,237' },
          { label: 'Today',     value: stats.today, color: '#34d399', glow: '16,185,129' },
          { label: 'Tomorrow',  value: stats.tomorrow, color: '#fbbf24', glow: '251,191,36' },
          { label: 'Completed', value: stats.completed, color: '#60a5fa', glow: '96,165,250' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: '#0e0e1a', border: `1px solid rgba(${s.glow},0.15)`, borderRadius: '14px', padding: '18px' }}>
            <p style={{ fontSize: '28px', fontWeight: '900', color: '#f0f0f8' }}>{s.value}</p>
            <p style={{ fontSize: '12px', color: '#55556a', marginTop: '4px' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Appointments list */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        style={{ background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e30', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f8' }}>Upcoming appointments</h3>
          <span style={{ fontSize: '11px', color: '#55556a' }}>{appointments.length} total</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#55556a' }}>Loading...</div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#55556a' }}>No appointments yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1e30' }}>
                {['Contact', 'Date & Time', 'Agent', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#33334a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt, i) => {
                const [tc, bg] = TYPE_COLORS[apt.type] || ['#9ca3af', 'rgba(156,163,175,0.1)']
                return (
                  <tr key={apt.id} style={{ borderBottom: '1px solid #0a0a14', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={14} color="#a78bfa" />
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: '#f0f0f8' }}>{apt.lead_name || apt.name}</p>
                          <p style={{ fontSize: '11px', color: '#55556a' }}>{apt.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} color="#55556a" />
                        <span style={{ fontSize: '12px', color: '#f0f0f8' }}>{apt.date}</span>
                        <span style={{ fontSize: '12px', color: '#55556a' }}>{apt.time}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bot size={12} color="#a78bfa" />
                        <span style={{ fontSize: '12px', color: '#f0f0f8' }}>{apt.agent}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: tc, background: bg, padding: '3px 10px', borderRadius: '999px', textTransform: 'capitalize' }}>
                        {apt.type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', background: apt.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)', color: apt.status === 'completed' ? '#10b981' : '#fbbf24' }}>
                        {apt.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '11px', gap: '4px' }}>
                          <Phone size={11} /> Call
                        </button>
                        <button onClick={() => updateStatus(apt.id, apt.status === 'completed' ? 'upcoming' : 'completed')} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '11px' }}>
                          {apt.status === 'completed' ? 'Undo' : 'Complete'}
                        </button>
                        <button onClick={() => deleteAppt(apt.id)} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '11px', color: '#f87171' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  )
}
