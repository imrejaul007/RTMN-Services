"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Workflow as WorkflowIcon,
  Activity,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { workflowApi, WorkflowData, Workflow as WorkflowDataType } from "@/lib/api";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default function WorkflowsPage() {
  const { data, isLoading, refetch } = useQuery<WorkflowData>({
    queryKey: ["workflows"],
    queryFn: () => workflowApi.getWorkflowData(),
    refetchInterval: 30000,
  });

  const workflowColumns: Column<WorkflowIconDataType>[] = [
    { key: "name", header: "Workflow", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <StatusBadge
          status={
            row.status === "active"
              ? "active"
              : row.status === "paused"
              ? "warning"
              : "error"
          }
        />
      ),
    },
    {
      key: "lastRun",
      header: "Last Run",
      sortable: true,
      render: (row) => formatRelativeTime(new Date(row.lastRun)),
    },
    {
      key: "avgRunTime",
      header: "Avg Runtime",
      render: (row) => `${row.avgRunTime}s`,
    },
    {
      key: "successRate",
      header: "Success Rate",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                row.successRate >= 90
                  ? "bg-success"
                  : row.successRate >= 70
                  ? "bg-warning"
                  : "bg-destructive"
              }`}
              style={{ width: `${row.successRate}%` }}
            />
          </div>
          <span className="text-sm">{row.successRate}%</span>
        </div>
      ),
    },
    { key: "trigger", header: "Trigger" },
  ];

  const suggestionColumns: Column<{ title: string; description: string; potentialSavings: string }>[] = [
    { key: "title", header: "Suggestion", sortable: true },
    { key: "description", header: "Description" },
    {
      key: "potentialSavings",
      header: "Potential Savings",
      sortable: true,
      render: (row) => (
        <span className="text-success font-medium">{row.potentialSavings}</span>
      ),
    },
  ];

  const alerts: Alert[] = data?.alerts || [
    {
      id: "1",
      title: "Workflow Error",
      message: "Lead Scoring workflow failed 3 times in the last hour",
      severity: "high",
      type: "general",
      timestamp: new Date(Date.now() - 1800000),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Hub</h1>
          <p className="text-muted-foreground">
            Monitor workflows, runs, and automation opportunities
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
          title="Total Workflows"
          value={data?.metrics?.total || 12}
          icon={<WorkflowIcon className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Active Workflows"
          value={data?.metrics?.active || 10}
          change={11.1}
          changeLabel="vs last month"
          trend="up"
          icon={<Activity className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Avg Runtime"
          value={data?.metrics?.avgRunTime || 45}
          subtitle="seconds"
          change={-15.2}
          changeLabel="vs last month"
          trend="up"
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Success Rate"
          value={data?.metrics?.successRate || 94}
          change={2.5}
          changeLabel="vs last month"
          format="percent"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Bottlenecks"
          value={data?.metrics?.bottlenecks || 2}
          change={-33.3}
          changeLabel="vs last month"
          trend="up"
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Automations Enabled"
          value={data?.metrics?.automationsEnabled || 45}
          change={12.5}
          changeLabel="vs last month"
          trend="up"
          icon={<Zap className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Time Saved"
          value="45h"
          change={20}
          changeLabel="vs last month"
          trend="up"
          subtitle="per month"
          loading={isLoading}
        />
      </div>

      {/* Workflow Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-success" />
                Healthy
              </div>
              <p className="mt-2 text-2xl font-bold">
                {(data?.workflows?.filter((w) => w.status === "active").length || 0) - (data?.metrics?.bottlenecks || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Bottlenecks
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.bottlenecks || 2}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4 text-destructive" />
                Errors
              </div>
              <p className="mt-2 text-2xl font-bold">
                {data?.workflows?.filter((w) => w.status === "error").length || 0}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-primary" />
                Paused
              </div>
              <p className="mt-2 text-2xl font-bold">
                {data?.workflows?.filter((w) => w.status === "paused").length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Workflow Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.workflows?.slice(0, 5).map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      workflow.status === "active"
                        ? "bg-success/10"
                        : workflow.status === "error"
                        ? "bg-destructive/10"
                        : "bg-warning/10"
                    }`}
                  >
                    <WorkflowIcon
                      className={`h-5 w-5 ${
                        workflow.status === "active"
                          ? "text-success"
                          : workflow.status === "error"
                          ? "text-destructive"
                          : "text-warning"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium">{workflow.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last run: {formatRelativeTime(new Date(workflow.lastRun))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{workflow.avgRunTime}s avg</p>
                    <p className="text-sm text-muted-foreground">
                      {workflow.successRate}% success rate
                    </p>
                  </div>
                  <StatusBadge
                    status={
                      workflow.status === "active"
                        ? "active"
                        : workflow.status === "error"
                        ? "error"
                        : "warning"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Automation Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Automation Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.suggestions?.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border border-border p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{suggestion.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {suggestion.description}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                    {suggestion.potentialSavings}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workflows Table */}
      <DataTable
        title="All Workflows"
        columns={workflowColumns}
        data={data?.workflows || []}
        keyField="id"
        searchPlaceholder="Search workflows..."
        searchKeys={["name", "trigger"]}
        emptyMessage="No workflows found"
      />

      {/* Suggestions Table */}
      <DataTable
        title="Automation Suggestions"
        columns={suggestionColumns}
        data={data?.suggestions || []}
        keyField="title"
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
