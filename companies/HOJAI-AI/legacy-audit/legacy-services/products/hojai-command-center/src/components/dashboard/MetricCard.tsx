"use client";

import * as React from "react";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown, MinusIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { clsx } from "clsx";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  comparison?: string;
  comparisonLabel?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  progress?: number;
  progressLabel?: string;
  format?: "number" | "currency" | "percent" | "string";
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  comparison,
  comparisonLabel,
  trend,
  icon,
  progress,
  progressLabel,
  format = "number",
  loading = false,
  className,
}: MetricCardProps) {
  const formattedValue = React.useMemo(() => {
    if (typeof value === "string") return value;
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case "percent":
        return `${value.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat("en-US").format(value);
    }
  }, [value, format]);

  const effectiveTrend = trend || (change !== undefined ? (change > 0 ? "up" : change < 0 ? "down" : "neutral") : "neutral");

  return (
    <Card className={clsx("relative overflow-hidden", className)}>
      {/* Background gradient for visual interest */}
      <div
        className={clsx(
          "absolute inset-0 opacity-5",
          effectiveTrend === "up" && "bg-gradient-to-br from-success to-primary",
          effectiveTrend === "down" && "bg-gradient-to-br from-destructive to-warning",
          effectiveTrend === "neutral" && "bg-gradient-to-br from-muted-foreground to-primary"
        )}
      />

      <CardContent className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {icon && <span className="text-primary">{icon}</span>}
              {title}
            </div>

            {loading ? (
              <div className="mt-3">
                <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            ) : (
              <>
                <p className="mt-3 text-4xl font-bold tracking-tight">{formattedValue}</p>
                {subtitle && (
                  <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                )}
              </>
            )}
          </div>

          {/* Trend Indicator */}
          {change !== undefined && !loading && (
            <div
              className={clsx(
                "flex items-center gap-1 rounded-full px-2.5 py-1",
                effectiveTrend === "up" && "bg-success/10 text-success",
                effectiveTrend === "down" && "bg-destructive/10 text-destructive",
                effectiveTrend === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {effectiveTrend === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : effectiveTrend === "down" ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <MinusIcon className="h-4 w-4" />
              )}
              <span className="text-sm font-semibold">
                {change > 0 ? "+" : ""}
                {change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Comparison */}
        {comparison !== undefined && (
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">{comparisonLabel || "vs last period"}</span>
            <span className="font-semibold">{comparison}</span>
          </div>
        )}

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-muted-foreground">{progressLabel || "Progress"}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  progress >= 80 && "bg-success",
                  progress >= 50 && progress < 80 && "bg-primary",
                  progress >= 25 && progress < 50 && "bg-warning",
                  progress < 25 && "bg-destructive"
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact metric for inline use
interface MetricMiniProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricMini({ label, value, trend, className }: MetricMiniProps) {
  return (
    <div className={clsx("flex items-center justify-between", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</span>
        {trend && (
          <span
            className={clsx(
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : trend === "down" ? (
              <ArrowDownRight className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
