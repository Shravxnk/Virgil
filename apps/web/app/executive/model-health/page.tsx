// app/executive/model-health/page.tsx
'use client';

import { Header } from '@/components/layout/header';
import { Cpu, BarChart3, Network, Brain, CheckCircle } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';

function CircularRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const sw = 5;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-dim)" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  );
}

const METRICS = [
  { label: 'ACCURACY', value: 93.4, color: 'var(--risk-low)', trend: '+0.2%' },
  { label: 'PRECISION', value: 91.2, color: 'var(--risk-low)', trend: '+0.1%' },
  { label: 'RECALL', value: 88.9, color: 'var(--risk-medium)', trend: '-0.3%' },
  { label: 'F1 SCORE', value: 90.0, color: 'var(--risk-low)', trend: '+0.2%' },
];

const RADAR_DATA = [
  { subject: 'Accuracy', A: 93.4, B: 91.2 },
  { subject: 'Precision', A: 91.2, B: 89.8 },
  { subject: 'Recall', A: 88.9, B: 91.2 },
  { subject: 'F1 Score', A: 90.0, B: 88.4 },
  { subject: 'ROC-AUC', A: 94.1, B: 92.8 },
  { subject: 'Coverage', A: 97.3, B: 95.1 },
];

const SIGNAL_IMPORTANCE = [
  { label: 'Amount Anomaly', pct: 24, top: true },
  { label: 'Behavioral Pattern', pct: 19, top: true },
  { label: 'Graph/Network', pct: 17, top: false },
  { label: 'Time Anomaly', pct: 14, top: false },
  { label: 'Device Trust', pct: 13, top: false },
  { label: 'Beneficiary Risk', pct: 10, top: false },
  { label: 'Channel Risk', pct: 3, top: false },
];

const ARCH_CARDS = [
  { icon: BarChart3, title: 'Rule-Based Scoring', desc: 'Deterministic, auditable, zero black box' },
  { icon: Network, title: 'Graph Analytics', desc: 'NetworkX fund-flow + circular transfer detection' },
  { icon: Brain, title: 'RAG + ChromaDB', desc: 'Semantic explanation and alert summarisation' },
  { icon: CheckCircle, title: 'Transparent Pipeline', desc: 'No proprietary ML — fully interpretable' },
];

export default function ModelHealthPage() {
  const dataDrift = 3.0;
  const driftColor = dataDrift > 10 ? 'var(--risk-critical)' : dataDrift > 5 ? 'var(--risk-medium)' : 'var(--risk-low)';

  return (
    <>
      <Header title="Model Health" />
      <div style={{ background: 'var(--bg-void)', minHeight: 'calc(100vh - 52px)', padding: '20px 24px' }}>

        {/* Hero panel */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--brand-glow)', border: '1px solid rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Cpu style={{ width: 24, height: 24, color: 'var(--brand-light)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Fraud Risk Scoring Engine</h2>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: 'var(--risk-low)', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.30)', borderRadius: 4, padding: '2px 8px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-low)', animation: 'livePulse 2s infinite', display: 'inline-block' }} />
                Operational
              </span>
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Rule-based + Graph Analytics + RAG pipeline. Scoring 250+ transactions per hour with full auditability.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-secondary)' }}>Next review: 15 Jun 2026</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: 'var(--risk-low)', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 4, padding: '2px 8px' }}>
              Data drift: {dataDrift}% within threshold
            </span>
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {METRICS.map(m => {
            const ringColor = m.value >= 90 ? 'var(--risk-low)' : m.value >= 80 ? 'var(--risk-medium)' : 'var(--risk-high)';
            const trendUp = m.trend.startsWith('+');
            return (
              <div key={m.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 8 }}>{m.label}</p>
                  <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 700, color: m.color, lineHeight: 1, marginBottom: 8 }}>{m.value.toFixed(1)}%</p>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: trendUp ? 'var(--risk-low)' : 'var(--risk-critical)', background: trendUp ? 'var(--risk-low-bg)' : 'var(--risk-critical-bg)', border: `1px solid ${trendUp ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`, borderRadius: 3, padding: '1px 6px' }}>
                    {m.trend} vs last month
                  </span>
                </div>
                <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                  <CircularRing pct={m.value} color={ringColor} size={56} />
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: ringColor }}>
                    {m.value.toFixed(0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main grid 50/50 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Radar */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Metric Balance</p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="var(--border-dim)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 12 }} labelStyle={{ color: 'var(--text-primary)' }} />
                <Radar name="This period" dataKey="A" stroke="var(--brand-light)" strokeWidth={2} fill="rgba(37,99,235,0.12)" />
                <Radar name="Last period" dataKey="B" stroke="rgba(37,99,235,0.35)" strokeWidth={1.5} fill="transparent" strokeDasharray="4 2" />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 2, background: 'var(--brand-light)', borderRadius: 1 }} />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--text-secondary)' }}>This period</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 2, background: 'rgba(37,99,235,0.35)', borderRadius: 1, borderTop: '1px dashed rgba(37,99,235,0.35)' }} />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>Last period</span>
              </div>
            </div>
          </div>

          {/* Signal importance */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Signal Importance</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SIGNAL_IMPORTANCE.map(s => {
                const gradient = s.top ? 'linear-gradient(90deg, var(--brand), rgba(37,99,235,0.4))' : s.pct > 10 ? 'linear-gradient(90deg, var(--risk-medium), transparent)' : 'linear-gradient(90deg, var(--border-bright), transparent)';
                return (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 120, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>{s.label}</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--border-dim)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${s.pct * 4}%`, height: '100%', background: gradient, borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ width: 36, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-mono)', textAlign: 'right', flexShrink: 0 }}>{s.pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom row — Data Drift + Architecture */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Data Drift */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Data Drift Monitor</p>
            <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: driftColor, marginBottom: 16 }}>{dataDrift}%</p>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <div style={{ height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--risk-low) 0%, var(--risk-low) 70%, var(--risk-medium) 70%, var(--risk-medium) 90%, var(--risk-critical) 90%)' }} />
              </div>
              {/* White indicator */}
              <div style={{
                position: 'absolute', top: -2, left: `${(dataDrift / 20) * 100}%`,
                width: 2, height: 16, background: '#fff', borderRadius: 1,
                boxShadow: '0 0 4px rgba(255,255,255,0.8)', transform: 'translateX(-50%)',
                transition: 'left 0.5s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'var(--risk-low)' }}>Safe 0-14%</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'var(--risk-medium)' }}>Watch 14-18%</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'var(--risk-critical)' }}>Alert 18%+</span>
            </div>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: 'var(--risk-low)', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 4, padding: '2px 10px' }}>
              Within safe threshold
            </span>
          </div>

          {/* Architecture */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Architecture Notes</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ARCH_CARDS.map(card => (
                <div key={card.title} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 6, padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <card.icon style={{ width: 16, height: 16, color: 'var(--brand-light)' }} />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{card.title}</span>
                  </div>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </>
  );
}

