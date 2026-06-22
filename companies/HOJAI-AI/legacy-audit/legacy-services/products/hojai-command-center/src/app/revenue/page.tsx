"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { revenueApi, RevenueData } from "@/lib/api";

export default function RevenuePage() {
  const { data, isLoading, refetch } = useQuery<RevenueData>({
    queryKey: ["revenue"],
    queryFn: () => revenueApi.getRevenueData(),
    refetchInterval: 30000,
  });

  const pipelineColumns: Column<{ stage: string; value: number; count: number }>[] = [
    { key: "stage", header: "Stage", sortable: true },
    {
      key: "value",
      header: "Value",
      sortable: true,
      render: (row) => `$${row.value.toLocaleString()}`,
    },
    { key: "count", header: "Deals", sortable: true },
    {
      key: "value",
      header: "Avg Deal",
      render: (row) => `$${Math.round(row.value / row.count).toLocaleString()}`,
    },
  ];

  const forecastColumns: Column<{ month: string; predicted: number; target: number }>[] = [
    { key: "month", header: "Month", sortable: true },
    {
      key: "predicted",
      header: "Predicted",
      sortable: true,
      render: (row) => `$${row.predicted.toLocaleString()}`,
    },
    {
      key: "target",
      header: "Target",
      sortable: true,
      render: (row) => `$${row.target.toLocaleString()}`,
    },
    {
      key: "predicted",
      header: "Variance",
      render: (row) => {
        const variance = row.predicted - row.target;
        const percent = ((variance / row.target) * 100).toFixed(1);
        return (
          <span className={variance >= 0 ? "text-success" : "text-destructive"}>
            {variance >= 0 ? "+" : ""}
            {percent}%
          </span>
        );
      },
    },
  ];

  const alerts: Alert[] = data?.alerts || [
    {
      id: "1",
      title: "MRR Growth Slowing",
      message: "MRR growth rate decreased from 20% to 15% over the last month",
      severity: "medium",
      type: "revenue",
      timestamp: new Date(Date.now() - 3600000),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Intelligence</h1>
          <p className="text-muted-foreground">
            Track ARR, MRR, pipeline, and revenue forecasts
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Annual Recurring Revenue"
          value={data?.metrics?.arr || 2450000}
          change={18.5}
          changeLabel="vs last year"
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Monthly Recurring Revenue"
          value={data?.metrics?.mrr || 204167}
          change={15.2}
          changeLabel="vs last month"
          format="currency"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Customer Acquisition Cost"
          value={data?.metrics?.cac || 4500}
          comparison="$4,200"
          comparisonLabel="Industry avg"
          format="currency"
          trend="down"
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Lifetime Value"
          value={data?.metrics?.ltv || 45000}
          change={12.3}
          changeLabel="vs last quarter"
          format="currency"
          icon={<Target className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="LTV:CAC Ratio"
          value={data?.metrics?.ltvToCacRatio || 10}
          comparison="5x"
          comparisonLabel="Recommended"
          trend="up"
          subtitle="Higher is better"
          loading={isLoading}
        />
        <MetricCard
          title="ARR per Customer"
          value={data?.metrics?.arrPerCustomer || 24500}
          change={5.2}
          changeLabel="vs last year"
          format="currency"
          loading={isLoading}
        />
        <MetricCard
          title="Net Revenue Retention"
          value={108}
          change={3.2}
          changeLabel="vs last quarter"
          format="percent"
          progress={108}
          progressLabel="NRR Target: 110%"
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart
          title="Revenue History"
          data={data?.historical || []}
          xKey="month"
          yKeys={[
            { key: "mrr", label: "MRR", color: "hsl(217.2, 91.2%, 59.8%)" },
            { key: "newMrr", label: "New MRR", color: "hsl(142, 76%, 36%)" },
            { key: "churnedMrr", label: "Churned MRR", color: "hsl(0, 62.8%, 30.6%)" },
          ]}
          type="area"
          height={300}
        />
        <TrendChart
          title="Revenue Forecast"
          data={data?.forecast || []}
          xKey="month"
          yKeys={[
            { key: "predicted", label: "Predicted", color: "hsl(217.2, 91.2%, 59.8%)" },
            { key: "target", label: "Target", color: "hsl(142, 76%, 36%)" },
          ]}
          type="line"
          height={300}
        />
      </div>

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Sales Pipeline"
          columns={pipelineColumns}
          data={data?.pipeline || []}
          keyField="stage"
          showSearch={false}
          showExport={false}
        />
        <DataTable
          title="Revenue Forecast"
          columns={forecastColumns}
          data={data?.forecast || []}
          keyField="month"
          showSearch={false}
          showExport={false}
        />
      </div>

      {/* Alerts */}
      <AlertFeed
        alerts={alerts}
        maxItems={5}
        showFilters={true}
        showHeader={true}
      />
    </div>
  );
}
