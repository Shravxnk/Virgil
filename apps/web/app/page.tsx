'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Search,
  Network,
  BarChart3,
  FileText,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Shield,
    title: 'Pre-Transaction Scoring',
    description: 'Real-time risk assessment using behavioral, device, and graph signals.',
  },
  {
    icon: Search,
    title: 'Post-Transaction Investigation',
    description: 'Deep-dive case management with AI-generated explanations.',
  },
  {
    icon: Network,
    title: 'Graph Intelligence',
    description: 'Detect circular transfers, money laundering rings, and hidden relationships.',
  },
  {
    icon: Brain,
    title: 'LLM-Powered Insights',
    description: 'Natural language explanations and knowledge retrieval from policies.',
  },
  {
    icon: FileText,
    title: 'FIU Report Generation',
    description: 'Automated regulatory reports with chain-of-custody hashing.',
  },
  {
    icon: BarChart3,
    title: 'Executive Analytics',
    description: 'KPIs, model health monitoring, compliance tracking, and trend analysis.',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Chakra<span className="text-primary">vyuh</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              AI-Powered Fraud Intelligence System — Multi-layered detection, investigation,
              and reporting for modern banking institutions.
            </p>
          </motion.div>

          {/* Role Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/analyst">
              <Button size="lg" className="gap-2 min-w-[220px] h-14 text-base">
                <Search className="h-5 w-5" />
                Analyst Console
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/executive">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 min-w-[220px] h-14 text-base"
              >
                <BarChart3 className="h-5 w-5" />
                Executive Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={item}>
              <Card className="h-full hover:border-primary/40 transition-colors">
                <CardContent className="pt-6">
                  <feature.icon className="h-8 w-8 text-primary mb-3" />
                  <CardTitle className="text-base mb-2">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Architecture */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-xs text-muted-foreground font-mono">
            Next.js 14 · FastAPI · OpenAI · NetworkX · ChromaDB · ReportLab
          </p>
        </motion.div>
      </div>
    </div>
  );
}
