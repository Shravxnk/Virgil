'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
  ChevronRight,
  Clock,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ScoringResult {
  pre_txn_id: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  score: number;
  decision: 'approve' | 'mfa' | 'manual_review' | 'block';
  reason_codes: string[];
  amount_anomaly: number;
  behavioral_mismatch: number;
  device_mismatch: boolean;
  time_anomaly: number;
  beneficiary_risk: number;
  graph_risk: number;
  explanation: string | null;
  scored_at: string;
}

const DECISION_CONFIG = {
  approve: {
    label: 'APPROVED',
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle2,
    barColor: 'bg-green-500',
    description: 'Transaction passes all risk checks. Proceeding.',
  },
  mfa: {
    label: 'STEP-UP MFA',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Smartphone,
    barColor: 'bg-amber-500',
    description: 'Elevated risk detected. Additional authentication required.',
  },
  manual_review: {
    label: 'MANUAL REVIEW',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: AlertTriangle,
    barColor: 'bg-orange-500',
    description: 'High risk signals detected. Routed to analyst queue.',
  },
  block: {
    label: 'BLOCKED',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
    barColor: 'bg-red-500',
    description: 'Transaction blocked. Risk score exceeds fraud threshold.',
  },
};

const REASON_LABELS: Record<string, string> = {
  AMOUNT_DEVIATION: 'Amount far exceeds account baseline',
  TIME_ANOMALY: 'Transaction outside usual active hours',
  NEW_DEVICE: 'Unrecognised or low-trust device',
  HIGH_RISK_IP: 'High-risk IP / VPN detected',
  FIRST_TIME_BENEFICIARY: 'First-ever transfer to this recipient',
  CIRCULAR_TRANSFERS: 'Circular fund flow pattern detected',
  LAYERING_DETECTED: 'Multi-hop layering pattern detected',
  FLAG_PRIOR_INVESTIGATION: 'Recipient has prior fraud history',
  FLAG_HIGH_RISK_JURISDICTION: 'Recipient in high-risk jurisdiction',
  FLAG_SHELL_COMPANY_INDICATORS: 'Recipient shows shell company indicators',
};

function formatReasonCode(code: string): string {
  for (const [prefix, label] of Object.entries(REASON_LABELS)) {
    if (code.startsWith(prefix)) return label;
  }
  return code.replace(/_/g, ' ');
}

const SIGNAL_BARS = [
  { key: 'amount_anomaly', label: 'Amount Anomaly', max: 25 },
  { key: 'time_anomaly', label: 'Time Anomaly', max: 15 },
  { key: 'beneficiary_risk', label: 'Beneficiary Risk', max: 20 },
  { key: 'graph_risk', label: 'Graph / Network Risk', max: 25 },
  { key: 'behavioral_mismatch', label: 'Behavioural Mismatch', max: 15 },
];

// Pre-filled demo scenarios
const DEMO_SCENARIOS = [
  {
    label: '✅ Normal transfer',
    from_account: 'ACC-003',
    to_account: 'ACC-001',
    amount: '15000',
    txn_type: 'UPI',
    device_known: 'true',
  },
  {
    label: '⚠️ Large unusual transfer',
    from_account: 'ACC-004',
    to_account: 'ACC-012',
    amount: '980000',
    txn_type: 'IMPS',
    device_known: 'false',
  },
  {
    label: '🚫 Mule network transfer',
    from_account: 'ACC-010',
    to_account: 'ACC-016',
    amount: '499000',
    txn_type: 'NEFT',
    device_known: 'false',
  },
  {
    label: '🔐 ATO attempt',
    from_account: 'ACC-004',
    to_account: 'ACC-015',
    amount: '250000',
    txn_type: 'RTGS',
    device_known: 'false',
  },
];

