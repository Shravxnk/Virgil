'use client';

import { Sidebar } from '@/components/layout/sidebar';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="analyst" />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
