'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatPercent, formatCurrency } from '@/lib/utils';
import { ComplianceSummary } from '@/types';
import { Shield, FileCheck, AlertTriangle, Calendar } from 'lucide-react';

interface CompliancePanelProps {
  summary: ComplianceSummary;
  regulatoryExposure: number;
}

export function CompliancePanel({ summary, regulatoryExposure }: CompliancePanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Compliance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">SAR Filed</p>
            <p className="text-xl font-bold">{summary.sar_filed}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">SAR Pending</p>
            <p className="text-xl font-bold text-orange-600">{summary.sar_pending}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">CTR Filed</p>
            <p className="text-xl font-bold">{summary.ctr_filed}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Regulatory Exposure</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(regulatoryExposure)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Compliance Score</span>
            <span className="font-medium">{summary.compliance_score}%</span>
          </div>
          <Progress value={summary.compliance_score} className="h-2" />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Last audit: {summary.last_audit_date}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Next: {summary.next_audit_date}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModelHealthPanelProps {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

export function ModelHealthPanel({ accuracy, precision, recall, f1 }: ModelHealthPanelProps) {
  const metrics = [
    { label: 'Accuracy', value: accuracy },
    { label: 'Precision', value: precision },
    { label: 'Recall', value: recall },
    { label: 'F1 Score', value: f1 },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Model Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-medium">{formatPercent(m.value)}</span>
            </div>
            <Progress value={m.value * 100} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
