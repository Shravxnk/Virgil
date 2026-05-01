'use client';

import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// ── types ──────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  name: string;
  account_type: string;
  kyc_tier: string;
  risk_rating: 'low' | 'medium' | 'high';
  monthly_avg_credit: number;
  monthly_avg_debit: number;
  typical_hours_start: number;
  typical_hours_end: number;
  city: string;
  state: string;
  upi_id: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
}

interface DbStats {
  pg: boolean;
  stats: Record<string, number>;
}

const ACCOUNT_TYPES = [
  'individual_savings', 'individual_current', 'individual_salary',
  'corporate_current', 'corporate_savings', 'nri_savings', 'nri_current',
  'trust_account', 'cooperative_account',
];
const KYC_TIERS = ['KYC0', 'KYC1', 'KYC2', 'KYC3'];
const RISK_RATINGS = ['low', 'medium', 'high'];
const RISK_COLORS: Record<string, string> = {
  low: '#34A853', medium: '#FBBC04', high: '#EA4335',
};

const EMPTY_FORM = {
  id: '', name: '', account_type: 'individual_savings', kyc_tier: 'KYC2',
  risk_rating: 'low', monthly_avg_credit: 500000, monthly_avg_debit: 400000,
  typical_hours_start: 9, typical_hours_end: 18,
  city: 'Mumbai', state: 'Maharashtra',
  upi_id: '', phone: '', email: '', notes: '',
};

type Tab = 'overview' | 'accounts' | 'create';

// ── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' | 'info' }) {
  const bg = type === 'success' ? '#34A853' : type === 'error' ? '#EA4335' : '#1A73E8';
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, background: bg, color: '#fff',
      padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 9999,
      animation: 'slideUp 0.25s ease',
      maxWidth: 380,
    }}>
      {msg}
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 40, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#202124', textAlign: 'center' }}>Are you sure?</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5F6368', textAlign: 'center', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #E8EAED',
            background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#5F6368',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '12px', borderRadius: 10, border: 'none',
            background: '#EA4335', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff',
          }}>Confirm Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit drawer ────────────────────────────────────────────────────────────

