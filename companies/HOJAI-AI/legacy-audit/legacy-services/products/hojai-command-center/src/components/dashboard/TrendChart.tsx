"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

interface TrendChartProps {
  title?: string;
  data: any[];
  xKey: string;
  yKeys: { key: string; label: string; color?: string }[];
  type?: "line" | "area" | "bar";
  height?: number;
  timeRanges?: string[];
  defaultTimeRange?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  className?: string;
}

const defaultColors = [
  "hsl(217.2, 91.2%, 59.8%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 50%)",
  "hsl(200, 80%, 50%)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="mb-2 font-semibold text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function TrendChart({
  title,
  data,
  xKey,
  yKeys,
  type = "line",
  height = 300,
  timeRanges = ["7D", "30D", "90D", "1Y"],
  defaultTimeRange = "30D",
  showGrid = true,
  showLegend = true,
  stacked = false,
  className,
}: TrendChartProps) {
  const [selectedRange, setSelectedRange] = React.useState(defaultTimeRange);
  const [chartType, setChartType] = React.useState<"line" | "area" | "bar">(type);

  const renderChart = () => {
    const chartProps = {
      data,
      margin: { top: 5, right: 20, left: 0, bottom: 5 },
    };

    const axisProps = {
      stroke: "hsl(var(--muted-foreground))",
      fontSize: 12,
      tickLine: false,
      axisLine: false,
    };

    switch (chartType) {
      case "area":
        return (
          <AreaChart {...chartProps}>
            <defs>
              {yKeys.map((item, index) => (
                <linearGradient key={item.key} id={`gradient-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={item.color || defaultColors[index % defaultColors.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={item.color || defaultColors[index % defaultColors.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {yKeys.map((item, index) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stroke={item.color || defaultColors[index % defaultColors.length]}
                fill={`url(#gradient-${item.key})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart {...chartProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {yKeys.map((item, index) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                fill={item.color || defaultColors[index % defaultColors.length]}
                radius={[4, 4, 0, 0]}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </BarChart>
        );

      default:
        return (
          <LineChart {...chartProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {yKeys.map((item, index) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stroke={item.color || defaultColors[index % defaultColors.length]}
                strokeWidth={2}
                dot={{ fill: item.color || defaultColors[index % defaultColors.length], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title && <CardTitle className="text-base">{title}</CardTitle>}

          <div className="flex items-center gap-2">
            {/* Chart Type Toggle */}
            <div className="flex rounded-lg border border-border p-0.5">
              {(["line", "area", "bar"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={clsx(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    chartType === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Time Range */}
            <div className="flex rounded-lg border border-border p-0.5">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={clsx(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    selectedRange === range
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
