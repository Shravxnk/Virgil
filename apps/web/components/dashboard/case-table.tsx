'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatCurrency, formatDate, statusColor } from '@/lib/utils';
import { CaseListItem } from '@/types';
import { FileSearch } from 'lucide-react';

interface CaseTableProps {
  cases: CaseListItem[];
}

export function CaseTable({ cases }: CaseTableProps) {
  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileSearch className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No cases found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Investigation Cases</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Case</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Risk</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Exposure</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-3">
                    <Link href={`/analyst/cases/${c.id}`} className="hover:underline">
                      <div className="font-medium">{c.id}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[280px]">
                        {c.title}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('text-[10px]', statusColor(c.status))}>
                      {c.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'font-bold',
                        c.risk_score >= 80
                          ? 'text-red-600'
                          : c.risk_score >= 60
                          ? 'text-orange-600'
                          : c.risk_score >= 30
                          ? 'text-yellow-600'
                          : 'text-green-600',
                      )}
                    >
                      {c.risk_score}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(c.total_exposure)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.assigned_to}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
