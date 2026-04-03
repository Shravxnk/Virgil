'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { api } from '@/lib/api';
import { cn, formatCurrency, formatDateTime, severityColor, statusColor } from '@/lib/utils';
import { Alert, AlertListResponse } from '@/types';
import { AlertTriangle, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function AlertsPage() {
  const [data, setData] = useState<AlertListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const params: Record<string, string> = {};
        if (severity !== 'all') params.severity = severity;
        if (status !== 'all') params.status = status;
        const result = await api.getAlerts(params);
        setData(result);
      } catch (e) {
        console.error('Failed to load alerts', e);
      } finally {
        setLoading(false);
      }
    }
    load();
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

  return (
    <>
      <Header title="Alert Inbox" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : !filtered || filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No alerts match your filters</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-2">
              {filtered.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="flex items-center gap-4 py-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold',
            alert.risk_score >= 80
              ? 'bg-red-500/10 text-red-600'
              : alert.risk_score >= 60
              ? 'bg-orange-500/10 text-orange-600'
              : alert.risk_score >= 30
              ? 'bg-yellow-500/10 text-yellow-600'
              : 'bg-green-500/10 text-green-600',
          )}
        >
          {alert.risk_score}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-muted-foreground">{alert.id}</span>
            <Badge className={cn('text-[10px]', severityColor(alert.severity))}>
              {alert.severity}
            </Badge>
            <Badge variant="outline" className={cn('text-[10px]', statusColor(alert.status))}>
              {alert.status}
            </Badge>
          </div>
          <p className="text-sm font-medium truncate">{alert.title}</p>
          <p className="text-xs text-muted-foreground">
            {alert.account_name} · {formatCurrency(alert.amount)} · {alert.alert_type}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">{formatDateTime(alert.timestamp)}</p>
          {alert.case_id && (
            <Link href={`/analyst/cases/${alert.case_id}`}>
              <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs gap-1">
                <ExternalLink className="h-3 w-3" />
                {alert.case_id}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
