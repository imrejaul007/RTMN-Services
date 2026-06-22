"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Users,
  FileText,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AlertFeed, Alert } from "@/components/dashboard/AlertFeed";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { meetingApi, MeetingData, Meeting } from "@/lib/api";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default function MeetingsPage() {
  const { data, isLoading, refetch } = useQuery<MeetingData>({
    queryKey: ["meetings"],
    queryFn: () => meetingApi.getMeetingData(),
    refetchInterval: 30000,
  });

  const meetingColumns: Column<Meeting>[] = [
    { key: "title", header: "Meeting", sortable: true },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (row) => (
        <span className="capitalize">{row.type.replace("-", " ")}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row) => formatDate(new Date(row.date)),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => `${row.duration} min`,
    },
    {
      key: "attendees",
      header: "Attendees",
      render: (row) => row.attendees.join(", "),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge
          status={
            row.status === "scheduled"
              ? "pending"
              : row.status === "in-progress"
              ? "warning"
              : row.status === "completed"
              ? "success"
              : "inactive"
          }
        />
      ),
    },
    {
      key: "actionItems",
      header: "Action Items",
      render: (row) => {
        const open = row.actionItems.filter((a) => !a.completed).length;
        return (
          <span className={open > 0 ? "text-warning" : "text-success"}>
            {open} open
          </span>
        );
      },
    },
  ];

  const actionItemColumns: Column<{ id: string; title: string; assignee: string; dueDate: Date; completed: boolean }>[] = [
    { key: "title", header: "Action Item", sortable: true },
    { key: "assignee", header: "Assignee", sortable: true },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (row) => formatDate(new Date(row.dueDate)),
    },
    {
      key: "completed",
      header: "Status",
      render: (row) => (
        <StatusBadge status={row.completed ? "success" : "pending"} />
      ),
    },
  ];

  const decisionColumns: Column<{ id: string; description: string; madeBy: string; date: Date }>[] = [
    { key: "description", header: "Decision", sortable: true },
    { key: "madeBy", header: "Made By", sortable: true },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row) => formatDate(new Date(row.date)),
    },
  ];

  const alerts: Alert[] = data?.alerts || [];

  // Collect all action items from meetings
  const allActionItems = React.useMemo(() => {
    const items: { id: string; title: string; assignee: string; dueDate: Date; completed: boolean }[] = [];
    data?.meetings?.forEach((meeting) => {
      meeting.actionItems.forEach((item) => {
        items.push(item);
      });
    });
    return items;
  }, [data?.meetings]);

  // Collect all decisions from meetings
  const allDecisions = React.useMemo(() => {
    const items: { id: string; description: string; madeBy: string; date: Date }[] = [];
    data?.meetings?.forEach((meeting) => {
      meeting.decisions.forEach((decision) => {
        items.push(decision);
      });
    });
    return items;
  }, [data?.meetings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meeting Hub</h1>
          <p className="text-muted-foreground">
            Track meetings, action items, and decisions
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
          title="Total Meetings"
          value={data?.metrics?.total || 24}
          icon={<Calendar className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Upcoming"
          value={data?.metrics?.upcoming || 5}
          change={25}
          changeLabel="vs last week"
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Completed This Week"
          value={data?.metrics?.completedThisWeek || 8}
          change={14.3}
          changeLabel="vs last week"
          trend="up"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Avg Duration"
          value={data?.metrics?.avgDuration || 45}
          subtitle="minutes"
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Open Action Items"
          value={data?.metrics?.actionItemsOpen || 12}
          change={-20}
          changeLabel="vs last week"
          trend="up"
          icon={<AlertCircle className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Decisions Made"
          value={data?.metrics?.decisionsMade || 4}
          change={33.3}
          changeLabel="vs last week"
          trend="up"
          icon={<FileText className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Meeting Utilization"
          value={78}
          change={5.2}
          changeLabel="vs last month"
          format="percent"
          progress={78}
          progressLabel="Calendar Utilization"
          loading={isLoading}
        />
      </div>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.meetings
              ?.filter((m) => m.status === "scheduled")
              .slice(0, 5)
              .map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{meeting.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(new Date(meeting.date), "full")} • {meeting.duration} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {meeting.attendees.slice(0, 3).map((attendee, index) => (
                        <div
                          key={index}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground"
                        >
                          {attendee.charAt(0)}
                        </div>
                      ))}
                      {meeting.attendees.length > 3 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                          +{meeting.attendees.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Meetings Table */}
      <DataTable
        title="All Meetings"
        columns={meetingColumns}
        data={data?.meetings || []}
        keyField="id"
        searchPlaceholder="Search meetings..."
        searchKeys={["title"]}
        emptyMessage="No meetings found"
      />

      {/* Action Items Table */}
      <DataTable
        title="Action Items"
        columns={actionItemColumns}
        data={allActionItems}
        keyField="id"
        searchPlaceholder="Search action items..."
        searchKeys={["title", "assignee"]}
        emptyMessage="No action items found"
      />

      {/* Decisions Table */}
      <DataTable
        title="Recent Decisions"
        columns={decisionColumns}
        data={allDecisions}
        keyField="id"
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
