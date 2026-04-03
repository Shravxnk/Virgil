import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

export function severityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 border border-red-200',
    high: 'bg-orange-50 text-orange-700 border border-orange-200',
    medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    low: 'bg-green-50 text-green-700 border border-green-200',
  };
  return colors[severity] || colors.low;
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border border-blue-200',
    open: 'bg-blue-50 text-blue-700 border border-blue-200',
    investigating: 'bg-amber-50 text-amber-700 border border-amber-200',
    escalated: 'bg-red-50 text-red-700 border border-red-200',
    resolved: 'bg-green-50 text-green-700 border border-green-200',
    resolved_fraud: 'bg-red-50 text-red-700 border border-red-200',
    resolved_legitimate: 'bg-green-50 text-green-700 border border-green-200',
    closed: 'bg-slate-50 text-slate-600 border border-slate-200',
  };
  return colors[status] || colors.new;
}

export function riskScoreColor(score: number): string {
  if (score >= 80) return 'text-red-600 dark:text-red-400';
  if (score >= 60) return 'text-orange-600 dark:text-orange-400';
  if (score >= 30) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

export function riskScoreBg(score: number): string {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 30) return 'bg-yellow-500';
  return 'bg-green-500';
}
