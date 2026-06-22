"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { MiniChart } from "@/components/ui/Chart";
import { clsx } from "clsx";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: number[];
  icon?: LucideIcon;
  href?: string;
  format?: "number" | "currency" | "percent" | "string";
  loading?: boolean;
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  trend,
  icon: Icon,
  href,
  format = "number",
  loading = false,
  className,
}: KPICardProps) {
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

  const trendColor = change && change > 0
    ? "hsl(142, 76%, 36%)"
    : change && change < 0
    ? "hsl(0, 62.8%, 30.6%)"
    : "hsl(var(--muted-foreground))";

  const content = (
    <Card className={clsx("hover:border-primary/50 transition-colors cursor-pointer", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>

            {loading ? (
              <div className="mt-3 h-8 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-3 text-3xl font-bold tracking-tight">{formattedValue}</p>
            )}

            {change !== undefined && (
              <div className="mt-2 flex items-center gap-1">
                <div
                  className={clsx(
                    "flex items-center gap-1 text-sm font-medium",
                    change > 0 && "text-success",
                    change < 0 && "text-destructive",
                    change === 0 && "text-muted-foreground"
                  )}
                >
                  {change > 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : change < 0 ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  <span>{Math.abs(change).toFixed(1)}%</span>
                </div>
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              </div>
            )}
          </div>

          {trend && trend.length > 0 && (
            <div className="ml-4">
              <MiniChart data={trend} color={trendColor} width={80} height={40} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
