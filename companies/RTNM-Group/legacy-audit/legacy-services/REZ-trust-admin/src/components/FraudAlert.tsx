"use client";

import { AlertTriangle, Clock, User, Building2, CheckCircle, XCircle } from "lucide-react";
import clsx from "clsx";

interface FraudAlertProps {
  id: string;
  type: "high" | "medium" | "low";
  title: string;
  description: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  merchant?: {
    name: string;
    id: string;
  };
  amount?: number;
  timestamp: string;
  status: "pending" | "reviewed" | "dismissed";
  onAction?: (id: string, action: "review" | "dismiss") => void;
}

export function FraudAlert({
  id,
  type,
  title,
  description,
  user,
  merchant,
  amount,
  timestamp,
  status,
  onAction,
}: FraudAlertProps) {
  const severityConfig = {
    high: {
      bg: "bg-red-50 border-red-200",
      icon: "text-red-600",
      badge: "bg-red-100 text-red-800",
      dot: "bg-red-500",
    },
    medium: {
      bg: "bg-yellow-50 border-yellow-200",
      icon: "text-yellow-600",
      badge: "bg-yellow-100 text-yellow-800",
      dot: "bg-yellow-500",
    },
    low: {
      bg: "bg-blue-50 border-blue-200",
      icon: "text-blue-600",
      badge: "bg-blue-100 text-blue-800",
      dot: "bg-blue-500",
    },
  };

  const config = severityConfig[type];

  return (
    <div className={clsx("border rounded-lg p-4 transition-all hover:shadow-md", config.bg)}>
      <div className="flex items-start gap-4">
        <div className={clsx("mt-1 p-2 rounded-full", config.bg)}>
          <AlertTriangle className={clsx("h-5 w-5", config.icon)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx("inline-block w-2 h-2 rounded-full", config.dot)} />
            <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", config.badge)}>
              {type.toUpperCase()} RISK
            </span>
          </div>

          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-1">{description}</p>

          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
            {user && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{user.name}</span>
                <span className="text-slate-400">({user.email})</span>
              </div>
            )}
            {merchant && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span>{merchant.name}</span>
                <span className="text-slate-400">#{merchant.id}</span>
              </div>
            )}
            {amount && (
              <div className="font-medium text-slate-700">
                ${amount.toLocaleString()}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{timestamp}</span>
            </div>
          </div>
        </div>

        {status === "pending" && onAction && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onAction(id, "review")}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Review
            </button>
            <button
              onClick={() => onAction(id, "dismiss")}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Dismiss
            </button>
          </div>
        )}

        {status === "reviewed" && (
          <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
            Reviewed
          </span>
        )}

        {status === "dismissed" && (
          <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium">
            Dismissed
          </span>
        )}
      </div>
    </div>
  );
}

interface FraudStatsProps {
  high: number;
  medium: number;
  low: number;
}

export function FraudStats({ high, medium, low }: FraudStatsProps) {
  const total = high + medium + low;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-red-600">{high}</div>
        <div className="text-xs text-red-600/70">High Risk</div>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-yellow-600">{medium}</div>
        <div className="text-xs text-yellow-600/70">Medium Risk</div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-blue-600">{low}</div>
        <div className="text-xs text-blue-600/70">Low Risk</div>
      </div>
    </div>
  );
}
