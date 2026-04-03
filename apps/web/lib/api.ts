import type {
  RiskScore,
  AlertListResponse,
  Alert,
  CaseListResponse,
  CaseDetailResponse,
  GraphData,
  AnalystDashboardResponse,
  ExecutiveDashboardResponse,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Risk Scoring
  getRiskScore: (transactionId: string) =>
    fetchAPI<RiskScore>(`/api/risk/score?transaction_id=${encodeURIComponent(transactionId)}`),

  // Alerts
  getAlerts: (params?: { severity?: string; status?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return fetchAPI<AlertListResponse>(`/api/alerts${qs ? `?${qs}` : ''}`);
  },
  getAlert: (id: string) => fetchAPI<Alert>(`/api/alerts/${encodeURIComponent(id)}`),
  getAlertExplanation: (id: string) =>
    fetchAPI<{ alert_id: string; explanation: string }>(`/api/alerts/${encodeURIComponent(id)}/explain`),

  // Cases
  getCases: (params?: { status?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return fetchAPI<CaseListResponse>(`/api/cases${qs ? `?${qs}` : ''}`);
  },
  getCase: (id: string) => fetchAPI<CaseDetailResponse>(`/api/cases/${encodeURIComponent(id)}`),

  // Graph
  getCaseGraph: (caseId: string) => fetchAPI<GraphData>(`/api/graph/${encodeURIComponent(caseId)}`),

  // Reports
  getReportUrl: (caseId: string) => `${API_BASE}/api/report/${encodeURIComponent(caseId)}/pdf`,

  // Dashboard
  getAnalystDashboard: () => fetchAPI<AnalystDashboardResponse>('/api/dashboard/analyst'),
  getExecutiveDashboard: () => fetchAPI<ExecutiveDashboardResponse>('/api/dashboard/executive'),

  // Feedback
  submitFeedback: (data: {
    case_id: string;
    confirmed_fraud: boolean;
    analyst_id: string;
    notes?: string;
  }) =>
    fetchAPI('/api/feedback/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Knowledge Search
  searchKnowledge: (query: string, collection?: string, topK?: number) =>
    fetchAPI('/api/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, collection, top_k: topK || 5 }),
    }),

  // Pre-Transaction Scoring
  scorePreTransaction: (data: {
    from_account: string;
    to_account: string;
    amount: number;
    txn_type?: string;
    channel?: string;
    device_known?: boolean;
  }) =>
    fetchAPI('/api/transactions/score', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPreTxnQueue: (limit?: number) =>
    fetchAPI(`/api/transactions/queue${limit ? `?limit=${limit}` : ''}`),

  getTransactions: (params?: { flagged?: boolean; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.flagged !== undefined) searchParams.set('flagged', String(params.flagged));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return fetchAPI(`/api/transactions${qs ? `?${qs}` : ''}`);
  },
};
