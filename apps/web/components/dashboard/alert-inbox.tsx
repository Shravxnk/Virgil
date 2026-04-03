'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  cn,
  formatCurrency,
  formatDateTime,
  severityColor,
  statusColor,
} from '@/lib/utils';
import { Alert } from '@/types';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface AlertInboxProps {
  alerts: Alert[];
  compact?: boolean;
}

export function AlertInbox({ alerts, compact = false }: AlertInboxProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No alerts to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Recent Alerts</CardTitle>
          <Link
            href="/analyst/alerts"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={compact ? 'h-[320px]' : 'h-[480px]'}>
          <div className="divide-y">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.case_id ? `/analyst/cases/${alert.case_id}` : '/analyst/alerts'}
                className="flex items-start gap-4 px-6 py-3.5 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn('text-[10px]', severityColor(alert.severity))}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline" className={cn('text-[10px]', statusColor(alert.status))}>
                      {alert.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDateTime(alert.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.account_name} · {formatCurrency(alert.amount)}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className={cn(
                      'text-lg font-bold',
                      alert.risk_score >= 80
                        ? 'text-red-600'
                        : alert.risk_score >= 60
                        ? 'text-orange-600'
                        : alert.risk_score >= 30
                        ? 'text-yellow-600'
                        : 'text-green-600',
                    )}
                  >
                    {alert.risk_score}
                  </span>
                  <span className="text-[10px] text-muted-foreground">risk</span>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
