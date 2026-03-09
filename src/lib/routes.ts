/**
 * Shared route registry — single source of truth for all app routes.
 *
 * Used by: sidebar, command bar, AI prompt, URL validation, page titles.
 * When adding a new page, add it here and everything auto-updates.
 */

export interface AppRoute {
  path: string;
  label: string;
  description: string;
  keywords: string[];
  icon: string; // lucide icon name
  sidebarIcon: string; // unicode character for sidebar
  portal: "gp" | "lp";
  priority: number; // command bar sort priority (higher = first)
  /** Optional role hint — middleware enforces actual access; this is for UI hints only */
  requiredRole?: "GP_ADMIN" | "GP_TEAM" | "SERVICE_PROVIDER" | "LP_INVESTOR";
  /** When true, the route is not shown in the sidebar (e.g. accessed from top bar or direct link) */
  hiddenFromSidebar?: boolean;
}

export const APP_ROUTES: AppRoute[] = [
  // ── GP Navigation ──────────────────────────────────────────
  { path: "/dashboard", label: "Dashboard", description: "Main overview with KPIs, pipeline, and allocations", keywords: ["home", "overview", "kpi", "stats", "metrics"], icon: "LayoutDashboard", sidebarIcon: "\u25FB", portal: "gp", priority: 100 },
  { path: "/deals", label: "Deal Desk", description: "Deal pipeline, screening, IC review", keywords: ["deals", "pipeline", "screening", "ic", "investment", "opportunities"], icon: "Briefcase", sidebarIcon: "\u25C6", portal: "gp", priority: 95 },
  { path: "/entities", label: "Vehicles", description: "Fund vehicles — funds, sidecars, SPVs", keywords: ["funds", "vehicles", "sidecar", "spv", "formation", "llc", "lp", "entities"], icon: "Building2", sidebarIcon: "\u25A3", portal: "gp", priority: 92 },
  { path: "/assets", label: "Assets", description: "Portfolio assets and investments", keywords: ["portfolio", "investments", "holdings", "real estate", "credit", "equity"], icon: "TrendingUp", sidebarIcon: "\u25C8", portal: "gp", priority: 90 },
  { path: "/directory", label: "Directory", description: "Contacts, companies, investors, team", keywords: ["contacts", "companies", "investors", "people", "crm", "team", "lp"], icon: "Users", sidebarIcon: "\u25A1", portal: "gp", priority: 88 },
  { path: "/documents", label: "Documents", description: "Document management and file storage", keywords: ["files", "docs", "pdf", "upload", "k1", "reports"], icon: "FileText", sidebarIcon: "\u25A5", portal: "gp", priority: 85 },
  { path: "/tasks", label: "Tasks", description: "Task management across deals and entities", keywords: ["tasks", "todo", "checklist", "assignments", "workflow"], icon: "CheckSquare", sidebarIcon: "\u2611", portal: "gp", priority: 85 },
  { path: "/accounting", label: "Accounting", description: "QBO/Xero connections, trial balance, NAV", keywords: ["accounting", "quickbooks", "qbo", "xero", "bookkeeping", "nav", "trial balance"], icon: "Calculator", sidebarIcon: "\u2B21", portal: "gp", priority: 82 },
  { path: "/analytics", label: "Analytics", description: "Pipeline analytics and deal metrics", keywords: ["analytics", "metrics", "pipeline", "performance", "conversion", "velocity", "funnel"], icon: "BarChart3", sidebarIcon: "\u25A8", portal: "gp", priority: 81 },
  { path: "/meetings", label: "Meetings", description: "Meeting notes, transcripts, and decisions", keywords: ["meetings", "notes", "transcript", "decisions", "fireflies"], icon: "Calendar", sidebarIcon: "\u25CE", portal: "gp", priority: 80 },
  { path: "/reports", label: "Reports", description: "Generate and download PDF reports for fund entities", keywords: ["reports", "pdf", "quarterly", "statement", "export", "generate", "fund summary", "capital account"], icon: "FileText", sidebarIcon: "\u25A4", portal: "gp", priority: 79 },
  { path: "/transactions", label: "Transactions", description: "Capital calls, distributions, and waterfall", keywords: ["capital", "transactions", "calls", "distributions", "waterfall", "capital calls", "capital activity"], icon: "DollarSign", sidebarIcon: "\u25C7", portal: "gp", priority: 78 },
  { path: "/settings", label: "Settings", description: "Platform configuration and preferences", keywords: ["settings", "config", "preferences", "api", "keys"], icon: "Settings", sidebarIcon: "\u2699", portal: "gp", priority: 60 },
  { path: "/profile", label: "Profile", description: "Your profile and AI settings", keywords: ["profile", "ai", "settings", "api key", "personal"], icon: "User", sidebarIcon: "\u25CB", portal: "gp", priority: 90, hiddenFromSidebar: true },
  { path: "/contacts/:id", label: "Contact Detail", description: "Contact relationship intelligence and activity history", keywords: ["contact", "crm", "interactions", "relationship"], icon: "User", sidebarIcon: "\u25CB", portal: "gp", priority: 0, hiddenFromSidebar: true },

  // ── LP Navigation ──────────────────────────────────────────
  { path: "/lp-dashboard", label: "My Overview", description: "LP investor overview", keywords: ["lp", "investor", "portal", "my overview"], icon: "LayoutDashboard", sidebarIcon: "\u25FB", portal: "lp", priority: 70 },
  { path: "/lp-account", label: "Capital Account", description: "LP capital account statement", keywords: ["capital account", "lp account", "statement"], icon: "DollarSign", sidebarIcon: "\u25C8", portal: "lp", priority: 68 },
  { path: "/lp-portfolio", label: "LP Portfolio", description: "LP portfolio view", keywords: ["lp portfolio", "my investments"], icon: "TrendingUp", sidebarIcon: "\u25C9", portal: "lp", priority: 66 },
  { path: "/lp-activity", label: "Notices & Activity", description: "LP notices and activity feed", keywords: ["notices", "activity", "updates"], icon: "Bell", sidebarIcon: "\u25C7", portal: "lp", priority: 64 },
  { path: "/lp-documents", label: "Documents", description: "LP documents and reports", keywords: ["documents", "reports", "k1", "statements"], icon: "FileText", sidebarIcon: "\u25A5", portal: "lp", priority: 62 },
  { path: "/lp-settings", label: "Settings", description: "LP notification preferences and settings", keywords: ["settings", "notifications", "preferences", "email", "sms"], icon: "Settings", sidebarIcon: "\u2699", portal: "lp", priority: 58 },
];

