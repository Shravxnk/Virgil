'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldCheck,
  ShieldX,
  Activity,
  Banknote,
  Smartphone,
  Timer,
  Network,
  User2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RiskSignals {
  amount_anomaly: number;
  time_anomaly: number;
  device_mismatch: boolean;
  beneficiary_risk: number;
  graph_risk: number;
  analyst_note?: string;
  resolved_at?: string;
}

interface AiSuggestion {
  suggestion: 'APPROVE' | 'REJECT';
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
  action: string;
  score: number;
}

interface ManualReviewItem {
  id: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  txn_type: string;
  channel: string;
  device_known: boolean;
  risk_score: number;
  risk_signals: RiskSignals;
  decision: string;
  created_at: string;
  scored_at: string | null;
  completed: boolean;
  explanation?: string;
  ai_suggestion: AiSuggestion;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColour(score: number) {
  if (score >= 80) return 'text-red-600';
  if (score >= 60) return 'text-orange-500';
  if (score >= 30) return 'text-yellow-500';
  return 'text-green-600';
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 30) return 'bg-yellow-400';
  return 'bg-green-500';
}

function fmtAmount(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return iso;
  }
}

function SignalBar({
  label,
  value,
  maxVal = 1,
  icon: Icon,
  invert = false,
}: {
  label: string;
  value: number;
  maxVal?: number;
  icon: React.ElementType;
  invert?: boolean;
}) {
  const pct = Math.min(100, (value / maxVal) * 100);
  const risk = invert ? 100 - pct : pct;
  const colour =
    risk >= 70 ? 'bg-red-500' : risk >= 40 ? 'bg-orange-400' : 'bg-green-500';
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div className="w-28 text-xs text-muted-foreground shrink-0">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-10 text-right text-xs font-mono text-foreground">
        {(value * (maxVal === 1 ? 100 : 1)).toFixed(maxVal === 1 ? 0 : 1)}{maxVal === 1 ? '%' : 'x'}
      </div>
    </div>
  );
}

// ─── Card component ───────────────────────────────────────────────────────────

