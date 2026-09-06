'use client';

import Link from 'next/link';
import { Shield, Eye, FlaskConical, ArrowRight, Lock, Zap, Network, Brain } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen hex-grid-bg flex flex-col" style={{ backgroundColor: '#0A0F1E' }}>

      {/* Top Nav */}
      <nav
        className="sticky top-0 z-20 px-6 h-14 flex items-center gap-3 backdrop-blur-md"
        style={{ backgroundColor: '#0A0F1E/80', borderBottom: '1px solid #1E2D45' }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded"
          style={{ backgroundColor: '#3B82F620', border: '1px solid #3B82F640' }}
        >
          <Shield className="h-3.5 w-3.5" style={{ color: '#60A5FA' }} />
        </div>
        <span
          className="text-sm font-bold tracking-wide font-display"
          style={{ color: '#F0F4FF', letterSpacing: '0.08em' }}
        >
          VIRGIL
        </span>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded"
          style={{ color: '#60A5FA', backgroundColor: '#3B82F615', border: '1px solid #3B82F630' }}
        >
          v1.2.0
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded"
            style={{ backgroundColor: '#22C55E15', border: '1px solid #22C55E30', color: '#22C55E' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            SYSTEM LIVE
          </span>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        {/* Glyph */}
        <div className="relative mb-8">
          <div
            className="flex h-20 w-20 items-center justify-center rounded"
            style={{
              backgroundColor: '#3B82F610',
              border: '1px solid #3B82F640',
              boxShadow: '0 0 40px #3B82F625, 0 0 80px #3B82F610',
            }}
          >
            <Shield className="h-10 w-10" style={{ color: '#60A5FA' }} />
          </div>
          <div
            className="absolute inset-0 rounded animate-ping"
            style={{ border: '1px solid #3B82F630', animationDuration: '2s' }}
          />
        </div>

        <h1
          className="text-5xl font-bold font-display tracking-tight mb-4"
          style={{ color: '#F0F4FF', letterSpacing: '-0.02em' }}
        >
          Virgil
        </h1>
        <p className="text-sm leading-relaxed max-w-xl mb-3" style={{ color: '#8899BB' }}>
          AI-powered banking fraud intelligence platform — real-time risk scoring, AML graph analysis,
          LLM-powered investigation, and FIU-IND-compliant reporting.
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {['Pre-Transaction Prevention', 'Graph Intelligence', 'LLM Investigation', 'FIU Reporting'].map(tag => (
            <span
              key={tag}
              className="text-[11px] font-mono px-3 py-1 rounded"
              style={{ color: '#60A5FA', backgroundColor: '#3B82F610', border: '1px solid #3B82F630' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="flex flex-col items-center px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">

          {/* Analyst Console */}
          <div
            className="rounded p-5 flex flex-col gap-4 relative overflow-hidden group transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3B82F660'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1E2D45'; }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t" style={{ background: 'linear-gradient(90deg, #3B82F6, transparent)' }} />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded" style={{ backgroundColor: '#3B82F615', border: '1px solid #3B82F630' }}>
                <Eye className="h-4 w-4" style={{ color: '#60A5FA' }} />
              </div>
              <div>
                <p className="text-sm font-semibold font-display" style={{ color: '#F0F4FF' }}>Analyst Console</p>
                <p className="text-[11px]" style={{ color: '#8899BB' }}>Threat detection workspace</p>
              </div>
            </div>
            <ul className="space-y-2">
              {[
                [Lock, 'Alert inbox with risk ranking'],
                [Network, 'Case graph investigation'],
                [Brain, 'LLM-generated explanations'],
                [Zap, 'Pre-transaction analytics'],
              ].map(([Icon, text]: any) => (
                <li key={text} className="flex items-center gap-2 text-[11px]" style={{ color: '#8899BB' }}>
                  <Icon className="h-3 w-3 flex-shrink-0" style={{ color: '#3B82F6' }} />
                  {text}
                </li>
              ))}
            </ul>
            <Link
              href="/analyst"
              className="flex items-center justify-center gap-2 rounded py-2 text-xs font-semibold transition-all"
              style={{ backgroundColor: '#3B82F6', color: '#fff' }}
            >
              Open Analyst Console <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Executive Dashboard card hidden for the first review — pages
              still exist at /executive/*, just not linked from here yet. */}

          {/* Demo / Test Simulation */}
          <div
            className="rounded p-5 flex flex-col gap-4 relative overflow-hidden group transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: '#111827', border: '1px dashed #1E2D45' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#14B8A660'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1E2D45'; }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t" style={{ background: 'linear-gradient(90deg, #14B8A6, transparent)' }} />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded" style={{ backgroundColor: '#14B8A615', border: '1px solid #14B8A630' }}>
                <FlaskConical className="h-4 w-4" style={{ color: '#2DD4BF' }} />
              </div>
              <div>
                <p className="text-sm font-semibold font-display" style={{ color: '#F0F4FF' }}>Test Case Simulation</p>
                <p className="text-[11px]" style={{ color: '#8899BB' }}>Live use-case runner</p>
              </div>
            </div>
            <ul className="space-y-2">
              {[
                [Shield, '9 pre-transaction scenarios'],
                [Network, '9 post-transaction / AML cases'],
                [Eye, '7 analyst dashboard flows'],
                [Brain, 'Custom transaction builder'],
              ].map(([Icon, text]: any) => (
                <li key={text} className="flex items-center gap-2 text-[11px]" style={{ color: '#8899BB' }}>
                  <Icon className="h-3 w-3 flex-shrink-0" style={{ color: '#14B8A6' }} />
                  {text}
                </li>
              ))}
            </ul>
            <Link
              href="/demo"
              className="flex items-center justify-center gap-2 rounded py-2 text-xs font-semibold transition-all"
              style={{ backgroundColor: '#1A2235', color: '#2DD4BF', border: '1px solid #14B8A640' }}
            >
              Run Test Cases <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mt-6">
          {[
            { label: 'Use Cases', value: '34', sub: 'across 5 groups', color: '#3B82F6' },
            { label: 'API Endpoints', value: '12+', sub: 'REST API', color: '#6366F1' },
            { label: 'Risk Signals', value: '5', sub: 'behavioral dimensions', color: '#F59E0B' },
            { label: 'Intelligence', value: 'RAG', sub: 'ChromaDB + PostgreSQL', color: '#14B8A6' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded px-4 py-3 text-center relative overflow-hidden"
              style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
              <p className="text-xl font-bold font-display" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs font-medium" style={{ color: '#F0F4FF' }}>{s.label}</p>
              <p className="text-[10px]" style={{ color: '#8899BB' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

