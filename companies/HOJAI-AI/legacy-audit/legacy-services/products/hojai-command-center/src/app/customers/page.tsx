"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  UserMinus,
  TrendingUp,
  Heart,
  RefreshCw,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { HealthBadge, StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { customerApi, CustomerData, Customer } from "@/lib/api";

export default function CustomersPage() {
  const { data, isLoading, refetch } = useQuery<CustomerData>({
    queryKey: ["customers"],
    queryFn: () => customerApi.getCustomerData(),
    refetchInterval: 30000,
  });

  const customerColumns: Column<Customer>[] = [
    { key: "name", header: "Customer", sortable: true },
    { key: "industry", header: "Industry", sortable: true },
    {
      key: "tier",
      header: "Tier",
      sortable: true,
      render: (row) => (
        <span className="capitalize">{row.tier}</span>
      ),
    },
    {
      key: "arr",
      header: "ARR",
      sortable: true,
      render: (row) => `$${row.arr.toLocaleString()}`,
    },
    {
      key: "healthScore",
      header: "Health",
      sortable: true,
      render: (row) => <HealthBadge score={row.healthScore} size="sm" />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge
          status={row.status === "active" ? "active" : row.status === "at-risk" ? "warning" : "inactive"}
        />
      ),
    },
    { key: "accountManager", header: "Account Manager" },
  ];

  const segmentColumns: Column<{ name: string; count: number; arr: number }>[] = [
    { key: "name", header: "Segment", sortable: true },
    { key: "count", header: "Customers", sortable: true },
    {
      key: "arr",
      header: "Total ARR",
      sortable: true,
      render: (row) => `$${row.arr.toLocaleString()}`,
    },
    {
      key: "arr",
      header: "Avg ARR",
      render: (row) => `$${Math.round(row.arr / row.count).toLocaleString()}`,
    },
  ];

  const alerts: Alert[] = data?.alerts || [
    {
      id: "1",
      title: "Customer at Risk",
      message: "Global Solutions health score dropped to 45%",
      severity: "high",
      type: "customer",
      timestamp: new Date(Date.now() - 7200000),
    },
  ];

  const healthDistribution = data?.healthDistribution || [
    { score: 10, count: 2 },
    { score: 30, count: 5 },
    { score: 50, count: 10 },
    { score: 70, count: 25 },
    { score: 90, count: 58 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer 360</h1>
          <p className="text-muted-foreground">
            View customer health, segments, and interactions
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
          title="Total Customers"
          value={data?.metrics?.total || 100}
          change={12.5}
          changeLabel="vs last month"
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Active Customers"
          value={data?.metrics?.active || 85}
          change={8.5}
          changeLabel="vs last month"
          trend="up"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="New Customers"
          value={data?.metrics?.newThisMonth || 8}
          change={33.3}
          changeLabel="vs last month"
          trend="up"
          icon={<UserPlus className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Churned"
          value={data?.metrics?.churnedThisMonth || 3}
          change={-25}
          changeLabel="vs last month"
          trend="up"
          icon={<UserMinus className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Churn Rate"
          value={data?.metrics?.churnRate || 3.5}
          change={-0.5}
          changeLabel="vs last month"
          format="percent"
          progress={3.5}
          progressLabel="Target: < 3%"
          loading={isLoading}
        />
        <MetricCard
          title="Net Revenue Retention"
          value={data?.metrics?.nrr || 108}
          change={3.2}
          changeLabel="vs last quarter"
          format="percent"
          progress={108}
          progressLabel="NRR Target: 110%"
          loading={isLoading}
        />
        <MetricCard
          title="Avg Health Score"
          value={data?.metrics?.avgHealthScore || 72}
          change={2.5}
          changeLabel="vs last month"
          format="percent"
          progress={72}
          progressLabel="Health Score"
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart
          title="Customer Health Distribution"
          data={healthDistribution}
          xKey="score"
          yKeys={[
            { key: "count", label: "Customers", color: "hsl(217.2, 91.2%, 59.8%)" },
          ]}
          type="bar"
          height={280}
          timeRanges={[]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.segments?.map((segment) => (
                <div key={segment.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{segment.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {segment.count} customers
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${(segment.count / (data?.metrics?.total || 100)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${segment.arr.toLocaleString()} ARR
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Table */}
      <DataTable
        title="Top Customers"
        columns={customerColumns}
        data={data?.customers || []}
        keyField="id"
        searchPlaceholder="Search customers..."
        searchKeys={["name", "industry", "accountManager"]}
        emptyMessage="No customers found"
      />

      {/* Segments Table */}
      <DataTable
        title="Customer Segments"
        columns={segmentColumns}
        data={data?.segments || []}
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
