"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Search,
  RefreshCw,
  ChevronRight,
  Home,
  User,
  Settings,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSidebar } from "./Sidebar";

const pageTitles: Record<string, string> = {
  "/": "Executive Command Center",
  "/revenue": "Revenue Intelligence",
  "/customers": "Customer 360",
  "/products": "Product Hub",
  "/projects": "Project Hub",
  "/team": "Workforce Dashboard",
  "/goals": "GoalOS",
  "/meetings": "Meeting Hub",
  "/competitors": "Competitive Intelligence",
  "/decisions": "Decision Center",
  "/agents": "Agent Workforce",
  "/workflows": "Workflow Hub",
};

export function Header() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const [notifications, setNotifications] = React.useState(3);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const title = pageTitles[pathname] || "Dashboard";

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger data refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const notificationItems = [
    { id: 1, title: "Revenue Alert", message: "MRR dropped 5% this week", time: "5m ago", type: "warning" },
    { id: 2, title: "New Customer", message: "Enterprise deal closed with Acme Corp", time: "12m ago", type: "success" },
    { id: 3, title: "Risk Alert", message: "Project Alpha is 2 weeks behind schedule", time: "1h ago", type: "error" },
  ];

  return (
    <header
      className={clsx(
        "fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300",
        collapsed ? "left-16" : "left-64"
      )}
    >
      {/* Breadcrumb and Title */}
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="flex items-center hover:text-foreground">
            <Home className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{title}</span>
        </nav>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Input
            placeholder="Search..."
            icon={<Search className="h-4 w-4" />}
            className="w-64"
          />
        </div>

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          title="Refresh data"
        >
          <RefreshCw className={clsx("h-4 w-4", refreshing && "animate-spin")} />
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {notifications}
              </span>
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-lg animate-fade-in-up">
              <div className="border-b border-border p-3">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificationItems.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-border p-3 last:border-0 hover:bg-accent/50 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={clsx(
                          "mt-1 h-2 w-2 rounded-full",
                          item.type === "warning" && "bg-warning",
                          item.type === "success" && "bg-success",
                          item.type === "error" && "bg-destructive"
                        )}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-2">
                <button className="w-full text-center text-sm text-primary hover:underline">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-accent"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              A
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-card shadow-lg animate-fade-in-up">
              <div className="border-b border-border p-3">
                <p className="font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@hojai.ai</p>
              </div>
              <div className="p-1">
                <button className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
                  <HelpCircle className="h-4 w-4" />
                  Help
                </button>
              </div>
              <div className="border-t border-border p-1">
                <button className="flex w-full items-center gap-2 rounded-md p-2 text-sm text-destructive hover:bg-accent">
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// Need to import clsx
import { clsx } from "clsx";