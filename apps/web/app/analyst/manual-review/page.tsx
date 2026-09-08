// app/analyst/manual-review/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import {
  Bot, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';

interface RiskSignals {
  amount_anomaly?: number;
  time_anomaly?: number;
  device_mismatch?: boolean | number;
  beneficiary_risk?: number;
  graph_risk?: number;
  analyst_note?: string;
  resolved_at?: string;
}

interface AiSuggestion {
  suggestion: 'APPROVE' | 'REJECT';
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
  action: string;
  score: number;
}

interface ManualReviewItem {
  id: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  txn_type?: string;
  channel?: string;
  risk_score: number;
  ai_suggestion?: AiSuggestion;
  risk_signals?: RiskSignals;
  created_at: string;
  status?: string;
}

function fmtIN(n: number) {
  return 'Rs.' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function fmtCompact(n: number) {
  if (n >= 1e7) return 'Rs.' + (n / 1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return 'Rs.' + (n / 1e5).toFixed(1) + 'L';
  return fmtIN(n);
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// Signal bar — 4 segments colored by type
const SIGNAL_KEYS = [
  { key: 'amount_anomaly', color: 'var(--risk-critical)', max: 25 },
  { key: 'time_anomaly', color: 'var(--risk-medium)', max: 15 },
  { key: 'device_mismatch', color: 'var(--risk-high)', max: 15, bool: true },
  { key: 'beneficiary_risk', color: '#7C3AED', max: 20 },
  { key: 'graph_risk', color: 'var(--brand)', max: 25 },
];

function SegmentedRiskBar({ signals }: { signals: RiskSignals }) {
  const total = SIGNAL_KEYS.reduce((s, k) => {
    const v = signals[k.key as keyof RiskSignals];
    const n = k.bool ? (v ? k.max : 0) : (typeof v === 'number' ? v : 0);
    return s + Math.min(n, k.max);
  }, 0);
  const maxTotal = SIGNAL_KEYS.reduce((s, k) => s + k.max, 0);
  return (
    <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', display: 'flex', background: 'var(--bg-elevated)' }}>
      {SIGNAL_KEYS.map(k => {
        const v = signals[k.key as keyof RiskSignals];
        const n = k.bool ? (v ? k.max : 0) : (typeof v === 'number' ? v : 0);
        const pct = (Math.min(n, k.max) / maxTotal) * 100;
        return <div key={k.key} style={{ width: `${pct}%`, background: k.color, transition: 'width 0.4s' }} />;
      })}
    </div>
  );
}

type FilterMode = 'all' | 'approve' | 'reject';

export default function ManualReviewPage() {
  const [items, setItems] = useState<ManualReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [actioned, setActioned] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getManualReviewQueue();
      const arr = Array.isArray(data) ? data : (data as { manual_review: ManualReviewItem[] }).manual_review ?? [];
      setItems(arr as ManualReviewItem[]);
      setLastRefresh(new Date());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setActioned(prev => ({ ...prev, [id]: action }));
    try {
      await api.decideManualReview(id, action);
    } catch {
      // Revert the optimistic update if the backend call failed, so the
      // item reappears in the queue instead of silently vanishing unresolved.
      setActioned(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const pending = items.filter(i => !actioned[i.id]);
  const aiApprove = items.filter(i => i.ai_suggestion?.suggestion === 'APPROVE').length;
  const aiReject = items.filter(i => i.ai_suggestion?.suggestion === 'REJECT').length;
  const highConf = items.filter(i => i.ai_suggestion?.confidence === 'High').length;
  const totalExposure = items.reduce((s, i) => s + i.amount, 0);

  const filteredItems = pending.filter(item => {
    if (filter === 'approve') return item.ai_suggestion?.suggestion === 'APPROVE';
    if (filter === 'reject') return item.ai_suggestion?.suggestion === 'REJECT';
    return true;
  });

  return (
    <>
      <Header title="Manual Review" />
      <div style={{ background: 'var(--bg-void)', minHeight: 'calc(100vh - 52px)', padding: 24 }}>

        {/* AI Auto-Assist banner */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(37,99,235,0.06)', border: '1px solid var(--border-dim)', borderLeft: '3px solid var(--brand)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          <Bot style={{ width: 16, height: 16, color: 'var(--brand-light)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--brand-light)' }}>AI Auto-Assist active</span>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              Each transaction has been pre-analyzed. AI suggestions are advisory — final decision rests with the analyst.
            </p>
          </div>
        </div>

        {/* Stats command strip */}
        <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, marginBottom: 20, overflow: 'hidden', height: 68 }}>
          {[
            { label: 'PENDING REVIEW', value: pending.length, color: 'var(--text-primary)' },
            { label: 'AI: APPROVE', value: aiApprove, color: 'var(--risk-low)' },
            { label: 'AI: REJECT', value: aiReject, color: 'var(--risk-critical)' },
            { label: 'HIGH CONFIDENCE', value: highConf, color: 'var(--brand-light)' },
            { label: 'TOTAL EXPOSURE', value: fmtCompact(totalExposure), color: 'var(--risk-medium)' },
          ].map((m, i) => (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px', borderLeft: i > 0 ? '1px solid var(--border-dim)' : 'none' }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 5 }}>{m.label}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600, color: m.color, lineHeight: 1 }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {([['all', 'All'], ['approve', 'AI: Approve'], ['reject', 'AI: Reject']] as [FilterMode, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              border: `1px solid ${filter === key ? 'var(--brand)' : 'var(--border-default)'}`,
              background: filter === key ? 'var(--brand)' : 'var(--bg-elevated)',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
              color: filter === key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}>{label}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
              {lastRefresh ? `Last refreshed ${lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST` : 'Loading…'}
            </span>
            <button onClick={loadData} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'DM Sans, sans-serif', fontSize: 11 }}>
              <RefreshCw style={{ width: 12, height: 12 }} />Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
            Loading review queue...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <CheckCircle2 style={{ width: 40, height: 40, color: 'var(--risk-low)' }} />
            <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Queue Clear</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No transactions require manual review</p>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
              {lastRefresh ? `Last refreshed: ${lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })} IST` : ''}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredItems.map(item => {
              const isExpanded = expanded.has(item.id);
              const ai = item.ai_suggestion;
              const aiColor = ai?.suggestion === 'APPROVE' ? 'var(--risk-low)' : 'var(--risk-critical)';
              const confColor = ai?.confidence === 'High' ? 'var(--risk-low)' : ai?.confidence === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-high)';

              return (
                <div key={item.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Card top row */}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-mono)' }}>
                            {item.from_account} → {item.to_account}
                          </span>
                          {item.txn_type && (
                            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 3, padding: '1px 6px', textTransform: 'uppercase' }}>{item.txn_type}</span>
                          )}
                          {item.channel && (
                            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 3, padding: '1px 6px', textTransform: 'uppercase' }}>{item.channel}</span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtIN(item.amount)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        {ai && (
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, color: aiColor, background: `${aiColor}18`, border: `1px solid ${aiColor}40`, borderRadius: 4, padding: '2px 8px' }}>
                            AI: {ai.suggestion}
                          </span>
                        )}
                        {ai && (
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: confColor }}>
                            {ai.confidence} confidence ({ai.score?.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Segmented risk bar */}
                    {item.risk_signals && <SegmentedRiskBar signals={item.risk_signals} />}

                    {/* Actions row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
                        {ai?.action ?? 'Verify transaction details before acting'}
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => toggleExpanded(item.id)} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'DM Sans, sans-serif', fontSize: 11 }}>
                          {isExpanded ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                          {isExpanded ? 'Less' : 'Details'}
                        </button>
                        <button onClick={() => handleAction(item.id, 'approved')} style={{ background: 'none', border: '1px solid var(--risk-low)', borderRadius: 5, padding: '4px 14px', cursor: 'pointer', color: 'var(--risk-low)', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, transition: 'background 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--risk-low-bg)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <CheckCircle2 style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />Approve
                        </button>
                        <button onClick={() => handleAction(item.id, 'rejected')} style={{ background: 'none', border: '1px solid var(--risk-critical)', borderRadius: 5, padding: '4px 14px', cursor: 'pointer', color: 'var(--risk-critical)', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, transition: 'background 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--risk-critical-bg)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <XCircle style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />Reject
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && item.risk_signals && (
                    <div style={{ borderTop: '1px solid var(--border-dim)', padding: '14px 16px', background: 'var(--bg-elevated)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        {[
                          { title: 'Risk Signals', items: [
                            { label: 'Amount Anomaly', value: item.risk_signals.amount_anomaly?.toFixed(1) ?? '—' },
                            { label: 'Time Anomaly', value: item.risk_signals.time_anomaly?.toFixed(1) ?? '—' },
                            { label: 'Device Mismatch', value: item.risk_signals.device_mismatch ? 'Yes' : 'No' },
                          ]},
                          { title: 'Network Analysis', items: [
                            { label: 'Beneficiary Risk', value: item.risk_signals.beneficiary_risk?.toFixed(1) ?? '—' },
                            { label: 'Graph Risk', value: item.risk_signals.graph_risk?.toFixed(1) ?? '—' },
                            { label: 'Overall Score', value: item.risk_score.toFixed(0) + '/100' },
                          ]},
                          { title: 'AI Assessment', items: [
                            { label: 'Suggestion', value: ai?.suggestion ?? '—' },
                            { label: 'Confidence', value: ai?.confidence ?? '—' },
                            { label: 'Reasoning', value: ai?.reasoning ? ai.reasoning.slice(0, 40) + '…' : '—' },
                          ]},
                        ].map(section => (
                          <div key={section.title}>
                            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{section.title}</p>
                            {section.items.map(row => (
                              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>{row.label}</span>
                                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{row.value}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

