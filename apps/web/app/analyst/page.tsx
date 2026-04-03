'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { RiskScoreCard } from '@/components/dashboard/risk-score-card';
import { AlertInbox } from '@/components/dashboard/alert-inbox';
import { DailyTrendChart, ScoreDistributionChart } from '@/components/dashboard/kpi-chart';
import { CaseTable } from '@/components/dashboard/case-table';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { api } from '@/lib/api';
import { AnalystDashboardResponse, CaseListResponse } from '@/types';
import { AlertTriangle, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

export default function AnalystDashboardPage() {
  const [dashboard, setDashboard] = useState<AnalystDashboardResponse | null>(null);
  const [cases, setCases] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashData, caseData] = await Promise.all([
          api.getAnalystDashboard(),
          api.getCases(),
        ]);
        setDashboard(dashData);
        setCases(caseData);
      } catch (e) {
        console.error('Failed to load dashboard', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !dashboard) {
    return (
      <>
        <Header title="Analyst Dashboard" />
        <div className="p-6">
          <DashboardSkeleton />
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
            trend={{ value: 12, label: 'vs last week' }}
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
            trend={{ value: 8, label: 'vs yesterday' }}
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
