"use client";

import { Shield, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import clsx from "clsx";

export interface TimelineEvent {
  id: string;
  type: "verification" | "score_change" | "fraud_alert" | "payment" | "kyc" | "limit_change";
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
  metadata?: Record<string, string | number>;
}

interface TrustTimelineProps {
  events: TimelineEvent[];
  maxItems?: number;
}

const eventConfig = {
  verification: {
    icon: CheckCircle,
    bg: "bg-green-100",
    iconColor: "text-green-600",
    border: "border-green-300",
  },
  score_change: {
    icon: Shield,
    bg: "bg-blue-100",
    iconColor: "text-blue-600",
    border: "border-blue-300",
  },
  fraud_alert: {
    icon: AlertTriangle,
    bg: "bg-red-100",
    iconColor: "text-red-600",
    border: "border-red-300",
  },
  payment: {
    icon: Clock,
    bg: "bg-purple-100",
    iconColor: "text-purple-600",
    border: "border-purple-300",
  },
  kyc: {
    icon: CheckCircle,
    bg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    border: "border-indigo-300",
  },
  limit_change: {
    icon: Clock,
    bg: "bg-amber-100",
    iconColor: "text-amber-600",
    border: "border-amber-300",
  },
};

export function TrustTimeline({ events, maxItems }: TrustTimelineProps) {
  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  return (
    <div className="space-y-0">
      {displayEvents.map((event, index) => {
        const config = eventConfig[event.type];
        const Icon = config.icon;
        const isLast = index === displayEvents.length - 1;

        return (
          <div key={event.id} className="flex gap-4">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div className={clsx("p-2 rounded-full", config.bg)}>
                <Icon className={clsx("h-4 w-4", config.iconColor)} />
              </div>
              {!isLast && (
                <div className="w-px h-full min-h-[60px] bg-slate-200 my-1" />
              )}
            </div>

            {/* Event content */}
            <div className={clsx("flex-1 pb-6", !isLast && "border-b border-slate-100")}>
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900">{event.title}</h4>
                <span className="text-xs text-slate-500">{event.timestamp}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{event.description}</p>

              {event.actor && (
                <p className="text-xs text-slate-400 mt-2">By: {event.actor}</p>
              )}

              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(event.metadata).map(([key, value]) => (
                    <span
                      key={key}
                      className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600"
                    >
                      {key}: {typeof value === "number" ? value.toLocaleString() : value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TrustMetricProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

export function TrustMetric({ label, value, change, trend }: TrustMetricProps) {
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-slate-400";

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {change && (
          <span className={clsx("text-sm font-medium", trendColor)}>
            {trend === "up" && "+"}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