export default function PreTransactionScorerPage() {
  const [form, setForm] = useState({
    from_account: 'ACC-001',
    to_account: 'ACC-012',
    amount: '50000',
    txn_type: 'UPI',
    channel: 'mobile',
    device_known: 'true',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyScenario = (s: (typeof DEMO_SCENARIOS)[number]) => {
    setForm((f) => ({
      ...f,
      from_account: s.from_account,
      to_account: s.to_account,
      amount: s.amount,
      txn_type: s.txn_type,
      device_known: s.device_known,
    }));
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/transactions/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_account: form.from_account,
          to_account: form.to_account,
          amount: parseFloat(form.amount),
          txn_type: form.txn_type,
          channel: form.channel,
          device_known: form.device_known === 'true',
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? DECISION_CONFIG[result.decision] : null;
  const DecisionIcon = cfg?.icon ?? Info;

  return (
    <>
      <Header title="Live Transaction Scorer" />
      <div className="p-6 space-y-6">

        {/* Explainer banner */}
        <div className="rounded-xl border bg-primary/5 px-5 py-4 flex items-start gap-4">
          <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Pre-Transaction Real-Time Decisioning</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This engine scores a transaction <strong>before it executes</strong> — the same pipeline that
              powers the GPay mock. Risk signals include behavioural baseline deviation, device trust,
              time-of-day anomaly, first-time beneficiary, and graph/network analysis.
              Decisions: Approve → MFA → Manual Review → Block.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Input Form */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Transaction Details
              </CardTitle>
              <CardDescription>Enter transaction parameters to score in real-time</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Demo Scenarios */}
              <div className="mb-5">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Quick demo scenarios</p>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_SCENARIOS.map((s) => (
                    <Button
                      key={s.label}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5 px-2 text-left justify-start"
                      onClick={() => applyScenario(s)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs mb-1.5 block font-medium text-foreground">From Account</label>
                    <Input
                      value={form.from_account}
                      onChange={(e) => setForm({ ...form, from_account: e.target.value })}
                      placeholder="ACC-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-medium text-foreground">To Account</label>
                    <Input
                      value={form.to_account}
                      onChange={(e) => setForm({ ...form, to_account: e.target.value })}
                      placeholder="ACC-012"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-medium text-foreground">Amount (₹)</label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="50000"
                    min="1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs mb-1.5 block font-medium text-foreground">Transaction Type</label>
                    <Select value={form.txn_type} onValueChange={(v) => setForm({ ...form, txn_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="IMPS">IMPS</SelectItem>
                        <SelectItem value="NEFT">NEFT</SelectItem>
                        <SelectItem value="RTGS">RTGS</SelectItem>
                        <SelectItem value="SWIFT">SWIFT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-medium text-foreground">Channel</label>
                    <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mobile">Mobile App</SelectItem>
                        <SelectItem value="internet_banking">Internet Banking</SelectItem>
                        <SelectItem value="branch">Branch</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-medium text-foreground">Device Status</label>
                  <Select value={form.device_known} onValueChange={(v) => setForm({ ...form, device_known: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Known / Trusted Device</SelectItem>
                      <SelectItem value="false">Unknown / New Device</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scoring...</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" />Score Transaction</>
                  )}
                </Button>
              </form>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result Panel */}
          <div className="space-y-4">
            {!result && !loading && (
              <Card className="shadow-sm h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">
                    Fill in the transaction details and click<br /><strong>Score Transaction</strong> to get a real-time decision.
                  </p>
                </CardContent>
              </Card>
            )}

            {result && cfg && (
              <>
                {/* Decision Card */}
                <Card className={cn('shadow-sm border-2', result.decision === 'block' ? 'border-red-200' : result.decision === 'approve' ? 'border-green-200' : 'border-amber-200')}>
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', cfg.color.split(' ')[0])}>
                        <DecisionIcon className={cn('h-7 w-7', cfg.color.split(' ')[1])} />
                      </div>
                      <div>
                        <Badge className={cn('text-sm font-bold px-3 py-1 border', cfg.color)}>
                          {cfg.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{cfg.description}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-4xl font-bold text-foreground">{result.score.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">/ 100 risk score</p>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0 — Low Risk</span>
                        <span>100 — Critical</span>
                      </div>
                      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', cfg.barColor)}
                          style={{ width: `${result.score}%` }}
                        />
                        {/* Threshold markers */}
                        <div className="absolute top-0 left-[30%] h-full w-0.5 bg-white/60" />
                        <div className="absolute top-0 left-[60%] h-full w-0.5 bg-white/60" />
                        <div className="absolute top-0 left-[80%] h-full w-0.5 bg-white/60" />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Approve &lt;30</span>
                        <span>MFA 30-60</span>
                        <span>Review 60-80</span>
                        <span>Block &gt;80</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Signal Breakdown */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Signal Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {SIGNAL_BARS.map(({ key, label, max }) => {
                      const raw = result[key as keyof ScoringResult] as number;
                      const val = typeof raw === 'boolean' ? (raw ? max : 0) : (raw ?? 0);
                      const pct = Math.min(100, (val / max) * 100);
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium">{val.toFixed(1)} / {max}</span>
                          </div>
                          <Progress
                            value={pct}
                            className={cn('h-2', pct > 70 ? '[&>div]:bg-red-500' : pct > 40 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500')}
                          />
                        </div>
                      );
                    })}
                    {result.device_mismatch && (
                      <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">
                        <Smartphone className="h-3.5 w-3.5" />
                        Device mismatch — unrecognised device used
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reason Codes */}
                {result.reason_codes.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Triggered Risk Signals</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.reason_codes.map((rc) => (
                        <div key={rc} className="flex items-start gap-2 text-xs">
                          <ChevronRight className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-mono text-[10px] text-muted-foreground">{rc}</span>
                            <p className="text-foreground">{formatReasonCode(rc)}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* AI Explanation */}
                {result.explanation && (
                  <Card className="shadow-sm border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        AI Analyst Briefing
                      </CardTitle>
                      <CardDescription className="text-xs">Generated by GPT-4o mini</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                        {result.explanation}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(result.scored_at).toLocaleTimeString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    Ref: {result.pre_txn_id}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
