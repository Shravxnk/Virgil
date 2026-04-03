'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { api } from '@/lib/api';
import { ExecutiveDashboardResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function CompliancePage() {
  const [data, setData] = useState<ExecutiveDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getExecutiveDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <>
        <Header title="Compliance Overview" />
        <div className="p-6"><DashboardSkeleton /></div>
      </>
    );
  }

  const cs = data.compliance_summary;
  const sarTotal = cs.sar_filed + cs.sar_pending;
  const sarCompletion = sarTotal > 0 ? Math.round((cs.sar_filed / sarTotal) * 100) : 100;

  const sarItems = [
    { label: 'STR / SAR Filed', value: cs.sar_filed, icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'STR / SAR Pending', value: cs.sar_pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'CTR / FCR Filed', value: cs.ctr_filed, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const regulatoryItems = [
    { label: 'Last RBI Audit', value: formatDate(cs.last_audit_date) },
    { label: 'Next Scheduled Audit', value: formatDate(cs.next_audit_date) },
    { label: 'Compliance Score', value: `${cs.compliance_score}/100` },
    { label: 'Regulatory Exposure', value: `₹${(data.regulatory_exposure / 100000).toFixed(1)}L` },
  ];

  const riskCategories = data.top_risk_categories;

  return (
    <>
      <Header title="Compliance Overview" />
      <div className="p-6 space-y-6">

        {/* Compliance Score Banner */}
        <div className="rounded-xl border bg-card p-6 flex items-center gap-6 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl font-bold text-primary">{cs.compliance_score}</span>
              <span className="text-muted-foreground text-sm">/ 100 — Q1 2026 Compliance Score</span>
              <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs">
                {cs.compliance_score >= 90 ? 'Compliant' : cs.compliance_score >= 75 ? 'Needs Review' : 'At Risk'}
              </Badge>
            </div>
            <Progress value={cs.compliance_score} className="h-2 w-64" />
            <p className="mt-2 text-xs text-muted-foreground">
              Based on RBI/FIU-IND regulatory framework and internal audit standards. 
              Next audit scheduled: {formatDate(cs.next_audit_date)}.
            </p>
          </div>
        </div>

        {/* SAR / CTR Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sarItems.map((item) => (
            <Card key={item.label} className="shadow-sm">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-semibold mt-0.5">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regulatory Timeline */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Regulatory Schedule
              </CardTitle>
              <CardDescription>Audit calendar and key compliance milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {regulatoryItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SAR Filing Progress */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                STR / SAR Filing Status
              </CardTitle>
              <CardDescription>Suspicious Transaction Reports — Q1 2026</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Filings Completed</span>
                  <span className="font-medium">{cs.sar_filed} of {sarTotal}</span>
                </div>
                <Progress value={sarCompletion} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{sarCompletion}% of required filings submitted to FIU-IND</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
                <p className="font-medium text-foreground">Filing Obligation</p>
                <p className="text-muted-foreground">All STRs must be submitted to FIU-IND within 7 working days of forming a suspicion under PMLA, 2002.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Categories Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Risk Category Breakdown
            </CardTitle>
            <CardDescription>Top fraud typologies by case count and total exposure (Q1 2026)</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Category</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Cases</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Exposure</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Share</th>
                </tr>
              </thead>
              <tbody>
                {riskCategories.map((cat, i) => {
                  const total = riskCategories.reduce((s, c) => s + c.amount, 0);
                  const share = total > 0 ? ((cat.amount / total) * 100).toFixed(1) : '0';
                  return (
                    <tr key={cat.category} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">{cat.category}</td>
                      <td className="py-2.5 text-right">{cat.count}</td>
                      <td className="py-2.5 text-right font-mono">
                        ₹{(cat.amount / 100000).toFixed(1)}L
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground text-xs w-10 text-right">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

      </div>
    </>
  );
}
