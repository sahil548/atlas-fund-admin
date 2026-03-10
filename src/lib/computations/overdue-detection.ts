/**
 * Determines if a capital call is overdue.
 * Overdue = due date has passed AND status is not FUNDED or PARTIALLY_FUNDED.
 */
export function isOverdue(call: { status: string; dueDate: string | Date }): boolean {
  if (call.status === "FUNDED" || call.status === "PARTIALLY_FUNDED") return false;
  return new Date(call.dueDate) < new Date();
}
