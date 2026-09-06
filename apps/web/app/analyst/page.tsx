'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { RiskScoreCard } from '@/components/dashboard/risk-score-card';
import { AlertInbox } from '@/components/dashboard/alert-inbox';
import { DailyTrendChart, ScoreDistributionChart } from '@/components/dashboard/kpi-chart';
import { CaseTable } from '@/components/dashboard/case-table';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { api, SSE_URL } from '@/lib/api';
import { AnalystDashboardResponse, CaseListResponse } from '@/types';
import { AlertTriangle, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

export default function AnalystDashboardPage() {
  const [dashboard, setDashboard] = useState<AnalystDashboardResponse | null>(null);
  const [cases, setCases] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [dashData, caseData] = await Promise.all([
        api.getAnalystDashboard(),
        api.getCases(),
      ]);
      setDashboard(dashData);
      setCases(caseData);
      setError(null);
    } catch (e) {
      console.error('Failed to load dashboard', e);
      setError('Failed to load dashboard. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Refresh every 30s as fallback
    const id = setInterval(load, 30000);
    // Instant refresh when a transaction is scored via SSE
    const es = new EventSource(SSE_URL);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'transaction_scored') load();
      } catch { /* ignore */ }
    };
    return () => { clearInterval(id); es.close(); };
  }, [load]);

  if (loading) {
    return (
      <>
        <Header title="Analyst Dashboard" />
        <div className="p-6">
          <DashboardSkeleton />
        </div>
      </>
    );
  }

  if (error || !dashboard) {
    return (
      <>
        <Header title="Analyst Dashboard" />
        <div className="p-6">
          <div className="rounded p-6 text-center" style={{ border: '1px solid #EF444430', backgroundColor: '#EF444410' }}>
            <p className="text-sm font-medium" style={{ color: '#EF4444' }}>{error ?? 'Failed to load dashboard data.'}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Analyst Dashboard" />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <RiskScoreCard
            title="Total Alerts"
            value={dashboard.total_alerts}
            icon={AlertTriangle}
          />
          <RiskScoreCard
            title="Critical Alerts"
            value={dashboard.critical_alerts}
            subtitle="Requires immediate attention"
            icon={AlertTriangle}
          />
          <RiskScoreCard
            title="Pending Review"
            value={dashboard.pending_review}
            icon={Clock}
          />
          <RiskScoreCard
            title="Resolved Today"
            value={dashboard.resolved_today}
            icon={CheckCircle2}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DailyTrendChart data={dashboard.daily_trend} />
          <ScoreDistributionChart data={dashboard.score_distribution} />
        </div>

        {/* Alert Inbox + Cases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AlertInbox alerts={dashboard.recent_alerts} compact />
          {cases && <CaseTable cases={cases.cases} />}
        </div>
      </div>
    </>
  );
}
