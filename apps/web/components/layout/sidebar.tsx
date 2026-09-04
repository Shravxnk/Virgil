'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bell,
  FolderOpen,
  Eye,
  Activity,
  CreditCard,
  TrendingUp,
  Shield,
  Brain,
  FileText,
  Home,
} from 'lucide-react';

const navSections = [
  {
    label: 'ANALYST WORKSTATION',
    links: [
      { href: '/analyst',                      label: 'Dashboard',         icon: LayoutDashboard, exact: true  },
      { href: '/analyst/alerts',               label: 'Alert Inbox',       icon: Bell,            exact: false },
      { href: '/analyst/cases',                label: 'Investigation Cases',icon: FolderOpen,      exact: false },
      { href: '/analyst/manual-review',        label: 'Manual Review',     icon: Eye,             exact: false },
      { href: '/analyst/pre-txn-analytics',    label: 'Pre-Txn Analytics', icon: Activity,        exact: false },
      { href: '/analyst/transactions',         label: 'Transaction Scorer', icon: CreditCard,      exact: false },
    ],
  },
  {
    label: 'EXECUTIVE INTELLIGENCE',
    links: [
      { href: '/executive',                    label: 'Overview',          icon: TrendingUp,      exact: true  },
      { href: '/executive/compliance',         label: 'Compliance & STR/CTR', icon: Shield,       exact: false },
      { href: '/executive/model-health',       label: 'Model Health',      icon: Brain,           exact: false },
    ],
  },
];

function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L3 7v6c0 5.55 4.3 10.74 10 12 5.7-1.26 10-6.45 10-12V7L13 2z" fill="rgba(96,165,250,0.15)" stroke="#60A5FA" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 13l2.5 2.5L17 10" stroke="#60A5FA" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Sidebar({ role: _role }: { role?: 'analyst' | 'executive' }) {
  const pathname = usePathname();

  return (
    <aside
      className="relative flex h-screen w-56 flex-col flex-shrink-0"
      style={{ backgroundColor: '#0F2044', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-3 px-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <ShieldIcon />
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white" style={{ letterSpacing: '-0.01em' }}>
            Virgil
          </h1>
          <p className="text-[9px] tracking-widest uppercase" style={{ color: '#6B8FBF', marginTop: 1 }}>
            Fraud Intelligence
          </p>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p
              className="px-3 mb-1.5 text-[9px] font-semibold tracking-[0.12em] uppercase"
              style={{ color: '#3D5F8A' }}
            >
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const isActive = link.exact
                  ? pathname === link.href
                  : pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[11.5px] font-medium transition-all duration-150',
                    )}
                    style={
                      isActive
                        ? { backgroundColor: 'rgba(37,99,235,0.18)', color: '#93C5FD' }
                        : { color: '#7A9CC4' }
                    }
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                        style={{ backgroundColor: '#3B82F6' }}
                      />
                    )}
                    <link.icon
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: isActive ? '#60A5FA' : '#4D6F96' }}
                    />
                    <span style={{ color: isActive ? '#BFD9FF' : '#7A9CC4' }}>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <Link
          href="/reports"
          className={cn(
            'relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[11.5px] font-medium transition-all duration-150',
          )}
          style={
            pathname.startsWith('/reports')
              ? { backgroundColor: 'rgba(37,99,235,0.18)', color: '#93C5FD' }
              : { color: '#7A9CC4' }
          }
          onMouseEnter={e => {
            if (!pathname.startsWith('/reports')) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
          }}
          onMouseLeave={e => {
            if (!pathname.startsWith('/reports')) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
          }}
        >
          <FileText className="h-3.5 w-3.5" style={{ color: pathname.startsWith('/reports') ? '#60A5FA' : '#4D6F96' }} />
          <span>Reports</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 rounded px-3 py-1.5 text-[11px] transition-all mt-0.5"
          style={{ color: '#3D5F8A' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#7A9CC4'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#3D5F8A'; }}
        >
          <Home className="h-3 w-3" />
          Home
        </Link>
        <div className="px-3 pt-3 pb-1 flex items-center gap-2">
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <span className="text-[8px] tracking-widest uppercase" style={{ color: '#2A3F5F' }}>v1.1.0</span>
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>
    </aside>
  );
}

