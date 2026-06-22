"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UserCog,
  Bot,
  Users,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { StatusBadge, HealthBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { workforceApi, TeamData, TeamMember } from "@/lib/api";

export default function TeamPage() {
  const { data, isLoading, refetch } = useQuery<TeamData>({
    queryKey: ["team"],
    queryFn: () => workforceApi.getTeamData(),
    refetchInterval: 30000,
  });

  const memberColumns: Column<TeamMember>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "role", header: "Role", sortable: true },
    { key: "department", header: "Department", sortable: true },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.type === "ai" ? (
            <Bot className="h-4 w-4 text-primary" />
          ) : (
            <Users className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="capitalize">{row.type}</span>
        </div>
      ),
    },
    {
      key: "performance",
      header: "Performance",
      sortable: true,
      render: (row) => <HealthBadge score={row.performance} size="sm" />,
    },
    {
      key: "workload",
      header: "Workload",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                row.workload > 80
                  ? "bg-destructive"
                  : row.workload > 60
                  ? "bg-warning"
                  : "bg-success"
              }`}
              style={{ width: `${row.workload}%` }}
            />
          </div>
          <span className="text-sm">{row.workload}%</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge
          status={
            row.status === "active"
              ? "active"
              : row.status === "on-leave"
              ? "warning"
              : "inactive"
          }
        />
      ),
    },
  ];

  const skillColumns: Column<{ name: string; demand: number; supply: number }>[] = [
    { key: "name", header: "Skill", sortable: true },
    {
      key: "demand",
      header: "Demand",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${row.demand}%` }}
            />
          </div>
          <span className="text-sm">{row.demand}%</span>
        </div>
      ),
    },
    {
      key: "supply",
      header: "Supply",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                row.supply >= row.demand ? "bg-success" : "bg-warning"
              }`}
              style={{ width: `${row.supply}%` }}
            />
          </div>
          <span className="text-sm">{row.supply}%</span>
        </div>
      ),
    },
    {
      key: "demand",
      header: "Gap",
      render: (row) => {
        const gap = row.demand - row.supply;
        return (
          <span
            className={gap > 0 ? "text-warning" : "text-success"}
          >
            {gap > 0 ? "-" : "+"}
            {Math.abs(gap)}%
          </span>
        );
      },
    },
  ];

  const alerts: Alert[] = data?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workforce Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor team performance and AI employees
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
          title="Total Team Members"
          value={data?.metrics?.total || 25}
          change={16.7}
          changeLabel="vs last quarter"
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Human Employees"
          value={data?.metrics?.humanEmployees || 17}
          change={0}
          changeLabel="vs last month"
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="AI Employees"
          value={data?.metrics?.aiEmployees || 8}
          change={33.3}
          changeLabel="vs last quarter"
          trend="up"
          icon={<Bot className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Open Roles"
          value={data?.metrics?.openRoles || 4}
          icon={<UserCog className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Avg Performance"
          value={data?.metrics?.avgPerformance || 78}
          change={3.5}
          changeLabel="vs last month"
          format="percent"
          progress={78}
          progressLabel="Performance Score"
          loading={isLoading}
        />
        <MetricCard
          title="Avg Workload"
          value={data?.metrics?.avgWorkload || 65}
          change={-5.2}
          changeLabel="vs last month"
          format="percent"
          progress={65}
          progressLabel="Workload Level"
          loading={isLoading}
        />
        <MetricCard
          title="Avg Tenure"
          value={data?.metrics?.avgTenure || 2.5}
          change={0}
          changeLabel="vs last year"
          subtitle="years"
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart
          title="Performance Distribution"
          data={data?.performanceDistribution || []}
          xKey="score"
          yKeys={[
            { key: "count", label: "Team Members", color: "hsl(217.2, 91.2%, 59.8%)" },
          ]}
          type="bar"
          height={280}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workload Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.workloadDistribution?.map((item) => (
                <div key={item.level} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.level}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          item.level === "Overloaded"
                            ? "bg-destructive"
                            : item.level === "High"
                            ? "bg-warning"
                            : item.level === "Normal"
                            ? "bg-primary"
                            : "bg-success"
                        }`}
                        style={{
                          width: `${(item.count / (data?.metrics?.total || 25)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <DataTable
        title="Team Members"
        columns={memberColumns}
        data={data?.members || []}
        keyField="id"
        searchPlaceholder="Search team members..."
        searchKeys={["name", "role", "department"]}
        emptyMessage="No team members found"
      />

      {/* Skills Gap Analysis */}
      <DataTable
        title="Skill Gap Analysis"
        columns={skillColumns}
        data={data?.skills || []}
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
