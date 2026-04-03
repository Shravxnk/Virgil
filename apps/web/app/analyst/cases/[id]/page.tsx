'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RiskGauge } from '@/components/dashboard/risk-score-card';
import { FraudNetwork } from '@/components/graph/fraud-network';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { api } from '@/lib/api';
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  severityColor,
  statusColor,
} from '@/lib/utils';
import { CaseDetailResponse, GraphData } from '@/types';
import {
  AlertTriangle,
  Clock,
  Download,
  FileText,
  MessageSquare,
  Network,
  Shield,
  User,
} from 'lucide-react';

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [caseData, setCaseData] = useState<CaseDetailResponse | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [detail, graph] = await Promise.all([
          api.getCase(caseId),
          api.getCaseGraph(caseId),
        ]);
        setCaseData(detail);
        setGraphData(graph);
      } catch (e) {
        console.error('Failed to load case', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [caseId]);

  const handleGenerateExplanation = async () => {
    if (!caseData?.alerts[0]) return;
    try {
      const result = await api.getAlertExplanation(caseData.alerts[0].id);
      setExplanation(result.explanation);
    } catch (e) {
      console.error('Failed to generate explanation', e);
    }
  };

  const handleDownloadReport = () => {
    window.open(api.getReportUrl(caseId), '_blank');
  };

  if (loading || !caseData) {
    return (
      <>
        <Header title={`Case ${caseId}`} />
        <div className="p-6">
          <DashboardSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={`Case ${caseData.id}`} />
      <div className="p-6 space-y-6">
        {/* Case Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <RiskGauge score={caseData.risk_score} size="lg" />
            <div>
              <h3 className="text-xl font-bold">{caseData.title}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={cn('text-xs', statusColor(caseData.status))}>
                  {caseData.status.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Assigned to {caseData.assigned_to}
                </span>
                <span className="text-sm text-muted-foreground">
                  · {formatDate(caseData.created_at)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                {caseData.recommended_action}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerateExplanation}>
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Explain
            </Button>
            <Button size="sm" onClick={handleDownloadReport}>
              <Download className="h-4 w-4 mr-2" />
              FIU Report
            </Button>
          </div>
        </div>

        {/* AI Explanation */}
        {explanation && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{explanation}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="graph">
              <Network className="h-3.5 w-3.5 mr-1.5" />
              Graph
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="evidence">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Evidence
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Alerts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Linked Alerts ({caseData.alerts.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {caseData.alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center gap-4 px-6 py-3">
                      <AlertTriangle
                        className={cn(
                          'h-4 w-4',
                          alert.severity === 'critical'
                            ? 'text-red-500'
                            : alert.severity === 'high'
                            ? 'text-orange-500'
                            : 'text-yellow-500',
                        )}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.alert_type} · {formatCurrency(alert.amount)}
                        </p>
                      </div>
                      <Badge className={cn('text-[10px]', severityColor(alert.severity))}>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Transactions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Transactions ({caseData.transactions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-6 py-2 text-left font-medium text-muted-foreground">ID</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">From → To</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Amount</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {caseData.transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-accent/50">
                          <td className="px-6 py-2 font-mono text-xs">{txn.id}</td>
                          <td className="px-4 py-2 text-xs">
                            {txn.from_account} → {txn.to_account}
                          </td>
                          <td className="px-4 py-2 font-medium">{formatCurrency(txn.amount)}</td>
                          <td className="px-4 py-2 text-xs">{txn.type}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {formatDateTime(txn.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Similar Cases */}
            {caseData.similar_cases.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Similar Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {caseData.similar_cases.map((sc) => (
                      <div
                        key={sc.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <span className="text-sm font-medium">{sc.id}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Similarity: {Math.round(sc.similarity * 100)}%
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{sc.outcome}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="graph" className="mt-4">
            {graphData ? (
              <FraudNetwork data={graphData} />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-20">
                  <p className="text-sm text-muted-foreground">Loading graph data...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Investigation Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  {caseData.timeline.map((event, i) => (
                    <div key={i} className="flex gap-4 pb-6 last:pb-0">
                      <div className="relative flex flex-col items-center">
                        <div
                          className={cn(
                            'h-3 w-3 rounded-full border-2',
                            event.event_type === 'alert'
                              ? 'border-red-500 bg-red-500/20'
                              : event.event_type === 'action'
                              ? 'border-blue-500 bg-blue-500/20'
                              : 'border-muted-foreground bg-muted',
                          )}
                        />
                        {i < caseData.timeline.length - 1 && (
                          <div className="absolute top-3 h-full w-px bg-border" />
                        )}
                      </div>
                      <div className="flex-1 -mt-0.5">
                        <p className="text-sm font-medium">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateTime(event.timestamp)}
                          {event.actor && ` · ${event.actor}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Evidence Package</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Behavioral Analysis */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Behavioral Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Avg. Transaction</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(caseData.evidence.behavioral_analysis.baseline_avg_amount)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Deviation</p>
                      <p className="text-sm font-medium">
                        {caseData.evidence.behavioral_analysis.deviation.toFixed(1)}x
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Unusual Timing</p>
                      <p className="text-sm font-medium">
                        {caseData.evidence.behavioral_analysis.time_anomaly ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Transaction Time</p>
                      <p className="text-sm font-medium">
                        {caseData.evidence.behavioral_analysis.transaction_time}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Device Intelligence */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Device Intelligence</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Device ID</p>
                      <p className="text-sm font-mono">{caseData.evidence.device_analysis.device_id}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Device Type</p>
                      <p className="text-sm font-medium">
                        {caseData.evidence.device_analysis.device_type}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Known Device</p>
                      <p className="text-sm font-medium">
                        {caseData.evidence.device_analysis.known_device ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{caseData.evidence.device_analysis.geo_location}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Graph Signals */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    Graph Signals
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-2xl font-bold">{caseData.evidence.network_analysis.circular_transfers ? 'Yes' : 'No'}</p>
                      <p className="text-xs text-muted-foreground">Circular Transfers</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-2xl font-bold">{caseData.evidence.network_analysis.hop_count}</p>
                      <p className="text-xs text-muted-foreground">Hop Count</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-2xl font-bold">{caseData.evidence.network_analysis.connected_suspicious_accounts}</p>
                      <p className="text-xs text-muted-foreground">Suspicious Accounts</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {caseData.notes.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Investigation Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {caseData.notes.map((note, i) => (
                      <div key={i} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{note.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(note.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
