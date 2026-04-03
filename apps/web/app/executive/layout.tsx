'use client';

import { Sidebar } from '@/components/layout/sidebar';

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="executive" />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
