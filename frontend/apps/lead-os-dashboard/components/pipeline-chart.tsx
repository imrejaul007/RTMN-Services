'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

interface PipelineChartProps {
  data?: PipelineStage[];
}

const defaultData = [
  { stage: 'New', count: 245, value: 1250000 },
  { stage: 'Contacted', count: 189, value: 2100000 },
  { stage: 'Qualified', count: 156, value: 3400000 },
  { stage: 'Proposal', count: 98, value: 4500000 },
  { stage: 'Negotiation', count: 45, value: 3200000 },
  { stage: 'Closed', count: 32, value: 2800000 },
];

const COLORS = ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'];

export default function PipelineChart({ data }: PipelineChartProps) {
  const chartData = data || defaultData;

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="stage"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: number, name: string) => [
              name === 'value' ? formatValue(value) : value,
              name === 'value' ? 'Value' : 'Leads',
            ]}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
