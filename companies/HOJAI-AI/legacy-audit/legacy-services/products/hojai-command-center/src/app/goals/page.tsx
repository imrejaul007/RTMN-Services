"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Target,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { goalApi, GoalData, Goal } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function GoalsPage() {
  const { data, isLoading, refetch } = useQuery<GoalData>({
    queryKey: ["goals"],
    queryFn: () => goalApi.getGoalData(),
    refetchInterval: 30000,
  });

  const goalColumns: Column<Goal>[] = [
    { key: "title", header: "Goal", sortable: true },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (row) => (
        <span className="capitalize">{row.type}</span>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                row.progress >= 75
                  ? "bg-success"
                  : row.progress >= 50
                  ? "bg-primary"
                  : row.progress >= 25
                  ? "bg-warning"
                  : "bg-destructive"
              }`}
              style={{ width: `${row.progress}%` }}
            />
          </div>
          <span className="text-sm">{row.progress}%</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <StatusBadge
          status={
            row.status === "on-track"
              ? "success"
              : row.status === "at-risk"
              ? "warning"
              : row.status === "behind"
              ? "error"
              : "completed"
          }
        />
      ),
    },
    { key: "owner", header: "Owner" },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (row) => formatDate(new Date(row.dueDate)),
    },
  ];

  const alerts: Alert[] = data?.alerts || [
    {
      id: "1",
      title: "Goal At Risk",
      message: "Mobile App launch is behind schedule",
      severity: "medium",
      type: "goal",
      timestamp: new Date(Date.now() - 14400000),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GoalOS</h1>
          <p className="text-muted-foreground">
            Track OKRs, goals, and milestones
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
          title="Total Goals"
          value={data?.metrics?.total || 20}
          icon={<Target className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Active Goals"
          value={data?.metrics?.active || 15}
          change={0}
          changeLabel="vs last month"
          icon={<Target className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Completed"
          value={data?.metrics?.completed || 5}
          change={25}
          changeLabel="vs last month"
          trend="up"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="At Risk"
          value={data?.metrics?.atRisk || 3}
          change={-25}
          changeLabel="vs last month"
          trend="up"
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Avg Progress"
          value={data?.metrics?.avgProgress || 65}
          change={5.2}
          changeLabel="vs last month"
          format="percent"
          progress={65}
          progressLabel="Overall Progress"
          loading={isLoading}
        />
        <MetricCard
          title="On Track"
          value={data?.metrics?.onTrack || 12}
          change={9.1}
          changeLabel="vs last month"
          trend="up"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Completion Rate"
          value={25}
          change={5}
          changeLabel="vs last quarter"
          format="percent"
          progress={25}
          progressLabel="Goals Completed"
          loading={isLoading}
        />
      </div>

      {/* Goal Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goal Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-success" />
                On Track
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.onTrack || 12}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-warning" />
                At Risk
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.atRisk || 3}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-destructive" />
                Behind
              </div>
              <p className="mt-2 text-2xl font-bold">0</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                Completed
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.completed || 5}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestone Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Milestone Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.timeline?.map((item, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Clock className="h-4 w-4" />
                  </div>
                  {index < (data?.timeline?.length || 0) - 1 && (
                    <div className="h-full w-px bg-border" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="font-medium">{item.date}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.milestones.map((milestone, mIndex) => (
                      <span
                        key={mIndex}
                        className="rounded-full bg-muted px-3 py-1 text-xs"
                      >
                        {milestone}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Goals Table */}
      <DataTable
        title="Goals & OKRs"
        columns={goalColumns}
        data={data?.goals || []}
        keyField="id"
        searchPlaceholder="Search goals..."
        searchKeys={["title", "owner"]}
        emptyMessage="No goals found"
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
