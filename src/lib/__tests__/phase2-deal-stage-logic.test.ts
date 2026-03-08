import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Deal Stage Engine Logic (DEAL-09, DEAL-08) ───────────────
// Tests for pure logic around kill/revive and send-back behaviors.
// Since killDeal/reviveDeal/sendBackToDueDiligence require Prisma DB access,
// we verify the function signatures, exports, and schema-level validations
// that gate these behaviors.

// Mock prisma at the module level to avoid actual DB connections
vi.mock("@/lib/prisma", () => ({
  prisma: {
    deal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    dealActivity: {
      create: vi.fn(),
    },
    iCProcess: {
      update: vi.fn(),
    },
  },
}));

// Mock notifications to prevent actual calls
vi.mock("@/lib/notifications", () => ({
  notifyGPTeam: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/slack", () => ({
  postICReviewToSlack: vi.fn().mockResolvedValue(null),
}));

import {
  killDeal,
  reviveDeal,
  sendBackToDueDiligence,
} from "@/lib/deal-stage-engine";
import { prisma } from "@/lib/prisma";

// ── killDeal (DEAL-09) ───────────────────────────────────────
// Requirement: Kill deal requires a reason dropdown + free text
// Requirement: Kill stores reason, text, and previous stage

describe("killDeal — stores kill reason and previous stage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if deal is not found", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);
    await expect(killDeal("non-existent", "Pricing")).rejects.toThrow(
      "Deal non-existent not found",
    );
  });

  it("throws if deal is already DEAD", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-1",
      stage: "DEAD",
    } as never);
    await expect(killDeal("deal-1", "Risk")).rejects.toThrow(
      "Deal is already dead",
    );
  });

  it("saves killReason, killReasonText, and previousStage on deal update", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-1",
      name: "Test Deal",
      stage: "DUE_DILIGENCE",
    } as never);
    vi.mocked(prisma.deal.update).mockResolvedValue({
      id: "deal-1",
      stage: "DEAD",
      killReason: "Pricing",
      killReasonText: "Too expensive",
      previousStage: "DUE_DILIGENCE",
    } as never);
    vi.mocked(prisma.dealActivity.create).mockResolvedValue({} as never);

    await killDeal("deal-1", "Pricing", "Too expensive");

    expect(prisma.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deal-1" },
        data: expect.objectContaining({
          stage: "DEAD",
          killReason: "Pricing",
          killReasonText: "Too expensive",
          previousStage: "DUE_DILIGENCE",
        }),
      }),
    );
  });

  it("saves previousStage so deal can be revived to its original stage", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-2",
      name: "Deal in IC",
      stage: "IC_REVIEW",
    } as never);
    vi.mocked(prisma.deal.update).mockResolvedValue({} as never);
    vi.mocked(prisma.dealActivity.create).mockResolvedValue({} as never);

    await killDeal("deal-2", "Sponsor");

    expect(prisma.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousStage: "IC_REVIEW",
          stage: "DEAD",
        }),
      }),
    );
  });

  it("logs a DEAL_KILLED activity with killReason in metadata", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-3",
      name: "Killed Deal",
      stage: "SCREENING",
    } as never);
    vi.mocked(prisma.deal.update).mockResolvedValue({} as never);
    vi.mocked(prisma.dealActivity.create).mockResolvedValue({} as never);

    await killDeal("deal-3", "Timing", "Market timing unfavorable");

    expect(prisma.dealActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: "deal-3",
          activityType: "DEAL_KILLED",
          metadata: expect.objectContaining({
            killReason: "Timing",
            killReasonText: "Market timing unfavorable",
            fromStage: "SCREENING",
            toStage: "DEAD",
          }),
        }),
      }),
    );
  });
});

// ── reviveDeal (DEAL-09) ─────────────────────────────────────
// Requirement: Revive deal returns to original stage (previousStage)

