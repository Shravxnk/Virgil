export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'new' | 'investigating' | 'resolved' | 'escalated';
export type CaseStatus =
  | 'open'
  | 'investigating'
  | 'escalated'
  | 'resolved_fraud'
  | 'resolved_legitimate'
  | 'closed';
export type Decision = 'approve' | 'mfa' | 'block' | 'manual_review';

export interface RiskScore {
  transaction_id: string;
  score: number;
  decision: Decision;
  reason_codes: string[];
  behavioral_mismatch: number;
  device_mismatch: boolean;
  amount_anomaly: number;
  time_anomaly: number;
  beneficiary_risk: number;
  graph_risk: number;
  explanation: string | null;
}

export interface Alert {
  id: string;
  case_id: string | null;
  transaction_id: string;
  alert_type: string;
  severity: Severity;
  status: AlertStatus;
  title: string;
  description: string;
  risk_score: number;
  timestamp: string;
  account_id: string;
  account_name: string;
  amount: number;
  currency: string;
}

export interface Transaction {
  id: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  timestamp: string;
  type: string;
  status: string;
  channel: string;
  location: string | null;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'account' | 'merchant' | 'external' | 'suspicious';
  risk_score: number;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  currency: string;
  timestamp: string;
  suspicious: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  suspicious_paths: string[][];
  clusters: { id: string; node_ids: string[]; risk_score: number }[];
}

export interface CaseDetail {
  id: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  assigned_to: string;
  title: string;
  description: string;
  risk_score: number;
  explanation: string | null;
  recommended_action: string;
  alerts: Alert[];
  transactions: Transaction[];
  evidence: Evidence;
  timeline: TimelineEvent[];
  similar_cases: SimilarCase[];
  notes: CaseNote[];
}

export interface Evidence {
  behavioral_analysis: {
    baseline_avg_amount: number;
    current_amount: number;
    deviation: number;
    usual_time_range: string;
    transaction_time: string;
    time_anomaly: boolean;
    usual_locations: string[];
    transaction_location: string | null;
  };
  device_analysis: {
    known_device: boolean;
    device_id: string;
    device_type: string;
    os: string;
    ip_address: string;
    ip_risk: string;
    geo_location: string;
  };
  network_analysis: {
    circular_transfers: boolean;
    hop_count: number;
    connected_suspicious_accounts: number;
    layering_detected: boolean;
  };
}

export interface TimelineEvent {
  timestamp: string;
  event_type: string;
  description: string;
  actor: string;
  metadata: Record<string, unknown>;
}

export interface SimilarCase {
  id: string;
  title: string;
  similarity: number;
  outcome: string;
  risk_score: number;
}

export interface CaseNote {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface AnalystDashboard {
  total_alerts: number;
  critical_alerts: number;
  pending_review: number;
  resolved_today: number;
  avg_risk_score: number;
  recent_alerts: Alert[];
  score_distribution: { range: string; count: number }[];
  daily_trend: { date: string; alerts: number; resolved: number }[];
}

export interface ExecutiveDashboard {
  total_fraud_detected: number;
  active_cases: number;
  false_positive_rate: number;
  detection_rate: number;
  avg_resolution_time: number;
  regulatory_exposure: number;
  model_accuracy: number;
  model_precision: number;
  model_recall: number;
  model_f1: number;
  cases_by_status: { status: string; count: number }[];
  fraud_trend: { month: string; detected: number; prevented: number }[];
  compliance_summary: {
    sar_filed: number;
    sar_pending: number;
    ctr_filed: number;
    last_audit_date: string;
    next_audit_date: string;
    compliance_score: number;
  };
  top_risk_categories: { category: string; count: number; amount: number }[];
}
