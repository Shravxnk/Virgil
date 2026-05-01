// components/dashboard/risk-score-card.tsx
'use client';

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { RiskBadge } from '@/components/shared/risk-badge';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  accentColor?: string;
  className?: string;
}

export function RiskScoreCard({ title, value, subtitle, icon: Icon, trend, accentColor = '#3B82F6' }: KpiCardProps) {
  const trendUp = trend && trend.value >= 0;
  return (
    <div
      className="rounded p-4 relative overflow-hidden"
      style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />

      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-medium tracking-wide uppercase" style={{ color: '#8899BB' }}>{title}</p>
        <div
          className="flex h-7 w-7 items-center justify-center rounded"
          style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
        </div>
      </div>

      <div className="text-2xl font-bold font-display tracking-tight mb-1" style={{ color: '#F0F4FF' }}>
        {value}
      </div>

      {subtitle && <p className="text-[11px] mb-1" style={{ color: '#8899BB' }}>{subtitle}</p>}

      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trendUp
            ? <TrendingUp className="h-3 w-3" style={{ color: '#22C55E' }} />
            : <TrendingDown className="h-3 w-3" style={{ color: '#EF4444' }} />
          }
          <span className="text-[10px] font-medium" style={{ color: trendUp ? '#22C55E' : '#EF4444' }}>
            {Math.abs(trend.value)}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

export function RiskGauge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  return <RiskBadge score={score} size={size} />;
}
