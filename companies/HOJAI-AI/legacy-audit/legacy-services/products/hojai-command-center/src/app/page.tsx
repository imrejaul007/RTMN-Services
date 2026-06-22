"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Users,
  Package,
  FolderKanban,
  UserCog,
  Target,
  AlertTriangle,
  TrendingUp,
  Activity,
  Clock,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { QueryInput } from "@/components/dashboard/QueryInput";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { ActivityFeed, Activity as ActivityItem } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { api, DashboardData } from "@/lib/api";

export default function CommandCenterPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboardData(),
    refetchInterval: 30000,
  });

  // Generate mock alerts if no data
  const alerts: Alert[] = data?.alerts || [
    {
      id: "1",
      title: "Revenue Alert",
      message: "MRR growth rate decreased from 20% to 15% this month",
      severity: "medium",
      type: "revenue",
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: "2",
      title: "Customer at Risk",
      message: "Global Solutions health score dropped to 45%",
      severity: "high",
      type: "customer",
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: "3",
      title: "Project Delay",
      message: "API v3 Migration is 2 weeks behind schedule",
      severity: "high",
      type: "project",
      timestamp: new Date(Date.now() - 10800000),
    },
    {
      id: "4",
      title: "Competitor Activity",
      message: "Competitor A raised $50M in Series C funding",
      severity: "critical",
      type: "general",
      timestamp: new Date(Date.now() - 43200000),
    },
    {
      id: "5",
      title: "Goal At Risk",
      message: "Mobile App launch is behind schedule",
      severity: "medium",
      type: "goal",
      timestamp: new Date(Date.now() - 14400000),
    },
  ];

  // Generate mock activities
  const activities: ActivityItem[] = [
    {
      id: "1",
      type: "completed",
      title: "Closed deal with Acme Corp",
      description: "$120,000 ARR enterprise contract",
      timestamp: new Date(Date.now() - 1800000),
      user: { name: "Sarah Johnson", initials: "SJ" },
    },
    {
      id: "2",
      type: "created",
      title: "New customer onboarded",
      description: "TechStart Inc started their free trial",
      timestamp: new Date(Date.now() - 3600000),
      user: { name: "Mike Chen", initials: "MC" },
    },
    {
      id: "3",
      type: "status_change",
      title: "Platform v3.2 deployed",
      description: "New version is now live in production",
      timestamp: new Date(Date.now() - 7200000),
      user: { name: "DevOps Bot", initials: "DB" },
    },
    {
      id: "4",
      type: "completed",
      title: "Q2 goals review completed",
      description: "All objectives reviewed and updated",
      timestamp: new Date(Date.now() - 14400000),
      user: { name: "CEO", initials: "CE" },
    },
    {
      id: "5",
      type: "assigned",
      title: "New task assigned",
      description: "Review competitor analysis report",
      timestamp: new Date(Date.now() - 21600000),
      user: { name: "Product Lead", initials: "PL" },
    },
  ];

  // Revenue trend data
  const revenueTrendData = [
    { month: "Jan", revenue: 150000, target: 145000 },
    { month: "Feb", revenue: 158000, target: 155000 },
    { month: "Mar", revenue: 167000, target: 165000 },
    { month: "Apr", revenue: 175000, target: 175000 },
    { month: "May", revenue: 183000, target: 185000 },
    { month: "Jun", revenue: 204000, target: 195000 },
  ];

  // Customer trend data
  const customerTrendData = [
    { month: "Jan", customers: 75, new: 5 },
    { month: "Feb", customers: 80, new: 7 },
    { month: "Mar", customers: 85, new: 6 },
    { month: "Apr", customers: 88, new: 5 },
    { month: "May", customers: 92, new: 8 },
    { month: "Jun", customers: 100, new: 10 },
  ];

  // Team growth data
  const teamGrowthData = [
    { month: "Jan", team: 18, ai: 4 },
    { month: "Feb", team: 20, ai: 5 },
    { month: "Mar", team: 21, ai: 6 },
    { month: "Apr", team: 22, ai: 6 },
    { month: "May", team: 24, ai: 7 },
    { month: "Jun", team: 25, ai: 8 },
  ];

  const handleQuery = async (query: string) => {
    const result = await api.query(query);
    return [
      {
        type: "text" as const,
        content: result.answer,
        source: result.sources.join(", "),
        confidence: result.confidence,
      },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Command Center</h1>
          <p className="text-muted-foreground">
            Your unified view of the entire business
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Annual Recurring Revenue"
          value={data?.revenue?.metrics?.arr || 2450000}
          change={18.5}
          changeLabel="vs last year"
          trend={[150, 158, 167, 175, 183, 204]}
          icon={DollarSign}
          href="/revenue"
          format="currency"
          loading={isLoading}
        />
        <KPICard
          title="Total Customers"
          value={data?.customers?.metrics?.total || 100}
          change={12.5}
          changeLabel="vs last month"
          trend={[75, 80, 85, 88, 92, 100]}
          icon={Users}
          href="/customers"
          loading={isLoading}
        />
        <KPICard
          title="Active Products"
          value={data?.products?.metrics?.active || 8}
          change={0}
          changeLabel="vs last month"
          trend={[6, 7, 7, 8, 8, 8]}
          icon={Package}
          href="/products"
          loading={isLoading}
        />
        <KPICard
          title="Active Projects"
          value={data?.projects?.metrics?.active || 12}
          change={-8.3}
          changeLabel="vs last month"
          trend={[14, 13, 14, 12, 13, 12]}
          icon={FolderKanban}
          href="/projects"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Team Members"
          value={data?.team?.metrics?.total || 25}
          change={16.7}
          changeLabel="vs last quarter"
          trend={[18, 20, 21, 22, 24, 25]}
          icon={UserCog}
          href="/team"
          loading={isLoading}
        />
        <KPICard
          title="Active Goals"
          value={data?.goals?.metrics?.active || 15}
          change={0}
          changeLabel="vs last month"
          trend={[12, 14, 13, 15, 14, 15]}
          icon={Target}
          href="/goals"
          loading={isLoading}
        />
        <KPICard
          title="Open Risks"
          value={3}
          change={-25}
          changeLabel="vs last week"
          trend={[5, 4, 5, 4, 3, 3]}
          icon={AlertTriangle}
          href="/goals"
          loading={isLoading}
        />
        <KPICard
          title="Opportunities"
          value={8}
          change={33.3}
          changeLabel="vs last week"
          trend={[4, 5, 6, 5, 7, 8]}
          icon={TrendingUp}
          href="/competitors"
          loading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Query and Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Natural Language Query */}
          <QueryInput onQuery={handleQuery} />

          {/* Revenue Trend Chart */}
          <TrendChart
            title="Revenue Trend"
            data={revenueTrendData}
            xKey="month"
            yKeys={[
              { key: "revenue", label: "Revenue", color: "hsl(217.2, 91.2%, 59.8%)" },
              { key: "target", label: "Target", color: "hsl(142, 76%, 36%)" },
            ]}
            type="area"
            height={280}
          />

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <TrendChart
              title="Customer Growth"
              data={customerTrendData}
              xKey="month"
              yKeys={[
                { key: "customers", label: "Total Customers", color: "hsl(217.2, 91.2%, 59.8%)" },
                { key: "new", label: "New Customers", color: "hsl(142, 76%, 36%)" },
              ]}
              type="bar"
              height={220}
              timeRanges={["30D", "90D", "1Y"]}
            />
            <TrendChart
              title="Team Growth"
              data={teamGrowthData}
              xKey="month"
              yKeys={[
                { key: "team", label: "Human", color: "hsl(217.2, 91.2%, 59.8%)" },
                { key: "ai", label: "AI Employees", color: "hsl(280, 60%, 50%)" },
              ]}
              type="area"
              height={220}
              timeRanges={["30D", "90D", "1Y"]}
            />
          </div>
        </div>

        {/* Right Column - Alerts and Activity */}
        <div className="space-y-6">
          {/* Alert Feed */}
          <AlertFeed
            alerts={alerts}
            maxItems={5}
            showFilters={true}
            onViewAll={() => {}}
          />

          {/* Quick Actions */}
          <QuickActions
            title="Quick Actions"
            actions={[
              { id: "1", label: "Revenue", icon: <DollarSign className="h-5 w-5" />, href: "/revenue" },
              { id: "2", label: "Customers", icon: <Users className="h-5 w-5" />, href: "/customers" },
              { id: "3", label: "Projects", icon: <FolderKanban className="h-5 w-5" />, href: "/projects" },
              { id: "4", label: "Team", icon: <UserCog className="h-5 w-5" />, href: "/team" },
              { id: "5", label: "Goals", icon: <Target className="h-5 w-5" />, href: "/goals" },
              { id: "6", label: "Meetings", icon: <Activity className="h-5 w-5" />, href: "/meetings" },
            ]}
            columns={3}
          />

          {/* Activity Feed */}
          <ActivityFeed
            activities={activities}
            title="Recent Activity"
            maxItems={8}
          />
        </div>
      </div>
    </div>
  );
}
