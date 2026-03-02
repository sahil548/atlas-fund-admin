import type { CommandAction } from "./command-bar-types";

// All navigable routes and quick actions in Atlas
export const ATLAS_COMMANDS: CommandAction[] = [
  // ── GP Navigation ──────────────────────────────────────────
  { id: "nav-dashboard", label: "Dashboard", description: "Main overview with KPIs, pipeline, and allocations", category: "navigation", keywords: ["home", "overview", "kpi", "stats", "metrics"], path: "/dashboard", icon: "LayoutDashboard", priority: 100 },
  { id: "nav-deals", label: "Deal Desk", description: "Deal pipeline, screening, IC review", category: "navigation", keywords: ["deals", "pipeline", "screening", "ic", "investment", "opportunities"], path: "/deals", icon: "Briefcase", priority: 95 },
  { id: "nav-entities", label: "Entities", description: "Fund entities, sidecars, SPVs", category: "navigation", keywords: ["funds", "vehicles", "sidecar", "spv", "formation", "llc", "lp"], path: "/entities", icon: "Building2", priority: 92 },
  { id: "nav-assets", label: "Assets", description: "Portfolio assets and investments", category: "navigation", keywords: ["portfolio", "investments", "holdings", "real estate", "credit", "equity"], path: "/assets", icon: "TrendingUp", priority: 90 },
  { id: "nav-directory", label: "Directory", description: "Contacts, companies, investors, team", category: "navigation", keywords: ["contacts", "companies", "investors", "people", "crm", "team", "lp"], path: "/directory", icon: "Users", priority: 88 },
  { id: "nav-documents", label: "Documents", description: "Document management and file storage", category: "navigation", keywords: ["files", "docs", "pdf", "upload", "k1", "reports"], path: "/documents", icon: "FileText", priority: 85 },
  { id: "nav-tasks", label: "Tasks", description: "Task management across deals and entities", category: "navigation", keywords: ["tasks", "todo", "checklist", "assignments", "workflow"], path: "/tasks", icon: "CheckSquare", priority: 85 },
  { id: "nav-accounting", label: "Accounting", description: "QBO/Xero connections, trial balance, NAV", category: "navigation", keywords: ["accounting", "quickbooks", "qbo", "xero", "bookkeeping", "nav", "trial balance"], path: "/accounting", icon: "Calculator", priority: 82 },
  { id: "nav-meetings", label: "Meetings", description: "Meeting notes, transcripts, and decisions", category: "navigation", keywords: ["meetings", "notes", "transcript", "decisions", "fireflies"], path: "/meetings", icon: "Calendar", priority: 80 },
  { id: "nav-waterfall", label: "Waterfall", description: "Waterfall calculations and distributions", category: "navigation", keywords: ["waterfall", "distributions", "carried interest", "fees", "promote"], path: "/waterfall", icon: "Layers", priority: 78 },
  { id: "nav-settings", label: "Settings", description: "Platform configuration and preferences", category: "navigation", keywords: ["settings", "config", "preferences", "api", "keys"], path: "/settings", icon: "Settings", priority: 60 },

  // ── LP Navigation ──────────────────────────────────────────
  { id: "nav-lp-dashboard", label: "LP Dashboard", description: "LP investor overview", category: "navigation", keywords: ["lp", "investor", "portal", "my overview"], path: "/lp-dashboard", icon: "LayoutDashboard", priority: 70 },
  { id: "nav-lp-account", label: "Capital Account", description: "LP capital account statement", category: "navigation", keywords: ["capital account", "lp account", "statement"], path: "/lp-account", icon: "DollarSign", priority: 68 },
  { id: "nav-lp-portfolio", label: "LP Portfolio", description: "LP portfolio view", category: "navigation", keywords: ["lp portfolio", "my investments"], path: "/lp-portfolio", icon: "TrendingUp", priority: 66 },

  // ── Quick Create Actions ───────────────────────────────────
  { id: "create-deal", label: "Create New Deal", description: "Start a new deal in the pipeline", category: "create", keywords: ["new deal", "add deal", "start deal", "create deal"], actionId: "createDeal", icon: "Plus", priority: 55 },
  { id: "create-entity", label: "Create New Entity", description: "Create a fund entity, sidecar, or SPV", category: "create", keywords: ["new entity", "new fund", "new spv", "new sidecar", "create entity", "add fund"], actionId: "createEntity", icon: "Plus", priority: 53 },
  { id: "create-investor", label: "Add Investor", description: "Add a new LP investor", category: "create", keywords: ["new investor", "add investor", "add lp", "create investor"], actionId: "createInvestor", icon: "Plus", priority: 51 },
  { id: "create-task", label: "Create Task", description: "Create a new task", category: "create", keywords: ["new task", "add task", "create task", "todo"], path: "/tasks", icon: "Plus", priority: 50 },
  { id: "create-meeting", label: "Log Meeting", description: "Log a new meeting or IC session", category: "create", keywords: ["new meeting", "log meeting", "add meeting", "ic session"], actionId: "createMeeting", icon: "Plus", priority: 48 },
  { id: "create-company", label: "Add Company", description: "Add a company to the directory", category: "create", keywords: ["new company", "add company", "create company"], path: "/directory?tab=companies", icon: "Plus", priority: 46 },
  { id: "create-contact", label: "Add Contact", description: "Add a contact to the directory", category: "create", keywords: ["new contact", "add contact", "add person", "create contact"], path: "/directory?tab=contacts", icon: "Plus", priority: 44 },
];

