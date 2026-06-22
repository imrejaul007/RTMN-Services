"use client";

import * as React from "react";
import {
  Plus,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Bell,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Briefcase,
  MessageSquare,
  ChevronRight,
  Zap,
  Grid3X3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  disabled?: boolean;
  badge?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  columns?: 2 | 3 | 4;
  showLabels?: boolean;
  onAction?: (action: QuickAction) => void;
  className?: string;
}

const defaultActions: QuickAction[] = [
  {
    id: "add-customer",
    label: "Add Customer",
    icon: <Plus className="h-5 w-5" />,
    href: "/customers/new",
    variant: "primary",
  },
  {
    id: "new-meeting",
    label: "Schedule Meeting",
    icon: <Calendar className="h-5 w-5" />,
    href: "/meetings/new",
  },
  {
    id: "view-reports",
    label: "View Reports",
    icon: <BarChart3 className="h-5 w-5" />,
    href: "/revenue",
  },
  {
    id: "set-reminder",
    label: "Set Reminder",
    icon: <Bell className="h-5 w-5" />,
    onClick: () => {},
  },
];

export function QuickActions({
  actions = defaultActions,
  title = "Quick Actions",
  columns = 4,
  showLabels = true,
  onAction,
  className,
}: QuickActionsProps) {
  const handleClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    }
    onAction?.(action);
  };

  const buttonVariant = (variant?: QuickAction["variant"]) => {
    switch (variant) {
      case "primary":
        return "default";
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "destructive":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Button variant="ghost" size="sm" className="gap-1">
            <Zap className="h-4 w-4" />
            Customize
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div
          className={clsx(
            "grid gap-2",
            columns === 2 && "grid-cols-2",
            columns === 3 && "grid-cols-2 sm:grid-cols-3",
            columns === 4 && "grid-cols-2 sm:grid-cols-4"
          )}
        >
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={buttonVariant(action.variant)}
              className={clsx(
                "flex h-auto flex-col items-center justify-center gap-2 py-4",
                !showLabels && "h-12 w-12 p-0"
              )}
              disabled={action.disabled}
              onClick={() => handleClick(action)}
              asChild={!!action.href}
            >
              {action.href ? (
                <a href={action.href} className="flex flex-col items-center gap-2">
                  <span className="relative">
                    {action.icon}
                    {action.badge && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {action.badge}
                      </span>
                    )}
                  </span>
                  {showLabels && <span className="text-xs">{action.label}</span>}
                </a>
              ) : (
                <>
                  <span className="relative">
                    {action.icon}
                    {action.badge && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {action.badge}
                      </span>
                    )}
                  </span>
                  {showLabels && <span className="text-xs">{action.label}</span>}
                </>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Preset action panels for common use cases
export function DashboardQuickActions({ className }: { className?: string }) {
  const actions: QuickAction[] = [
    {
      id: "revenue-overview",
      label: "Revenue",
      icon: <DollarSign className="h-5 w-5" />,
      href: "/revenue",
    },
    {
      id: "add-customer",
      label: "Add Customer",
      icon: <Users className="h-5 w-5" />,
      href: "/customers/new",
      variant: "primary",
    },
    {
      id: "view-projects",
      label: "Projects",
      icon: <Briefcase className="h-5 w-5" />,
      href: "/projects",
    },
    {
      id: "meetings",
      label: "Meetings",
      icon: <Calendar className="h-5 w-5" />,
      href: "/meetings",
    },
    {
      id: "competitors",
      label: "Competitors",
      icon: <TrendingUp className="h-5 w-5" />,
      href: "/competitors",
    },
    {
      id: "decisions",
      label: "Decisions",
      icon: <FileText className="h-5 w-5" />,
      href: "/decisions",
    },
    {
      id: "goals",
      label: "Goals",
      icon: <Grid3X3 className="h-5 w-5" />,
      href: "/goals",
    },
    {
      id: "team",
      label: "Team",
      icon: <Users className="h-5 w-5" />,
      href: "/team",
    },
  ];

  return (
    <QuickActions
      title="Navigate"
      actions={actions}
      columns={4}
      className={className}
    />
  );
}

// Data actions panel
export function DataActionsPanel({ className }: { className?: string }) {
  const actions: QuickAction[] = [
    {
      id: "export",
      label: "Export Data",
      icon: <Download className="h-5 w-5" />,
      onClick: () => {},
    },
    {
      id: "import",
      label: "Import Data",
      icon: <Upload className="h-5 w-5" />,
      onClick: () => {},
    },
    {
      id: "refresh",
      label: "Refresh",
      icon: <RefreshCw className="h-5 w-5" />,
      onClick: () => {},
    },
    {
      id: "filter",
      label: "Filter",
      icon: <Filter className="h-5 w-5" />,
      onClick: () => {},
    },
  ];

  return (
    <QuickActions
      title="Data Actions"
      actions={actions}
      columns={4}
      className={className}
    />
  );
}

// Notification action button group
export function NotificationActions({ className }: { className?: string }) {
  const actions: QuickAction[] = [
    {
      id: "mark-read",
      label: "Mark All Read",
      icon: <MessageSquare className="h-5 w-5" />,
      onClick: () => {},
    },
    {
      id: "mute",
      label: "Mute Alerts",
      icon: <Bell className="h-5 w-5" />,
      onClick: () => {},
    },
    {
      id: "settings",
      label: "Alert Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/settings/alerts",
    },
  ];

  return (
    <QuickActions
      title="Alert Actions"
      actions={actions}
      columns={3}
      className={className}
    />
  );
}
