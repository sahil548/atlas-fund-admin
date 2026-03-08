/**
 * Shared notification type constants.
 * Extracted from src/app/api/notifications/route.ts for testability.
 */

export const VALID_TYPES = new Set<string>([
  "STAGE_CHANGE",
  "IC_VOTE",
  "DOCUMENT_UPLOAD",
  "CAPITAL_CALL",
  "TASK_ASSIGNED",
  "CLOSING_UPDATE",
  "GENERAL",
  "DISTRIBUTION",
  "REPORT",
]);
