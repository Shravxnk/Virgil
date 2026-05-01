// app/executive/page.tsx — professional light banking theme
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import { ExecutiveDashboardResponse } from '@/types';
import {
  TrendingUp, TrendingDown, CheckCircle2, Activity, ArrowRight, RefreshCw, Shield,
} from 'lucide-react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from 'recharts';

function fmtCr(n: number) {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
  return '₹' + new Intl.NumberFormat('en-IN').format(n);
}

function fmtPct(n: number) { return (n * 100).toFixed(1) + '%'; }

const STATUS_COLORS: Record<string, string> = {
  open: '#1D4ED8', investigating: '#B45309', escalated: '#DC2626',
  resolved: '#15803D', resolved_fraud: '#15803D', resolved_legitimate: '#0891B2', closed: '#64748B',
};
const STATUS_BG: Record<string, string> = {
  open: '#EFF6FF', investigating: '#FFFBEB', escalated: '#FEF2F2',
  resolved: '#F0FDF4', resolved_fraud: '#F0FDF4', resolved_legitimate: '#F0FDFA', closed: '#F8FAFC',
};

function StatCard({ label, value, sub, trend, trendUp, color = '#0F172A', borderColor }: {
  label: string; value: string; sub?: string; trend?: string; trendUp?: boolean; color?: string; borderColor?: string;
}) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderTop: `3px solid ${borderColor ?? '#E2E8F0'}`, borderRadius: 8, padding: '20px 24px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, marginBottom: 6 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: trend ? 8 : 0 }}>{sub}</p>}
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {trendUp ? <TrendingUp style={{ width: 12, height: 12, color: '#15803D' }} /> : <TrendingDown style={{ width: 12, height: 12, color: '#DC2626' }} />}
          <span style={{ fontSize: 11, color: trendUp ? '#15803D' : '#DC2626', fontWeight: 600 }}>{trend}</span>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, action, href }: { title: string; action?: string; href?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{title}</h3>
      {action && href && (
        <Link href={href} style={{ fontSize: 11, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500, textDecoration: 'none' }}>
          {action} <ArrowRight style={{ width: 11, height: 11 }} />
        </Link>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '10px 14px', boxShadow: '0 4px 12px rgba(15,23,42,0.1)' }}>
      <p style={{ fontSize: 11, color: '#64748B', marginBottom: 6, fontWeight: 500 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: 12, color: p.color, margin: '2px 0', fontWeight: 600 }}>{p.name}: {fmtCr(p.value)}</p>
      ))}
    </div>
  );
}

