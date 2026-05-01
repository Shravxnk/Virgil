// app/analyst/pre-txn-analytics/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';

interface PreTxnItem {
  id: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  txn_type: string;
  channel: string;
  risk_score: number;
  decision: 'approve' | 'mfa' | 'manual_review' | 'block' | 'pending';
  risk_signals?: {
    amount_anomaly?: number;
    time_anomaly?: number;
    device_mismatch?: boolean | number;
    beneficiary_risk?: number;
    graph_risk?: number;
    reason_codes?: string[];
    from_name?: string;
    to_name?: string;
  };
  scored_at: string | null;
  completed: boolean;
  created_at: string;
}

const DECISION_CFG = {
  approve: { label: 'APPROVE', color: 'var(--risk-low)', bg: 'rgba(22,163,74,0.12)', border: 'rgba(22,163,74,0.30)' },
  mfa: { label: 'MFA', color: 'var(--risk-medium)', bg: 'rgba(217,119,6,0.10)', border: 'rgba(217,119,6,0.30)' },
  manual_review: { label: 'REVIEW', color: 'var(--risk-high)', bg: 'rgba(234,88,12,0.10)', border: 'rgba(234,88,12,0.30)' },
  block: { label: 'BLOCK', color: 'var(--risk-critical)', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.25)' },
  pending: { label: 'PENDING', color: 'var(--text-muted)', bg: 'rgba(71,85,105,0.12)', border: 'rgba(71,85,105,0.25)' },
};