function EditDrawer({ account, onClose, onSaved }: { account: Account; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ ...account });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/accounts/${account.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9997, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 480, height: '100%', overflowY: 'auto', padding: '28px 28px 40px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#202124' }}>Edit Account</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#5F6368' }}>✕</button>
        </div>

        <div style={{ background: '#E8F0FE', borderRadius: 8, padding: '8px 14px', marginBottom: 20, fontSize: 13, color: '#1A73E8', fontWeight: 500 }}>
          ID: {account.id}
        </div>

        <FormFields form={form} set={set} />

        {err && <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 12 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #E8EAED', background: '#fff', fontWeight: 600, cursor: 'pointer', color: '#5F6368' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: saving ? '#9AA0A6' : '#1A73E8', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── shared form fields ─────────────────────────────────────────────────────

function FormFields({ form, set }: { form: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const field = (label: string, key: string, type = 'text', opts?: string[]) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5F6368', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {opts ? (
        <select value={String(form[key] ?? '')} onChange={e => set(key, e.target.value)} style={INPUT}>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={String(form[key] ?? '')}
          onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
          style={INPUT}
          placeholder={label}
        />
      )}
    </div>
  );

  return (
    <>
      {field('Full Name *', 'name')}
      {field('Account Type', 'account_type', 'text', ACCOUNT_TYPES)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>{field('KYC Tier', 'kyc_tier', 'text', KYC_TIERS)}</div>
        <div>{field('Risk Rating', 'risk_rating', 'text', RISK_RATINGS)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>{field('Monthly Avg Credit (₹)', 'monthly_avg_credit', 'number')}</div>
        <div>{field('Monthly Avg Debit (₹)', 'monthly_avg_debit', 'number')}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>{field('Typical Hours Start', 'typical_hours_start', 'number')}</div>
        <div>{field('Typical Hours End', 'typical_hours_end', 'number')}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>{field('City', 'city')}</div>
        <div>{field('State', 'state')}</div>
      </div>
      {field('UPI ID', 'upi_id')}
      {field('Phone', 'phone', 'tel')}
      {field('Email', 'email', 'email')}
      {field('Notes', 'notes')}
    </>
  );
}

const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid #E8EAED', background: '#F8F9FA',
  fontSize: 14, color: '#202124', outline: 'none', boxSizing: 'border-box',
};

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DBMPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<DbStats | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`);
      const data = await res.json();
      setStats(data);
    } catch { setStats({ pg: false, stats: {} }); }
  }, []);

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/accounts`);
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch { showToast('Failed to load accounts', 'error'); }
    finally { setLoadingAccounts(false); }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (tab === 'accounts') fetchAccounts();
  }, [tab, fetchAccounts]);

  // ── Delete account ─────────────────────────────────────────────────────

  const deleteAccount = (id: string) => {
    setConfirm({
      msg: `Delete account "${id}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`${API_BASE}/api/admin/accounts/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error((await res.json()).detail);
          showToast(`Account ${id} deleted`, 'success');
          fetchAccounts(); fetchStats();
        } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Delete failed', 'error'); }
      },
    });
  };

  // ── Bulk operations ────────────────────────────────────────────────────

  const bulkOp = async (label: string, url: string, method: string, successMsg: string) => {
    setBulkLoading(label);
    try {
      const res = await fetch(`${API_BASE}${url}`, { method });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      showToast(successMsg, 'success');
      fetchStats(); if (tab === 'accounts') fetchAccounts();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Operation failed', 'error');
    } finally { setBulkLoading(null); }
  };

  const confirmBulk = (label: string, msg: string, url: string, method = 'DELETE', successMsg = 'Done') => {
    setConfirm({ msg, onConfirm: () => { setConfirm(null); bulkOp(label, url, method, successMsg); } });
  };

  // ── Create account ─────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.name.trim()) { setCreateErr('Name is required'); return; }
    setCreating(true); setCreateErr('');
    try {
      const body = { ...createForm, id: createForm.id || undefined };
      const res = await fetch(`${API_BASE}/api/admin/accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      showToast(`Account "${data.id}" created!`, 'success');
      setCreateForm({ ...EMPTY_FORM });
      fetchStats();
      setTab('accounts');
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : 'Create failed');
    } finally { setCreating(false); }
  };

  // ── filtered accounts ──────────────────────────────────────────────────

  const filtered = accounts.filter(a => {
    if (riskFilter !== 'all' && a.risk_rating !== riskFilter) return false;
    if (search && !`${a.id} ${a.name} ${a.city} ${a.account_type}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── TAB BAR ────────────────────────────────────────────────────────────

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 14,
    background: active ? '#1A73E8' : 'transparent',
    color: active ? '#fff' : '#5F6368',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: '"Google Sans", Roboto, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EAED', padding: '0 28px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #1A73E8, #4285F4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🗄️</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#202124' }}>DB Manager</div>
              <div style={{ fontSize: 11, color: '#9AA0A6' }}>Chakravyuh · Full Database Control</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, background: '#F1F3F4', borderRadius: 12, padding: 4 }}>
            {(['overview', 'accounts', 'create'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={TAB_STYLE(tab === t)}>
                {t === 'overview' ? '📊 Overview' : t === 'accounts' ? '👥 Accounts' : '➕ Create Account'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: stats?.pg ? '#34A853' : '#EA4335' }} />
            <span style={{ fontSize: 12, color: '#5F6368', fontWeight: 500 }}>{stats?.pg ? 'PostgreSQL Connected' : 'DB Offline'}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 28px' }}>

        {/* ── OVERVIEW TAB ──────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#202124' }}>Database Overview</h2>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
              {Object.entries(stats?.stats ?? {}).map(([table, count]) => (
                <div key={table} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 11, color: '#9AA0A6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    {table.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#202124' }}>{count}</div>
                  <div style={{ fontSize: 11, color: '#9AA0A6', marginTop: 2 }}>rows</div>
                </div>
              ))}
            </div>

            {/* Bulk operations */}
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#202124' }}>Bulk Operations</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 32 }}>

              {/* Seed default data */}
              <BulkCard
                icon="🌱"
                title="Seed Default Test Data"
                description="Re-seed with default accounts from data generator. Clears existing accounts first."
                buttonLabel="Seed Now"
                buttonColor="#34A853"
                loading={bulkLoading === 'seed'}
                onClick={() => confirmBulk(
                  'seed', 'This will clear all existing accounts and re-seed default test data. Continue?',
                  '/api/admin/seed', 'POST', 'Default data seeded successfully'
                )}
              />

              {/* Clear accounts */}
              <BulkCard
                icon="👥"
                title="Delete All Accounts"
                description="Truncates the accounts table. Useful before importing custom accounts."
                buttonLabel="Delete All Accounts"
                buttonColor="#F9A825"
                loading={bulkLoading === 'del-accounts'}
                onClick={() => confirmBulk(
                  'del-accounts', 'This will PERMANENTLY delete all accounts from the database. Are you sure?',
                  '/api/admin/accounts', 'DELETE', 'All accounts deleted'
                )}
              />

              {/* Clear transactions */}
              <BulkCard
                icon="💸"
                title="Clear Transactions"
                description="Truncate the transactions table. Useful to reset demo state."
                buttonLabel="Clear Transactions"
                buttonColor="#F9A825"
                loading={bulkLoading === 'del-txns'}
                onClick={() => confirmBulk(
                  'del-txns', 'Delete all transactions? This cannot be undone.',
                  '/api/admin/table/transactions', 'DELETE', 'Transactions cleared'
                )}
              />

              {/* Clear pre_txn_queue */}
              <BulkCard
                icon="📋"
                title="Clear Pre-Txn Queue"
                description="Clear the pre_txn_queue table (scored transactions log)."
                buttonLabel="Clear Queue"
                buttonColor="#F9A825"
                loading={bulkLoading === 'del-queue'}
                onClick={() => confirmBulk(
                  'del-queue', 'Delete all queued pre-transactions?',
                  '/api/admin/table/pre_txn_queue', 'DELETE', 'Pre-txn queue cleared'
                )}
              />

              {/* Clear alerts */}
              <BulkCard
                icon="🚨"
                title="Clear Alerts"
                description="Delete all alerts from the database."
                buttonLabel="Clear Alerts"
                buttonColor="#F9A825"
                loading={bulkLoading === 'del-alerts'}
                onClick={() => confirmBulk(
                  'del-alerts', 'Delete all alerts?',
                  '/api/admin/table/alerts', 'DELETE', 'Alerts cleared'
                )}
              />

              {/* Clear cases */}
              <BulkCard
                icon="📁"
                title="Clear Cases"
                description="Delete all open/closed cases from the database."
                buttonLabel="Clear Cases"
                buttonColor="#F9A825"
                loading={bulkLoading === 'del-cases'}
                onClick={() => confirmBulk(
                  'del-cases', 'Delete all cases?',
                  '/api/admin/table/cases', 'DELETE', 'Cases cleared'
                )}
              />

              {/* NUKE ALL */}
              <BulkCard
                icon="💣"
                title="NUKE — Truncate Everything"
                description="Truncate ALL tables in the correct dependency order. Wipes the entire DB."
                buttonLabel="⚠️ Truncate All Tables"
                buttonColor="#EA4335"
                loading={bulkLoading === 'nuke'}
                onClick={() => confirmBulk(
                  'nuke',
                  'This will WIPE THE ENTIRE DATABASE — all accounts, transactions, alerts, cases, and queue. This is irreversible. Are you absolutely sure?',
                  '/api/admin/all', 'DELETE', 'All tables truncated — database is now empty'
                )}
              />
            </div>

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => { fetchStats(); showToast('Stats refreshed', 'info'); }} style={{
                background: '#E8F0FE', border: 'none', borderRadius: 10, padding: '10px 18px',
                fontSize: 13, fontWeight: 600, color: '#1A73E8', cursor: 'pointer',
              }}>
                🔄 Refresh Stats
              </button>
            </div>
          </div>
        )}

        {/* ── ACCOUNTS TAB ──────────────────────────────────────────── */}
        {tab === 'accounts' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#202124' }}>
                Accounts <span style={{ fontSize: 14, fontWeight: 500, color: '#9AA0A6' }}>({filtered.length})</span>
              </h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search accounts…"
                  style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8EAED', background: '#fff', fontSize: 13, outline: 'none', width: 200 }}
                />
                <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E8EAED', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
                  <option value="all">All Risk</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button onClick={() => fetchAccounts()} style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px solid #E8EAED', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#5F6368' }}>
                  🔄 Refresh
                </button>
                <button onClick={() => setTab('create')} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: '#1A73E8', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff' }}>
                  ➕ New Account
                </button>
              </div>
            </div>

            {loadingAccounts ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9AA0A6' }}>Loading accounts…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9AA0A6' }}>
                No accounts found. <button onClick={() => setTab('create')} style={{ background: 'none', border: 'none', color: '#1A73E8', cursor: 'pointer', fontWeight: 600 }}>Create one</button>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8F9FA', borderBottom: '1.5px solid #E8EAED' }}>
                      {['ID', 'Name', 'Type', 'KYC', 'Risk', 'Avg Credit', 'City', 'UPI ID', 'Hours', ''].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#5F6368', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, i) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #F1F3F4', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', color: '#1A73E8', fontWeight: 600, whiteSpace: 'nowrap' }}>{a.id}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#202124', minWidth: 150 }}>{a.name}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#5F6368', whiteSpace: 'nowrap' }}>{a.account_type.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#5F6368' }}>{a.kyc_tier}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: `${RISK_COLORS[a.risk_rating]}22`, color: RISK_COLORS[a.risk_rating], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                            {a.risk_rating}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#5F6368', whiteSpace: 'nowrap' }}>{fmt(a.monthly_avg_credit)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#5F6368' }}>{a.city}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: '#9AA0A6', fontFamily: 'monospace' }}>{a.upi_id || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#9AA0A6', whiteSpace: 'nowrap' }}>{a.typical_hours_start}–{a.typical_hours_end}h</td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setEditAccount(a)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #E8EAED', background: '#fff', fontSize: 12, fontWeight: 600, color: '#1A73E8', cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => deleteAccount(a.id)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #FFCDD2', background: '#fff', fontSize: 12, fontWeight: 600, color: '#EA4335', cursor: 'pointer' }}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── CREATE ACCOUNT TAB ─────────────────────────────────────── */}
        {tab === 'create' && (
          <div style={{ maxWidth: 680 }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#202124' }}>Create New Account</h2>

            <div style={{ background: '#fff', borderRadius: 16, padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5F6368', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account ID (optional — auto-generated if blank)</label>
                <input
                  value={createForm.id}
                  onChange={e => setCreateForm(f => ({ ...f, id: e.target.value }))}
                  placeholder="e.g. ACC-XYZ001 (leave blank to auto-generate)"
                  style={{ ...INPUT, fontFamily: 'monospace' }}
                />
              </div>

              <FormFields
                form={createForm as unknown as Record<string, unknown>}
                set={(k, v) => setCreateForm(f => ({ ...f, [k]: v }))}
              />

              {createErr && (
                <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{createErr}</div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={() => { setCreateForm({ ...EMPTY_FORM }); setCreateErr(''); }} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '1.5px solid #E8EAED', background: '#fff', fontWeight: 600, cursor: 'pointer', color: '#5F6368', fontSize: 14 }}>Reset Form</button>
                <button onClick={handleCreate} disabled={creating} style={{ flex: 2, padding: '13px', borderRadius: 10, border: 'none', background: creating ? '#9AA0A6' : '#1A73E8', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {creating ? 'Creating…' : '➕ Create Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Confirm modal */}
      {confirm && <ConfirmModal message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* Edit drawer */}
      {editAccount && (
        <EditDrawer
          account={editAccount}
          onClose={() => setEditAccount(null)}
          onSaved={() => { fetchAccounts(); fetchStats(); showToast('Account updated', 'success'); }}
        />
      )}
    </div>
  );
}

// ── BulkCard helper ────────────────────────────────────────────────────────

function BulkCard({
  icon, title, description, buttonLabel, buttonColor, loading, onClick,
}: {
  icon: string; title: string; description: string;
  buttonLabel: string; buttonColor: string; loading: boolean; onClick: () => void;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#202124' }}>{title}</div>
      </div>
      <div style={{ fontSize: 13, color: '#5F6368', lineHeight: 1.5 }}>{description}</div>
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          padding: '10px', borderRadius: 9, border: 'none', marginTop: 'auto',
          background: loading ? '#9AA0A6' : buttonColor,
          color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Working…' : buttonLabel}
      </button>
    </div>
  );
}
