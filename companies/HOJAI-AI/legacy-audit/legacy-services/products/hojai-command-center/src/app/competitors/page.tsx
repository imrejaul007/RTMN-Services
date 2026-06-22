"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Newspaper,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { SeverityBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { competitorApi, CompetitorData, Competitor } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function CompetitorsPage() {
  const { data, isLoading, refetch } = useQuery<CompetitorData>({
    queryKey: ["competitors"],
    queryFn: () => competitorApi.getCompetitorData(),
    refetchInterval: 30000,
  });

  const competitorColumns: Column<Competitor>[] = [
    { key: "name", header: "Competitor", sortable: true },
    {
      key: "marketShare",
      header: "Market Share",
      sortable: true,
      render: (row) => `${row.marketShare}%`,
    },
    {
      key: "threatLevel",
      header: "Threat Level",
      sortable: true,
      render: (row) => (
        <SeverityBadge
          severity={
            row.threatLevel === "high"
              ? "critical"
              : row.threatLevel === "medium"
              ? "medium"
              : "low"
          }
        />
      ),
    },
    {
      key: "strengths",
      header: "Strengths",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.strengths.slice(0, 2).map((strength, index) => (
            <span
              key={index}
              className="rounded bg-success/10 px-2 py-0.5 text-xs text-success"
            >
              {strength}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "weaknesses",
      header: "Weaknesses",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.weaknesses.slice(0, 2).map((weakness, index) => (
            <span
              key={index}
              className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
            >
              {weakness}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "funding",
      header: "Recent Funding",
      render: (row) =>
        row.funding ? (
          <span className="text-warning">
            ${(row.funding.amount / 1000000).toFixed(0)}M {row.funding.round}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ];

  const comparisonColumns: Column<{ feature: string; us: number; competitors: { name: string; score: number }[] }>[] = [
    { key: "feature", header: "Feature", sortable: true },
    {
      key: "us",
      header: "Us",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${row.us}%` }}
            />
          </div>
          <span className="text-sm">{row.us}</span>
        </div>
      ),
    },
    ...(data?.comparisonMatrix?.[0]?.competitors || []).map((comp, index) => ({
      key: `comp-${index}`,
      header: comp.name,
      render: (row: { competitors: { name: string; score: number }[] }) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-muted-foreground"
              style={{ width: `${row.competitors[index]?.score || 0}%` }}
            />
          </div>
          <span className="text-sm">{row.competitors[index]?.score || 0}</span>
        </div>
      ),
    })),
  ];

  const alerts: Alert[] = data?.alerts || [
    {
      id: "1",
      title: "Competitor Funding",
      message: "Competitor A raised $50M in Series C",
      severity: "high",
      type: "general",
      timestamp: new Date(Date.now() - 43200000),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Competitive Intelligence</h1>
          <p className="text-muted-foreground">
            Monitor competitors, threats, and opportunities
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
          title="Total Competitors"
          value={data?.metrics?.total || 5}
          icon={<Building2 className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Threats"
          value={data?.metrics?.threats || 2}
          change={0}
          changeLabel="vs last month"
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Opportunities"
          value={data?.metrics?.opportunities || 3}
          change={50}
          changeLabel="vs last month"
          trend="up"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Recent News"
          value={data?.metrics?.recentNews || 8}
          change={33.3}
          changeLabel="vs last week"
          icon={<Newspaper className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Competitor Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitor Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {data?.competitors?.slice(0, 3).map((competitor) => (
              <div
                key={competitor.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{competitor.name}</h3>
                  <SeverityBadge
                    severity={
                      competitor.threatLevel === "high"
                        ? "critical"
                        : competitor.threatLevel === "medium"
                        ? "medium"
                        : "low"
                    }
                  />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Market Share</span>
                    <span className="font-medium">{competitor.marketShare}%</span>
                  </div>
                  {competitor.funding && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Latest Funding</span>
                      <span className="font-medium text-warning">
                        ${(competitor.funding.amount / 1000000).toFixed(0)}M
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Comparison Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Us
                  </th>
                  {data?.comparisonMatrix?.[0]?.competitors?.map((comp, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {comp.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.comparisonMatrix?.map((row, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium">{row.feature}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${row.us}%` }}
                          />
                        </div>
                        <span className="text-sm">{row.us}</span>
                      </div>
                    </td>
                    {row.competitors.map((comp, cIndex) => (
                      <td key={cIndex} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-muted-foreground"
                              style={{ width: `${comp.score}%` }}
                            />
                          </div>
                          <span className="text-sm">{comp.score}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Competitors Table */}
      <DataTable
        title="Competitor List"
        columns={competitorColumns}
        data={data?.competitors || []}
        keyField="id"
        searchPlaceholder="Search competitors..."
        searchKeys={["name"]}
        emptyMessage="No competitors found"
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
