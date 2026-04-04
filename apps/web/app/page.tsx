import Link from 'next/link';
import { Shield, Eye, BarChart3, FlaskConical, ArrowRight, Lock, Zap, Network, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col">

      {/* Top Nav */}
      <nav className="sticky top-0 z-10 bg-white border-b px-6 h-14 flex items-center gap-3 shadow-sm">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Shield className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight">Chakravyuh</span>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">v1.2.0</Badge>
      </nav>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-5 shadow-lg">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Chakravyuh</h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
          AI-powered banking fraud intelligence platform — real-time risk scoring, AML graph analysis,
          LLM-powered investigation, and FIU-IND-compliant reporting.
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          <Badge variant="secondary">Pre-Transaction Prevention</Badge>
          <Badge variant="secondary">Graph Intelligence</Badge>
          <Badge variant="secondary">LLM Investigation</Badge>
          <Badge variant="secondary">FIU Reporting</Badge>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="flex flex-col items-center px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">

          {/* Analyst Console */}
          <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardHeader className="pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 mb-2">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-base">Analyst Console</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Alert inbox, case investigation, manual review queue, pre-transaction analytics,
                and AI-generated fraud explanations.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1.5"><Lock className="h-3 w-3" />Alert inbox with risk ranking</li>
                <li className="flex items-center gap-1.5"><Network className="h-3 w-3" />Case graph investigation</li>
                <li className="flex items-center gap-1.5"><Brain className="h-3 w-3" />LLM-generated explanations</li>
                <li className="flex items-center gap-1.5"><Zap className="h-3 w-3" />Pre-transaction analytics</li>
              </ul>
              <Link href="/analyst" className="block">
                <Button className="w-full mt-2 gap-2">
                  Open Analyst Console <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Executive Dashboard */}
          <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardHeader className="pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 mb-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-base">Executive Dashboard</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Enterprise-level KPIs, fraud trend analysis, model health monitoring,
                and compliance tracking for leadership.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1.5"><BarChart3 className="h-3 w-3" />Fraud KPIs and trend charts</li>
                <li className="flex items-center gap-1.5"><Zap className="h-3 w-3" />Model accuracy and precision</li>
                <li className="flex items-center gap-1.5"><Lock className="h-3 w-3" />Compliance score and SARs</li>
                <li className="flex items-center gap-1.5"><Network className="h-3 w-3" />Risk category breakdown</li>
              </ul>
              <Link href="/executive" className="block">
                <Button className="w-full mt-2 gap-2" variant="outline">
                  Open Executive Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Test Case Simulation */}
          <Card className="shadow-sm hover:shadow-md transition-shadow bg-white border-dashed border-2">
            <CardHeader className="pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 mb-2">
                <FlaskConical className="h-5 w-5 text-teal-600" />
              </div>
              <CardTitle className="text-base">Test Case Simulation</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Fire all 34 use cases live — pre-transaction scoring, graph detection,
                analyst workflows, executive metrics, and the learning loop.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1.5"><Shield className="h-3 w-3" />9 pre-transaction scenarios</li>
                <li className="flex items-center gap-1.5"><Network className="h-3 w-3" />9 post-transaction / AML cases</li>
                <li className="flex items-center gap-1.5"><Eye className="h-3 w-3" />7 analyst dashboard flows</li>
                <li className="flex items-center gap-1.5"><Brain className="h-3 w-3" />Custom transaction builder</li>
              </ul>
              <Link href="/analyst/demo" className="block">
                <Button className="w-full mt-2 gap-2" variant="outline">
                  Run Test Cases <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mt-8">
          {[
            { label: 'Use Cases', value: '34', sub: 'across 5 groups' },
            { label: 'API Endpoints', value: '12+', sub: 'REST API' },
            { label: 'Risk Signals', value: '5', sub: 'behavioral dimensions' },
            { label: 'AI Model', value: 'GPT-4o-mini', sub: 'RAG + ChromaDB' },
          ].map(s => (
            <div key={s.label} className="rounded-lg border bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-xl font-bold text-primary">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white py-4 text-center text-[11px] text-muted-foreground">
        Chakravyuh v1.2.0 · Built by Suyash Sawant · Indian Banking Fraud Intelligence
      </footer>

    </div>
  );
}
