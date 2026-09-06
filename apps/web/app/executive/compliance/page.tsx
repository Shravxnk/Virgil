// app/executive/compliance/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { api, ComplianceReport } from '@/lib/api';
import {
  Shield, CheckCircle2, AlertTriangle, Clock, FileText,
  X, Download, RefreshCw, ExternalLink, ChevronRight, ArrowRight,
} from 'lucide-react';

function fmtCr(n: number) {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
  return '₹' + new Intl.NumberFormat('en-IN').format(n);
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

type TabId = 'all' | 'STR' | 'CTR';

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Filed:   { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  Pending: { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  Due:     { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
};

// ── STR form modal ──────────────────────────────────────────────────────────
function STRFormModal({ report, onClose }: { report: ComplianceReport; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const deadline = report.filing_deadline
    ? new Date(report.filing_deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const createdDate = new Date(report.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Simulate async filing submission
    setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 1500);
  }

  if (submitted) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '48px 40px', width: 480, textAlign: 'center', boxShadow: '0 20px 60px rgba(15,23,42,0.2)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 style={{ width: 28, height: 28, color: '#15803D' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Report Submitted to FIU-IND</h3>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 6 }}>Reference: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#1D4ED8' }}>{report.report_id}</span></p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 24 }}>Filing recorded under PMLA 2002. A copy has been generated for your records.</p>
          <button onClick={onClose} style={{ background: '#1D4ED8', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '10px 32px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 0' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, width: 780, maxWidth: '96vw', boxShadow: '0 20px 60px rgba(15,23,42,0.2)', marginBottom: 24 }}>

        {/* Modal header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileText style={{ width: 18, height: 18, color: '#1D4ED8', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              {report.report_type === 'STR'
                ? 'Suspicious Transaction Report (STR) — FIU-IND Format'
                : 'Cash Transaction Report (CTR) — FIU-IND Format'}
            </h2>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>PMLA 2002 · Rule 2(g) · FINnet 2.0 Submission</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {report.is_overdue && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                <AlertTriangle style={{ width: 10, height: 10 }} /> OVERDUE
              </span>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94A3B8', display: 'flex' }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>

          {/* FIU-IND notice banner */}
          <div style={{ padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Shield style={{ width: 14, height: 14, color: '#1D4ED8', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8', margin: 0 }}>FIU-IND Mandatory Reporting Obligation</p>
              <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
                Under PMLA 2002, Section 12(1)(b), all Reporting Entities must file STRs within <strong>7 working days</strong> of forming suspicion.
                Filing deadline: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#DC2626' }}>{deadline}</span>.
                Submit via FINnet 2.0 portal or this interface (auto-routes to FIU-IND API).
              </p>
            </div>
          </div>

          {/* Section A: Report Identification */}
          <Section label="A — Report Identification">
            <TwoCol>
              <Field label="FIU-IND Reference No." value={report.report_id} mono />
              <Field label="Report Type" value={report.report_type === 'STR' ? 'Suspicious Transaction Report (STR)' : 'Cash Transaction Report (CTR/FCR)'} />
              <Field label="Reporting Entity" value="Chakravyuh National Bank Ltd." />
              <Field label="BSR / Licence No." value="CHK-RBI-2019-004821" mono />
              <Field label="Branch / Originating Unit" value="Central Fraud Intelligence Unit" />
              <Field label="MLRO / Filing Officer" value={report.assigned_analyst || 'Compliance Officer'} />
            </TwoCol>
          </Section>

          {/* Section B: Subject / Account */}
          <Section label="B — Subject Person & Account Details">
            <TwoCol>
              <Field label="Subject Name" value={report.subject_name} />
              <Field label="Primary Account No." value={report.primary_account} mono />
              <Field label="Case Reference ID" value={report.case_id} mono />
              <Field label="Case Title" value={report.case_title} />
              <Field label="Total Exposure" value={fmtCr(report.total_exposure)} mono />
              <Field label="Risk Score" value={`${report.risk_score.toFixed(0)} / 100`} mono />
            </TwoCol>
          </Section>

          {/* Section C: Transaction Details */}
          <Section label="C — Transaction Details">
            <TwoCol>
              <Field label="Date of Suspicion" value={createdDate} />
              <Field label="Filing Deadline (7 WD)" value={deadline} highlight={report.is_overdue} />
              <Field label="No. of Linked Alerts" value={String(report.alert_count)} mono />
              <Field label="No. of Transactions" value={String(report.transaction_ids?.length ?? 0)} mono />
            </TwoCol>
            {report.transaction_ids && report.transaction_ids.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Transaction IDs Included</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {report.transaction_ids.slice(0, 12).map((tid: string) => (
                    <span key={tid} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 8px', color: '#475569' }}>{tid}</span>
                  ))}
                  {report.transaction_ids.length > 12 && (
                    <span style={{ fontSize: 10, color: '#94A3B8', padding: '2px 4px' }}>+{report.transaction_ids.length - 12} more</span>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* Section D: Fraud Type & Legal Basis */}
          <Section label="D — Nature of Suspicion & Legal Basis">
            <TwoCol>
              <Field label="Fraud / Offence Type" value={report.fraud_type} />
              <Field label="Legal Basis" value={report.legal_basis} />
            </TwoCol>
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Grounds for Suspicion (Evidence Points)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.reasons.map((r: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderLeft: '3px solid #B45309', borderRadius: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ fontSize: 12, color: '#334155' }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Section E: Narrative */}
          <Section label="E — Detailed Narrative (for FIU-IND submission)">
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Case Description (auto-filled — edit before filing)
              </p>
              <textarea
                defaultValue={report.description || report.explanation || 'Suspicious activity detected by automated fraud scoring engine. See grounds listed above.'}
                rows={5}
                style={{ width: '100%', padding: '10px 12px', fontSize: 12, color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: 6, background: '#FAFAFA', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Recommended Action</p>
              <div style={{ padding: '10px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, fontSize: 12, color: '#15803D' }}>
                {report.recommended_action || 'Submit STR to FIU-IND and freeze account pending investigation.'}
              </div>
            </div>
          </Section>

          {/* Section F: Declaration */}
          <Section label="F — Declaration & Authorisation">
            <div style={{ padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
              I, the undersigned MLRO / Compliance Officer of <strong>Chakravyuh National Bank Ltd.</strong>, hereby certify that this
              {report.report_type} has been prepared in good faith based on the information available and constitutes a bona fide
              report as required under <strong>Section 12(1)(b) of the Prevention of Money Laundering Act, 2002</strong> and the
              rules thereunder. The information contained herein is true and correct to the best of my knowledge.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>MLRO Name</p>
                <input type="text" defaultValue={report.assigned_analyst || 'Compliance Officer'} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, color: '#0F172A', background: '#FFFFFF', boxSizing: 'border-box' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>Date of Filing</p>
                <input type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, color: '#0F172A', background: '#FFFFFF', boxSizing: 'border-box' }} />
              </div>
            </div>
          </Section>

          {/* Submit row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #E2E8F0', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, color: '#64748B', background: '#FFFFFF', cursor: 'pointer', fontWeight: 500 }}>
              Cancel
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, color: '#1D4ED8', background: '#EFF6FF', cursor: 'pointer', fontWeight: 500 }}>
                <Download style={{ width: 13, height: 13 }} /> Download PDF
              </button>
              <button type="submit" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#1D4ED8', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Submitting…' : `Submit ${report.report_type} to FIU-IND`}
                {!submitting && <ArrowRight style={{ width: 13, height: 13 }} />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ height: 1, width: 12, background: '#CBD5E1' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{label}</span>
        <div style={{ height: 1, flex: 1, background: '#CBD5E1' }} />
      </div>
      {children}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>{children}</div>;
}

function Field({ label, value, mono = false, highlight = false }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div style={{ paddingBottom: 8 }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 12, color: highlight ? '#DC2626' : '#0F172A', fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', fontWeight: mono ? 600 : 400, margin: 0 }}>{value}</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
interface ReportListItem {
  summary: {
    total_reports: number; str_count: number; ctr_count: number;
    filed: number; pending: number; overdue: number; total_exposure: number;
  };
  reports: ComplianceReport[];
}

export default function CompliancePage() {
  const [data, setData] = useState<ReportListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    api.getComplianceReports()
      .then((d) => { setData(d as ReportListItem); setLastUpdated(new Date()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 30000);
    return () => clearInterval(iv);
  }, [loadData]);

  const reports = data?.reports ?? [];
  const summary = data?.summary;

  const filtered = activeTab === 'all' ? reports : reports.filter(r => r.report_type === activeTab);

  return (
    <>
      <Header title="Compliance & STR/CTR Reporting" subtitle="FIU-IND · PMLA 2002 · RBI Regulatory Framework" breadcrumb={['Executive', 'Compliance & STR/CTR']} />

      {selectedReport && (
        <STRFormModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}

      <div style={{ background: '#F0F2F5', minHeight: 'calc(100vh - 56px)', padding: '20px 24px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803D', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#64748B' }}>Live{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}` : ''}</span>
          </div>
          <button onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#1D4ED8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
          </button>
        </div>

        {/* Summary KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Reports', value: String(summary?.total_reports ?? '—'), borderColor: '#1D4ED8', color: '#1D4ED8' },
            { label: 'STR (Suspicious)', value: String(summary?.str_count ?? '—'), borderColor: '#B45309', color: '#B45309' },
            { label: 'CTR (Cash >₹10L)', value: String(summary?.ctr_count ?? '—'), borderColor: '#0891B2', color: '#0891B2' },
            { label: 'Filed', value: String(summary?.filed ?? '—'), borderColor: '#15803D', color: '#15803D' },
            { label: 'Pending', value: String(summary?.pending ?? '—'), borderColor: '#B45309', color: '#B45309' },
            { label: 'Total Exposure', value: summary ? fmtCr(summary.total_exposure) : '—', borderColor: '#7C3AED', color: '#7C3AED' },
          ].map(k => (
            <div key={k.label} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderTop: `3px solid ${k.borderColor}`, borderRadius: 8, padding: '16px 20px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{k.label}</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Overdue banner */}
        {(summary?.overdue ?? 0) > 0 && (
          <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #DC2626', borderRadius: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', margin: 0 }}>{summary?.overdue} STR Report{(summary?.overdue ?? 0) > 1 ? 's' : ''} Overdue — Immediate Action Required</p>
              <p style={{ fontSize: 11, color: '#B91C1C', margin: 0 }}>Filing deadline exceeded under PMLA 2002, Section 12(1)(b). Click "File STR" on the affected row to submit immediately.</p>
            </div>
          </div>
        )}

        {/* PMLA compliance badge row */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Shield style={{ width: 16, height: 16, color: '#1D4ED8', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Regulatory Obligations</span>
          {[
            { label: 'PMLA 2002', desc: 'STR — 7 working days', ok: true },
            { label: 'FIU-IND', desc: 'FINnet 2.0 portal', ok: true },
            { label: 'RBI Circular', desc: 'Master Direction on KYC', ok: true },
            { label: 'FATF Rec. 16', desc: 'Wire transfer reporting', ok: true },
            { label: 'CTR Threshold', desc: '₹10 lakh & above', ok: true },
          ].map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: b.ok ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${b.ok ? '#BBF7D0' : '#FECACA'}`, borderRadius: 4 }}>
              <CheckCircle2 style={{ width: 10, height: 10, color: b.ok ? '#15803D' : '#DC2626' }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: b.ok ? '#15803D' : '#DC2626' }}>{b.label}</span>
              <span style={{ fontSize: 10, color: '#94A3B8' }}>{b.desc}</span>
            </div>
          ))}
        </div>

        {/* Report Table */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ padding: '0 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 0 }}>
            {(['all', 'STR', 'CTR'] as TabId[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: activeTab === tab ? '#1D4ED8' : '#64748B', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#1D4ED8' : 'transparent'}`, cursor: 'pointer', textTransform: tab === 'all' ? 'capitalize' : 'none', transition: 'all 0.15s', marginBottom: -1 }}>
                {tab === 'all' ? 'All Reports' : tab} {tab !== 'all' && <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>({tab === 'STR' ? summary?.str_count : summary?.ctr_count} total)</span>}
              </button>
            ))}
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              {loading ? 'Loading reports…' : 'No reports found. Reports are generated automatically from resolved/escalated cases.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Report ID', 'Type', 'Subject', 'Fraud Category', 'Exposure', 'Alerts', 'Status', 'Deadline', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const ss = STATUS_STYLE[r.filing_status] ?? STATUS_STYLE.Pending;
                  const deadlineDate = r.filing_deadline ? new Date(r.filing_deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
                  return (
                    <tr key={r.report_id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F8FAFC'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#1D4ED8', fontWeight: 600 }}>{r.report_id}</span>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: r.report_type === 'STR' ? '#B45309' : '#0891B2', background: r.report_type === 'STR' ? '#FFFBEB' : '#F0FDFA', border: `1px solid ${r.report_type === 'STR' ? '#FDE68A' : '#99F6E4'}`, borderRadius: 4, padding: '2px 8px' }}>{r.report_type}</span>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', margin: 0 }}>{r.subject_name}</p>
                        <p style={{ fontSize: 10, color: '#94A3B8', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>{r.primary_account}</p>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: 11, color: '#334155', maxWidth: 180 }}>{r.fraud_type}</td>
                      <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{fmtCr(r.total_exposure)}</td>
                      <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#64748B', textAlign: 'center' }}>{r.alert_count}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`, borderRadius: 4, padding: '2px 8px' }}>{r.filing_status}</span>
                          {r.is_overdue && <AlertTriangle style={{ width: 12, height: 12, color: '#DC2626' }} />}
                        </div>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: 11, color: r.is_overdue ? '#DC2626' : '#64748B', fontFamily: 'JetBrains Mono, monospace', fontWeight: r.is_overdue ? 700 : 400 }}>
                        {deadlineDate}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <button
                          onClick={() => setSelectedReport(r)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: r.filing_status === 'Filed' ? '#64748B' : '#1D4ED8', background: r.filing_status === 'Filed' ? '#F8FAFC' : '#EFF6FF', border: `1px solid ${r.filing_status === 'Filed' ? '#E2E8F0' : '#BFDBFE'}`, borderRadius: 5, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          <FileText style={{ width: 11, height: 11 }} />
                          {r.filing_status === 'Filed' ? 'View' : `File ${r.report_type}`}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