function fmtIN(n: number) {
  return 'Rs.' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function fmtCompact(n: number) {
  if (n >= 1e7) return 'Rs.' + (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e5) return 'Rs.' + (n / 1e5).toFixed(1) + 'L';
  return 'Rs.' + new Intl.NumberFormat('en-IN').format(n);
}

function timeAgo(ts: string | null) {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function riskColor(score: number) {
  if (score >= 80) return 'var(--risk-critical)';
  if (score >= 60) return 'var(--risk-high)';
  if (score >= 30) return 'var(--risk-medium)';
  return 'var(--risk-low)';
}

function RiskRing({ score, size = 24 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = riskColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-dim)" strokeWidth={2.5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={2.5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

type FilterTab = 'all' | 'block' | 'manual_review' | 'mfa' | 'approve';

export default function PreTxnAnalyticsPage() {
  const [items, setItems] = useState<PreTxnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const loadData = useCallback(async () => {
    try {
      const data = await api.getPreTxnQueue(50);
      const raw = (data as { queue?: PreTxnItem[] }).queue
        ?? (Array.isArray(data) ? (data as PreTxnItem[]) : []);
      setItems(raw);
      setLastUpdated(Date.now());
    } catch {
      // use stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Poll every 2 seconds for near-real-time updates
    const tick = setInterval(loadData, 2000);
    // Also refresh instantly when Transaction Scorer submits a new score
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pretxn_scored') loadData();
    };
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(tick); window.removeEventListener('storage', onStorage); };
  }, [loadData]);

  // treat all items as scored — API transactions don't have a `completed` flag
  const scored = items.filter(i => i.decision && i.decision !== 'pending');
  const completed = scored.length > 0 ? scored : items; // fall back to all items if none have decisions
  const counts = {
    total: items.length,
    block: items.filter(i => i.decision === 'block').length,
    manual_review: items.filter(i => i.decision === 'manual_review').length,
    mfa: items.filter(i => i.decision === 'mfa').length,
    approve: items.filter(i => i.decision === 'approve').length,
    pending: items.filter(i => !i.decision || i.decision === 'pending').length,
  };
  const fraudPrevented = items.filter(i => i.decision === 'block').reduce((s, i) => s + i.amount, 0);
  const avgScore = items.length ? items.reduce((s, i) => s + (i.risk_score ?? 0), 0) / items.length : 0;

  const filteredItems = activeTab === 'all' ? items : items.filter(i => i.decision === activeTab);

  // stacked bar segments
  const segments = [
    { key: 'block', pct: counts.total ? (counts.block / counts.total) * 100 : 0, color: 'var(--risk-critical)', label: 'BLOCK' },
    { key: 'manual_review', pct: counts.total ? (counts.manual_review / counts.total) * 100 : 0, color: 'var(--risk-high)', label: 'REVIEW' },
    { key: 'mfa', pct: counts.total ? (counts.mfa / counts.total) * 100 : 0, color: 'var(--risk-medium)', label: 'MFA' },
    { key: 'approve', pct: counts.total ? (counts.approve / counts.total) * 100 : 0, color: 'var(--risk-low)', label: 'APPROVE' },
  ];

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'block', label: 'Block' },
    { key: 'manual_review', label: 'Review' },
    { key: 'mfa', label: 'MFA' },
    { key: 'approve', label: 'Approve' },
  ];

  return (
    <>
      <Header title="Pre-Transaction Analytics" />
      <div style={{ background: 'var(--bg-void)', minHeight: 'calc(100vh - 52px)' }}>

        {/* Live indicator banner */}
        <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', background: 'rgba(37,99,235,0.04)', borderBottom: '1px solid var(--border-dim)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--risk-low)', boxShadow: '0 0 6px var(--risk-low)', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
            LIVE · Auto-refreshing every 2s · Last updated {Math.floor((Date.now() - lastUpdated) / 1000)}s ago
          </span>
          <button onClick={() => loadData()} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--brand-light)', padding: '0 4px' }}>
            Refresh now
          </button>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
        </div>

        {/* Stats — 2-tier command strip */}
        <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-dim)' }}>
          {/* Tier 1 */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-dim)', height: 80 }}>
            {[
              { label: 'TOTAL SCORED', value: counts.total, color: 'var(--text-primary)', mono: false },
              { label: 'BLOCKED', value: counts.block, color: 'var(--risk-critical)', mono: true },
              { label: 'FRAUD PREVENTED', value: fmtCompact(fraudPrevented), color: 'var(--risk-low)', mono: true },
            ].map((m, i) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px', borderLeft: i > 0 ? '1px solid var(--border-dim)' : 'none' }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>{m.label}</p>
                <p style={{ fontFamily: m.mono ? 'JetBrains Mono, monospace' : 'Sora, sans-serif', fontSize: 28, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</p>
              </div>
            ))}
          </div>
          {/* Tier 2 */}
          <div style={{ display: 'flex', height: 48 }}>
            {[
              { label: 'MANUAL REVIEW', value: counts.manual_review, color: 'var(--risk-high)' },
              { label: 'MFA REQUIRED', value: counts.mfa, color: 'var(--risk-medium)' },
              { label: 'APPROVED', value: counts.approve, color: 'var(--risk-low)' },
            ].map((m, i) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px', borderLeft: i > 0 ? '1px solid var(--border-dim)' : 'none' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: m.color, marginLeft: 'auto' }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main 52/48 content */}
        <div style={{ display: 'grid', gridTemplateColumns: '52fr 48fr', gap: 16, padding: 20 }}>

          {/* LEFT — Scoring Outcomes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px' }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Scoring Outcomes</p>

              {/* Hero stacked bar */}
              <div style={{ height: 32, borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
                {segments.map(s => (
                  <div key={s.key} style={{ width: `${s.pct}%`, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: s.pct > 5 ? undefined : 0, overflow: 'hidden', transition: 'width 0.5s ease' }}>
                    {s.pct > 8 && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{s.label}</span>}
                  </div>
                ))}
                {counts.total === 0 && <div style={{ flex: 1, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>No data yet</span></div>}
              </div>

              {/* Breakdown list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {segments.map(s => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{s.label}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-mono)' }}>{s.pct.toFixed(1)}%</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 3, padding: '1px 7px' }}>
                      {counts[s.key as keyof typeof counts]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Average Risk Score + Thermometer */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px' }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Average Risk Score</p>
              <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 36, fontWeight: 700, color: riskColor(avgScore), lineHeight: 1, marginBottom: 16 }}>{avgScore.toFixed(1)}</p>

              {/* Thermometer gauge */}
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <div style={{ height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #16A34A 0%, #D97706 30%, #EA580C 60%, #DC2626 80%)', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: `${Math.min(98, avgScore)}%`, top: -4,
                    width: 2, height: 16, background: '#fff', borderRadius: 1,
                    boxShadow: '0 0 4px rgba(255,255,255,0.8)', transform: 'translateX(-50%)',
                    transition: 'left 0.5s ease',
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {['Safe <30', 'MFA 30-60', 'Review 60-80', 'Block >80'].map(l => (
                  <span key={l} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'var(--text-muted)' }}>{l}</span>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Live Queue */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)' }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Live Queue</p>
              {/* Filter tabs */}
              <div style={{ display: 'flex', gap: 4 }}>
                {TABS.map(tab => {
                  const cnt = tab.key === 'all' ? items.length : items.filter(i => i.decision === tab.key).length;
                  const isActive = activeTab === tab.key;
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5,
                      border: `1px solid ${isActive ? 'var(--brand)' : 'var(--border-default)'}`,
                      background: isActive ? 'var(--brand)' : 'var(--bg-elevated)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: isActive ? '#fff' : 'var(--text-secondary)' }}>{tab.label}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', background: isActive ? 'rgba(255,255,255,0.15)' : 'var(--bg-overlay)', borderRadius: 3, padding: '1px 5px' }}>{cnt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transaction rows */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 480 }}>
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>No transactions in this category</div>
              ) : (
                filteredItems.slice(0, 25).map(item => {
                  const dcfg = DECISION_CFG[item.decision] ?? DECISION_CFG.pending;
                  return (
                    <div key={item.id} style={{ position: 'relative', padding: '10px 20px', borderBottom: '1px solid var(--border-dim)', borderLeft: `2px solid ${dcfg.color}`, cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.from_account} → {item.to_account}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {[item.txn_type, item.channel].map(tag => (
                              <span key={tag} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)', borderRadius: 3, padding: '1px 6px', textTransform: 'uppercase' }}>{tag}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtIN(item.amount)}</span>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'var(--text-muted)' }}>{timeAgo(item.scored_at)}</span>
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 600, color: dcfg.color, background: dcfg.bg, border: `1px solid ${dcfg.border}`, borderRadius: 3, padding: '2px 7px', flexShrink: 0 }}>
                          {dcfg.label}
                        </span>
                        <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
                          <RiskRing score={item.risk_score} size={24} />
                        </div>
                      </div>
                      {/* Bottom risk bar */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'var(--bg-elevated)' }}>
                        <div style={{ width: `${item.risk_score}%`, height: '100%', background: dcfg.color, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

