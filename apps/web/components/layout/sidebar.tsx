'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  FileSearch,
  BarChart3,
  ChevronLeft,
  Network,
  FileText,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  role: 'analyst' | 'executive';
}

const analystLinks = [
  { href: '/analyst', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/analyst/alerts', label: 'Alert Inbox', icon: AlertTriangle, exact: false },
  { href: '/analyst/cases', label: 'Cases', icon: FileSearch, exact: false },
  { href: '/analyst/transactions', label: 'Live Scorer', icon: Zap, exact: false },
];

const executiveLinks = [
  { href: '/executive', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/executive/compliance', label: 'Compliance', icon: Shield, exact: false },
  { href: '/executive/model-health', label: 'Model Health', icon: BarChart3, exact: false },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const links = role === 'analyst' ? analystLinks : executiveLinks;

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-white shadow-[1px_0_0_0_#e5e9f0]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-foreground">Chakravyuh</h1>
          <p className="text-[11px] text-muted-foreground capitalize">
            {role === 'analyst' ? 'Analyst Console' : 'Executive Dashboard'}
          </p>
        </div>
      </div>

      {/* Role label */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2">
          {role === 'analyst' ? 'Investigation' : 'Management'}
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 px-3">
        {links.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-100',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
              )}
            >
              <link.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary' : '')} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Switch role */}
      <div className="border-t px-3 py-3 space-y-0.5">
        {role === 'analyst' ? (
          <Link
            href="/executive"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/70 hover:text-foreground transition-all"
          >
            <BarChart3 className="h-4 w-4" />
            Executive View
          </Link>
        ) : (
          <Link
            href="/analyst"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/70 hover:text-foreground transition-all"
          >
            <Network className="h-4 w-4" />
            Analyst Console
          </Link>
        )}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground transition-all"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Home
        </Link>
      </div>
    </aside>
  );
}
