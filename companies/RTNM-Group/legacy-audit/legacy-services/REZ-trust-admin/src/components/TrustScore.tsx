"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import clsx from "clsx";

interface TrustScoreProps {
  score: number;
  label: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  size?: "sm" | "md" | "lg";
  showGauge?: boolean;
}

export function TrustScore({
  score,
  label,
  trend,
  trendValue,
  size = "md",
  showGauge = true,
}: TrustScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-yellow-600";
    if (s >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    if (s >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-slate-400";

  const sizeClasses = {
    sm: "w-24 h-24 text-2xl",
    md: "w-32 h-32 text-3xl",
    lg: "w-40 h-40 text-4xl",
  };

  const strokeWidth = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const radius = size === "sm" ? 42 : size === "md" ? 56 : 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className={clsx("relative", sizeClasses[size])}>
        {showGauge && (
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-200"
            />
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              className={clsx("transition-all duration-1000 ease-out", getScoreBg(animatedScore))}
            />
          </svg>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={clsx("font-bold", getScoreColor(animatedScore))}>
            {animatedScore}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
      {trend && trendValue && (
        <div className={clsx("flex items-center gap-1 mt-1 text-sm", trendColor)}>
          <TrendIcon className="h-4 w-4" />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}

interface TrustBadgeProps {
  score: number;
  showLabel?: boolean;
}

export function TrustBadge({ score, showLabel = true }: TrustBadgeProps) {
  const getStatus = (s: number) => {
    if (s >= 80) return { label: "Trusted", className: "bg-green-100 text-green-800 border-green-200" };
    if (s >= 60) return { label: "Verified", className: "bg-blue-100 text-blue-800 border-blue-200" };
    if (s >= 40) return { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return { label: "Flagged", className: "bg-red-100 text-red-800 border-red-200" };
  };

  const status = getStatus(score);

  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", status.className)}>
      {showLabel ? status.label : score}
    </span>
  );
}