/**
 * Fuzzy match scoring between a query and a target string.
 * Returns a score from 0–100.
 */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return 100;
  if (t.startsWith(q)) return 95;
  if (t.includes(q)) return 85;

  // Word boundary match
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(q)) return 90;
    if (word.includes(q)) return 75;
  }

  // Character-by-character subsequence match
  let qi = 0;
  let matches = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      matches++;
      qi++;
    }
  }
  if (qi === q.length) {
    return Math.round((matches / t.length) * 60);
  }

  return 0;
}

/**
 * Discover commands matching a search query.
 * Returns top 8 results sorted by relevance score.
 */
export function discoverCommands(query: string): CommandAction[] {
  if (!query.trim()) return [];

  const queryWords = query.toLowerCase().trim().split(/\s+/);

  const scored = ATLAS_COMMANDS.map((cmd) => {
    let score = 0;

    if (queryWords.length === 1) {
      const q = queryWords[0];
      const labelScore = fuzzyScore(q, cmd.label);
      const descScore = fuzzyScore(q, cmd.description) * 0.5;
      const keywordScore = Math.max(
        ...cmd.keywords.map((kw) => fuzzyScore(q, kw) * 0.9),
        0
      );
      score = Math.max(labelScore, descScore, keywordScore);
    } else {
      // Multi-word: average of best matches per word
      const wordScores = queryWords.map((q) => {
        const labelScore = fuzzyScore(q, cmd.label);
        const descScore = fuzzyScore(q, cmd.description) * 0.5;
        const keywordScore = Math.max(
          ...cmd.keywords.map((kw) => fuzzyScore(q, kw) * 0.9),
          0
        );
        return Math.max(labelScore, descScore, keywordScore);
      });
      score = wordScores.reduce((a, b) => a + b, 0) / wordScores.length * 0.8;
    }

    // Apply priority boost
    score = score * (cmd.priority / 90);

    return { cmd, score };
  });

  return scored
    .filter(({ score }) => score > 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ cmd }) => cmd);
}

/**
 * Get module routes for the app grid.
 */
export function getModuleRoutes() {
  return [
    { name: "Dashboard", path: "/dashboard", icon: "LayoutDashboard" },
    { name: "Deal Desk", path: "/deals", icon: "Briefcase" },
    { name: "Entities", path: "/entities", icon: "Building2" },
    { name: "Assets", path: "/assets", icon: "TrendingUp" },
    { name: "Directory", path: "/directory", icon: "Users" },
    { name: "Documents", path: "/documents", icon: "FileText" },
    { name: "Tasks", path: "/tasks", icon: "CheckSquare" },
    { name: "Accounting", path: "/accounting", icon: "Calculator" },
    { name: "Meetings", path: "/meetings", icon: "Calendar" },
    { name: "Settings", path: "/settings", icon: "Settings" },
  ];
}
