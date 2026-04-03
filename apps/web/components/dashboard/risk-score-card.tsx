'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, riskScoreColor, riskScoreBg } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface RiskScoreCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
}

export function RiskScoreCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: RiskScoreCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <p
            className={cn(
              'text-xs mt-1',
              trend.value >= 0 ? 'text-green-600' : 'text-red-600',
            )}
          >
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface RiskGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskGauge({ score, size = 'md' }: RiskGaugeProps) {
  const sizes = {
    sm: 'h-12 w-12 text-lg',
    md: 'h-20 w-20 text-2xl',
    lg: 'h-28 w-28 text-3xl',
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full border-4',
        sizes[size],
        score >= 80
          ? 'border-red-500'
          : score >= 60
          ? 'border-orange-500'
          : score >= 30
          ? 'border-yellow-500'
          : 'border-green-500',
      )}
    >
      <span className={cn('font-bold', riskScoreColor(score))}>{score}</span>
    </div>
  );
}
