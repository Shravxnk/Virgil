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

  useEffect(() => {
    async function load() {
      try {
        const result = await api.getCases();
        setData(result);
      } catch (e) {
        console.error('Failed to load cases', e);
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
        {loading ? <DashboardSkeleton /> : data && <CaseTable cases={data.cases} />}
      </div>
    </>
  );
}
