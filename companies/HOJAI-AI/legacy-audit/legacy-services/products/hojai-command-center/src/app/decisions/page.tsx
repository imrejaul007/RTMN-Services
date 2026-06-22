"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { StatusBadge, SeverityBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { boardApi, DecisionData, Decision } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function DecisionsPage() {
  const { data, isLoading, refetch } = useQuery<DecisionData>({
    queryKey: ["decisions"],
    queryFn: () => boardApi.getDecisionData(),
    refetchInterval: 30000,
  });

  const decisionColumns: Column<Decision>[] = [
    { key: "title", header: "Decision", sortable: true },
    { key: "description", header: "Description" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <StatusBadge
          status={
            row.status === "approved"
              ? "success"
              : row.status === "rejected"
              ? "error"
              : row.status === "pending"
              ? "pending"
              : "draft"
          }
        />
      ),
    },
    {
      key: "impact",
      header: "Impact",
      sortable: true,
      render: (row) => (
        <SeverityBadge
          severity={
            row.impact === "high"
              ? "critical"
              : row.impact === "medium"
              ? "medium"
              : "low"
          }
        />
      ),
    },
    { key: "madeBy", header: "Made By", sortable: true },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row) => formatDate(new Date(row.date)),
    },
  ];

  const alerts: Alert[] = data?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Decision Center</h1>
          <p className="text-muted-foreground">
            Track decisions, outcomes, and impact
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
          title="Total Decisions"
          value={data?.metrics?.total || 15}
          icon={<Scale className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Pending"
          value={data?.metrics?.pending || 3}
          change={50}
          changeLabel="vs last month"
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Approved"
          value={data?.metrics?.approved || 10}
          change={11.1}
          changeLabel="vs last month"
          trend="up"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Rejected"
          value={data?.metrics?.rejected || 2}
          change={0}
          changeLabel="vs last month"
          icon={<XCircle className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Avg Impact Score"
          value={data?.metrics?.avgImpact || 72}
          change={5.2}
          changeLabel="vs last month"
          format="percent"
          progress={72}
          progressLabel="Impact Score"
          loading={isLoading}
        />
        <MetricCard
          title="Approval Rate"
          value={83}
          change={3.5}
          changeLabel="vs last month"
          format="percent"
          progress={83}
          progressLabel="Decisions Approved"
          loading={isLoading}
        />
        <MetricCard
          title="High Impact Decisions"
          value={5}
          change={25}
          changeLabel="vs last month"
          trend="up"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Decision Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-warning" />
                Pending
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.pending || 3}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-success" />
                Approved
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.approved || 10}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4 text-destructive" />
                Rejected
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.rejected || 2}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                Avg Impact
              </div>
              <p className="mt-2 text-2xl font-bold">{data?.metrics?.avgImpact || 72}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.decisions?.slice(0, 5).map((decision) => (
              <div
                key={decision.id}
                className="flex items-start justify-between rounded-lg border border-border p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{decision.title}</h3>
                    <StatusBadge
                      status={
                        decision.status === "approved"
                          ? "success"
                          : decision.status === "rejected"
                          ? "error"
                          : decision.status === "pending"
                          ? "pending"
                          : "draft"
                      }
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {decision.description}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>By {decision.madeBy}</span>
                    <span>•</span>
                    <span>{formatDate(new Date(decision.date))}</span>
                    {decision.outcome && (
                      <>
                        <span>•</span>
                        <span>Outcome: {decision.outcome}</span>
                      </>
                    )}
                  </div>
                </div>
                <SeverityBadge
                  severity={
                    decision.impact === "high"
                      ? "critical"
                      : decision.impact === "medium"
                      ? "medium"
                      : "low"
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Decisions Table */}
      <DataTable
        title="All Decisions"
        columns={decisionColumns}
        data={data?.decisions || []}
        keyField="id"
        searchPlaceholder="Search decisions..."
        searchKeys={["title", "description", "madeBy"]}
        emptyMessage="No decisions found"
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
