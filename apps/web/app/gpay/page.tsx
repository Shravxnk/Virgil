'use client';

/**
 * GPay Mock — Google Pay-style white theme mobile UI
 * Real device model detection via Client Hints API + UA fallback
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

// ── Real device name via Client Hints API (Chrome/Edge Android) ───────────
async function getDeviceName(): Promise<string> {
  // Chrome/Edge on Android: gives real model name e.g. "Pixel 7", "SM-S918B"
  if (typeof navigator !== 'undefined' && 'userAgentData' in navigator) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uaData = (navigator as any).userAgentData;
      const hints = await uaData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
      if (hints.model && hints.model.trim()) return hints.model.trim();
      if (hints.platform) {
        const ver = hints.platformVersion ? ` ${hints.platformVersion}` : '';
        return `${hints.platform}${ver}`.trim();
      }
    } catch (_) { /* fall through */ }
  }

  // Fallback: UA string parsing
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  // iOS — extract model from UA (iOS 15 and earlier include "iPhone OS X_X")
  if (/iPhone/.test(ua)) {
    const ios = ua.match(/iPhone OS (\d+_\d+)/);
    return ios ? `iPhone (iOS ${ios[1].replace('_', '.')})` : 'iPhone';
  }
  if (/iPad/.test(ua)) {
    const ios = ua.match(/OS (\d+_\d+)/);
    return ios ? `iPad (iOS ${ios[1].replace('_', '.')})` : 'iPad';
  }

  // Android — extract model from the parenthetical e.g. "Linux; Android 13; Redmi Note 12 Build/..."
  const android = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|\))/);
  if (android) {
    const model = android[1].trim();
    if (model && model !== 'Linux' && model.length > 1) return model;
    return 'Android Device';
  }

  if (/CrOS/.test(ua)) return 'Chromebook';
  if (/Macintosh/.test(ua)) return 'MacBook';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Unknown Device';
}

