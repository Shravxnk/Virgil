// components/dashboard/case-table.tsx
'use client';

import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { RiskBadge } from '@/components/shared/risk-badge';
import { CaseListItem } from '@/types';
import { FileSearch } from 'lucide-react';

interface CaseTableProps {
  cases: CaseListItem[];
}

export function CaseTable({ cases }: CaseTableProps) {
  if (cases.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 rounded"
        style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}
      >
        <FileSearch className="h-10 w-10 mb-3" style={{ color: '#1E2D45' }} />
        <p className="text-xs" style={{ color: '#8899BB' }}>No cases found</p>
      </div>
    );
  }

  return (
    <div className="rounded overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1E2D45' }}>
        <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#8899BB' }}>
          Investigation Cases
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid #1E2D45' }}>
              {['Case', 'Status', 'Risk', 'Exposure', 'Assigned', 'Created'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left font-medium tracking-wide uppercase" style={{ color: '#4A5F80' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((c, idx) => (
              <tr
                key={c.id}
                className="transition-colors"
                style={{ borderBottom: idx < cases.length - 1 ? '1px solid #1E2D45' : 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#1A2235'; (e.currentTarget as HTMLTableRowElement).style.borderLeft = '2px solid #3B82F6'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLTableRowElement).style.borderLeft = 'none'; }}
              >
                <td className="px-4 py-3">
                  <Link href={`/analyst/cases/${c.id}`}>
                    <div className="text-xs font-mono font-medium" style={{ color: '#60A5FA' }}>{c.id}</div>
                    <div className="text-[11px] truncate max-w-[240px] mt-0.5" style={{ color: '#8899BB' }}>{c.title}</div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={c.status} />
                </td>
                <td className="px-4 py-3">
                  <RiskBadge score={c.risk_score} size="sm" showLabel={false} />
                </td>
                <td className="px-4 py-3 font-mono font-medium" style={{ color: '#F0F4FF' }}>
                  {formatCurrency(c.total_exposure)}
                </td>
                <td className="px-4 py-3" style={{ color: '#8899BB' }}>{c.assigned_to}</td>
                <td className="px-4 py-3 font-mono" style={{ color: '#4A5F80' }}>{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
