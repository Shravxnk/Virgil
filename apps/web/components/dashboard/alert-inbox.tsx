// components/dashboard/alert-inbox.tsx
'use client';

import Link from 'next/link';
import { Alert } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { SeverityBadge, StatusBadge } from '@/components/shared/status-badge';
import { RiskBadge } from '@/components/shared/risk-badge';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface AlertInboxProps {
  alerts: Alert[];
  compact?: boolean;
}

export function AlertInbox({ alerts, compact = false }: AlertInboxProps) {
  if (alerts.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 rounded"
        style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}
      >
        <AlertTriangle className="h-10 w-10 mb-3" style={{ color: '#1E2D45' }} />
        <p className="text-xs" style={{ color: '#8899BB' }}>No alerts to display</p>
      </div>
    );
  }

  return (
    <div className="rounded overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1E2D45' }}>
        <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#8899BB' }}>
          Recent Alerts
        </p>
        <Link
          href="/analyst/alerts"
          className="flex items-center gap-1 text-[11px] transition-colors"
          style={{ color: '#60A5FA' }}
        >
          View all <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Rows */}
      <div
        className="overflow-y-auto divide-y"
        style={{ maxHeight: compact ? 300 : 460 }}
      >
        {alerts.map((alert, idx) => (
          <Link
            key={alert.id}
            href={alert.case_id ? `/analyst/cases/${alert.case_id}` : '/analyst/alerts'}
            className="flex items-center gap-3 px-4 py-3 transition-colors"
            style={{ borderBottom: idx < alerts.length - 1 ? '1px solid #1E2D45' : 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#1A2235'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'; }}
          >
            <RiskBadge score={alert.risk_score} size="sm" showLabel={false} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <SeverityBadge value={alert.severity} />
                <StatusBadge value={alert.status} />
              </div>
              <p className="text-xs font-medium truncate" style={{ color: '#F0F4FF' }}>{alert.title}</p>
              <p className="text-[11px] truncate" style={{ color: '#8899BB' }}>
                {alert.account_name} · {formatCurrency(alert.amount)}
              </p>
            </div>

            <span className="text-[10px] tabular-nums shrink-0" style={{ color: '#4A5F80' }}>
              {formatDateTime(alert.timestamp)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
