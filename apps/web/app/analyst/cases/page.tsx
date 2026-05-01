'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { CaseTable } from '@/components/dashboard/case-table';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { api } from '@/lib/api';
import { CaseListResponse } from '@/types';

export default function CasesPage() {
  const [data, setData] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await api.getCases();
        setData(result);
        setError(null);
      } catch (e) {
        console.error('Failed to load cases', e);
        setError('Failed to load cases. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Header title="Investigation Cases" />
      <div className="p-6">
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="rounded p-6 text-center" style={{ border: '1px solid #EF444430', backgroundColor: '#EF444410' }}>
            <p className="text-sm font-medium" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        ) : data ? (
          <CaseTable cases={data.cases} />
        ) : (
          <div className="rounded p-12 text-center" style={{ border: '1px solid #1E2D45', backgroundColor: '#111827' }}>
            <p className="text-xs" style={{ color: '#8899BB' }}>No cases found.</p>
          </div>
        )}
      </div>
    </>
  );
}
