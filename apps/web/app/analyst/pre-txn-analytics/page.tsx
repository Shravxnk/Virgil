'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  XCircle,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
  ShieldAlert,
  TrendingUp,
  Activity,
  RefreshCw,
  Zap,
  Clock,
  Ban,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  scored_at: string | null;
  completed: boolean;
  created_at: string;
}

interface QueueResponse {
  queue: PreTxnItem[];
  total: number;
}

const DECISION_CONFIG = {
  block: {
    label: 'Blocked',
    color: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
    icon: XCircle,
    iconColor: 'text-red-500',
    cardBg: 'bg-red-50 border-red-200',
  },
  manual_review: {
    label: 'Manual Review',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    cardBg: 'bg-orange-50 border-orange-200',
  },
  mfa: {
    label: 'MFA Required',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    icon: Smartphone,
    iconColor: 'text-amber-500',
    cardBg: 'bg-amber-50 border-amber-200',
  },
  approve: {
    label: 'Approved',
    color: 'bg-green-100 text-green-700 border-green-200',
    dot: 'bg-green-500',
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    cardBg: 'bg-green-50 border-green-200',
  },
  pending: {
    label: 'Pending',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
    icon: Clock,
    iconColor: 'text-gray-400',
    cardBg: 'bg-gray-50 border-gray-200',
  },
};

const SIGNAL_KEYS = ['amount_anomaly', 'time_anomaly', 'device_mismatch', 'beneficiary_risk', 'graph_risk'] as const;
const SIGNAL_LABELS: Record<string, string> = {
  amount_anomaly: 'Amount Anomaly',
  time_anomaly: 'Time Anomaly',
  device_mismatch: 'Device Mismatch',
  beneficiary_risk: 'Beneficiary Risk',
  graph_risk: 'Graph Risk',
};
const SIGNAL_MAX: Record<string, number> = {
  amount_anomaly: 25, time_anomaly: 15, device_mismatch: 15, beneficiary_risk: 20, graph_risk: 25,
};

function getRiskColor(score: number) {
  if (score >= 80) return 'text-red-600 font-bold';
  if (score >= 60) return 'text-orange-600 font-bold';
  if (score >= 30) return 'text-amber-600 font-semibold';
  return 'text-green-600';
}

