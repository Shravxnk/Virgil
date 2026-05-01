'use client';

import { useEffect, useState } from 'react';
import { Bell, User, ChevronRight } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });

  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 rounded px-2 py-1"
        style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#16A34A', animation: 'livePulse 2s infinite', display: 'inline-block' }} />
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: '#15803D' }}>LIVE</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: '#334155', fontSize: 12 }}>{timeStr} IST</span>
        <span style={{ fontSize: 9, color: '#94A3B8', lineHeight: 1.2 }}>{dateStr}</span>
      </div>
    </div>
  );
}

export function Header({ title, subtitle, breadcrumb }: HeaderProps) {
  return (
    <header
      className="flex h-14 items-center justify-between px-6 flex-shrink-0"
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      }}
    >
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 mb-0.5">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-2.5 w-2.5" style={{ color: '#CBD5E1' }} />}
                <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>{crumb}</span>
              </span>
            ))}
          </div>
        )}
        <h2 className="font-semibold tracking-tight" style={{ color: '#0F172A', fontSize: 15, lineHeight: 1.3 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <LiveClock />

        {/* Notification bell */}
        <button
          className="relative h-8 w-8 rounded-md flex items-center justify-center transition-colors"
          style={{ color: '#64748B', border: '1px solid #E2E8F0', background: '#FFFFFF' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
        >
          <Bell className="h-4 w-4" />
          <span
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: '#DC2626' }}
          >
            3
          </span>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors"
          style={{ border: '1px solid #E2E8F0', background: '#FFFFFF' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#FFFFFF'; }}>
          <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <User className="h-3.5 w-3.5" style={{ color: '#1D4ED8' }} />
          </div>
          <span className="text-xs font-medium" style={{ color: '#374151' }}>Analyst</span>
        </div>
      </div>
    </header>
  );
}
