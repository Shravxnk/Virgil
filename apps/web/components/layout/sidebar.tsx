'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  FileSearch,
  Network,
  BarChart3,
  Settings,
  ChevronLeft,
} from 'lucide-react';

interface SidebarProps {
  role: 'analyst' | 'executive';
}

const analystLinks = [
  { href: '/analyst', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analyst/alerts', label: 'Alert Inbox', icon: AlertTriangle },
  { href: '/analyst/cases', label: 'Cases', icon: FileSearch },
];

const executiveLinks = [
  { href: '/executive', label: 'Overview', icon: LayoutDashboard },
  { href: '/executive/compliance', label: 'Compliance', icon: Shield },
  { href: '/executive/model-health', label: 'Model Health', icon: BarChart3 },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const links = role === 'analyst' ? analystLinks : executiveLinks;

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-lg font-bold tracking-tight">Chakravyuh</h1>
          <p className="text-xs text-muted-foreground capitalize">{role} Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== `/${role}` && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </aside>
  );
}
