"use client";

import * as React from "react";
import { AlertTriangle, AlertCircle, Info, X, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AlertType = "revenue" | "customer" | "product" | "project" | "team" | "goal" | "general";

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  type: AlertType;
  timestamp: Date;
  read?: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface AlertFeedProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onViewAll?: () => void;
  maxItems?: number;
  showFilters?: boolean;
  showHeader?: boolean;
  className?: string;
}

const severityConfig: Record<AlertSeverity, { icon: typeof AlertCircle; color: string; bgColor: string; label: string }> = {
  critical: {
    icon: AlertTriangle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    label: "Critical",
  },
  high: {
    icon: AlertCircle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    label: "High",
  },
  medium: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    label: "Medium",
  },
  low: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Low",
  },
  info: {
    icon: Info,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "Info",
  },
};

const typeColors: Record<AlertType, string> = {
  revenue: "bg-green-500",
  customer: "bg-blue-500",
  product: "bg-purple-500",
  project: "bg-orange-500",
  team: "bg-pink-500",
  goal: "bg-cyan-500",
  general: "bg-gray-500",
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function AlertFeed({
  alerts,
  onDismiss,
  onMarkRead,
  onViewAll,
  maxItems,
  showFilters = true,
  showHeader = true,
  className,
}: AlertFeedProps) {
  const [filter, setFilter] = React.useState<AlertSeverity | "all">("all");
  const [dismissedAlerts, setDismissedAlerts] = React.useState<Set<string>>(new Set());

  const filteredAlerts = alerts
    .filter((alert) => !dismissedAlerts.has(alert.id))
    .filter((alert) => filter === "all" || alert.severity === filter);

  const displayedAlerts = maxItems ? filteredAlerts.slice(0, maxItems) : filteredAlerts;

  const handleDismiss = (id: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(id));
    onDismiss?.(id);
  };

  const handleMarkRead = (id: string) => {
    onMarkRead?.(id);
  };

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Alerts</CardTitle>
            {onViewAll && (
              <Button variant="ghost" size="sm" onClick={onViewAll}>
                View All
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "critical", "high", "medium", "low"] as const).map((severity) => (
                <button
                  key={severity}
                  onClick={() => setFilter(severity)}
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filter === severity
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {severity === "all" ? "All" : severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className="p-0">
        {displayedAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-success mb-3" />
            <p className="font-medium text-muted-foreground">All caught up!</p>
            <p className="mt-1 text-sm text-muted-foreground">No alerts to display</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={clsx(
                    "group relative p-4 transition-colors hover:bg-accent/50",
                    !alert.read && "bg-accent/20"
                  )}
                >
                  <div className="flex gap-3">
                    <div className={clsx("mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg", config.bgColor)}>
                      <Icon className={clsx("h-4 w-4", config.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{alert.title}</h4>
                            <span className={clsx("h-2 w-2 rounded-full", typeColors[alert.type])} />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {alert.message}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <span className={clsx("text-xs font-medium", config.color)}>
                              {config.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(alert.timestamp)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {!alert.read && (
                            <button
                              onClick={() => handleMarkRead(alert.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              title="Mark as read"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDismiss(alert.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            title="Dismiss"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
