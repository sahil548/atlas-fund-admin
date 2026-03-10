/**
 * NL Intent Classification — heuristic-based, zero LLM calls.
 *
 * Classifies command bar input into one of three routing categories:
 *  - fuzzy_search: short queries routed to existing fuzzy search engine
 *  - nl_query:     natural language read-only questions routed to AI
 *  - nl_action:    mutation commands routed to AI action execution
 */

export type IntentType = "fuzzy_search" | "nl_query" | "nl_action";

/**
 * Verbs that indicate the user wants to perform a mutation.
 * Sorted by likelihood to appear at the start of a command.
 */
const ACTION_VERBS = [
  "create",
  "add",
  "make",
  "new",
  "update",
  "change",
  "edit",
  "set",
  "delete",
  "remove",
  "archive",
  "kill",
  "assign",
  "log",
  "note",
  "draft",
  "generate",
  "extract",
  "trigger",
  "send",
  "move",
  "advance",
];

/**
 * Phrases that indicate a read-only question or list request.
 */
const QUERY_PHRASES = [
  "show me",
  "show",
  "what's",
  "whats",
  "what",
  "how many",
  "how",
  "which",
  "list",
  "find",
  "where",
  "who",
  "when",
  "total",
  "summarize",
  "give me",
  "tell me",
];

/**
 * Classify user intent for command bar routing.
 * Heuristics-only — no LLM call. Fast and deterministic.
 *
 * Logic:
 * 1. Short queries (≤2 words) without a query phrase → fuzzy_search
 * 2. Starts with an action verb → nl_action
 * 3. Starts with a query phrase → nl_query
 * 4. Fallback for longer ambiguous inputs → nl_query (let AI handle it)
 */
export function classifyIntent(input: string): IntentType {
  const normalized = input.trim().toLowerCase();
  const words = normalized.split(/\s+/);

  // Step 1: Short query check — 1-2 words without any NL signal → fuzzy search
  if (words.length <= 2) {
    const hasQueryPhrase = QUERY_PHRASES.some((p) => normalized.startsWith(p));
    if (!hasQueryPhrase) {
      return "fuzzy_search";
    }
  }

  // Step 2: Action verb check — starts with a mutation verb → nl_action
  if (
    ACTION_VERBS.some(
      (v) => normalized.startsWith(v + " ") || normalized === v,
    )
  ) {
    return "nl_action";
  }

  // Step 3: Query phrase check — starts with a question/list phrase → nl_query
  if (QUERY_PHRASES.some((p) => normalized.startsWith(p))) {
    return "nl_query";
  }

  // Step 4: Fallback — longer inputs without a clear verb → let AI interpret
  return "nl_query";
}

/**
 * Count alerts that were created after the given lastSeenAt timestamp.
 *
 * Used to power the "since your last visit" proactive mention in the command
 * bar footer. Persisted via localStorage — no schema changes needed.
 *
 * @param alerts    Array of items with a createdAt ISO string
 * @param lastSeenAt ISO timestamp of last time GP acknowledged alerts,
 *                   or null if this is their first visit
 * @returns Number of unseen alerts
 */
export function getUnseenAlertCount(
  alerts: Array<{ createdAt: string }>,
  lastSeenAt: string | null,
): number {
  if (alerts.length === 0) return 0;

  // First visit — all alerts are new
  if (lastSeenAt === null) return alerts.length;

  const lastSeenMs = new Date(lastSeenAt).getTime();

  return alerts.filter(
    (alert) => new Date(alert.createdAt).getTime() > lastSeenMs,
  ).length;
}
