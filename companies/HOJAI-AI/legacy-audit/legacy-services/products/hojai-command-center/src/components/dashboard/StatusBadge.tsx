"use client";

import * as React from "react";
import { clsx } from "clsx";
import { CheckCircle, AlertTriangle, XCircle, Clock, Circle, Minus } from "lucide-react";

type StatusType = "success" | "warning" | "error" | "pending" | "active" | "inactive" | "on-hold" | "completed" | "cancelled" | "draft";

interface StatusBadgeProps {
  status: StatusType;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; color: string; bgColor: string; icon: typeof CheckCircle }> = {
  success: {
    label: "Success",
    color: "text-success",
    bgColor: "bg-success/10",
    icon: CheckCircle,
  },
  completed: {
    label: "Completed",
    color: "text-success",
    bgColor: "bg-success/10",
    icon: CheckCircle,
  },
  active: {
    label: "Active",
    color: "text-success",
    bgColor: "bg-success/10",
    icon: Circle,
  },
  warning: {
    label: "Warning",
    color: "text-warning",
    bgColor: "bg-warning/10",
    icon: AlertTriangle,
  },
  "on-hold": {
    label: "On Hold",
    color: "text-warning",
    bgColor: "bg-warning/10",
    icon: Clock,
  },
  pending: {
    label: "Pending",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    icon: Clock,
  },
  error: {
    label: "Error",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    icon: XCircle,
  },
  inactive: {
    label: "Inactive",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: Minus,
  },
  draft: {
    label: "Draft",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: Circle,
  },
};

const sizeConfig = {
  sm: { padding: "px-2 py-0.5", text: "text-xs", icon: "h-3 w-3" },
  md: { padding: "px-2.5 py-1", text: "text-xs", icon: "h-3.5 w-3.5" },
  lg: { padding: "px-3 py-1.5", text: "text-sm", icon: "h-4 w-4" },
};

export function StatusBadge({
  status,
  showIcon = true,
  size = "md",
  pulse = false,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const sizes = sizeConfig[size];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.color,
        config.bgColor,
        sizes.padding,
        sizes.text,
        pulse && status === "active" && "animate-pulse",
        className
      )}
    >
      {showIcon && <Icon className={sizes.icon} />}
      {config.label}
    </span>
  );
}

// Health score badge
interface HealthBadgeProps {
  score: number;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function HealthBadge({
  score,
  showScore = true,
  size = "md",
  className,
}: HealthBadgeProps) {
  const getHealthStatus = (score: number) => {
    if (score >= 80) return { status: "success" as const, label: "Excellent" };
    if (score >= 60) return { status: "active" as const, label: "Good" };
    if (score >= 40) return { status: "warning" as const, label: "Fair" };
    if (score >= 20) return { status: "pending" as const, label: "Poor" };
    return { status: "error" as const, label: "Critical" };
  };

  const { status, label } = getHealthStatus(score);
  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full font-medium",
        config.color,
        config.bgColor,
        sizes.padding,
        sizes.text,
        className
      )}
    >
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
          status === "success" && "bg-success",
          status === "active" && "bg-primary",
          status === "warning" && "bg-warning",
          status === "pending" && "bg-yellow-500",
          status === "error" && "bg-destructive"
        )}
      />
      {showScore ? `${score}% - ${label}` : label}
    </span>
  );
}

// Severity badge
type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";

interface SeverityBadgeProps {
  severity: SeverityLevel;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const severityConfig: Record<SeverityLevel, { label: string; color: string; bgColor: string; borderColor: string }> = {
  critical: {
    label: "Critical",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
  },
  high: {
    label: "High",
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  low: {
    label: "Low",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  info: {
    label: "Info",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-border",
  },
};

export function SeverityBadge({
  severity,
  showIcon = true,
  size = "md",
  className,
}: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const sizes = sizeConfig[size];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        config.color,
        config.bgColor,
        config.borderColor,
        sizes.padding,
        sizes.text,
        className
      )}
    >
      {showIcon && (
        <span
          className={clsx(
            "h-1.5 w-1.5 rounded-full",
            severity === "critical" && "bg-destructive",
            severity === "high" && "bg-warning",
            severity === "medium" && "bg-yellow-500",
            severity === "low" && "bg-blue-500",
            severity === "info" && "bg-muted-foreground"
          )}
        />
      )}
      {config.label}
    </span>
  );
}
