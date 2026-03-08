import { describe, it, expect } from "vitest";
import { UpdateNotificationPreferencesSchema } from "@/lib/schemas";

// LP-03a (P02-T1): Notification preferences Zod schema validates correctly
// Requirement: schema validates channel, email, phone, digest, notificationTypes; partial updates allowed

describe("UpdateNotificationPreferencesSchema — valid full payload accepted", () => {
  it("accepts a complete valid notification preferences payload", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      preferredChannel: "EMAIL",
      emailAddress: "investor@example.com",
      phoneNumber: "1234567890",
      digestPreference: "IMMEDIATE",
      notificationTypes: {
        capitalActivity: true,
        reports: true,
        portfolio: false,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts EMAIL as a valid preferredChannel", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      preferredChannel: "EMAIL",
    });
    expect(result.success).toBe(true);
  });

  it("accepts SMS as a valid preferredChannel", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      preferredChannel: "SMS",
    });
    expect(result.success).toBe(true);
  });

  it("accepts PORTAL_ONLY as a valid preferredChannel", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      preferredChannel: "PORTAL_ONLY",
    });
    expect(result.success).toBe(true);
  });

  it("accepts IMMEDIATE as a valid digestPreference", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      digestPreference: "IMMEDIATE",
    });
    expect(result.success).toBe(true);
  });

  it("accepts DAILY_DIGEST as a valid digestPreference", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      digestPreference: "DAILY_DIGEST",
    });
    expect(result.success).toBe(true);
  });

  it("accepts WEEKLY_DIGEST as a valid digestPreference", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      digestPreference: "WEEKLY_DIGEST",
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateNotificationPreferencesSchema — partial updates allowed", () => {
  it("accepts an empty payload (all fields optional)", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts payload with only preferredChannel set (all others omitted)", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      preferredChannel: "SMS",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.digestPreference).toBeUndefined();
      expect(result.data.emailAddress).toBeUndefined();
    }
  });

  it("accepts payload with only digestPreference set", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      digestPreference: "WEEKLY_DIGEST",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.digestPreference).toBe("WEEKLY_DIGEST");
      expect(result.data.preferredChannel).toBeUndefined();
    }
  });

  it("accepts payload with only notificationTypes set", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      notificationTypes: {
        capitalActivity: false,
        reports: true,
        portfolio: true,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notificationTypes?.capitalActivity).toBe(false);
    }
  });
});

describe("UpdateNotificationPreferencesSchema — invalid email rejects", () => {
  it("rejects emailAddress that is not a valid email format", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      emailAddress: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects emailAddress that is missing the @ sign", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      emailAddress: "investorexample.com",
    });
    expect(result.success).toBe(false);
  });

  it("accepts emailAddress set to null (clearing the email)", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      emailAddress: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emailAddress).toBeNull();
    }
  });

  it("accepts a valid email address", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      emailAddress: "lp.investor@fund.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateNotificationPreferencesSchema — enum validation rejects unknown values", () => {
  it("rejects unknown preferredChannel value", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      preferredChannel: "PUSH_NOTIFICATION",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown digestPreference value", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      digestPreference: "MONTHLY",
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateNotificationPreferencesSchema — phone number validation", () => {
  it("rejects phoneNumber shorter than 10 characters", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      phoneNumber: "123456789",
    });
    expect(result.success).toBe(false);
  });

  it("accepts phoneNumber with exactly 10 characters", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      phoneNumber: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("accepts phoneNumber set to null (clearing the phone)", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      phoneNumber: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phoneNumber).toBeNull();
    }
  });
});

describe("UpdateNotificationPreferencesSchema — notificationTypes defaults", () => {
  it("notificationTypes defaults capitalActivity to true when omitted from the object", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      notificationTypes: {
        reports: false,
        portfolio: false,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notificationTypes?.capitalActivity).toBe(true);
    }
  });

  it("notificationTypes defaults reports to true when omitted from the object", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      notificationTypes: {
        capitalActivity: false,
        portfolio: false,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notificationTypes?.reports).toBe(true);
    }
  });

  it("notificationTypes defaults portfolio to true when omitted from the object", () => {
    const result = UpdateNotificationPreferencesSchema.safeParse({
      notificationTypes: {
        capitalActivity: false,
        reports: false,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notificationTypes?.portfolio).toBe(true);
    }
  });
});
