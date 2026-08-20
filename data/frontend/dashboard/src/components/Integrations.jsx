import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link2, CheckCircle2, RefreshCw, ExternalLink, Zap, Webhook, Copy, Eye, EyeOff } from 'lucide-react'
import api from '../api'

const CRM_URL = 'https://crm.tzmicha.com'
const CRM_API = 'https://api.tzmicha.com/api'

const card = {
  background: '#0e0e1a',
  border: '1px solid #1e1e30',
  borderRadius: '16px',
  padding: '24px',
}

export default function Integrations() {
  const [crmStatus, setCrmStatus]     = useState('idle') // idle | checking | connected | error
  const [crmToken, setCrmToken]       = useState(localStorage.getItem('crm_token') || '')
  const [showToken, setShowToken]     = useState(false)
  const [crmInfo, setCrmInfo]         = useState(null)
  const [syncLog, setSyncLog]         = useState([])
  const [syncing, setSyncing]         = useState(false)
  const [webhookUrl]                  = useState(`${window.location.origin}/api/webhook/crm`)
  const [copied, setCopied]           = useState(false)
  const [lastSync, setLastSync]       = useState(localStorage.getItem('crm_last_sync') || null)

  // Auto-check if token exists
  useEffect(() => {
    if (crmToken) checkCrmConnection(crmToken)
  }, [])

  const checkCrmConnection = async (token) => {
    setCrmStatus('checking')
    try {
      const res = await fetch(`${CRM_API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCrmInfo(data.data || data)
        setCrmStatus('connected')
        localStorage.setItem('crm_token', token)
      } else {
        setCrmStatus('error')
      }
    } catch {
      setCrmStatus('error')
    }
  }

  const handleConnect = () => checkCrmConnection(crmToken)

  const handleDisconnect = () => {
    localStorage.removeItem('crm_token')
    setCrmToken('')
    setCrmStatus('idle')
    setCrmInfo(null)
    setSyncLog([])
  }

  const handleSyncLeads = async () => {
    if (crmStatus !== 'connected') return
    setSyncing(true)
    setSyncLog([])
    try {
      const leadsData = await api.get('/leads').then(r => r.data)
      const leads = leadsData.leads || []

      let pushed = 0, failed = 0
      for (const lead of leads) {
        try {
          await fetch(`${CRM_API}/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${crmToken}` },
            body: JSON.stringify({
              name: lead.name,
              phone: lead.phone,
              email: lead.email || '',
              status: lead.category === 'hot' ? 'hot' : lead.category === 'warm' ? 'warm' : 'cold',
              source: 'AI Voice Engine',
              notes: lead.notes || '',
            })
          })
          pushed++
          setSyncLog(p => [...p, { type: 'success', msg: `✅ Synced: ${lead.name}` }])
        } catch {
          failed++
          setSyncLog(p => [...p, { type: 'error', msg: `❌ Failed: ${lead.name}` }])
        }
      }

      const now = new Date().toLocaleString()
      setLastSync(now)
      localStorage.setItem('crm_last_sync', now)
      setSyncLog(p => [...p, { type: 'info', msg: `🎯 Done: ${pushed} synced, ${failed} failed` }])
    } catch {
      setSyncLog([{ type: 'error', msg: '❌ Could not reach AI Voice Engine backend' }])
    }
    setSyncing(false)
  }

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#f0f0f8', letterSpacing: '-0.6px' }}>Integrations</h1>
        <p style={{ fontSize: '13px', color: '#55556a', marginTop: '4px' }}>Connect your tools and sync data across platforms</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>

        {/* ── Tzmicha CRM Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ ...card, border: crmStatus === 'connected' ? '1px solid rgba(16,185,129,0.3)' : '1px solid #1e1e30' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} color="white" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '800', color: '#f0f0f8' }}>Tzmicha CRM</p>
                <a href={CRM_URL} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#55556a', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                  crm.tzmicha.com <ExternalLink size={10} />
                </a>
              </div>
            </div>
            <StatusBadge status={crmStatus} />
          </div>

          {crmStatus === 'connected' && crmInfo ? (
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', marginBottom: '8px' }}>✅ Connected as</p>
              <p style={{ fontSize: '13px', color: '#f0f0f8', fontWeight: '600' }}>{crmInfo.name || crmInfo.email || 'CRM User'}</p>
              <p style={{ fontSize: '11px', color: '#55556a' }}>{crmInfo.email || ''}</p>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#55556a', marginBottom: '8px' }}>Enter your Tzmicha CRM API token</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={crmToken}
                    onChange={e => setCrmToken(e.target.value)}
                    placeholder="Bearer token from CRM settings..."
                    style={{
                      width: '100%', padding: '10px 36px 10px 12px', borderRadius: '10px',
                      background: '#0a0a14', border: '1px solid #1e1e30',
                      color: '#f0f0f8', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button onClick={() => setShowToken(!showToken)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#55556a' }}>
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '10px', color: '#33334a', marginTop: '6px' }}>
                Get token: CRM → Settings → API Keys → Generate Token
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {crmStatus !== 'connected' ? (
              <button onClick={handleConnect} disabled={!crmToken || crmStatus === 'checking'}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', border: 'none', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {crmStatus === 'checking' ? <><RefreshCw size={13} className="spin" /> Connecting...</> : <><Link2 size={13} /> Connect CRM</>}
              </button>
            ) : (
              <>
                <button onClick={handleSyncLeads} disabled={syncing}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {syncing ? <><RefreshCw size={13} className="spin" /> Syncing...</> : <><RefreshCw size={13} /> Sync Leads</>}
                </button>
                <button onClick={handleDisconnect}
                  style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  Disconnect
                </button>
              </>
            )}
          </div>

          {lastSync && (
            <p style={{ fontSize: '10px', color: '#33334a', marginTop: '10px' }}>Last sync: {lastSync}</p>
          )}

          {/* Sync Log */}
          {syncLog.length > 0 && (
            <div style={{ marginTop: '14px', background: '#0a0a14', border: '1px solid #1e1e30', borderRadius: '10px', padding: '12px', maxHeight: '140px', overflowY: 'auto' }}>
              {syncLog.map((l, i) => (
                <p key={i} style={{ fontSize: '11px', color: l.type === 'success' ? '#10b981' : l.type === 'error' ? '#f87171' : '#a78bfa', marginBottom: '3px', fontFamily: 'monospace' }}>{l.msg}</p>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Right Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Webhook */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Webhook size={16} color="#fbbf24" />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#f0f0f8' }}>Webhook</p>
                <p style={{ fontSize: '10px', color: '#55556a' }}>Receive CRM events</p>
              </div>
            </div>
            <div style={{ background: '#0a0a14', border: '1px solid #1e1e30', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <p style={{ fontSize: '10px', color: '#55556a', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{webhookUrl}</p>
              <button onClick={copyWebhook} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : '#55556a', flexShrink: 0 }}>
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <p style={{ fontSize: '10px', color: '#33334a', marginTop: '8px' }}>Paste this URL in CRM → Settings → Webhooks</p>
          </motion.div>

          {/* Coming Soon integrations */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={card}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Coming Soon</p>
            {[
              { name: 'Zapier',    icon: '⚡', desc: 'Automate workflows' },
              { name: 'Slack',     icon: '💬', desc: 'Call notifications' },
              { name: 'WhatsApp',  icon: '📱', desc: 'Message leads' },
              { name: 'Google Sheets', icon: '📊', desc: 'Export data' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < 3 ? '1px solid #0e0e1a' : 'none' }}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#f0f0f8' }}>{item.name}</p>
                  <p style={{ fontSize: '10px', color: '#33334a' }}>{item.desc}</p>
                </div>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#33334a', background: '#0a0a14', padding: '3px 8px', borderRadius: '999px', border: '1px solid #1e1e30' }}>SOON</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite } @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    idle:       { color: '#55556a', bg: 'rgba(85,85,106,0.1)',   label: 'Not Connected' },
    checking:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  label: 'Checking...' },
    connected:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Connected' },
    error:      { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Auth Failed' },
  }
  const s = map[status]
  return (
    <span style={{ fontSize: '11px', fontWeight: '700', color: s.color, background: s.bg, padding: '4px 10px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}
