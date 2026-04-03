'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Search,
  Network,
  BarChart3,
  FileText,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: Zap,
    title: 'Pre-Transaction Decisioning',
    description: 'Real-time approve / block / MFA / manual-review decisions based on behavioural baseline, device trust, velocity, and graph signals.',
    tag: 'RBI Aligned',
  },
  {
    icon: Search,
    title: 'Post-Transaction Investigation',
    description: 'Full case management with timeline reconstruction, fund-flow tracing, evidence packaging, and analyst action centre.',
    tag: 'PMLA Compliant',
  },
  {
    icon: Network,
    title: 'Graph-Based Fund-Flow Analysis',
    description: 'Detect circular transfers, layering rings, and mule networks using NetworkX-powered graph analytics.',
    tag: 'FIU-IND Ready',
  },
  {
    icon: Shield,
    title: 'AI Explanation Layer',
    description: 'OpenAI GPT-4o mini generates plain-language alert explanations, case narratives, and STR drafts for analysts.',
    tag: 'Auditable',
  },
  {
    icon: FileText,
    title: 'Regulatory Report Export',
    description: 'FIU-style PDF reports with chain-of-custody hashing, transaction timelines, and evidence summaries.',
    tag: 'PDF Export',
  },
  {
    icon: BarChart3,
    title: 'Executive Intelligence',
    description: 'KPI dashboards, compliance tracker, model health monitor, SAR/CTR metrics, and learning loop summaries.',
    tag: 'CXO Ready',
  },
];

const capabilities = [
  'Structuring / Sub-threshold detection',
  'Account takeover signals',
  'Synthetic identity detection',
  'Circular fund-flow mapping',
  'NEFT / RTGS / UPI channel analysis',
  'Behavioural baseline deviation',
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      {/* Top nav bar */}
      <nav className="sticky top-0 z-10 bg-white border-b px-8 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground tracking-tight">Chakravyuh</span>
          <Badge variant="outline" className="text-[10px] text-muted-foreground ml-1">v1.1</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/analyst">
            <Button variant="ghost" size="sm" className="text-sm">Analyst Console</Button>
          </Link>
          <Link href="/executive">
            <Button size="sm" className="text-sm">Executive Dashboard</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-5xl px-8 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge className="mb-5 bg-primary/10 text-primary border border-primary/20 text-xs font-medium px-3 py-1">
            Indian Banking · Fraud Intelligence · v1.1
          </Badge>
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Chakra<span className="text-primary">vyuh</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground leading-relaxed">
            A multi-layered fraud intelligence platform for Indian banking institutions —
            combining behavioural analytics, graph-based fund-flow tracing, and AI-assisted
            investigation workflows.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link href="/analyst">
            <Button size="lg" className="gap-2 min-w-[200px] h-11">
              <Search className="h-4 w-4" />
              Analyst Console
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/executive">
            <Button size="lg" variant="outline" className="gap-2 min-w-[200px] h-11">
              <BarChart3 className="h-4 w-4" />
              Executive Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-5xl px-8 pb-16">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center mb-8">
          Core Capabilities
        </h2>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={item}>
              <Card className="h-full bg-white border border-border/70 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">{feature.tag}</Badge>
                  </div>
                  <CardTitle className="text-sm mb-1.5">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Capabilities Strip */}
      <div className="border-t border-b bg-white py-10 px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center mb-6">
            Detection Coverage
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {capabilities.map((cap) => (
              <div key={cap} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                {cap}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-muted-foreground">
          Chakravyuh · Next.js 14 · FastAPI · OpenAI GPT-4o mini · NetworkX · MongoDB ·{' '}
          <span className="text-primary">Made for Indian Banking</span>
        </p>
      </footer>
    </div>
  );
}
