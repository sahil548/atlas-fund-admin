// ── Shared Deal Types ────────────────────────────────────────

/** Context object describing a deal for AI analysis prompts */
export interface DealContext {
  dealName: string;
  assetClass: string;
  capitalInstrument?: string | null;
  participationStructure?: string | null;
  sector?: string | null;
  targetSize?: string | null;
  targetCheckSize?: string | null;
  targetReturn?: string | null;
  gpName?: string | null;
  description?: string | null;
  investmentRationale?: string | null;
  additionalContext?: string | null;
  thesisNotes?: string | null;
  documents: { name: string; category: string | null }[];
  notes: { content: string; author: string | null }[];
  documentContents?: { name: string; content: string }[];
}
