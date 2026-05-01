// app/analyst/transactions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import {
  Zap,
  Brain,
  Activity,
  Smartphone,
  BarChart2,
  Network,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  KeyRound,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';

interface ScoringResult {
  pre_txn_id: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  score: number;
  decision: 'approve' | 'mfa' | 'manual_review' | 'block';
  reason_codes: string[];
  amount_anomaly: number;
  behavioral_mismatch: number;
  device_mismatch: boolean;
  time_anomaly: number;
  beneficiary_risk: number;
  graph_risk: number;
  explanation: string | null;
  scored_at: string;
}

const DECISION_CFG = {
  approve: {
    label: 'APPROVED',
    color: 'var(--risk-low)',
    bg: 'rgba(22,163,74,0.10)',
    border: 'rgba(22,163,74,0.30)',
    icon: CheckCircle2,
    desc: 'Transaction passes all risk checks. Proceeding.',
  },
  mfa: {
    label: 'STEP-UP MFA',
    color: 'var(--risk-medium)',
    bg: 'rgba(217,119,6,0.10)',
    border: 'rgba(217,119,6,0.30)',
    icon: KeyRound,
    desc: 'Elevated risk detected. Additional authentication required.',
  },
  manual_review: {
    label: 'MANUAL REVIEW',
    color: 'var(--risk-high)',
    bg: 'rgba(234,88,12,0.10)',
    border: 'rgba(234,88,12,0.30)',
    icon: AlertTriangle,
    desc: 'High risk signals detected. Routed to analyst queue.',
  },
  block: {
    label: 'BLOCKED',
    color: 'var(--risk-critical)',
    bg: 'rgba(220,38,38,0.12)',
    border: 'rgba(220,38,38,0.25)',
    icon: XCircle,
    desc: 'Transaction blocked. Risk score exceeds fraud threshold.',
  },
};

const SCENARIOS = [
  { id: 0, icon: CheckCircle2, name: 'Normal transfer', expected: 'APPROVE', expectedColor: 'var(--risk-low)', from: 'ACC-003', to: 'ACC-001', amount: '15000', txn: 'UPI', device: 'true' },
  { id: 1, icon: AlertTriangle, name: 'Large unusual', expected: 'REVIEW', expectedColor: 'var(--risk-high)', from: 'ACC-004', to: 'ACC-012', amount: '980000', txn: 'IMPS', device: 'false' },
  { id: 2, icon: XCircle, name: 'Mule network', expected: 'BLOCK', expectedColor: 'var(--risk-critical)', from: 'ACC-010', to: 'ACC-016', amount: '499000', txn: 'NEFT', device: 'false' },
  { id: 3, icon: KeyRound, name: 'ATO attempt', expected: 'MFA', expectedColor: 'var(--risk-medium)', from: 'ACC-004', to: 'ACC-015', amount: '250000', txn: 'RTGS', device: 'false' },
];

const SIGNALS = [
  { key: 'behavioral_mismatch', label: 'Behavioral Mismatch', max: 15 },
  { key: 'device_risk', label: 'Device Risk', max: 15, derived: true },
  { key: 'amount_anomaly', label: 'Amount Anomaly', max: 25 },
  { key: 'time_anomaly', label: 'Time Anomaly', max: 15 },
  { key: 'beneficiary_risk', label: 'Beneficiary Risk', max: 20 },
  { key: 'graph_risk', label: 'Graph Risk', max: 25 },
];

function signalColor(pct: number) {
  if (pct >= 80) return 'var(--risk-critical)';
  if (pct >= 55) return 'var(--risk-high)';
  if (pct >= 30) return 'var(--risk-medium)';
  return 'var(--risk-low)';
}

function fmtIN(n: number) {
  return 'Rs.' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; }
      else clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  return <span>{displayed}{displayed.length < text.length && <span style={{ opacity: 1 }}>|</span>}</span>;
}

function RiskRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? 'var(--risk-critical)' : score >= 60 ? 'var(--risk-high)' : score >= 30 ? 'var(--risk-medium)' : 'var(--risk-low)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-dim)" strokeWidth={size >= 64 ? 4 : 3} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={size >= 64 ? 4 : 3}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1)', filter: score >= 80 ? 'drop-shadow(0 0 4px var(--risk-critical))' : 'none' }}
      />
    </svg>
  );
}

function StyledSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', appearance: 'none', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '10px 36px 10px 14px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer', outline: 'none' }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
      >
        {options.map(o => <option key={o.value} value={o.value} style={{ background: 'var(--bg-elevated)' }}>{o.label}</option>)}
      </select>
      <ChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)', pointerEvents: 'none' }} />
    </div>
  );
}

