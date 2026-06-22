"use client";

import * as React from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { clsx } from "clsx";

export interface Activity {
  id: string;
  type: "created" | "updated" | "deleted" | "commented" | "assigned" | "completed" | "status_change" | "mention";
  title: string;
  description?: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
    initials?: string;
  };
  metadata?: Record<string, string>;
  link?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  title?: string;
  maxItems?: number;
  showTimeline?: boolean;
  onActivityClick?: (activity: Activity) => void;
  className?: string;
}

const activityIcons: Record<Activity["type"], { icon: string; color: string }> = {
  created: { icon: "+", color: "bg-success text-success-foreground" },
  updated: { icon: "~", color: "bg-primary text-primary-foreground" },
  deleted: { icon: "-", color: "bg-destructive text-destructive-foreground" },
  commented: { icon: "!", color: "bg-blue-500 text-white" },
  assigned: { icon: ">", color: "bg-purple-500 text-white" },
  completed: { icon: "✓", color: "bg-success text-success-foreground" },
  status_change: { icon: "↔", color: "bg-warning text-warning-foreground" },
  mention: { icon: "@", color: "bg-cyan-500 text-white" },
};

function ActivityIcon({ type }: { type: Activity["type"] }) {
  const config = activityIcons[type];

  return (
    <div
      className={clsx(
        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold",
        config.color
      )}
    >
      {config.icon}
    </div>
  );
}

function UserAvatar({ user }: { user: Activity["user"] }) {
  if (!user) return null;

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className="h-6 w-6 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
      {user.initials || user.name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ActivityFeed({
  activities,
  title = "Activity",
  maxItems,
  showTimeline = true,
  onActivityClick,
  className,
}: ActivityFeedProps) {
  const displayedActivities = maxItems ? activities.slice(0, maxItems) : activities;

  const groupedActivities = React.useMemo(() => {
    const groups: { [key: string]: Activity[] } = {};

    displayedActivities.forEach((activity) => {
      const date = format(activity.timestamp, "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      label: format(new Date(date), "MMMM d, yyyy"),
      isToday: date === format(new Date(), "yyyy-MM-dd"),
      isYesterday: date === format(new Date(Date.now() - 86400000), "yyyy-MM-dd"),
      activities: items,
    }));
  }, [displayedActivities]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {displayedActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="font-medium text-muted-foreground">No recent activity</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Activity will appear here as things happen
            </p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
            {groupedActivities.map((group, groupIndex) => (
              <div key={group.date}>
                {/* Date Header */}
                <div className="sticky top-0 z-10 border-b border-border bg-muted/80 px-4 py-2 backdrop-blur">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.isToday
                      ? "Today"
                      : group.isYesterday
                      ? "Yesterday"
                      : group.label}
                  </span>
                </div>

                {/* Activities */}
                <div className="relative px-4">
                  {showTimeline && (
                    <div className="absolute left-[36px] top-0 h-full w-px bg-border" />
                  )}

                  <div className="space-y-4 py-4">
                    {group.activities.map((activity, index) => (
                      <div
                        key={activity.id}
                        className={clsx(
                          "relative flex gap-3 transition-colors",
                          onActivityClick && "cursor-pointer hover:bg-accent/50"
                        )}
                        onClick={() => onActivityClick?.(activity)}
                      >
                        {showTimeline && (
                          <div className="relative z-10 flex-shrink-0">
                            <ActivityIcon type={activity.type} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <UserAvatar user={activity.user} />
                                <p className="font-medium text-sm">{activity.title}</p>
                              </div>
                              {activity.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {activity.description}
                                </p>
                              )}
                              {activity.metadata && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {Object.entries(activity.metadata).map(([key, value]) => (
                                    <span
                                      key={key}
                                      className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                    >
                                      {key}: {value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="flex-shrink-0 text-xs text-muted-foreground">
                              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact activity item for inline use
interface ActivityItemProps {
  activity: Activity;
  compact?: boolean;
  className?: string;
}

export function ActivityItem({ activity, compact = false, className }: ActivityItemProps) {
  return (
    <div className={clsx("flex items-start gap-3", className)}>
      <ActivityIcon type={activity.type} />
      <div className="flex-1 min-w-0">
        <p className={compact ? "text-sm" : "text-sm font-medium"}>{activity.title}</p>
        {activity.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{activity.description}</p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {activity.user && <span>{activity.user.name}</span>}
          <span>•</span>
          <span>{formatDistanceToNow(activity.timestamp, { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}
