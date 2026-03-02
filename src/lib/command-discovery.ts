import type { CommandAction } from "./command-bar-types";
import { APP_ROUTES } from "./routes";

// Auto-generate navigation commands from the shared route registry
const NAV_COMMANDS: CommandAction[] = APP_ROUTES.map((r) => ({
  id: `nav-${r.path.replace(/\//g, "-").replace(/^-/, "")}`,
  label: r.label,
  description: r.description,
  category: "navigation" as const,
  keywords: r.keywords,
  path: r.path,
  icon: r.icon,
  priority: r.priority,
}));

// Quick create actions (manually defined — not routes)
const CREATE_COMMANDS: CommandAction[] = [
  { id: "create-deal", label: "Create New Deal", description: "Start a new deal in the pipeline", category: "create", keywords: ["new deal", "add deal", "start deal", "create deal"], actionId: "createDeal", icon: "Plus", priority: 55 },
  { id: "create-entity", label: "Create New Entity", description: "Create a fund entity, sidecar, or SPV", category: "create", keywords: ["new entity", "new fund", "new spv", "new sidecar", "create entity", "add fund"], actionId: "createEntity", icon: "Plus", priority: 53 },
  { id: "create-investor", label: "Add Investor", description: "Add a new LP investor", category: "create", keywords: ["new investor", "add investor", "add lp", "create investor"], actionId: "createInvestor", icon: "Plus", priority: 51 },
  { id: "create-task", label: "Create Task", description: "Create a new task", category: "create", keywords: ["new task", "add task", "create task", "todo"], path: "/tasks", icon: "Plus", priority: 50 },
  { id: "create-meeting", label: "Log Meeting", description: "Log a new meeting or IC session", category: "create", keywords: ["new meeting", "log meeting", "add meeting", "ic session"], actionId: "createMeeting", icon: "Plus", priority: 48 },
  { id: "create-company", label: "Add Company", description: "Add a company to the directory", category: "create", keywords: ["new company", "add company", "create company"], path: "/directory?tab=companies", icon: "Plus", priority: 46 },
  { id: "create-contact", label: "Add Contact", description: "Add a contact to the directory", category: "create", keywords: ["new contact", "add contact", "add person", "create contact"], path: "/directory?tab=contacts", icon: "Plus", priority: 44 },
];

// All navigable routes and quick actions in Atlas
export const ATLAS_COMMANDS: CommandAction[] = [...NAV_COMMANDS, ...CREATE_COMMANDS];

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
export { getModuleRoutes } from "./routes";
