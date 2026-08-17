import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { CreditCard, Zap, Crown, Building, Check } from 'lucide-react'
import api from '../api'

export default function Billing() {
  const [plans, setPlans] = useState([])
  const [usage, setUsage] = useState(null)
  const [currentPlan, setCurrentPlan] = useState('free')

  useEffect(() => {
    api.get('/billing/plans').then(r => setPlans(r.data.plans || [])).catch(() => {})
    api.get('/billing/usage').then(r => { setUsage(r.data); setCurrentPlan(r.data.plan) }).catch(() => {})
  }, [])

  const planIcons = { starter: Zap, growth: Crown, pro: Building, enterprise: Crown }
  const planColors = { starter: '#06b6d4', growth: '#8b5cf6', pro: '#f59e0b', enterprise: '#ef4444' }

  const handleUpgrade = (planId) => {
    alert(`Razorpay integration coming soon!\nPlan: ${planId}\nContact: support@tzmicha.com`)
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>Billing & Plans</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Manage your subscription and usage</p>
      </motion.div>

      {/* Usage Card */}
      {usage && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Current Usage</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>Plan: {usage.plan}</p>
            </div>
            <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>{usage.calls_used} <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '400' }}>/ {usage.calls_limit} calls</span></span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '4px', background: usage.percent_used > 80 ? '#ef4444' : '#06b6d4', width: `${Math.min(usage.percent_used, 100)}%`, transition: 'width 0.5s' }} />
          </div>
          <p style={{ fontSize: '11px', color: usage.percent_used > 80 ? '#f87171' : 'var(--text-muted)', marginTop: '8px' }}>{usage.percent_used}% used this month</p>
        </motion.div>
      )}

      {/* Plans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
        {plans.map((plan, i) => {
          const Icon = planIcons[plan.id] || Zap
          const color = planColors[plan.id] || '#06b6d4'
          const isCurrent = currentPlan === plan.id
          const isPopular = plan.id === 'growth'
          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="card" style={{ padding: '24px', position: 'relative', border: isCurrent ? `1px solid ${color}` : isPopular ? `1px solid ${color}50` : '1px solid var(--border)' }}>
              {isPopular && !isCurrent && (
                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: color, color: 'white', fontSize: '9px', fontWeight: '700', padding: '3px 10px', borderRadius: '10px' }}>POPULAR</div>
              )}
              {isCurrent && (
                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: color, color: 'white', fontSize: '9px', fontWeight: '700', padding: '3px 10px', borderRadius: '10px' }}>CURRENT</div>
              )}
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Icon size={16} color={color} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{plan.name}</h3>
              <p style={{ fontSize: '24px', fontWeight: '800', color, marginBottom: '4px' }}>₹{plan.price.toLocaleString()}<span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '400' }}>/mo</span></p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>{plan.calls.toLocaleString()} calls/month</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                {plan.features.map((f, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <Check size={11} color={color} /> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => !isCurrent && handleUpgrade(plan.id)} className="btn" style={{ width: '100%', justifyContent: 'center', fontSize: '12px', background: isCurrent ? 'transparent' : `linear-gradient(135deg, ${color}, ${color}cc)`, color: isCurrent ? 'var(--text-muted)' : 'white', border: isCurrent ? '1px solid var(--border)' : 'none', cursor: isCurrent ? 'default' : 'pointer' }}>
                {isCurrent ? 'Current Plan' : 'Upgrade'}
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Contact */}
      <div style={{ marginTop: '24px', padding: '16px 20px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Need a custom plan?</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Contact us for enterprise pricing and custom call volumes</p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: '12px' }} onClick={() => window.open('mailto:support@tzmicha.com')}>
          <CreditCard size={13} /> Contact Sales
        </button>
      </div>
    </div>
  )
}
