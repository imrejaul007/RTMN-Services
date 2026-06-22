"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Heart,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { productApi, ProductData, Product } from "@/lib/api";

export default function ProductsPage() {
  const { data, isLoading, refetch } = useQuery<ProductData>({
    queryKey: ["products"],
    queryFn: () => productApi.getProductData(),
    refetchInterval: 30000,
  });

  const productColumns: Column<Product>[] = [
    { key: "name", header: "Product", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <StatusBadge
          status={
            row.status === "active"
              ? "active"
              : row.status === "beta"
              ? "warning"
              : row.status === "planned"
              ? "pending"
              : "inactive"
          }
        />
      ),
    },
    { key: "version", header: "Version" },
    {
      key: "pmfScore",
      header: "PMF Score",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                row.pmfScore >= 70
                  ? "bg-success"
                  : row.pmfScore >= 40
                  ? "bg-warning"
                  : "bg-destructive"
              }`}
              style={{ width: `${row.pmfScore}%` }}
            />
          </div>
          <span className="text-sm">{row.pmfScore}%</span>
        </div>
      ),
    },
    {
      key: "usage",
      header: "Usage",
      sortable: true,
      render: (row) => row.usage.toLocaleString(),
    },
    {
      key: "revenue",
      header: "Revenue",
      sortable: true,
      render: (row) => (row.revenue > 0 ? `$${row.revenue.toLocaleString()}` : "-"),
    },
    {
      key: "feedbackCount",
      header: "Feedback",
      render: (row) => {
        const positivePercent = row.feedbackCount > 0
          ? Math.round((row.feedbackPositive / row.feedbackCount) * 100)
          : 0;
        return (
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-success" />
            <span>{positivePercent}%</span>
          </div>
        );
      },
    },
  ];

  const featureColumns: Column<{ name: string; votes: number; status: string }>[] = [
    { key: "name", header: "Feature", sortable: true },
    { key: "votes", header: "Votes", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge
          status={
            row.status === "completed"
              ? "success"
              : row.status === "in-progress"
              ? "warning"
              : "pending"
          }
        />
      ),
    },
  ];

  const alerts: Alert[] = data?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Hub</h1>
          <p className="text-muted-foreground">
            Track products, features, and feedback
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
          title="Total Products"
          value={data?.metrics?.total || 12}
          icon={<Package className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Active Products"
          value={data?.metrics?.active || 8}
          change={14.3}
          changeLabel="vs last quarter"
          trend="up"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="In Development"
          value={data?.metrics?.inDevelopment || 4}
          icon={<Package className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Avg PMF Score"
          value={data?.metrics?.avgPmfScore || 72}
          change={5.2}
          changeLabel="vs last month"
          format="percent"
          icon={<Heart className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Feedback Sentiment */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Feedback Sentiment"
          value={data?.metrics?.feedbackSentiment || 78}
          change={3.5}
          changeLabel="vs last month"
          format="percent"
          progress={78}
          progressLabel="Positive Feedback"
          loading={isLoading}
        />
        <MetricCard
          title="Positive Feedback"
          value={78}
          change={5.0}
          changeLabel="vs last month"
          format="percent"
          icon={<ThumbsUp className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Negative Feedback"
          value={8}
          change={-2.5}
          changeLabel="vs last month"
          trend="up"
          icon={<ThumbsDown className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart
          title="Feedback Sentiment Trend"
          data={data?.sentimentTrend || []}
          xKey="week"
          yKeys={[
            { key: "positive", label: "Positive", color: "hsl(142, 76%, 36%)" },
            { key: "neutral", label: "Neutral", color: "hsl(217.2, 91.2%, 59.8%)" },
            { key: "negative", label: "Negative", color: "hsl(0, 62.8%, 30.6%)" },
          ]}
          type="area"
          height={280}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.pipeline?.map((stage) => (
                <div key={stage.stage} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(stage.count / 10) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stage.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Table */}
      <DataTable
        title="Products"
        columns={productColumns}
        data={data?.products || []}
        keyField="id"
        searchPlaceholder="Search products..."
        searchKeys={["name", "version"]}
        emptyMessage="No products found"
      />

      {/* Top Features Table */}
      <DataTable
        title="Top Features by Votes"
        columns={featureColumns}
        data={data?.topFeatures || []}
        keyField="name"
        showSearch={false}
        showExport={false}
      />

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
