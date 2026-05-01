'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { SeverityBadge, StatusBadge } from '@/components/shared/status-badge';
import { RiskBadge } from '@/components/shared/risk-badge';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Alert, AlertListResponse } from '@/types';
import { AlertTriangle, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function AlertsPage() {
  const [data, setData] = useState<AlertListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (severity !== 'all') params.severity = severity;
        if (status !== 'all') params.status = status;
        const result = await api.getAlerts(params);
        setData(result);
        setError(null);
      } catch (e) {
        console.error('Failed to load alerts', e);
        setError('Failed to load alerts. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [severity, status]);

  const filtered = data?.alerts.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.account_name.toLowerCase().includes(q)
    );
  });

  const selectStyle = {
    backgroundColor: '#111827',
    border: '1px solid #1E2D45',
    color: '#F0F4FF',
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 12,
    outline: 'none',
  };

  return (
    <>
      <Header title="Alert Inbox" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#4A5F80' }} />
            <input
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...selectStyle, paddingLeft: 32, width: 240 }}
            />
          </div>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={selectStyle}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
          {data && (
            <span className="ml-auto text-xs font-mono self-center" style={{ color: '#8899BB' }}>
              {filtered?.length ?? 0} / {data.total} alerts
            </span>
          )}
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="rounded p-8 text-center" style={{ border: '1px solid #EF444430', backgroundColor: '#EF444410' }}>
            <AlertTriangle className="h-8 w-8 mx-auto mb-3" style={{ color: '#EF4444' }} />
            <p className="text-sm font-medium" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="rounded p-12 text-center" style={{ border: '1px solid #1E2D45', backgroundColor: '#111827' }}>
            <AlertTriangle className="h-10 w-10 mx-auto mb-3" style={{ color: '#1E2D45' }} />
            <p className="text-xs" style={{ color: '#8899BB' }}>No alerts match your filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <div
      className="flex items-center gap-4 rounded px-4 py-3 transition-colors cursor-pointer"
      style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#1A2235';
        (e.currentTarget as HTMLDivElement).style.borderLeftColor = '#3B82F6';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#111827';
        (e.currentTarget as HTMLDivElement).style.borderLeftColor = '#1E2D45';
      }}
    >
      <RiskBadge score={alert.risk_score} size="sm" showLabel={false} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono" style={{ color: '#4A5F80' }}>{alert.id}</span>
          <SeverityBadge value={alert.severity} />
          <StatusBadge value={alert.status} />
        </div>
        <p className="text-xs font-medium truncate" style={{ color: '#F0F4FF' }}>{alert.title}</p>
        <p className="text-[11px]" style={{ color: '#8899BB' }}>
          {alert.account_name} · {formatCurrency(alert.amount)} · {alert.alert_type}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-mono" style={{ color: '#4A5F80' }}>{formatDateTime(alert.timestamp)}</p>
        {alert.case_id && (
          <Link
            href={`/analyst/cases/${alert.case_id}`}
            className="flex items-center gap-1 text-[10px] mt-1 justify-end"
            style={{ color: '#60A5FA' }}
          >
            <ExternalLink className="h-3 w-3" />
            {alert.case_id}
          </Link>
        )}
      </div>
    </div>
  );
}
