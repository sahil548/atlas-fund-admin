/**
 * Pure utility functions for pipeline summary data transformation.
 * Extracted from the API route to be unit-testable without Prisma/Next.js deps.
 */

const ACTIVE_PIPELINE_STAGES = [
  "SCREENING",
  "DUE_DILIGENCE",
  "IC_REVIEW",
  "CLOSING",
] as const;

type ActiveStage = (typeof ACTIVE_PIPELINE_STAGES)[number];

export interface PipelineStageRow {
  stage: string;
  count: number;
  totalValue: number;
}

/**
 * Raw Prisma groupBy result shape for deals grouped by stage.
 */
export interface RawGroupByStage {
  stage: string;
  _count: { stage: number };
  _sum: { dealValue: number | null };
}

/**
 * Transform Prisma groupBy output into a full ordered stage array.
 *
 * - Includes only the 4 active pipeline stages (SCREENING, DUE_DILIGENCE, IC_REVIEW, CLOSING).
 * - Missing stages are filled with count=0 and totalValue=0.
 * - Null dealValue sums are treated as 0.
 * - DEAD and CLOSED deals are excluded.
 */
export function groupPipelineStages(raw: RawGroupByStage[]): PipelineStageRow[] {
  // Build a lookup from the raw Prisma results
  const lookup = new Map<string, RawGroupByStage>();
  for (const row of raw) {
    lookup.set(row.stage, row);
  }

  return ACTIVE_PIPELINE_STAGES.map((stage) => {
    const row = lookup.get(stage);
    return {
      stage,
      count: row?._count.stage ?? 0,
      totalValue: row?._sum.dealValue ?? 0,
    };
  });
}