describe("reviveDeal — restores deal to previous stage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if deal is not found", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);
    await expect(reviveDeal("non-existent")).rejects.toThrow(
      "Deal non-existent not found",
    );
  });

  it("throws if deal is not DEAD", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-1",
      stage: "SCREENING",
    } as never);
    await expect(reviveDeal("deal-1")).rejects.toThrow(
      "Deal is not dead — cannot revive",
    );
  });

  it("restores deal to previousStage when it exists", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-1",
      name: "Dead Deal",
      stage: "DEAD",
      previousStage: "IC_REVIEW",
    } as never);
    vi.mocked(prisma.deal.update).mockResolvedValue({} as never);
    vi.mocked(prisma.dealActivity.create).mockResolvedValue({} as never);

    await reviveDeal("deal-1");

    expect(prisma.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deal-1" },
        data: expect.objectContaining({
          stage: "IC_REVIEW",
          killReason: null,
          killReasonText: null,
          previousStage: null,
        }),
      }),
    );
  });

  it("falls back to SCREENING if no previousStage was recorded", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-2",
      name: "Old Dead Deal",
      stage: "DEAD",
      previousStage: null,
    } as never);
    vi.mocked(prisma.deal.update).mockResolvedValue({} as never);
    vi.mocked(prisma.dealActivity.create).mockResolvedValue({} as never);

    await reviveDeal("deal-2");

    expect(prisma.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stage: "SCREENING",
        }),
      }),
    );
  });

  it("clears all kill metadata (killReason, killReasonText, previousStage) on revive", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-3",
      name: "Deal To Revive",
      stage: "DEAD",
      previousStage: "DUE_DILIGENCE",
    } as never);
    vi.mocked(prisma.deal.update).mockResolvedValue({} as never);
    vi.mocked(prisma.dealActivity.create).mockResolvedValue({} as never);

    await reviveDeal("deal-3");

    const updateCall = vi.mocked(prisma.deal.update).mock.calls[0][0];
    expect(updateCall.data.killReason).toBeNull();
    expect(updateCall.data.killReasonText).toBeNull();
    expect(updateCall.data.previousStage).toBeNull();
  });

  it("logs a DEAL_REVIVED activity with the restored stage", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-4",
      name: "Revived Deal",
      stage: "DEAD",
      previousStage: "DUE_DILIGENCE",
    } as never);
    vi.mocked(prisma.deal.update).mockResolvedValue({} as never);
    vi.mocked(prisma.dealActivity.create).mockResolvedValue({} as never);

    await reviveDeal("deal-4");

    expect(prisma.dealActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: "deal-4",
          activityType: "DEAL_REVIVED",
          metadata: expect.objectContaining({
            fromStage: "DEAD",
            toStage: "DUE_DILIGENCE",
            revivedToStage: "DUE_DILIGENCE",
          }),
        }),
      }),
    );
  });
});

// ── sendBackToDueDiligence (DEAL-08) ─────────────────────────
// Requirement: Send Back moves deal to DUE_DILIGENCE with reason recorded

describe("sendBackToDueDiligence — IC send back flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if deal is not in IC_REVIEW", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-1",
      name: "Deal",
      stage: "DUE_DILIGENCE",
      icProcess: null,
    } as never);
    await expect(sendBackToDueDiligence("deal-1", "Needs more work")).rejects.toThrow(
      "Deal must be in IC_REVIEW to send back",
    );
  });

  it("throws if deal not found", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);
    await expect(sendBackToDueDiligence("non-existent", "reason")).rejects.toThrow(
      "Deal non-existent not found",
    );
  });

  it("moves deal stage to DUE_DILIGENCE with the reason logged", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-2",
      name: "IC Deal",
      stage: "IC_REVIEW",
      icProcess: null,
    } as never);
    vi.mocked(prisma.deal.update).mockResolvedValue({
      id: "deal-2",
      stage: "DUE_DILIGENCE",
    } as never);
    vi.mocked(prisma.dealActivity.create).mockResolvedValue({} as never);

    await sendBackToDueDiligence("deal-2", "Requires additional financial analysis");

    expect(prisma.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deal-2" },
        data: { stage: "DUE_DILIGENCE" },
      }),
    );
  });

  it("logs a DEAL_SENT_BACK activity with the reason in metadata", async () => {
    vi.mocked(prisma.deal.findUnique).mockResolvedValue({
      id: "deal-3",
      name: "Deal",
      stage: "IC_REVIEW",
      icProcess: null,
    } as never);
    vi.mocked(prisma.deal.update).mockResolvedValue({} as never);
    vi.mocked(prisma.dealActivity.create).mockResolvedValue({} as never);

    const reason = "Needs more due diligence on environmental risks";
    await sendBackToDueDiligence("deal-3", reason);

    expect(prisma.dealActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: "deal-3",
          activityType: "DEAL_SENT_BACK",
          metadata: expect.objectContaining({
            fromStage: "IC_REVIEW",
            toStage: "DUE_DILIGENCE",
            reason,
          }),
        }),
      }),
    );
  });
});