// ── Derived helpers (auto-generated from APP_ROUTES) ─────────

/**
 * Get sidebar navigation items for a portal.
 */
export function getSidebarNav(portal: "gp" | "lp") {
  return APP_ROUTES
    .filter((r) => r.portal === portal && !r.hiddenFromSidebar)
    .map((r) => ({ key: r.path, label: r.label, icon: r.sidebarIcon }));
}

/**
 * Get page title from pathname. Falls back to detail page patterns.
 */
export function getPageTitle(pathname: string): string {
  const exact = APP_ROUTES.find((r) => r.path === pathname);
  if (exact) return exact.label;

  // Detail page patterns
  if (pathname.startsWith("/assets/")) return "Asset Detail";
  if (pathname.startsWith("/deals/")) return "Deal Detail";
  if (pathname.startsWith("/entities/")) return "Vehicle Detail";
  if (pathname.startsWith("/investors/")) return "Investor Detail";
  if (pathname.startsWith("/companies/")) return "Company Detail";
  if (pathname.startsWith("/transactions/")) return "Transaction Detail";

  return "Atlas";
}

/**
 * Check if a URL matches a valid app route.
 */
export function isValidAppRoute(url: string): boolean {
  return APP_ROUTES.some(
    (r) => url === r.path || url.startsWith(r.path + "/") || url.startsWith(r.path + "?"),
  );
}

/**
 * Generate route listing for the AI system prompt.
 */
export function generateAIRouteList(): string {
  const gpRoutes = APP_ROUTES.filter((r) => r.portal === "gp");
  return gpRoutes
    .map((r) => `- ${r.label}: ${r.path}`)
    .join("\n");
}

/**
 * Get module routes for the app grid / module discovery.
 */
export function getModuleRoutes() {
  return APP_ROUTES
    .filter((r) => r.portal === "gp" && r.path !== "/settings" && !r.hiddenFromSidebar)
    .map((r) => ({ name: r.label, path: r.path, icon: r.icon }));
}