function ReviewCard({
  item,
  onDecide,
}: {
  item: ManualReviewItem;
  onDecide: (id: string, decision: 'approved' | 'rejected', note: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);
  const [fullData, setFullData] = useState<{ explanation?: string; ai_suggestion?: AiSuggestion } | null>(null);

  const signals = item.risk_signals ?? {};
  const ai = fullData?.ai_suggestion ?? item.ai_suggestion;
  const explanation = fullData?.explanation;

  async function loadFull() {
    if (fullData) return;
    setLoadingFull(true);
    try {
      const data = await (api as any).getManualReviewItem(item.id);
      setFullData(data);
    } catch {
      // already have partial data
    } finally {
      setLoadingFull(false);
    }
  }

  async function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next) loadFull();
  }

  async function handleDecide(decision: 'approved' | 'rejected') {
    setDeciding(true);
    onDecide(item.id, decision, note);
  }

  const suggestApprove = ai?.suggestion === 'APPROVE';
  const confidenceColour = ai?.confidence === 'High'
    ? 'text-green-700 bg-green-50 border-green-200'
    : ai?.confidence === 'Low'
    ? 'text-red-700 bg-red-50 border-red-200'
    : 'text-yellow-700 bg-yellow-50 border-yellow-200';

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Score circle */}
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${scoreBg(item.risk_score)}`}>
          {item.risk_score}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{item.id}</span>
            <span className="text-xs rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 font-medium">
              MANUAL REVIEW
            </span>
            <span className="text-xs rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">{item.txn_type}</span>
            <span className="text-xs rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">{item.channel}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User2 className="h-3 w-3" />
              <span className="font-mono">{item.from_account}</span>
              <span>→</span>
              <span className="font-mono">{item.to_account}</span>
            </span>
            <span className="font-semibold text-foreground text-sm">{fmtAmount(item.amount)}</span>
            <span>{fmtTime(item.created_at)}</span>
          </div>
        </div>

        {/* AI Badge */}
        <div className={`hidden md:flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs font-semibold ${confidenceColour}`}>
          <Cpu className="h-3.5 w-3.5" />
          AI: {ai?.suggestion ?? '…'} ({ai?.confidence ?? '…'})
        </div>

        {/* Expand toggle */}
        <button
          onClick={handleExpand}
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Score bar */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>Risk Score</span>
          <span className={`font-bold ml-auto ${scoreColour(item.risk_score)}`}>{item.risk_score}/100</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden relative">
          <div className={`h-full rounded-full ${scoreBg(item.risk_score)} transition-all`} style={{ width: `${item.risk_score}%` }} />
          {/* threshold markers */}
          {[30, 60, 80].map(t => (
            <div key={t} className="absolute top-0 bottom-0 w-px bg-gray-400/40" style={{ left: `${t}%` }} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>0</span>
          <span className="text-green-600">30 Approve</span>
          <span className="text-yellow-600">60 MFA</span>
          <span className="text-orange-600">80 Block</span>
          <span>100</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t bg-slate-50/60 px-5 py-4 space-y-5">
          {loadingFull && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading full AI analysis…
            </div>
          )}

          {/* Signal breakdown */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Signal Breakdown
            </h4>
            <div className="space-y-2.5">
              <SignalBar label="Amount Anomaly" value={signals.amount_anomaly ?? 0} maxVal={20} icon={Banknote} />
              <SignalBar label="Time Anomaly" value={signals.time_anomaly ?? 0} maxVal={1} icon={Timer} />
              <SignalBar label="Device Risk" value={signals.device_mismatch ? 1 : 0} maxVal={1} icon={Smartphone} />
              <SignalBar label="Beneficiary" value={signals.beneficiary_risk ?? 0} maxVal={1} icon={User2} />
              <SignalBar label="Network/Graph" value={signals.graph_risk ?? 0} maxVal={1} icon={Network} />
            </div>

            {/* Device tag */}
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                item.device_known
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {item.device_known ? '✅ Known Device' : '⚠️ Unknown Device'}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                (signals.amount_anomaly ?? 0) > 5
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
              }`}>
                {(signals.amount_anomaly ?? 0) > 0
                  ? `${(signals.amount_anomaly ?? 0).toFixed(1)}x Amount Deviation`
                  : 'Normal Amount'}
              </span>
            </div>
          </div>

          {/* AI Suggestion box */}
          {ai && (
            <div className={`rounded-lg border p-4 ${
              suggestApprove
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  suggestApprove ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {suggestApprove
                    ? <ShieldCheck className="h-4 w-4 text-green-700" />
                    : <ShieldX className="h-4 w-4 text-red-700" />
                  }
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`font-bold text-sm ${suggestApprove ? 'text-green-800' : 'text-red-800'}`}>
                      AI Suggests: {ai.suggestion}
                    </span>
                    <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${confidenceColour}`}>
                      {ai.confidence} Confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{ai.reasoning}</p>
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-600">
                    <Activity className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span><strong>Suggested action:</strong> {ai.action}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full AI Explanation */}
          {explanation && (
            <div className="rounded-lg border bg-white p-4">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" /> Full AI Analyst Briefing
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{explanation}</p>
            </div>
          )}

          {/* Analyst decision area */}
          <div className="rounded-lg border bg-white p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Your Decision</h4>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional: Add a note for audit trail (e.g. Called account holder at +91-XXXXX, confirmed legitimate)"
              className="w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
              rows={2}
            />
            <div className="flex gap-3">
              <button
                disabled={deciding}
                onClick={() => handleDecide('approved')}
                className="flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve Transaction
              </button>
              <button
                disabled={deciding}
                onClick={() => handleDecide('rejected')}
                className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ items }: { items: ManualReviewItem[] }) {
  const total = items.length;
  const aiApprove = items.filter(i => i.ai_suggestion?.suggestion === 'APPROVE').length;
  const aiReject = items.filter(i => i.ai_suggestion?.suggestion === 'REJECT').length;
  const highConf = items.filter(i => i.ai_suggestion?.confidence === 'High').length;
  const avgScore = total ? Math.round(items.reduce((s, i) => s + i.risk_score, 0) / total) : 0;
  const totalExp = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {[
        { label: 'Pending Review', value: total, sub: 'awaiting decision', colour: 'text-orange-600' },
        { label: 'AI: Approve', value: aiApprove, sub: 'suggested legit', colour: 'text-green-600' },
        { label: 'AI: Reject', value: aiReject, sub: 'suggested fraud', colour: 'text-red-600' },
        { label: 'High Confidence', value: highConf, sub: 'AI certainty', colour: 'text-blue-600' },
        { label: 'Total Exposure', value: fmtAmount(totalExp), sub: 'funds on hold', colour: 'text-purple-600' },
      ].map(s => (
        <div key={s.label} className="rounded-xl border bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
          <p className={`text-2xl font-bold ${s.colour}`}>{s.value}</p>
          <p className="text-[11px] text-muted-foreground">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManualReviewPage() {
  const [items, setItems] = useState<ManualReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'approve' | 'reject'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'amount' | 'time'>('score');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await (api as any).getManualReviewQueue();
      setItems(data.manual_review ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDecide(id: string, decision: 'approved' | 'rejected', note: string) {
    try {
      await (api as any).decideManualReview(id, decision, note);
      setResolvedIds(prev => new Set(Array.from(prev).concat(id)));
    } catch (e: any) {
      alert(`Failed to submit decision: ${e.message}`);
    }
  }

  const visible = items
    .filter(i => !resolvedIds.has(i.id))
    .filter(i => {
      if (filter === 'approve') return i.ai_suggestion?.suggestion === 'APPROVE';
      if (filter === 'reject') return i.ai_suggestion?.suggestion === 'REJECT';
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.risk_score - a.risk_score;
      if (sortBy === 'amount') return b.amount - a.amount;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manual Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Transactions the AI scored 60–79 — uncertain enough to need your eyes.
            AI pre-analysis shown for each to speed up your decision.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Auto-resolve banner */}
      <div className="mt-4 mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
        <Cpu className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>AI Auto-Assist active.</strong> Each transaction below includes an AI-generated approve/reject suggestion with confidence rating and a specific verification action. 
          High-confidence suggestions are marked — you can bulk-act on those to reduce manual work.
        </div>
      </div>

      {/* Stats */}
      {!loading && !error && <StatsBar items={items.filter(i => !resolvedIds.has(i.id))} />}

      {/* Filters + sort */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Filter AI:</span>
        {(['all', 'approve', 'reject'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              filter === f
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-muted-foreground border-gray-200 hover:border-primary/40'
            }`}
          >
            {f === 'all' ? 'All' : f === 'approve' ? '✅ AI Approve' : '❌ AI Reject'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="text-xs rounded-lg border px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="score">Risk Score ↓</option>
            <option value="amount">Amount ↓</option>
            <option value="time">Newest First</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading manual review queue with AI analysis…</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <p className="text-xs text-red-500 mt-1">Make sure the backend is running at localhost:8000</p>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="rounded-xl border bg-white p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Queue is clear!</h3>
          <p className="text-sm text-muted-foreground">
            {resolvedIds.size > 0
              ? `You resolved ${resolvedIds.size} transaction${resolvedIds.size > 1 ? 's' : ''} this session. ✌️`
              : 'No transactions are pending manual review right now.'}
          </p>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="space-y-4">
          {visible.map(item => (
            <ReviewCard key={item.id} item={item} onDecide={handleDecide} />
          ))}
        </div>
      )}

      {/* Resolved this session */}
      {resolvedIds.size > 0 && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800">
            <strong>{resolvedIds.size}</strong> transaction{resolvedIds.size > 1 ? 's' : ''} resolved this session.
            All decisions are written to the database with timestamp and analyst note for audit trail.
          </p>
        </div>
      )}
    </div>
  );
}
