'use client';

/**
 * GPay Mock — Mobile-first pre-transaction payment UI
 *
 * Open on any phone/tablet: /gpay
 * Captures device name + geolocation, submits to /api/transactions/score,
 * shows real-time approve / MFA / block result, and broadcasts to the
 * analyst dashboard via SSE.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────────────
interface Account {
  id: string;
  name: string;
  account_type: string;
  risk_rating: string;
  city: string;
  upi_id: string;
}

interface ScoreResult {
  pre_txn_id: string;
  from_account: string;
  from_name: string;
  to_account: string;
  to_name: string;
  amount: number;
  score: number;
  decision: 'approve' | 'mfa' | 'manual_review' | 'block';
  reason_codes: string[];
  alert_id: string | null;
  case_id: string | null;
  scored_at: string;
}

// ── Decision config ────────────────────────────────────────────────────────
const DECISION = {
  approve: {
    emoji: '✓',
    label: 'Payment Approved',
    sub: 'Transaction processed successfully',
    bg: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
    border: '#10b981',
    glow: 'rgba(16,185,129,0.4)',
    color: '#6ee7b7',
  },
  mfa: {
    emoji: '🔐',
    label: 'Verify Your Identity',
    sub: 'Additional authentication required',
    bg: 'linear-gradient(135deg, #1e3a5f 0%, #1e3049 100%)',
    border: '#3b82f6',
    glow: 'rgba(59,130,246,0.4)',
    color: '#93c5fd',
  },
  manual_review: {
    emoji: '⏳',
    label: 'Under Review',
    sub: 'Our fraud team is reviewing this payment',
    bg: 'linear-gradient(135deg, #451a03 0%, #3c1a00 100%)',
    border: '#f59e0b',
    glow: 'rgba(245,158,11,0.4)',
    color: '#fcd34d',
  },
  block: {
    emoji: '⛔',
    label: 'Payment Blocked',
    sub: 'High-risk transaction — contact your bank',
    bg: 'linear-gradient(135deg, #450a0a 0%, #3b0000 100%)',
    border: '#ef4444',
    glow: 'rgba(239,68,68,0.4)',
    color: '#fca5a5',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  const model = ua.match(/\(([^)]+)\)/)?.[1]?.split(';')[0]?.trim();
  if (model) return model;
  if (/Android/.test(ua)) return 'Android Device';
  if (/Mac/.test(ua)) return 'MacBook';
  if (/Win/.test(ua)) return 'Windows PC';
  return 'Unknown Device';
}

async function getGeoLocation(): Promise<string> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(''); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`),
      () => resolve(''),
      { timeout: 5000 },
    );
  });
}

// ── GPay Contact Avatar ────────────────────────────────────────────────────
function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initial = name?.[0]?.toUpperCase() ?? '?';
  const hue = (name?.charCodeAt(0) ?? 65) * 137 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},55%,45%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, color: '#fff',
      flexShrink: 0,
    }}>{initial}</div>
  );
}

// ── Quick Amount Chip ──────────────────────────────────────────────────────
function Chip({ val, active, onClick }: { val: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? '#4ade80' : 'rgba(255,255,255,0.12)'}`,
      background: active ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
      color: active ? '#4ade80' : 'rgba(255,255,255,0.75)',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
    }}>
      ₹{val >= 1000 ? `${val / 1000}K` : val}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function GPayPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [txnType, setTxnType] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'result'>('form');
  const [deviceName, setDeviceName] = useState('');
  const [geoLoc, setGeoLoc] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const amtRef = useRef<HTMLInputElement>(null);

  // Load accounts on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/accounts`)
      .then(r => r.json())
      .then(d => {
        const list: Account[] = d.accounts || [];
        setAccounts(list);
        if (list.length >= 2) {
          setFromId(list[0].id);
          setToId(list[1].id);
        }
      })
      .catch(() => setError('Cannot reach API. Check NEXT_PUBLIC_API_URL.'));

    setDeviceName(getDeviceName());
  }, []);

  const requestGeo = useCallback(async () => {
    setGeoLoading(true);
    const loc = await getGeoLocation();
    setGeoLoc(loc);
    setGeoLoading(false);
    return loc;
  }, []);

  const fromAccount = accounts.find(a => a.id === fromId);
  const toAccount = accounts.find(a => a.id === toId);

  const handlePay = async () => {
    if (!fromId || !toId || !amount || fromId === toId) return;
    setLoading(true);
    setError('');
    try {
      const loc = geoLoc || await requestGeo();
      const res = await fetch(`${API_BASE}/api/transactions/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_account: fromId,
          to_account: toId,
          amount: parseFloat(amount),
          txn_type: txnType,
          channel: 'mobile',
          device_id: deviceName.replace(/\s+/g, '_').toLowerCase(),
          device_name: deviceName,
          device_known: false,
          geo_location: loc || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data: ScoreResult = await res.json();
      setResult(data);
      setStep('result');
      // Notify same-browser analytics pages
      localStorage.setItem('pretxn_scored', String(Date.now()));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setAmount(''); setStep('form'); setError(''); };

  // ── Result screen ──────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const cfg = DECISION[result.decision] ?? DECISION.approve;
    return (
      <div style={{
        minHeight: '100dvh', background: cfg.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Glow ring */}
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          border: `3px solid ${cfg.border}`,
          boxShadow: `0 0 40px ${cfg.glow}, inset 0 0 20px ${cfg.glow}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, marginBottom: 28,
          animation: 'pop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {cfg.emoji}
        </div>

        <h1 style={{ color: cfg.color, fontSize: 24, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>
          {cfg.label}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: '0 0 32px', textAlign: 'center' }}>
          {cfg.sub}
        </p>

        {/* Amount */}
        <div style={{
          background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 32px',
          marginBottom: 20, textAlign: 'center', border: `1px solid rgba(255,255,255,0.1)`,
          width: '100%', maxWidth: 340, boxSizing: 'border-box',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</div>
          <div style={{ color: '#fff', fontSize: 36, fontWeight: 800 }}>₹{Number(result.amount).toLocaleString('en-IN')}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            {result.from_name} → {result.to_name}
          </div>
        </div>

        {/* Risk pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28,
          background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '8px 16px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Risk Score</span>
          <span style={{ color: cfg.color, fontWeight: 700, fontSize: 16 }}>{result.score}/100</span>
          {result.case_id && (
            <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
              Case: {result.case_id}
            </span>
          )}
        </div>

        {/* MFA instruction */}
        {result.decision === 'mfa' && (
          <div style={{
            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 24, width: '100%', maxWidth: 340, boxSizing: 'border-box',
          }}>
            <div style={{ color: '#93c5fd', fontWeight: 600, marginBottom: 4, fontSize: 14 }}>OTP Sent</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
              A one-time password has been sent to your registered mobile number. Enter it to complete payment.
            </div>
          </div>
        )}

        {/* Device + location */}
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 32, textAlign: 'center' }}>
          {deviceName}{geoLoc ? ` · ${geoLoc}` : ''}
        </div>

        <button onClick={reset} style={{
          width: '100%', maxWidth: 340, height: 52, borderRadius: 14,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer',
        }}>
          New Payment
        </button>

        <style>{`
          @keyframes pop {
            0%  { transform: scale(0.5); opacity: 0; }
            100%{ transform: scale(1);   opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── Confirm screen ─────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div style={{
        minHeight: '100dvh', background: '#0f0f14',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <button onClick={() => setStep('form')} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            fontSize: 24, cursor: 'pointer', marginBottom: 24, padding: 0,
          }}>‹</button>

          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Confirm Payment</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 28px' }}>Review details before sending</p>

          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '20px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <Avatar name={toAccount?.name ?? ''} size={52} />
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{toAccount?.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  {toAccount?.upi_id || toAccount?.id} · {toAccount?.city}
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 4 }}>AMOUNT</div>
              <div style={{ color: '#fff', fontSize: 40, fontWeight: 800 }}>₹{Number(amount).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, marginTop: 14 }}>
              {[
                ['From', fromAccount?.name ?? fromId],
                ['Via', txnType],
                ['Device', deviceName],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{k}</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{v}</span>
                </div>
              ))}
              {geoLoc && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Location</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{geoLoc}</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              color: '#fca5a5', fontSize: 13,
            }}>{error}</div>
          )}

          <button onClick={handlePay} disabled={loading} style={{
            width: '100%', height: 56, borderRadius: 14,
            background: loading ? 'rgba(74,222,128,0.4)' : 'linear-gradient(135deg,#16a34a,#15803d)',
            border: 'none', color: '#fff', fontSize: 17, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Processing...
              </>
            ) : (
              <>Pay ₹{Number(amount).toLocaleString('en-IN')}</>
            )}
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Form screen ────────────────────────────────────────────────────────
  const canProceed = fromId && toId && fromId !== toId && parseFloat(amount) > 0;

  return (
    <div style={{
      minHeight: '100dvh', background: '#0f0f14',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '0 0 40px',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f14 100%)',
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #4ade80, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>₹</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>ChakraPay</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Real-time fraud protection active</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 600 }}>LIVE</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Sender */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Paying from
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <select
              value={fromId}
              onChange={e => setFromId(e.target.value)}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 15, padding: '14px 16px', cursor: 'pointer',
              }}
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id} style={{ background: '#1a1a2e', color: '#fff' }}>
                  {a.name} ({a.id})
                </option>
              ))}
            </select>
          </div>
          {fromAccount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 4 }}>
              <Avatar name={fromAccount.name} size={28} />
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                {fromAccount.city} · {fromAccount.account_type.replace('_', ' ')} · {fromAccount.risk_rating.toUpperCase()} risk
              </span>
            </div>
          )}
        </div>

        {/* Arrow divider */}
        <div style={{ textAlign: 'center', margin: '4px 0 12px', color: 'rgba(255,255,255,0.2)', fontSize: 22 }}>↓</div>

        {/* Receiver */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Paying to
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <select
              value={toId}
              onChange={e => setToId(e.target.value)}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 15, padding: '14px 16px', cursor: 'pointer',
              }}
            >
              {accounts.filter(a => a.id !== fromId).map(a => (
                <option key={a.id} value={a.id} style={{ background: '#1a1a2e', color: '#fff' }}>
                  {a.name} ({a.id})
                </option>
              ))}
            </select>
          </div>
          {toAccount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 4 }}>
              <Avatar name={toAccount.name} size={28} />
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                {toAccount.city} · {toAccount.account_type.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Amount
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, display: 'flex', alignItems: 'center', padding: '0 16px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20, marginRight: 8 }}>₹</span>
            <input
              ref={amtRef}
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 28, fontWeight: 700, padding: '14px 0',
              }}
            />
          </div>

          {/* Quick chips */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {[500, 1000, 5000, 10000, 50000].map(v => (
              <Chip key={v} val={v} active={amount === String(v)} onClick={() => setAmount(String(v))} />
            ))}
          </div>
        </div>

        {/* Txn type */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Payment method
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['UPI', 'IMPS', 'NEFT', 'RTGS'].map(t => (
              <button key={t} onClick={() => setTxnType(t)} style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${txnType === t ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.08)'}`,
                background: txnType === t ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)',
                color: txnType === t ? '#4ade80' : 'rgba(255,255,255,0.5)',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Location request */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>
              📍 Location for fraud check
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>
              {geoLoc || 'Not captured yet'}
            </div>
          </div>
          <button onClick={requestGeo} disabled={geoLoading} style={{
            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: 8, padding: '6px 12px', color: '#4ade80', fontSize: 12,
            fontWeight: 600, cursor: 'pointer',
          }}>
            {geoLoading ? '...' : geoLoc ? 'Re-capture' : 'Allow'}
          </button>
        </div>

        {/* Device info */}
        <div style={{
          color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', marginBottom: 20,
        }}>
          Device: {deviceName}
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13,
          }}>{error}</div>
        )}

        {/* Pay button */}
        <button
          disabled={!canProceed}
          onClick={() => { setError(''); setStep('confirm'); }}
          style={{
            width: '100%', height: 56, borderRadius: 14,
            background: canProceed
              ? 'linear-gradient(135deg,#16a34a,#15803d)'
              : 'rgba(255,255,255,0.06)',
            border: 'none', color: canProceed ? '#fff' : 'rgba(255,255,255,0.2)',
            fontSize: 17, fontWeight: 700, cursor: canProceed ? 'pointer' : 'not-allowed',
          }}
        >
          {canProceed ? `Pay ₹${Number(amount).toLocaleString('en-IN')} →` : 'Enter payment details'}
        </button>

        {/* Fraud shield note */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 16 }}>
          🛡️ AI fraud check runs in &lt;100ms before this payment processes
        </p>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        select option { background: #1a1a2e; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}
