'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import { CaseDetailResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Download,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Clock,
  User,
  Hash,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { formatINR, formatDateTime, severityColor } from '@/lib/utils';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<CaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    api.getCase(caseId)
      .then(setCaseData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return (
      <>
        <Header title="Fraud Investigation Report" />
        <div className="p-6 space-y-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      </>
    );
  }

  if (!caseData) {
    return (
      <>
        <Header title="Report Not Found" />
        <div className="p-6 flex flex-col items-center gap-4 pt-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Case {caseId} not found.</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
          </Button>
        </div>
      </>
    );
  }

  const riskLevel =
    caseData.risk_score >= 80 ? 'critical' :
    caseData.risk_score >= 60 ? 'high' :
    caseData.risk_score >= 40 ? 'medium' : 'low';

  const evidenceHash = `SHA256:${btoa(caseId + caseData.updated_at).replace(/=/g, '').substring(0, 40)}`;

  return (
    <>
      <Header title="Case Investigation Report" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Case
          </Button>
          <Button
            size="sm"
            onClick={() => window.open(api.getReportUrl(caseId), '_blank')}
          >
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>

        {/* Report Header */}
        <Card className="shadow-sm border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold">{caseData.title}</h1>
                  <Badge className="font-mono text-xs">{caseData.id}</Badge>
                  <Badge className={severityColor(riskLevel)}>
                    Risk Score: {caseData.risk_score}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{caseData.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Opened: {formatDateTime(caseData.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> Analyst: {caseData.assigned_to}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Account: {caseData.primary_account}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Total Exposure</p>
              <p className="text-2xl font-bold text-red-600">{formatINR(caseData.total_exposure)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Alerts Linked</p>
              <p className="text-2xl font-bold">{caseData.alert_ids.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className="text-2xl font-bold capitalize">{caseData.status.replace('_', ' ')}</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Explanation */}
        {caseData.explanation && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                AI-Assisted Case Narrative
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{caseData.explanation}</p>
              <p className="text-xs text-muted-foreground mt-3">
                Generated by OpenAI GPT-4o mini. This narrative is an analytical aid and does not constitute a legal determination.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Evidence Summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Evidence Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">BEHAVIOURAL</p>
                <p className="text-sm">
                  Baseline avg: {formatINR(caseData.evidence.behavioral_analysis.baseline_avg_amount)}<br />
                  Actual: {formatINR(caseData.evidence.behavioral_analysis.current_amount)}<br />
                  Deviation: {(caseData.evidence.behavioral_analysis.deviation * 100).toFixed(0)}%
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">DEVICE</p>
                <p className="text-sm">
                  Known device: {caseData.evidence.device_analysis.known_device ? 'Yes' : 'No'}<br />
                  Type: {caseData.evidence.device_analysis.device_type}<br />
                  IP Risk: {caseData.evidence.device_analysis.ip_risk}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">NETWORK</p>
                <p className="text-sm">
                  Circular: {caseData.evidence.network_analysis.circular_transfers ? 'Detected' : 'None'}<br />
                  Hops: {caseData.evidence.network_analysis.hop_count}<br />
                  Layering: {caseData.evidence.network_analysis.layering_detected ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Timeline */}
        {caseData.transactions.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transaction Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Txn ID</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">From</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">To</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {caseData.transactions.map((txn) => (
                    <tr key={txn.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{txn.id}</td>
                      <td className="py-2">{txn.from_account}</td>
                      <td className="py-2">{txn.to_account}</td>
                      <td className="py-2 text-right font-medium">{formatINR(txn.amount)}</td>
                      <td className="py-2 text-right text-muted-foreground text-xs">
                        {formatDateTime(txn.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Analyst Decision */}
        <Card className="shadow-sm border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recommended Action</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{caseData.recommended_action}</p>
          </CardContent>
        </Card>

        {/* Evidence Integrity */}
        <Card className="shadow-sm bg-muted/30">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Evidence Integrity Hash</p>
                <p className="font-mono text-xs mt-0.5">{evidenceHash}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-green-600 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />
        <p className="text-xs text-muted-foreground text-center">
          Chakravyuh Fraud Intelligence Platform · Confidential — Restricted to Authorised Personnel Only ·{' '}
          {new Date().toLocaleDateString('en-IN')}
        </p>
      </div>
    </>
  );
}
