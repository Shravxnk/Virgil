// components/shared/risk-badge.tsx
'use client';

import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

function getRiskColor(score: number) {
  if (score >= 80) return { stroke: '#EF4444', glow: 'rgba(239,68,68,0.6)', text: '#EF4444', bg: 'rgba(239,68,68,0.08)' };
  if (score >= 60) return { stroke: '#F97316', glow: 'rgba(249,115,22,0.5)', text: '#F97316', bg: 'rgba(249,115,22,0.08)' };
  if (score >= 30) return { stroke: '#F59E0B', glow: 'rgba(245,158,11,0.4)', text: '#F59E0B', bg: 'rgba(245,158,11,0.08)' };
  return      { stroke: '#22C55E', glow: 'rgba(34,197,94,0.35)',  text: '#22C55E', bg: 'rgba(34,197,94,0.08)' };
}

export function RiskBadge({ score, size = 'md', showLabel = true, className }: RiskBadgeProps) {
  const { stroke, glow, text, bg } = getRiskColor(score);
  const isCritical = score >= 80;

  const dims = { sm: 44, md: 56, lg: 72 };
  const strokeWidths = { sm: 2.5, md: 3, lg: 3.5 };
  const d = dims[size];
  const sw = strokeWidths[size];

  const r = (d - sw * 2) / 2;
  const cx = d / 2;
  const cy = d / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: d, height: d }}
    >
      {/* Glow halo for critical */}
      {isCritical && (
        <div
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ boxShadow: `0 0 0 0 ${glow}` }}
        />
      )}

      <svg width={d} height={d} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={sw}
        />
        {/* Progress ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            filter: `drop-shadow(0 0 4px ${glow})`,
            transition: 'stroke-dashoffset 0.8s ease',
          }}
        />
      </svg>

      {/* Score number */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ backgroundColor: bg, borderRadius: '50%' }}
      >
        <span
          className={cn(
            'font-bold font-mono tabular-nums leading-none',
            size === 'sm' ? 'text-[11px]' : size === 'md' ? 'text-sm' : 'text-lg',
          )}
          style={{ color: text }}
        >
          {score}
        </span>
        {showLabel && size !== 'sm' && (
          <span className="text-[8px] tracking-wider mt-0.5" style={{ color: text, opacity: 0.7 }}>
            RISK
          </span>
        )}
      </div>
    </div>
  );
}

/** Flat inline risk score — no ring, just colored number */
export function RiskNumber({ score, className }: { score: number; className?: string }) {
  const { text } = getRiskColor(score);
  return (
    <span
      className={cn('font-mono font-bold tabular-nums', className)}
      style={{ color: text }}
    >
      {score}
    </span>
  );
}

/** Decision badge */
export function DecisionBadge({ decision }: { decision: string }) {
  const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
    block:         { bg: 'rgba(239,68,68,0.12)',  text: '#EF4444', border: 'rgba(239,68,68,0.25)',  label: 'BLOCKED' },
    manual_review: { bg: 'rgba(249,115,22,0.12)', text: '#F97316', border: 'rgba(249,115,22,0.25)', label: 'MANUAL REVIEW' },
    mfa:           { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', border: 'rgba(245,158,11,0.25)', label: 'MFA REQUIRED' },
    approve:       { bg: 'rgba(34,197,94,0.12)',  text: '#22C55E', border: 'rgba(34,197,94,0.25)',  label: 'APPROVED' },
  };
  const style = map[decision] ?? { bg: 'rgba(136,153,187,0.12)', text: '#8899BB', border: 'rgba(136,153,187,0.25)', label: decision.toUpperCase() };
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider"
      style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.text }} />
      {style.label}
    </span>
  );
}
