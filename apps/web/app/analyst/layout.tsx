'use client';

import { Sidebar } from '@/components/layout/sidebar';

export default function AnalystLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F0F2F5' }}>
      <Sidebar role="analyst" />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F0F2F5' }}>{children}</main>
    </div>
  );
}