function getRiskBarColor(score: number) {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 30) return 'bg-amber-500';
  return 'bg-green-500';
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PreTxnAnalyticsPage() {
  const [data, setData] = useState<PreTxnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/transactions/queue?limit=100`);
      if (res.ok) {
        const json: QueueResponse = await res.json();
        setData(json.queue || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const id = setInterval(() => fetchQueue(), 15000);
    return () => clearInterval(id);
  }, [fetchQueue]);

  // ── Analytics ──────────────────────────────────────────────────────
  const total = data.length;
  const blocked = data.filter(d => d.decision === 'block').length;
  const reviews = data.filter(d => d.decision === 'manual_review').length;
  const mfa = data.filter(d => d.decision === 'mfa').length;
  const approved = data.filter(d => d.decision === 'approve').length;
  const blockRate = total > 0 ? ((blocked / total) * 100).toFixed(1) : '0';
  const totalAmountBlocked = data
    .filter(d => d.decision === 'block')
    .reduce((s, d) => s + d.amount, 0);
  const avgScore = total > 0
    ? (data.reduce((s, d) => s + d.risk_score, 0) / total).toFixed(1)
    : '0';

  const filtered = filter === 'all' ? data : data.filter(d => d.decision === filter);

  // Decision distribution for bar chart
  const decisionCounts = [
    { key: 'block', count: blocked },
    { key: 'manual_review', count: reviews },
    { key: 'mfa', count: mfa },
    { key: 'approve', count: approved },
  ];
  const maxCount = Math.max(...decisionCounts.map(d => d.count), 1);

  const KPI_CARDS = [
    {
      label: 'Total Scored',
      value: total,
      icon: Activity,
      iconColor: 'text-blue-500',
      bg: 'bg-blue-50',
      sub: `Avg risk: ${avgScore}/100`,
    },
    {
      label: 'Blocked',
      value: blocked,
      icon: Ban,
      iconColor: 'text-red-500',
      bg: 'bg-red-50',
      sub: `${blockRate}% block rate`,
    },
    {
      label: 'Manual Review',
      value: reviews,
      icon: AlertTriangle,
      iconColor: 'text-orange-500',
      bg: 'bg-orange-50',
      sub: 'Awaiting analyst',
    },
    {
      label: 'MFA Required',
      value: mfa,
      icon: Smartphone,
      iconColor: 'text-amber-500',
      bg: 'bg-amber-50',
      sub: 'Step-up auth sent',
    },
    {
      label: 'Approved',
      value: approved,
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      bg: 'bg-green-50',
      sub: 'Passed all checks',
    },
    {
      label: '₹ Blocked',
      value: `₹${(totalAmountBlocked / 10000000).toFixed(2)}Cr`,
      icon: ShieldAlert,
      iconColor: 'text-purple-500',
      bg: 'bg-purple-50',
      sub: 'Fraud prevented',
    },
  ];

  return (
    <>
      <Header title="Pre-Transaction Fraud Analytics" />
      <div className="p-6 space-y-6">

        {/* Banner */}
        <div className="rounded-xl border bg-primary/5 px-5 py-4 flex items-center gap-4">
          <Zap className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Pre-Transaction Scoring Queue</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every transaction scored <strong>before money moves</strong>. Showing live decisions from
              the deterministic fraud engine: Approve / MFA / Manual Review / Block.
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
            Auto-refreshing every 15s
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {KPI_CARDS.map((k) => (
            <Card key={k.label} className="shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg mb-3', k.bg)}>
                  <k.icon className={cn('h-4 w-4', k.iconColor)} />
                </div>
                <p className="text-2xl font-bold text-foreground leading-none">{k.value}</p>
                <p className="text-xs font-medium text-foreground mt-1">{k.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Decision Distribution Chart */}
          <Card className="shadow-sm lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Decision Distribution
              </CardTitle>
              <CardDescription className="text-xs">Breakdown of all scoring outcomes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {decisionCounts.map(({ key, count }) => {
                const cfg = DECISION_CONFIG[key as keyof typeof DECISION_CONFIG];
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const totalPct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                        <span className="text-xs text-foreground font-medium">{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{totalPct}%</span>
                        <span className="text-xs font-bold text-foreground w-5 text-right">{count}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', cfg.dot)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Score gauge */}
              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3 font-medium">Average Risk Score</p>
                <div className="flex items-end gap-3">
                  <p className={cn('text-4xl font-bold', getRiskColor(parseFloat(avgScore)))}>
                    {avgScore}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">/ 100</p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', getRiskBarColor(parseFloat(avgScore)))}
                    style={{ width: `${avgScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Safe &lt;30</span>
                  <span>MFA 30–60</span>
                  <span>Review 60–80</span>
                  <span>Block &gt;80</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Table */}
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Scored Transactions</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {filtered.length} of {total} shown
                  </CardDescription>
                </div>
                {/* Filter tabs */}
                <div className="flex gap-1">
                  {['all', 'block', 'manual_review', 'mfa', 'approve'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'px-2 py-1 rounded text-[11px] font-medium transition-colors',
                        filter === f
                          ? 'bg-primary text-white'
                          : 'text-muted-foreground hover:bg-accent',
                      )}
                    >
                      {f === 'all' ? 'All' : f === 'manual_review' ? 'Review' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                  Loading queue...
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No transactions found</p>
                  <p className="text-xs mt-1">Run the SQL seed query in pgAdmin, then refresh</p>
                </div>
              ) : (
                <div className="divide-y overflow-auto max-h-[480px]">
                  {filtered.map((item) => {
                    const cfg = DECISION_CONFIG[item.decision];
                    const DecIcon = cfg?.icon ?? Clock;
                    const signals: Record<string, number> = item as unknown as Record<string, number>;
                    // try to get signals from risk_signals if available
                    const rs = (item as unknown as { risk_signals?: Record<string, number> }).risk_signals ?? {};

                    return (
                      <div key={item.id} className="px-4 py-3 hover:bg-accent/40 transition-colors">
                        <div className="flex items-start gap-3">

                          {/* Decision icon */}
                          <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border', cfg?.cardBg ?? 'bg-gray-50 border-gray-200')}>
                            <DecIcon className={cn('h-4 w-4', cfg?.iconColor ?? 'text-gray-400')} />
                          </div>

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {rs.from_name ?? item.from_account}
                              </span>
                              <span className="text-[10px] text-muted-foreground">→</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {rs.to_name ?? item.to_account}
                              </span>
                              <Badge className={cn('text-[10px] px-1.5 py-0 border ml-auto', cfg?.color)}>
                                {cfg?.label ?? item.decision}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm font-bold text-foreground">
                                ₹{(item.amount / 100).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{item.txn_type}</span>
                              <span className="text-[10px] text-muted-foreground">{item.channel}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {item.created_at ? timeAgo(item.created_at) : '—'}
                              </span>
                            </div>

                            {/* Risk score bar */}
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full', getRiskBarColor(item.risk_score))}
                                  style={{ width: `${item.risk_score}%` }}
                                />
                              </div>
                              <span className={cn('text-[11px] w-12 text-right', getRiskColor(item.risk_score))}>
                                {item.risk_score}/100
                              </span>
                            </div>

                            {/* Reason codes from risk_signals */}
                            {Array.isArray((rs as unknown as { reason_codes?: string[] }).reason_codes) &&
                              ((rs as unknown as { reason_codes?: string[] }).reason_codes?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {((rs as unknown as { reason_codes?: string[] }).reason_codes ?? []).slice(0, 3).map((rc: string) => (
                                  <span key={rc} className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                                    {rc}
                                  </span>
                                ))}
                                {((rs as unknown as { reason_codes?: string[] }).reason_codes?.length ?? 0) > 3 && (
                                  <span className="text-[9px] text-muted-foreground">
                                    +{((rs as unknown as { reason_codes?: string[] }).reason_codes?.length ?? 0) - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Signal Heatmap — top risky transactions */}
        {data.filter(d => d.risk_score >= 60).length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                High-Risk Transactions — Signal Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Score ≥ 60 — transactions routed to Manual Review or Block
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-2 text-muted-foreground font-medium pr-4">Entity</th>
                      <th className="text-left pb-2 text-muted-foreground font-medium pr-4">Amount</th>
                      <th className="text-center pb-2 text-muted-foreground font-medium pr-4">Score</th>
                      <th className="text-center pb-2 text-muted-foreground font-medium pr-4">Decision</th>
                      {SIGNAL_KEYS.map(k => (
                        <th key={k} className="text-center pb-2 text-muted-foreground font-medium pr-2">
                          {SIGNAL_LABELS[k].split(' ')[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data
                      .filter(d => d.risk_score >= 60)
                      .sort((a, b) => b.risk_score - a.risk_score)
                      .slice(0, 8)
                      .map((item) => {
                        const cfg = DECISION_CONFIG[item.decision];
                        const rs = (item as unknown as { risk_signals?: Record<string, number> }).risk_signals ?? {};
                        return (
                          <tr key={item.id} className="hover:bg-accent/30">
                            <td className="py-2 pr-4 font-medium truncate max-w-[120px]">
                              {(rs as unknown as { from_name?: string }).from_name ?? item.from_account}
                            </td>
                            <td className="py-2 pr-4 text-foreground">
                              ₹{(item.amount / 100).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 pr-4 text-center">
                              <span className={cn('font-bold', getRiskColor(item.risk_score))}>
                                {item.risk_score}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-center">
                              <Badge className={cn('text-[10px] px-1.5 py-0 border', cfg?.color)}>
                                {cfg?.label ?? item.decision}
                              </Badge>
                            </td>
                            {SIGNAL_KEYS.map(k => {
                              const raw = rs[k] ?? 0;
                              const val = typeof raw === 'boolean' ? (raw ? 1 : 0) : raw;
                              const pct = Math.min(1, val / (SIGNAL_MAX[k] ?? 1));
                              const heat = pct > 0.7 ? 'bg-red-100 text-red-700' : pct > 0.4 ? 'bg-amber-100 text-amber-700' : pct > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-muted text-muted-foreground';
                              return (
                                <td key={k} className="py-2 pr-2 text-center">
                                  <span className={cn('inline-block px-1.5 py-0.5 rounded text-[10px] font-medium min-w-[32px]', heat)}>
                                    {typeof raw === 'boolean' ? (raw ? 'YES' : '—') : val.toFixed(1)}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </>
  );
}
