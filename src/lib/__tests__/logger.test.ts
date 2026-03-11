import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Test the logger utility behavior:
// - error and warn: always log in both dev and prod
// - info and debug: only log when NODE_ENV !== "production"

describe("logger — error level", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls console.error with [ERROR] prefix", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { logger } = await import("../logger");
    logger.error("something failed");
    expect(console.error).toHaveBeenCalledWith("[ERROR] something failed", "");
  });

  it("calls console.error with meta when provided", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { logger } = await import("../logger");
    const meta = { code: 500 };
    logger.error("database error", meta);
    expect(console.error).toHaveBeenCalledWith("[ERROR] database error", meta);
  });

  it("calls console.error in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    // Re-import to pick up env change
    vi.resetModules();
    const { logger } = await import("../logger");
    logger.error("prod error");
    expect(console.error).toHaveBeenCalledWith("[ERROR] prod error", "");
  });

  it("accepts string meta", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { logger } = await import("../logger");
    logger.error("error msg", "string meta");
    expect(console.error).toHaveBeenCalledWith("[ERROR] error msg", "string meta");
  });

  it("accepts number meta", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { logger } = await import("../logger");
    logger.error("error msg", 42);
    expect(console.error).toHaveBeenCalledWith("[ERROR] error msg", 42);
  });
});

describe("logger — warn level", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls console.warn with [WARN] prefix", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { logger } = await import("../logger");
    logger.warn("deprecation warning");
    expect(console.warn).toHaveBeenCalledWith("[WARN] deprecation warning", "");
  });

  it("calls console.warn with meta when provided", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { logger } = await import("../logger");
    const meta = { field: "email" };
    logger.warn("validation issue", meta);
    expect(console.warn).toHaveBeenCalledWith("[WARN] validation issue", meta);
  });

  it("calls console.warn in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { logger } = await import("../logger");
    logger.warn("prod warning");
    expect(console.warn).toHaveBeenCalledWith("[WARN] prod warning", "");
  });
});

describe("logger — info level", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls console.log with [INFO] prefix in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const { logger } = await import("../logger");
    logger.info("server started");
    expect(console.log).toHaveBeenCalledWith("[INFO] server started", "");
  });

  it("does NOT call console.log in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { logger } = await import("../logger");
    logger.info("server started");
    expect(console.log).not.toHaveBeenCalled();
  });

  it("calls console.log with meta in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const { logger } = await import("../logger");
    const meta = { userId: "user-1" };
    logger.info("user logged in", meta);
    expect(console.log).toHaveBeenCalledWith("[INFO] user logged in", meta);
  });
});

describe("logger — debug level", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls console.log with [DEBUG] prefix in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const { logger } = await import("../logger");
    logger.debug("processing request");
    expect(console.log).toHaveBeenCalledWith("[DEBUG] processing request", "");
  });

  it("does NOT call console.log in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { logger } = await import("../logger");
    logger.debug("verbose debug");
    expect(console.log).not.toHaveBeenCalled();
  });

  it("calls console.log with meta in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const { logger } = await import("../logger");
    const meta = { requestId: "req-abc" };
    logger.debug("processing", meta);
    expect(console.log).toHaveBeenCalledWith("[DEBUG] processing", meta);
  });
});
