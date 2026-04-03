export const RISK_THRESHOLDS = {
  APPROVE: 30,
  MFA: 60,
  MANUAL_REVIEW: 80,
  BLOCK: 100,
} as const;

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export const ALERT_STATUSES = ['new', 'investigating', 'resolved', 'escalated'] as const;

export const CASE_STATUSES = [
  'open',
  'investigating',
  'escalated',
  'resolved_fraud',
  'resolved_legitimate',
  'closed',
] as const;

export const DECISION_TYPES = ['approve', 'mfa', 'block', 'manual_review'] as const;

export const ANALYST_ACTIONS = [
  'freeze_account',
  'escalate',
  'watchlist',
  'confirm_fraud',
  'confirm_legitimate',
  'export_report',
] as const;

export const EXECUTIVE_ACTIONS = [
  'approve_containment',
  'request_audit',
  'export_executive_report',
] as const;
