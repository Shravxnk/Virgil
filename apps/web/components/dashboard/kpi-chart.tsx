'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#6b7280'];

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface DailyTrendChartProps {
  data: { date: string; alerts: number; resolved: number }[];
}

export function DailyTrendChart({ data }: DailyTrendChartProps) {
  return (
    <ChartCard title="Daily Alert Trend">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="alerts"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="resolved"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.1}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface ScoreDistributionChartProps {
  data: { range: string; count: number }[];
}

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  return (
    <ChartCard title="Risk Score Distribution">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="range" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  index <= 1
                    ? '#10b981'
                    : index === 2
                    ? '#f59e0b'
                    : index === 3
                    ? '#f97316'
                    : '#ef4444'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface FraudTrendChartProps {
  data: { month: string; detected: number; prevented: number }[];
}

export function FraudTrendChart({ data }: FraudTrendChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    detected: d.detected / 1000,
    prevented: d.prevented / 1000,
  }));

  return (
    <ChartCard title="Fraud Trend ($K)">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number) => `$${value.toFixed(0)}K`} />
          <Legend />
          <Line
            type="monotone"
            dataKey="detected"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="prevented"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface CasesByStatusChartProps {
  data: { status: string; count: number }[];
}

export function CasesByStatusChart({ data }: CasesByStatusChartProps) {
  return (
    <ChartCard title="Cases by Status">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="count"
            nameKey="status"
            label={({ status, count }) => `${status}: ${count}`}
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface RiskCategoriesChartProps {
  data: { category: string; count: number; amount: number }[];
}

export function RiskCategoriesChart({ data }: RiskCategoriesChartProps) {
  const formatted = data.map((d) => ({ ...d, amount: d.amount / 1000 }));
  return (
    <ChartCard title="Top Risk Categories ($K)">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={formatted} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={120} />
          <Tooltip formatter={(value: number) => `$${value.toFixed(0)}K`} />
          <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
