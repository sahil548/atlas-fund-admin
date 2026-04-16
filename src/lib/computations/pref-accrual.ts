/**
 * Preferred-return accrual helpers.
 *
 * Pure functions extracted from `src/app/api/waterfall-templates/[id]/calculate/route.ts`
 * to make the day-count conventions and segment-walk logic independently testable.
 *
 * Conventions (matching Kathryn's manual Excel waterfall for CG Private Credit Fund II):
 *  - 30/360 day count
 *  - Intermediate segments: exclusive of end date (no double-count at boundaries)
 *  - Final segment (up to distribution date): inclusive of both endpoints
 *  - ROC events step down the PIC base effective the first day of the month FOLLOWING
 *    the distribution date (e.g. Oct 21 ROC → Nov 1 effective)
 *
 * The route currently inlines equivalent logic. When that is refactored to import
 * from this module, the two implementations must stay in sync — these tests are
 * the canonical source of truth for the math.
 */

/**
 * Standard NASD 30/360 day count between two dates, EXCLUSIVE of the end date.
 * Used for intermediate pref-accrual segments where the end of one segment is
 * the start of the next (avoids double-counting boundary days).
 *
 * Convention:
 *  - Every month is 30 days
 *  - Every year is 360 days
 *  - Day 31 is treated as day 30 (capped)
 *  - If `from` day is 30 and `to` day is 31, `to` is clamped to 30
 */
export function days360Exclusive(from: Date, to: Date): number {
  const y1 = from.getUTCFullYear();
  const m1 = from.getUTCMonth() + 1;
  const d1raw = from.getUTCDate();
  const y2 = to.getUTCFullYear();
  const m2 = to.getUTCMonth() + 1;
  const d2raw = to.getUTCDate();
  const d1 = Math.min(d1raw, 30);
  const d2 = d1 === 30 && d2raw === 31 ? 30 : Math.min(d2raw, 30);
  return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
}

/**
 * Inclusive 30/360 day count (both endpoints count).
 *
 * Matches the manual Excel waterfall convention where a contribution on day N
 * earns a full day of pref on day N, and a distribution on day M collects pref
 * on day M. Used for the final segment running up to the distribution date.
 *
 * Equivalent to `days360Exclusive + 1` when from < to; 0 otherwise.
 */
export function days360Inclusive(from: Date, to: Date): number {
  const base = days360Exclusive(from, to);
  return base > 0 ? base + 1 : 0;
}

/**
 * A PIC-changing event on the fund's timeline.
 */
export interface PicEvent {
  /** Effective date on which this event changes the running PIC base. */
  date: Date;
  /** Positive for a contribution; negative for a return-of-capital step-down. */
  amount: number;
  kind: "contribution" | "roc";
  /** Human-readable label for debug output (e.g., investor name + call number). */
  label: string;
}

/**
 * Result of walking one segment of the PIC timeline.
 */
export interface PrefSegment {
  segmentStart: Date;
  /** Inclusive end of the segment for the final segment; day-before-next-event otherwise. */
  segmentEnd: Date;
  /** 30/360 day count over the segment (exclusive for intermediate, inclusive for final). */
  days: number;
  /** Running PIC balance that accrues pref over this segment. */
  balance: number;
  /** Pref accrued over this segment at the hurdle rate. */
  prefAccrued: number;
  eventKind: "contribution" | "roc";
  eventLabel: string;
}

/**
 * Convert a ROC distribution date to its PIC-step-down effective date.
 *
 * The Excel convention is that a ROC distribution on any day of month M flows into
 * the pref base starting the first day of month M+1. This avoids partial-month
 * accruals on a capital base that changed mid-month.
 *
 * Example: Oct 21 2025 ROC → Nov 1 2025 effective.
 */
export function rocEffectiveDate(distributionDate: Date): Date {
  const d = new Date(distributionDate);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/**
 * Input contribution tranche (typically a Funded capital call line item).
 */
export interface ContributionTranche {
  /** Date pref accrual begins (paidDate falling back to callDate). */
  startDate: Date;
  amount: number;
  label?: string;
}

/**
 * Input ROC distribution record.
 */
export interface RocDistribution {
  distributionDate: Date;
  returnOfCapital: number;
  label?: string;
}

/**
 * Build the chronological PIC-event timeline from contributions and ROC events.
 *
 * ROC events that would become effective on/after `distDate` are skipped — they
 * haven't had time to flow into the pref base for the current calculation.
 */
export function buildPicTimeline(
  contributions: ContributionTranche[],
  rocDistributions: RocDistribution[],
  distDate: Date,
): PicEvent[] {
  const events: PicEvent[] = [];

  for (const c of contributions) {
    if (!c.startDate || c.amount <= 0) continue;
    events.push({
      date: new Date(c.startDate),
      amount: c.amount,
      kind: "contribution",
      label: c.label ?? "contribution",
    });
  }

  for (const r of rocDistributions) {
    if (!r.distributionDate || r.returnOfCapital <= 0) continue;
    const eff = rocEffectiveDate(r.distributionDate);
    if (eff.getTime() >= distDate.getTime()) continue;
    events.push({
      date: eff,
      amount: -r.returnOfCapital,
      kind: "roc",
      label: r.label ?? "ROC",
    });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

/**
 * Walk the PIC timeline segment-by-segment and accrue pref at `hurdleRate`.
 *
 * Returns the cumulative pref and a per-segment breakdown suitable for debug display.
 *
 * @param events Sorted PIC events (use `buildPicTimeline` to produce this)
 * @param distDate Target distribution date — final segment runs inclusive up to here
 * @param hurdleRate Fractional annual rate (e.g., 0.08 for 8%)
 */
export function computePrefSegments(
  events: PicEvent[],
  distDate: Date,
  hurdleRate: number,
): { cumulativePrefAccrued: number; segments: PrefSegment[] } {
  let runningBalance = 0;
  let cumulativePrefAccrued = 0;
  const segments: PrefSegment[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    runningBalance += ev.amount;
    if (runningBalance <= 0) continue;

    const segStart = ev.date;
    const isLast = i === events.length - 1;
    const nextDate = isLast ? distDate : events[i + 1].date;

    const days = isLast
      ? Math.max(0, days360Inclusive(segStart, distDate))
      : Math.max(0, days360Exclusive(segStart, nextDate));

    if (days <= 0) continue;

    const pref = runningBalance * hurdleRate * (days / 360);
    cumulativePrefAccrued += pref;

    segments.push({
      segmentStart: segStart,
      segmentEnd: isLast ? distDate : new Date(nextDate.getTime() - 86_400_000),
      days,
      balance: runningBalance,
      prefAccrued: pref,
      eventKind: ev.kind,
      eventLabel: ev.label,
    });
  }

  return { cumulativePrefAccrued, segments };
}

/**
 * Compute the prior-distribution amount that offsets accrued pref.
 *
 * Return-of-capital repays principal, not pref — only the non-ROC portion of
 * prior LP distributions (income + gains) reduces the accrued-pref balance.
 */
export function prefOffsetFromPriorDistributions(
  priorDistributions: Array<{ grossAmount: number; returnOfCapital: number | null | undefined }>,
): number {
  return priorDistributions.reduce(
    (s, li) => s + Math.max(0, li.grossAmount - (li.returnOfCapital ?? 0)),
    0,
  );
}
