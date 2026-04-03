'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { RiskScoreCard } from '@/components/dashboard/risk-score-card';
import {
  FraudTrendChart,
  CasesByStatusChart,
  RiskCategoriesChart,
} from '@/components/dashboard/kpi-chart';
import { CompliancePanel, ModelHealthPanel } from '@/components/dashboard/metrics-panel';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { api } from '@/lib/api';
import { ExecutiveDashboardResponse } from '@/types';
import {
  DollarSign,
  FileSearch,
  Target,
  Clock,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

export default function ExecutiveDashboardPage() {
  const [data, setData] = useState<ExecutiveDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await api.getExecutiveDashboard();
        setData(result);
      } catch (e) {
        console.error('Failed to load executive dashboard', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <>
        <Header title="Executive Overview" />
        <div className="p-6">
          <DashboardSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Executive Overview" />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <RiskScoreCard
            title="Fraud Detected"
            value={formatCurrency(data.total_fraud_detected)}
            icon={DollarSign}
          />
          <RiskScoreCard
            title="Active Cases"
            value={data.active_cases}
            icon={FileSearch}
          />
          <RiskScoreCard
            title="Detection Rate"
            value={formatPercent(data.detection_rate)}
            icon={Target}
          />
          <RiskScoreCard
            title="False Positive Rate"
            value={formatPercent(data.false_positive_rate)}
            icon={TrendingDown}
          />
          <RiskScoreCard
            title="Avg. Resolution"
            value={`${data.avg_resolution_time}h`}
            icon={Clock}
          />
          <RiskScoreCard
            title="Regulatory Risk"
            value={formatCurrency(data.regulatory_exposure)}
            icon={ShieldAlert}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FraudTrendChart data={data.fraud_trend} />
          <CasesByStatusChart data={data.cases_by_status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RiskCategoriesChart data={data.top_risk_categories} />
          <ModelHealthPanel
            accuracy={data.model_accuracy}
            precision={data.model_precision}
            recall={data.model_recall}
            f1={2 * (data.model_precision * data.model_recall) / (data.model_precision + data.model_recall)}
          />
          <CompliancePanel
            summary={data.compliance_summary}
            regulatoryExposure={data.regulatory_exposure}
          />
        </div>
      </div>
    </>
  );
}