function PipelineIdle() {
  const nodes = [
    { icon: Activity, label: 'Behavioral' },
    { icon: Smartphone, label: 'Device' },
    { icon: BarChart2, label: 'Amount' },
    { icon: Network, label: 'Network' },
    { icon: ShieldCheck, label: 'Decision' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, padding: '64px 32px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {nodes.map((n, i) => (
          <div key={n.label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <n.icon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{n.label}</span>
            </div>
            {i < nodes.length - 1 && (
              <div style={{ position: 'relative', width: 52, height: 2, margin: '0 0 20px 0' }}>
                <div style={{ width: '100%', height: '100%', borderTop: '2px dashed var(--border-default)' }} />
                <div style={{ position: 'absolute', top: -2.5, left: 0, width: 5, height: 5, borderRadius: '50%', background: 'var(--brand)', boxShadow: '0 0 6px var(--brand)', animation: `dot${i} 2s ease-in-out ${i * 0.4}s infinite` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
        Submit a transaction to see real-time scoring
      </p>
      <style>{`
        @keyframes dot0{0%,100%{transform:translateX(0);opacity:0}10%{opacity:1}90%{opacity:1;transform:translateX(44px)}100%{opacity:0}}
        @keyframes dot1{0%,100%{transform:translateX(0);opacity:0}10%{opacity:1}90%{opacity:1;transform:translateX(44px)}100%{opacity:0}}
        @keyframes dot2{0%,100%{transform:translateX(0);opacity:0}10%{opacity:1}90%{opacity:1;transform:translateX(44px)}100%{opacity:0}}
        @keyframes dot3{0%,100%{transform:translateX(0);opacity:0}10%{opacity:1}90%{opacity:1;transform:translateX(44px)}100%{opacity:0}}
      `}</style>
    </div>
  );
}

export default function TransactionScorerPage() {
  const [form, setForm] = useState({ from_account: 'ACC-001', to_account: 'ACC-012', amount: '50000', txn_type: 'UPI', channel: 'mobile', device_known: 'true' });
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyScenario = (s: typeof SCENARIOS[number]) => {
    setSelectedScenario(s.id);
    setForm(f => ({ ...f, from_account: s.from, to_account: s.to, amount: s.amount, txn_type: s.txn, device_known: s.device }));
    setResult(null); setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setResult(null); setError(null);
    try {
      const data = await api.scorePreTransaction({
        from_account: form.from_account, to_account: form.to_account,
        amount: parseFloat(form.amount), txn_type: form.txn_type,
        channel: form.channel, device_known: form.device_known === 'true',
      });
      setResult(data as ScoringResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scoring failed — ensure the API is running.');
    } finally { setLoading(false); }
  };

  const cfg = result ? DECISION_CFG[result.decision] : null;

  return (
    <>
      <Header title="Transaction Scorer" />
      <div style={{ padding: '20px 24px', background: 'var(--bg-void)', minHeight: 'calc(100vh - 52px)' }}>

        {/* Banner */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(37,99,235,0.06)', border: '1px solid var(--border-dim)', borderLeft: '3px solid var(--brand)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          <Zap style={{ width: 16, height: 16, color: 'var(--brand-light)', marginTop: 2, flexShrink: 0 }} />
          <div>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--brand-light)' }}>Pre-Transaction Real-Time Decisioning</span>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
              Scores a transaction <strong style={{ color: 'var(--text-primary)' }}>before it executes</strong> — same pipeline powering the GPay mock. Decisions: Approve → MFA → Manual Review → Block.
            </p>
          </div>
        </div>

        {/* Two-column */}
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 16, alignItems: 'start' }}>

          {/* LEFT */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)' }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Score a Transaction</h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Enter parameters or select a quick scenario</p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {/* Quick scenarios */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Quick Scenarios</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {SCENARIOS.map(s => (
                    <button key={s.id} onClick={() => applyScenario(s)} style={{
                      display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 6,
                      cursor: 'pointer', textAlign: 'left', minHeight: 52, transition: 'border-color 0.15s, background 0.15s',
                      border: `1px solid ${selectedScenario === s.id ? 'var(--brand)' : 'var(--border-default)'}`,
                      background: selectedScenario === s.id ? 'var(--brand-glow)' : 'var(--bg-elevated)',
                    }}
                    onMouseEnter={e => { if (selectedScenario !== s.id) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-glow)'; } }}
                    onMouseLeave={e => { if (selectedScenario !== s.id) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; } }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <s.icon style={{ width: 12, height: 12, color: s.expectedColor }} />
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 600, color: s.expectedColor, background: `${s.expectedColor}18`, border: `1px solid ${s.expectedColor}40`, borderRadius: 3, padding: '1px 5px' }}>{s.expected}</span>
                      </div>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[{ label: 'From Account', key: 'from_account' }, { label: 'To Account', key: 'to_account' }].map(f => (
                      <div key={f.key}>
                        <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                        <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} required
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '10px 14px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, outline: 'none' }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }} onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                          placeholder={f.key === 'from_account' ? 'ACC-001' : 'ACC-012'}
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Amount</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)', pointerEvents: 'none' }}>Rs.</span>
                      <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} min="1" required
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '10px 14px 10px 38px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, outline: 'none' }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }} onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Transaction Type</label>
                      <StyledSelect value={form.txn_type} onChange={v => setForm(p => ({ ...p, txn_type: v }))} options={[{value:'UPI',label:'UPI'},{value:'IMPS',label:'IMPS'},{value:'NEFT',label:'NEFT'},{value:'RTGS',label:'RTGS'},{value:'SWIFT',label:'SWIFT'}]} />
                    </div>
                    <div>
                      <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Channel</label>
                      <StyledSelect value={form.channel} onChange={v => setForm(p => ({ ...p, channel: v }))} options={[{value:'mobile',label:'Mobile App'},{value:'internet_banking',label:'Net Banking'},{value:'branch',label:'Branch'},{value:'api',label:'API'}]} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Device Status</label>
                    <StyledSelect value={form.device_known} onChange={v => setForm(p => ({ ...p, device_known: v }))} options={[{value:'true',label:'Known / Trusted Device'},{value:'false',label:'Unknown / New Device'}]} />
                  </div>
                  <button type="submit" disabled={loading} style={{ width: '100%', height: 44, borderRadius: 6, background: loading ? 'rgba(37,99,235,0.5)' : 'var(--brand)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: '#fff', transition: 'background 0.15s' }}>
                    {loading ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />Scoring transaction...</> : <><Zap style={{ width: 16, height: 16 }} />Score Transaction</>}
                  </button>
                </div>
              </form>

              {error && (
                <div style={{ marginTop: 12, background: 'var(--risk-critical-bg)', border: '1px solid rgba(220,38,38,0.25)', borderLeft: '3px solid var(--risk-critical)', borderRadius: 6, padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--risk-critical)' }}>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-dim)', borderRadius: 8, minHeight: 480, display: 'flex', flexDirection: 'column' }}>
            {!result ? (
              <PipelineIdle />
            ) : cfg && (
              <div style={{ animation: 'slideIn 0.35s ease-out' }}>
                {/* Decision strip */}
                <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '8px 8px 0 0', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <cfg.icon style={{ width: 32, height: 32, color: cfg.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: cfg.color, lineHeight: 1.2, margin: 0 }}>{cfg.label}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{cfg.desc}</p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-mono)' }}>{result.from_account} → {result.to_account}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtIN(result.amount)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <div style={{ position: 'relative', width: 64, height: 64 }}>
                      <RiskRing score={result.score} size={64} />
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: cfg.color }}>{result.score.toFixed(0)}</span>
                    </div>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: 'var(--text-muted)' }}>risk score</span>
                  </div>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Signal breakdown */}
                  <div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Risk Signal Analysis</p>
                    {SIGNALS.map(sig => {
                      const raw = sig.key === 'device_risk' ? (result.device_mismatch ? sig.max : 0) : ((result[sig.key as keyof ScoringResult] as number) ?? 0);
                      const pct = Math.min(100, (raw / sig.max) * 100);
                      const color = signalColor(pct);
                      return (
                        <div key={sig.key} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 32 }}>
                          <span style={{ width: 140, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0, textAlign: 'right' }}>{sig.label}</span>
                          <div style={{ flex: 1, height: 6, background: 'var(--border-dim)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ width: 52, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-mono)', textAlign: 'right', flexShrink: 0 }}>{raw.toFixed(1)}/{sig.max}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI explanation */}
                  {result.explanation && (
                    <div style={{ background: 'rgba(37,99,235,0.06)', borderLeft: '3px solid var(--brand)', borderRadius: '0 6px 6px 0', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Brain style={{ width: 14, height: 14, color: 'var(--brand-light)' }} />
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--brand-light)' }}>AI Analysis</span>
                      </div>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                        <TypingText text={result.explanation} />
                      </p>
                    </div>
                  )}

                  {/* Reason codes */}
                  {result.reason_codes && result.reason_codes.length > 0 && (
                    <div>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Triggered Signals</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {result.reason_codes.map(rc => (
                          <span key={rc} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--risk-critical)', background: 'var(--risk-critical-bg)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 4, padding: '2px 8px' }}>{rc}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </>
  );
}

