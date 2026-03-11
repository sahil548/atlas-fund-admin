// Structured logger utility for Atlas
// - error and warn: always log (dev + prod)
// - info and debug: only log in development
// Usage: import { logger } from "@/lib/logger";

const isDev = process.env.NODE_ENV !== "production";

type LogMeta = Record<string, unknown> | string | number | undefined;

export const logger = {
  error: (msg: string, meta?: LogMeta) => {
    console.error(`[ERROR] ${msg}`, meta ?? "");
  },
  warn: (msg: string, meta?: LogMeta) => {
    console.warn(`[WARN] ${msg}`, meta ?? "");
  },
  info: (msg: string, meta?: LogMeta) => {
    if (isDev) console.log(`[INFO] ${msg}`, meta ?? "");
  },
  debug: (msg: string, meta?: LogMeta) => {
    if (isDev) console.log(`[DEBUG] ${msg}`, meta ?? "");
  },
};