async function getGeoLocation(): Promise<string> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(''); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`),
      () => resolve(''),
      { timeout: 8000 },
    );
  });
}

// ── Avatar (Google-style colorful circle) ─────────────────────────────────
const GPAY_COLORS = ['#4285F4','#EA4335','#FBBC04','#34A853','#FF6D00','#46BDC6','#7B1FA2','#E91E63'];
function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initial = name?.[0]?.toUpperCase() ?? '?';
  const color = GPAY_COLORS[(name?.charCodeAt(0) ?? 65) % GPAY_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, color: '#fff', flexShrink: 0,
      fontFamily: '"Google Sans", Roboto, sans-serif',
    }}>{initial}</div>
  );
}

// ── Google "G" logo SVG ────────────────────────────────────────────────────
function GPLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
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
  const [deviceName, setDeviceName] = useState('Detecting device...');
  const [geoLoc, setGeoLoc] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [biometricStep, setBiometricStep] = useState<'prompt' | 'fingerprint' | 'face' | 'success' | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const amtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load accounts
    fetch(`${API_BASE}/api/accounts`)
      .then(r => r.json())
      .then(d => {
        const list: Account[] = d.accounts || [];
        setAccounts(list);
        if (list.length >= 2) { setFromId(list[0].id); setToId(list[1].id); }
      })
      .catch(() => setError('Cannot reach API. Check NEXT_PUBLIC_API_URL.'));

    // Async real device name
    getDeviceName().then(setDeviceName);
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
    setLoading(true); setError('');
    try {
      const loc = geoLoc || await requestGeo();
      const res = await fetch(`${API_BASE}/api/transactions/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_account: fromId, to_account: toId,
          amount: parseFloat(amount), txn_type: txnType, channel: 'mobile',
          device_id: deviceName.replace(/\s+/g, '_').toLowerCase(),
          device_name: deviceName, device_known: false,
          geo_location: loc || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data: ScoreResult = await res.json();
      setResult(data); setStep('result');
      localStorage.setItem('pretxn_scored', String(Date.now()));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setAmount(''); setStep('form'); setError(''); };

  const completeTxn = useCallback((preId: string) => {
    fetch(`${API_BASE}/api/transactions/${preId}/complete`, { method: 'POST' }).catch(() => {
      // Best-effort — the result screen already reflects success either way.
    });
  }, []);

  // ── RESULT SCREEN ──────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const configs = {
      approve: { icon: '✓', iconBg: '#34A853', iconColor: '#fff', title: 'Payment Sent!', sub: 'Transaction completed successfully', accent: '#34A853', bg: '#fff', pillBg: '#E8F5E9', pillText: '#2E7D32' },
      mfa:     { icon: '🔐', iconBg: '#4285F4', iconColor: '#fff', title: 'Verify Identity', sub: 'Use your fingerprint or face to complete payment', accent: '#4285F4', bg: '#fff', pillBg: '#E3F2FD', pillText: '#1565C0' },
      manual_review: { icon: '⏳', iconBg: '#FBBC04', iconColor: '#fff', title: 'Under Review', sub: 'Our team is reviewing this payment', accent: '#F9A825', bg: '#fff', pillBg: '#FFF8E1', pillText: '#F57F17' },
      block:   { icon: '✕', iconBg: '#EA4335', iconColor: '#fff', title: 'Payment Declined', sub: 'High-risk transaction blocked for your safety', accent: '#EA4335', bg: '#fff', pillBg: '#FFEBEE', pillText: '#C62828' },
    };
    const cfg = configs[result.decision] ?? configs.approve;

    // ── MFA Biometric Flow ─────────────────────────────────────────────
    if (result.decision === 'mfa' && biometricStep) {
      return (
        <div style={{ minHeight: '100dvh', background: '#F8F9FA', fontFamily: '"Google Sans", Roboto, "Helvetica Neue", sans-serif', display: 'flex', flexDirection: 'column' }}>
          {/* Minimal header */}
          <div style={{ background: '#fff', padding: '16px 20px', borderBottom: '1px solid #E8EAED', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setBiometricStep(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#5F6368"/></svg>
            </button>
            <GPLogo size={22} />
            <span style={{ fontWeight: 600, fontSize: 17, color: '#202124' }}>Verify Identity</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', maxWidth: 420, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            {biometricStep === 'prompt' && (
              <>
                <div style={{ fontSize: 64, marginBottom: 24 }}>🔐</div>
                <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 600, color: '#202124', textAlign: 'center' }}>Choose Verification Method</h2>
                <p style={{ margin: '0 0 32px', fontSize: 14, color: '#5F6368', textAlign: 'center' }}>Select how you'd like to verify this payment</p>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 }}>
                  <button onClick={() => setBiometricStep('fingerprint')} style={{
                    width: '100%', padding: '16px', borderRadius: 12, border: 'none',
                    background: '#E3F2FD', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14,
                    fontSize: 16, fontWeight: 600, color: '#1A73E8',
                    transition: 'all 0.2s',
                  }} onMouseEnter={(e) => (e.currentTarget.style.background = '#BBDEFB')} onMouseLeave={(e) => (e.currentTarget.style.background = '#E3F2FD')}>
                    <span style={{ fontSize: 28 }}>👆</span>
                    <span>Fingerprint</span>
                  </button>
                  <button onClick={() => setBiometricStep('face')} style={{
                    width: '100%', padding: '16px', borderRadius: 12, border: 'none',
                    background: '#F3E5F5', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14,
                    fontSize: 16, fontWeight: 600, color: '#7B1FA2',
                    transition: 'all 0.2s',
                  }} onMouseEnter={(e) => (e.currentTarget.style.background = '#E1BEE7')} onMouseLeave={(e) => (e.currentTarget.style.background = '#F3E5F5')}>
                    <span style={{ fontSize: 28 }}>😊</span>
                    <span>Face Recognition</span>
                  </button>
                  <button onClick={() => setBiometricStep(null)} style={{
                    width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #E8EAED',
                    background: '#fff', cursor: 'pointer',
                    fontSize: 14, fontWeight: 500, color: '#5F6368',
                  }}>
                    Enter OTP Instead
                  </button>
                </div>
              </>
            )}

            {biometricStep === 'fingerprint' && (
              <>
                <div style={{
                  width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, #4285F4, #1A73E8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 50, marginBottom: 24, boxShadow: '0 4px 20px rgba(66,133,244,0.3)',
                  animation: biometricLoading ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }}>
                  👆
                </div>
                <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 600, color: '#202124', textAlign: 'center' }}>
                  {biometricLoading ? 'Scanning...' : 'Place Your Finger'}
                </h2>
                <p style={{ margin: '0 0 28px', fontSize: 14, color: '#5F6368', textAlign: 'center' }}>
                  {biometricLoading
                    ? 'Hold steady until authentication completes'
                    : 'Place your registered fingerprint on the sensor'}
                </p>

                {!biometricLoading && (
                  <button onClick={async () => {
                    setBiometricLoading(true);
                    await new Promise(r => setTimeout(r, 2000));
                    setBiometricStep('success');
                    completeTxn(result.pre_txn_id);
                  }} style={{
                    width: '100%', maxWidth: 320, height: 54, borderRadius: 27,
                    background: '#1A73E8', border: 'none', color: '#fff',
                    fontSize: 16, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Simulate Fingerprint Match
                  </button>
                )}

                <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
              </>
            )}

            {biometricStep === 'face' && (
              <>
                <div style={{
                  width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, #EA4335, #D33426)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 50, marginBottom: 24, boxShadow: '0 4px 20px rgba(234,67,53,0.3)',
                  animation: biometricLoading ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }}>
                  😊
                </div>
                <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 600, color: '#202124', textAlign: 'center' }}>
                  {biometricLoading ? 'Analyzing Face...' : 'Look At Camera'}
                </h2>
                <p style={{ margin: '0 0 28px', fontSize: 14, color: '#5F6368', textAlign: 'center' }}>
                  {biometricLoading
                    ? 'Comparing facial features'
                    : 'Keep your face centered in the frame'}
                </p>

                {!biometricLoading && (
                  <button onClick={async () => {
                    setBiometricLoading(true);
                    await new Promise(r => setTimeout(r, 2500));
                    setBiometricStep('success');
                    completeTxn(result.pre_txn_id);
                  }} style={{
                    width: '100%', maxWidth: 320, height: 54, borderRadius: 27,
                    background: '#EA4335', border: 'none', color: '#fff',
                    fontSize: 16, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Simulate Face Match
                  </button>
                )}

                <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
              </>
            )}

            {biometricStep === 'success' && (
              <>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', background: '#34A853',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 48, marginBottom: 24, animation: 'pop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  ✓
                </div>
                <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 600, color: '#202124', textAlign: 'center' }}>
                  Identity Verified
                </h2>
                <p style={{ margin: '0 0 28px', fontSize: 14, color: '#5F6368', textAlign: 'center' }}>
                  Payment is processing securely
                </p>

                <div style={{ background: '#E8F5E9', border: '1px solid #81C784', borderRadius: 12, padding: '16px', marginBottom: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2E7D32', marginBottom: 8 }}>✓ Authentication Successful</div>
                  <div style={{ fontSize: 12, color: '#2E7D32' }}>Your fingerprint/face has been verified and matched</div>
                </div>

                <button onClick={() => { setBiometricStep(null); reset(); }} style={{
                  width: '100%', maxWidth: 320, height: 54, borderRadius: 27,
                  background: '#34A853', border: 'none', color: '#fff',
                  fontSize: 16, fontWeight: 600, cursor: 'pointer',
                }}>
                  Complete Payment
                </button>

                <style>{`@keyframes pop{0%{transform:scale(0.5);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100dvh', background: '#F8F9FA', fontFamily: '"Google Sans", Roboto, "Helvetica Neue", sans-serif', display: 'flex', flexDirection: 'column' }}>
        {/* Header bar */}
        <div style={{ background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #E8EAED' }}>
          <GPLogo size={22} />
          <span style={{ fontWeight: 600, fontSize: 17, color: '#202124' }}>Google Pay</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 24px', maxWidth: 420, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {/* Icon circle */}
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: cfg.iconColor, marginBottom: 20, animation: 'pop 0.35s cubic-bezier(0.34,1.56,0.64,1)', fontWeight: 700 }}>
            {cfg.icon}
          </div>

          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: '#202124', textAlign: 'center' }}>{cfg.title}</h2>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: '#5F6368', textAlign: 'center' }}>{cfg.sub}</p>

          {/* Amount card */}
          <div style={{ width: '100%', background: '#fff', borderRadius: 16, padding: '24px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', textAlign: 'center' }}>
            <div style={{ fontSize: 38, fontWeight: 700, color: '#202124', marginBottom: 6 }}>
              ₹{Number(result.amount).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 13, color: '#5F6368' }}>
              {result.from_name} <span style={{ color: cfg.accent }}>→</span> {result.to_name}
            </div>
          </div>

          {/* Risk score pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: cfg.pillBg, borderRadius: 20, padding: '6px 14px', marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: cfg.pillText, fontWeight: 500 }}>Risk Score</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: cfg.pillText }}>{result.score}/100</span>
            {result.case_id && <span style={{ fontSize: 11, color: cfg.pillText, opacity: 0.7 }}>· {result.case_id}</span>}
          </div>

          {/* OTP box for MFA */}
          {result.decision === 'mfa' && (
            <div style={{ width: '100%', background: '#E3F2FD', borderRadius: 12, padding: '14px 16px', marginBottom: 20, boxSizing: 'border-box' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1565C0', marginBottom: 4 }}>OTP Sent</div>
              <div style={{ fontSize: 12, color: '#1565C0', opacity: 0.8 }}>Enter the OTP sent to your registered mobile number to complete this payment.</div>
            </div>
          )}

          {/* Device & location */}
          <div style={{ fontSize: 11, color: '#9AA0A6', textAlign: 'center', marginBottom: 32 }}>
            📱 {deviceName}{geoLoc ? ` · 📍 ${geoLoc}` : ''}
          </div>

          {result.decision === 'mfa' ? (
            <>
              <button onClick={() => setBiometricStep('prompt')} style={{ width: '100%', height: 52, borderRadius: 26, background: '#1A73E8', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em', marginBottom: 10 }}>
                Verify Identity
              </button>
              <button onClick={reset} style={{ width: '100%', height: 44, borderRadius: 22, background: 'transparent', border: '1px solid #DADCE0', color: '#5F6368', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel Payment
              </button>
            </>
          ) : (
            <button onClick={reset} style={{ width: '100%', height: 52, borderRadius: 26, background: '#1A73E8', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em' }}>
              New Payment
            </button>
          )}
        </div>

        <style>{`@keyframes pop{0%{transform:scale(0.5);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
      </div>
    );
  }

  // ── CONFIRM SCREEN ─────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div style={{ minHeight: '100dvh', background: '#F8F9FA', fontFamily: '"Google Sans", Roboto, "Helvetica Neue", sans-serif' }}>
        {/* Header */}
        <div style={{ background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #E8EAED' }}>
          <button onClick={() => setStep('form')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#5F6368"/></svg>
          </button>
          <GPLogo size={22} />
          <span style={{ fontWeight: 600, fontSize: 17, color: '#202124' }}>Confirm Payment</span>
        </div>

        <div style={{ padding: '20px', maxWidth: 420, margin: '0 auto' }}>
          {/* Recipient card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <Avatar name={toAccount?.name ?? ''} size={52} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#202124' }}>{toAccount?.name}</div>
                <div style={{ fontSize: 12, color: '#5F6368', marginTop: 2 }}>{toAccount?.upi_id || toAccount?.id} · {toAccount?.city}</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #E8EAED', paddingTop: 18 }}>
              <div style={{ fontSize: 11, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Amount</div>
              <div style={{ fontSize: 42, fontWeight: 700, color: '#202124' }}>₹{Number(amount).toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Details card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {[
              ['From', fromAccount?.name ?? fromId],
              ['Payment via', txnType],
              ['Device', deviceName],
              ...(geoLoc ? [['Location', geoLoc]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F3F4' }}>
                <span style={{ fontSize: 13, color: '#5F6368' }}>{k}</span>
                <span style={{ fontSize: 13, color: '#202124', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#FFEBEE', border: '1px solid #EF9A9A', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#C62828', fontSize: 13 }}>{error}</div>
          )}

          {/* Google Pay-style security note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '0 4px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#34A853"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
            <span style={{ fontSize: 12, color: '#5F6368' }}>AI fraud check runs in &lt;100ms before processing</span>
          </div>

          <button onClick={handlePay} disabled={loading} style={{
            width: '100%', height: 54, borderRadius: 27,
            background: loading ? '#9AA0A6' : '#1A73E8',
            border: 'none', color: '#fff', fontSize: 16, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            {loading ? (
              <><span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Verifying...</>
            ) : `Pay ₹${Number(amount).toLocaleString('en-IN')}`}
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── FORM SCREEN ────────────────────────────────────────────────────────
  const canProceed = fromId && toId && fromId !== toId && parseFloat(amount) > 0;

  return (
    <div style={{ minHeight: '100dvh', background: '#F8F9FA', fontFamily: '"Google Sans", Roboto, "Helvetica Neue", sans-serif', paddingBottom: 40 }}>

      {/* Google Pay Header */}
      <div style={{ background: '#fff', padding: '16px 20px 14px', borderBottom: '1px solid #E8EAED' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 420, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GPLogo size={26} />
            <span style={{ fontSize: 18, fontWeight: 600, color: '#202124', letterSpacing: '-0.3px' }}>Pay</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E8F5E9', borderRadius: 12, padding: '4px 10px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34A853', display: 'inline-block', animation: 'gpulse 1.8s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#2E7D32' }}>Fraud Protection ON</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: 420, margin: '0 auto' }}>

        {/* Pay to card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Pay to</div>

          <div style={{ position: 'relative' }}>
            <select value={toId} onChange={e => setToId(e.target.value)} style={{
              width: '100%', background: '#F8F9FA', border: '1.5px solid #E8EAED', borderRadius: 12,
              outline: 'none', color: '#202124', fontSize: 15, padding: '13px 16px', cursor: 'pointer',
              appearance: 'none', WebkitAppearance: 'none',
            }}>
              {accounts.filter(a => a.id !== fromId).map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
              ))}
            </select>
            <svg style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 10l5 5 5-5H7z" fill="#5F6368"/></svg>
          </div>

          {toAccount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 12px', background: '#F8F9FA', borderRadius: 10 }}>
              <Avatar name={toAccount.name} size={36} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#202124' }}>{toAccount.name}</div>
                <div style={{ fontSize: 11, color: '#5F6368' }}>{toAccount.upi_id || toAccount.id} · {toAccount.city}</div>
              </div>
            </div>
          )}
        </div>

        {/* Amount card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Amount</div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#F8F9FA', borderRadius: 12, border: '1.5px solid #E8EAED', padding: '0 16px' }}>
            <span style={{ color: '#5F6368', fontSize: 22, fontWeight: 400, marginRight: 4 }}>₹</span>
            <input
              ref={amtRef}
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#202124', fontSize: 32, fontWeight: 700, padding: '12px 0' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {[500, 1000, 5000, 10000, 50000].map(v => (
              <button key={v} onClick={() => setAmount(String(v))} style={{
                padding: '5px 13px', borderRadius: 16,
                border: `1.5px solid ${amount === String(v) ? '#1A73E8' : '#E8EAED'}`,
                background: amount === String(v) ? '#E8F0FE' : '#fff',
                color: amount === String(v) ? '#1A73E8' : '#5F6368',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                ₹{v >= 1000 ? `${v / 1000}K` : v}
              </button>
            ))}
          </div>
        </div>

        {/* Pay from + method card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Pay from</div>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <select value={fromId} onChange={e => setFromId(e.target.value)} style={{
              width: '100%', background: '#F8F9FA', border: '1.5px solid #E8EAED', borderRadius: 12,
              outline: 'none', color: '#202124', fontSize: 14, padding: '11px 16px', cursor: 'pointer',
              appearance: 'none', WebkitAppearance: 'none',
            }}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {a.account_type.replace('_', ' ')} ({a.city})</option>
              ))}
            </select>
            <svg style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 10l5 5 5-5H7z" fill="#5F6368"/></svg>
          </div>

          {/* Payment method tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['UPI', 'IMPS', 'NEFT', 'RTGS'].map(t => (
              <button key={t} onClick={() => setTxnType(t)} style={{
                flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                border: `1.5px solid ${txnType === t ? '#1A73E8' : '#E8EAED'}`,
                background: txnType === t ? '#E8F0FE' : '#fff',
                color: txnType === t ? '#1A73E8' : '#5F6368',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Location + Device row */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#202124' }}>📍 Location for fraud check</div>
              <div style={{ fontSize: 11, color: '#9AA0A6', marginTop: 2 }}>{geoLoc || 'Not captured yet'}</div>
            </div>
            <button onClick={requestGeo} disabled={geoLoading} style={{
              background: '#E8F0FE', border: 'none', borderRadius: 8,
              padding: '7px 14px', color: '#1A73E8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              {geoLoading ? '...' : geoLoc ? 'Refresh' : 'Allow'}
            </button>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F3F4', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>📱</span>
            <span style={{ fontSize: 12, color: '#5F6368' }}>{deviceName}</span>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FFEBEE', border: '1px solid #EF9A9A', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#C62828', fontSize: 13 }}>{error}</div>
        )}

        {/* Main pay button */}
        <button
          disabled={!canProceed}
          onClick={() => { setError(''); setStep('confirm'); }}
          style={{
            width: '100%', height: 54, borderRadius: 27,
            background: canProceed ? '#1A73E8' : '#E8EAED',
            border: 'none', color: canProceed ? '#fff' : '#9AA0A6',
            fontSize: 16, fontWeight: 600, cursor: canProceed ? 'pointer' : 'not-allowed',
            letterSpacing: '0.01em',
          }}
        >
          {canProceed ? `Pay ₹${Number(amount).toLocaleString('en-IN')}` : 'Enter payment details'}
        </button>

        <p style={{ textAlign: 'center', color: '#9AA0A6', fontSize: 11, marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#34A853"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
          AI fraud check runs in &lt;100ms before this payment processes
        </p>
      </div>

      <style>{`
        @keyframes gpulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        select option { background: #fff; color: #202124; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
