'use client';

import { Sidebar } from '@/components/layout/sidebar';

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F0F2F5' }}>
      <Sidebar role="executive" />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F0F2F5' }}>{children}</main>
    </div>
  );
}