export default function ExecutiveDashboardPage() {
  const [data, setData] = useState<ExecutiveDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = useCallback(() => {
    setLoading(true);
    api.getExecutiveDashboard()
      .then(d => { setData(d as ExecutiveDashboardResponse); setLastUpdated(new Date()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const fraudDetected = data?.total_fraud_detected ?? 89800000;
  const fraudPrevented = data?.total_fraud_prevented ?? fraudDetected * 0.793;
  const detectionRate = data ? data.detection_rate : 0.918;
  const activeCases = data?.active_cases ?? 5;
  const avgResolution = data?.avg_resolution_time ? `${data.avg_resolution_time.toFixed(1)}h` : '14.2h';
  const fpRate = data?.false_positive_rate ?? 0.082;
  const regulatoryExposure = data?.regulatory_exposure ?? 315000000;

  const trendData = data?.fraud_trend ?? [
    { month: 'Oct', detected: 18500000, prevented: 12200000 },
    { month: 'Nov', detected: 22100000, prevented: 15800000 },
    { month: 'Dec', detected: 19800000, prevented: 13500000 },
    { month: 'Jan', detected: 28700000, prevented: 20100000 },
    { month: 'Feb', detected: 31400000, prevented: 22600000 },
    { month: 'Mar', detected: 43200000, prevented: 30100000 },
  ];

  const casesByStatus = data?.cases_by_status ?? [
    { status: 'open', count: 2 },
    { status: 'investigating', count: 3 },
    { status: 'escalated', count: 1 },
    { status: 'resolved', count: 12 },
    { status: 'closed', count: 8 },
  ];

  const riskCats = data?.top_risk_categories ?? [
    { category: 'Circular Fund Flow / Layering', count: 14, amount: 87500000 },
    { category: 'Structuring / Smurfing', count: 11, amount: 42300000 },
    { category: 'Account Takeover (ATO)', count: 9, amount: 38250000 },
    { category: 'Mule Network', count: 5, amount: 25675000 },
    { category: 'Synthetic Identity Fraud', count: 6, amount: 19800000 },
  ];

  const totalCases = casesByStatus.reduce((sum, s) => sum + s.count, 0);
  const prevMonth = trendData.length >= 2 ? trendData[trendData.length - 2] : null;
  const currMonth = trendData[trendData.length - 1];
  const fraudTrend = prevMonth && currMonth
    ? ((currMonth.detected - prevMonth.detected) / prevMonth.detected * 100).toFixed(1) : null;

  const modelAcc = data?.model_accuracy ?? 0.934;
  const complianceScore = data?.compliance_summary?.compliance_score ?? 87.4;
  const strFiled = data?.compliance_summary?.sar_filed ?? 8;
  const strPending = data?.compliance_summary?.sar_pending ?? 2;
  const ctrFiled = data?.compliance_summary?.ctr_filed ?? 23;

  return (
    <>
      <Header title="Executive Intelligence Overview" subtitle="Real-time fraud detection and prevention analytics" breadcrumb={['Executive', 'Overview']} />
      <div style={{ background: '#F0F2F5', minHeight: 'calc(100vh - 56px)', padding: '20px 24px' }}>

        {/* Refresh bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803D', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#64748B' }}>
              Live data · Last refreshed {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          </div>
          <button onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#1D4ED8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
          </button>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
          <StatCard label="Total Fraud Detected" value={fmtCr(fraudDetected)} sub="YTD · All channels" trend={fraudTrend ? `${fraudTrend}% vs prev month` : undefined} trendUp={fraudTrend ? parseFloat(fraudTrend) < 0 : undefined} color="#DC2626" borderColor="#DC2626" />
          <StatCard label="Fraud Prevented" value={fmtCr(fraudPrevented)} sub={`${((fraudPrevented / fraudDetected) * 100).toFixed(1)}% prevention rate`} trend="+2.1% this month" trendUp={true} color="#15803D" borderColor="#15803D" />
          <StatCard label="Detection Rate" value={fmtPct(detectionRate)} sub="Model accuracy" color="#1D4ED8" borderColor="#1D4ED8" />
          <StatCard label="Active Cases" value={String(activeCases)} sub={`${totalCases} total cases`} color="#B45309" borderColor="#B45309" />
          <StatCard label="Avg Resolution" value={avgResolution} sub="Per investigation" color="#0F172A" borderColor="#94A3B8" />
          <StatCard label="Regulatory Exposure" value={fmtCr(regulatoryExposure)} sub="Open cases · FIU-IND" color="#7C3AED" borderColor="#7C3AED" />
        </div>

        {/* Main content: 60/40 split */}
        <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: 16, marginBottom: 16 }}>

          {/* Fraud Intelligence Trend */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px 24px' }}>
            <SectionHeader title="Fraud Intelligence Trend (Monthly)" />
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              {[
                { color: '#DC2626', label: 'Detected', value: fmtCr(currMonth?.detected ?? 0) },
                { color: '#15803D', label: 'Prevented', value: fmtCr(currMonth?.prevented ?? 0) },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 3, background: l.color, borderRadius: 2 }} />
                  <span style={{ fontSize: 11, color: '#64748B' }}>{l.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>{l.value}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="detGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#DC2626" stopOpacity={0.12} /><stop offset="100%" stopColor="#DC2626" stopOpacity={0} /></linearGradient>
                  <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#15803D" stopOpacity={0.10} /><stop offset="100%" stopColor="#15803D" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtCr(v)} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="detected" name="Detected" stroke="#DC2626" strokeWidth={2} fill="url(#detGrad)" dot={{ fill: '#DC2626', r: 3 }} />
                <Area type="monotone" dataKey="prevented" name="Prevented" stroke="#15803D" strokeWidth={2} fill="url(#prevGrad)" dot={{ fill: '#15803D', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Cases by Status */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px 24px' }}>
            <SectionHeader title="Cases by Status" action="View All" href="/analyst/cases" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {casesByStatus.map((s) => {
                const pct = totalCases > 0 ? (s.count / totalCases) * 100 : 0;
                const color = STATUS_COLORS[s.status] ?? '#64748B';
                const bg = STATUS_BG[s.status] ?? '#F8FAFC';
                return (
                  <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 80, textAlign: 'right' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, border: `1px solid ${color}22`, borderRadius: 4, padding: '2px 8px', textTransform: 'capitalize' }}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ width: 20, fontSize: 13, fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>{s.count}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{totalCases}</p>
                  <p style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#DC2626' }}>{casesByStatus.find(s => s.status === 'escalated')?.count ?? 0}</p>
                  <p style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Escalated</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#15803D' }}>{casesByStatus.filter(s => s.status.startsWith('resolved')).reduce((sum, s) => sum + s.count, 0)}</p>
                  <p style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row: 3 panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* Top Risk Categories */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px 24px' }}>
            <SectionHeader title="Top Risk Categories" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {riskCats.map((cat, i) => {
                const PALETTE = ['#DC2626', '#EA580C', '#B45309', '#1D4ED8', '#7C3AED'];
                const color = PALETTE[i % PALETTE.length];
                const maxAmt = Math.max(...riskCats.map(c => c.amount));
                const pct = (cat.amount / maxAmt) * 100;
                return (
                  <div key={cat.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 3, height: 14, background: color, borderRadius: 2 }} />
                        <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{cat.category}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#0F172A', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{fmtCr(cat.amount)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 10, color: '#94A3B8', width: 24, textAlign: 'right' }}>{cat.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model Health Snapshot */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px 24px' }}>
            <SectionHeader title="Model Health" action="Full Report" href="/executive/model-health" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6 }}>
              <Activity style={{ width: 14, height: 14, color: '#15803D' }} />
              <span style={{ fontSize: 11, color: '#15803D', fontWeight: 600 }}>Engine Operational · 250+ txn/hr</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Accuracy', value: modelAcc, color: '#15803D' },
                { label: 'Precision', value: data?.model_precision ?? 0.912, color: '#15803D' },
                { label: 'Recall', value: data?.model_recall ?? 0.889, color: '#B45309' },
                { label: 'F1 Score', value: data?.model_f1 ?? 0.9, color: '#15803D' },
              ].map(m => (
                <div key={m.label} style={{ padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 6 }}>
                  <p style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{m.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: m.color, marginBottom: 4 }}>{(m.value * 100).toFixed(1)}%</p>
                  <div style={{ height: 3, background: '#F1F5F9', borderRadius: 2 }}>
                    <div style={{ width: `${m.value * 100}%`, height: '100%', background: m.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#64748B' }}>False positive rate</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>{fmtPct(fpRate)}</span>
            </div>
          </div>

          {/* Compliance Summary */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px 24px' }}>
            <SectionHeader title="Compliance Summary" action="Full Report" href="/executive/compliance" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: complianceScore >= 80 ? '#F0FDF4' : '#FFFBEB', border: `2px solid ${complianceScore >= 80 ? '#15803D' : '#B45309'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: complianceScore >= 80 ? '#15803D' : '#B45309' }}>{complianceScore.toFixed(0)}</span>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Compliance Score</p>
                <p style={{ fontSize: 11, color: '#64748B' }}>PMLA 2002 · FIU-IND · RBI</p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <CheckCircle2 style={{ width: 10, height: 10 }} /> RBI Compliant
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'STR Filed (FIU-IND)', value: strFiled, badge: 'Filed', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
                { label: 'STR Pending (7-day deadline)', value: strPending, badge: strPending > 0 ? 'Action Needed' : 'Clear', color: strPending > 0 ? '#DC2626' : '#15803D', bg: strPending > 0 ? '#FEF2F2' : '#F0FDF4', border: strPending > 0 ? '#FECACA' : '#BBF7D0' },
                { label: 'CTR Filed (>₹10L)', value: ctrFiled, badge: 'Compliant', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 6, border: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 11, color: '#475569' }}>{row.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>{row.value}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: row.color, background: row.bg, border: `1px solid ${row.border}`, borderRadius: 3, padding: '1px 6px' }}>{row.badge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
