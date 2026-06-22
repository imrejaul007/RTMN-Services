"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Activity,
  Users,
  RefreshCw,
  Shield,
  Zap,
  Clock,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { StatusBadge, HealthBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { agentApi, AgentData, Agent } from "@/lib/api";

export default function AgentsPage() {
  const { data, isLoading, refetch } = useQuery<AgentData>({
    queryKey: ["agents"],
    queryFn: () => agentApi.getAgentData(),
    refetchInterval: 30000,
  });

  const agentColumns: Column<Agent>[] = [
    { key: "name", header: "Agent", sortable: true },
    { key: "role", header: "Role", sortable: true },
    { key: "team", header: "Team", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <StatusBadge
          status={
            row.status === "active"
              ? "active"
              : row.status === "idle"
              ? "pending"
              : "error"
          }
        />
      ),
    },
    {
      key: "performance",
      header: "Performance",
      sortable: true,
      render: (row) => <HealthBadge score={row.performance} size="sm" />,
    },
    {
      key: "tasksCompleted",
      header: "Tasks",
      sortable: true,
      render: (row) => row.tasksCompleted.toLocaleString(),
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.permissions.slice(0, 2).map((perm, index) => (
            <span
              key={index}
              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {perm}
            </span>
          ))}
          {row.permissions.length > 2 && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              +{row.permissions.length - 2}
            </span>
          )}
        </div>
      ),
    },
  ];

  const teamColumns: Column<{ name: string; memberCount: number; avgPerformance: number }>[] = [
    { key: "name", header: "Team", sortable: true },
    { key: "memberCount", header: "Members", sortable: true },
    {
      key: "avgPerformance",
      header: "Avg Performance",
      sortable: true,
      render: (row) => <HealthBadge score={row.avgPerformance} size="sm" />,
    },
  ];

  const alerts: Alert[] = data?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Workforce</h1>
          <p className="text-muted-foreground">
            Monitor AI employees, teams, and permissions
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
          title="Total Agents"
          value={data?.metrics?.total || 8}
          change={33.3}
          changeLabel="vs last quarter"
          icon={<Bot className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Active Agents"
          value={data?.metrics?.active || 7}
          change={16.7}
          changeLabel="vs last month"
          trend="up"
          icon={<Activity className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Avg Performance"
          value={data?.metrics?.avgPerformance || 85}
          change={3.5}
          changeLabel="vs last month"
          format="percent"
          icon={<Zap className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Avg Uptime"
          value={data?.metrics?.avgUptime || 99.5}
          change={0.2}
          changeLabel="vs last month"
          format="percent"
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Tasks Completed"
          value={data?.metrics?.totalTasks || 15420}
          change={25.5}
          changeLabel="vs last month"
          trend="up"
          icon={<Activity className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Agent Teams"
          value={4}
          change={0}
          changeLabel="vs last month"
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Active Permissions"
          value={12}
          change={20}
          changeLabel="vs last month"
          trend="up"
          icon={<Shield className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Agent Teams Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {data?.teams?.map((team) => (
              <div
                key={team.name}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{team.name}</h3>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium">{team.memberCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Performance</span>
                    <span className="font-medium">{team.avgPerformance}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Role
                  </th>
                  {data?.permissionMatrix?.[0]?.permissions?.map((perm, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {perm.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.permissionMatrix?.map((row, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium">{row.role}</td>
                    {row.permissions.map((perm, pIndex) => (
                      <td key={pIndex} className="px-4 py-3">
                        {perm.granted ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <DataTable
        title="AI Employee Registry"
        columns={agentColumns}
        data={data?.agents || []}
        keyField="id"
        searchPlaceholder="Search agents..."
        searchKeys={["name", "role", "team"]}
        emptyMessage="No agents found"
      />

      {/* Teams Table */}
      <DataTable
        title="Agent Teams"
        columns={teamColumns}
        data={data?.teams || []}
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

// Need to import these icons
import { CheckCircle, XCircle } from "lucide-react";
