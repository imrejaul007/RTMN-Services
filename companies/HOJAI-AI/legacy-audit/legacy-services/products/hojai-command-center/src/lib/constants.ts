// Service URLs
export const SERVICES = {
  REVENUE: process.env.NEXT_PUBLIC_REVENUE_SERVICE_URL || "http://localhost:4757",
  CUSTOMER: process.env.NEXT_PUBLIC_CUSTOMER_SERVICE_URL || "http://localhost:4752",
  PRODUCT: process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || "http://localhost:4755",
  PROJECT: process.env.NEXT_PUBLIC_PROJECT_SERVICE_URL || "http://localhost:4708",
  WORKFORCE: process.env.NEXT_PUBLIC_WORKFORCE_SERVICE_URL || "http://localhost:4820",
  GOAL: process.env.NEXT_PUBLIC_GOAL_SERVICE_URL || "http://localhost:4242",
  MEETING: process.env.NEXT_PUBLIC_MEETING_SERVICE_URL || "http://localhost:4700",
  COMPETITOR: process.env.NEXT_PUBLIC_COMPETITOR_SERVICE_URL || "http://localhost:4756",
  BOARD: process.env.NEXT_PUBLIC_BOARD_SERVICE_URL || "http://localhost:4870",
  AGENT: process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || "http://localhost:4580",
  WORKFLOW: process.env.NEXT_PUBLIC_WORKFLOW_SERVICE_URL || "http://localhost:4244",
} as const;

// API Configuration
export const API_CONFIG = {
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "10000", 10),
  REFRESH_INTERVAL: parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || "30000", 10),
} as const;

// Navigation
export const NAV_ITEMS = [
  { label: "Command Center", href: "/", icon: "LayoutDashboard" },
  { label: "Revenue", href: "/revenue", icon: "DollarSign" },
  { label: "Customers", href: "/customers", icon: "Users" },
  { label: "Products", href: "/products", icon: "Package" },
  { label: "Projects", href: "/projects", icon: "FolderKanban" },
  { label: "Team", href: "/team", icon: "UserCog" },
  { label: "Goals", href: "/goals", icon: "Target" },
  { label: "Meetings", href: "/meetings", icon: "Calendar" },
  { label: "Competitors", href: "/competitors", icon: "Building2" },
  { label: "Decisions", href: "/decisions", icon: "Scale" },
  { label: "Agents", href: "/agents", icon: "Bot" },
  { label: "Workflows", href: "/workflows", icon: "Workflow" },
] as const;

// Chart colors
export const CHART_COLORS = {
  primary: "hsl(217.2, 91.2%, 59.8%)",
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  destructive: "hsl(0, 62.8%, 30.6%)",
  purple: "hsl(280, 60%, 50%)",
  cyan: "hsl(200, 80%, 50%)",
  pink: "hsl(330, 60%, 50%)",
  orange: "hsl(25, 80%, 50%)",
} as const;

// Alert severities
export const ALERT_SEVERITIES = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
} as const;

// Status types
export const STATUS_TYPES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DRAFT: "draft",
  ON_HOLD: "on-hold",
} as const;

// Time ranges
export const TIME_RANGES = ["7D", "30D", "90D", "1Y", "ALL"] as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50, 100],
} as const;

// Animation durations
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;
