import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#0A0F1E', minHeight: '100vh' }}>
      {/* ── Standalone top bar ── */}
      <nav
        style={{
          backgroundColor: '#060D1A',
          borderBottom: '1px solid #1E2D45',
          padding: '0 1.5rem',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Left — logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#3B82F620',
              border: '1px solid #3B82F640',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={14} color="#3B82F6" />
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              fontWeight: 700,
              color: '#F0F4FF',
              letterSpacing: '0.08em',
            }}
          >
            VIRGIL
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              fontWeight: 500,
              color: '#3B82F6',
              backgroundColor: '#3B82F615',
              border: '1px solid #3B82F630',
              borderRadius: '4px',
              padding: '1px 8px',
              letterSpacing: '0.1em',
            }}
          >
            SIMULATOR
          </span>
          <span
            style={{
              fontSize: '10px',
              color: '#4A5C7A',
              letterSpacing: '0.06em',
              marginLeft: '4px',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            · TESTING ENVIRONMENT
          </span>
        </div>

        {/* Right — exit link */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#8899BB',
            textDecoration: 'none',
            padding: '5px 14px',
            borderRadius: '6px',
            border: '1px solid #1E2D45',
            backgroundColor: '#111827',
            transition: 'all 0.15s ease',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.05em',
          }}
        >
          ← EXIT SIMULATOR
        </Link>
      </nav>

      {/* ── Page content ── */}
      <main>{children}</main>
    </div>
  );
}
