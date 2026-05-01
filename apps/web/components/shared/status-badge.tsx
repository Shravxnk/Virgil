// components/shared/status-badge.tsx
'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  value: string;
  className?: string;
}

const SEVERITY_MAP: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'rgba(239,68,68,0.12)',  text: '#EF4444', border: 'rgba(239,68,68,0.25)'  },
  high:     { bg: 'rgba(249,115,22,0.12)', text: '#F97316', border: 'rgba(249,115,22,0.25)' },
  medium:   { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  low:      { bg: 'rgba(34,197,94,0.12)',  text: '#22C55E', border: 'rgba(34,197,94,0.25)'  },
};

const STATUS_MAP: Record<string, { bg: string; text: string; border: string }> = {
  new:                 { bg: 'rgba(59,130,246,0.12)',  text: '#60A5FA', border: 'rgba(59,130,246,0.25)'  },
  open:                { bg: 'rgba(59,130,246,0.12)',  text: '#60A5FA', border: 'rgba(59,130,246,0.25)'  },
  investigating:       { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B', border: 'rgba(245,158,11,0.25)'  },
  escalated:           { bg: 'rgba(239,68,68,0.12)',   text: '#EF4444', border: 'rgba(239,68,68,0.25)'   },
  resolved:            { bg: 'rgba(34,197,94,0.12)',   text: '#22C55E', border: 'rgba(34,197,94,0.25)'   },
  resolved_fraud:      { bg: 'rgba(239,68,68,0.1)',    text: '#F87171', border: 'rgba(239,68,68,0.2)'    },
  resolved_legitimate: { bg: 'rgba(34,197,94,0.12)',   text: '#22C55E', border: 'rgba(34,197,94,0.25)'   },
  closed:              { bg: 'rgba(136,153,187,0.1)',  text: '#8899BB', border: 'rgba(136,153,187,0.2)'  },
  confirmed_fraud:     { bg: 'rgba(239,68,68,0.12)',   text: '#EF4444', border: 'rgba(239,68,68,0.25)'   },
};

function BaseBadge({
  value,
  map,
  className,
}: {
  value: string;
  map: Record<string, { bg: string; text: string; border: string }>;
  className?: string;
}) {
  const style = map[value] ?? { bg: 'rgba(136,153,187,0.1)', text: '#8899BB', border: 'rgba(136,153,187,0.2)' };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider',
        className,
      )}
      style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.text }} />
      {value.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

export function SeverityBadge({ value, className }: BadgeProps) {
  return <BaseBadge value={value} map={SEVERITY_MAP} className={className} />;
}

export function StatusBadge({ value, className }: BadgeProps) {
  return <BaseBadge value={value} map={STATUS_MAP} className={className} />;
}
