"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FolderKanban,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  DollarSign,
  Users,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { projectApi, ProjectData, Project } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function ProjectsPage() {
  const { data, isLoading, refetch } = useQuery<ProjectData>({
    queryKey: ["projects"],
    queryFn: () => projectApi.getProjectData(),
    refetchInterval: 30000,
  });

  const projectColumns: Column<Project>[] = [
    { key: "name", header: "Project", sortable: true },
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
              : row.status === "delayed"
              ? "error"
              : "completed"
          }
        />
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
      key: "endDate",
      header: "Due Date",
      sortable: true,
      render: (row) => formatDate(new Date(row.endDate)),
    },
    {
      key: "budget",
      header: "Budget",
      sortable: true,
      render: (row) => {
        const spentPercent = (row.spent / row.budget) * 100;
        return (
          <div>
            <span>${row.spent.toLocaleString()}</span>
            <span className="text-muted-foreground"> / ${row.budget.toLocaleString()}</span>
          </div>
        );
      },
    },
    {
      key: "budget",
      header: "Budget Status",
      render: (row) => {
        const spentPercent = (row.spent / row.budget) * 100;
        return (
          <StatusBadge
            status={
              spentPercent > 100
                ? "error"
                : spentPercent > 80
                ? "warning"
                : "success"
            }
          />
        );
      },
    },
    { key: "team", header: "Team", render: (row) => row.team.join(", ") },
  ];

  const alerts: Alert[] = data?.alerts || [
    {
      id: "1",
      title: "Project Delay Warning",
      message: "API v3 Migration is 2 weeks behind schedule",
      severity: "high",
      type: "project",
      timestamp: new Date(Date.now() - 10800000),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Hub</h1>
          <p className="text-muted-foreground">
            Track projects, milestones, and resources
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
          title="Total Projects"
          value={data?.metrics?.total || 15}
          icon={<FolderKanban className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Active Projects"
          value={data?.metrics?.active || 12}
          change={-8.3}
          changeLabel="vs last month"
          icon={<FolderKanban className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="On Track"
          value={data?.metrics?.onTrack || 8}
          change={14.3}
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
          title="Delayed"
          value={data?.metrics?.delayed || 1}
          change={-50}
          changeLabel="vs last month"
          trend="up"
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Completed This Month"
          value={data?.metrics?.completedThisMonth || 2}
          change={100}
          changeLabel="vs last month"
          trend="up"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Avg Completion Rate"
          value={data?.metrics?.avgCompletionRate || 68}
          change={5.2}
          changeLabel="vs last month"
          format="percent"
          progress={68}
          progressLabel="Completion Rate"
          loading={isLoading}
        />
      </div>

      {/* Project Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-success" />
                On Track
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.onTrack || 8}</p>
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
                Delayed
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.delayed || 1}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderKanban className="h-4 w-4 text-primary" />
                Completed
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.completedThisMonth || 2}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Table */}
      <DataTable
        title="Projects"
        columns={projectColumns}
        data={data?.projects || []}
        keyField="id"
        searchPlaceholder="Search projects..."
        searchKeys={["name"]}
        emptyMessage="No projects found"
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
