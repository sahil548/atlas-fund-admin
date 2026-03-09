/**
 * Deal stage auto-task definitions (Phase 14)
 * Pure functions returning task title arrays for each pipeline stage.
 * These are imported by API routes to auto-create tasks on stage transitions.
 */

export interface AutoTask {
  title: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Returns auto-tasks created when a deal enters Due Diligence.
 */
export function getDDAutoTasks(): AutoTask[] {
  return [
    { title: "Request financial statements (3 years)", priority: "HIGH" },
    { title: "Conduct management interviews", priority: "HIGH" },
    { title: "Review legal structure and cap table", priority: "HIGH" },
    { title: "Perform background checks on key personnel", priority: "MEDIUM" },
    { title: "Engage third-party technical/operational diligence", priority: "MEDIUM" },
  ];
}

/**
 * Returns auto-tasks created when a deal enters Closing.
 */
export function getClosingAutoTasks(): AutoTask[] {
  return [
    { title: "Draft and circulate term sheet / SPA", priority: "HIGH" },
    { title: "Obtain board / LP approval", priority: "HIGH" },
    { title: "Wire transfer and confirm receipt", priority: "HIGH" },
    { title: "File regulatory notifications", priority: "MEDIUM" },
    { title: "Update cap table post-close", priority: "MEDIUM" },
  ];
}

/**
 * Returns auto-tasks created when an asset is exited.
 */
export function getExitAutoTasks(): AutoTask[] {
  return [
    { title: "File final tax documents", priority: "HIGH" },
    { title: "Distribute exit proceeds to LPs", priority: "HIGH" },
    { title: "Update cap table and ownership records", priority: "HIGH" },
    { title: "Archive deal and asset files", priority: "MEDIUM" },
    { title: "Send exit notice to LPs", priority: "MEDIUM" },
  ];
}
