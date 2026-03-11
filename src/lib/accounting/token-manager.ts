/**
 * OAuth token storage, retrieval, and auto-refresh logic.
 * Reads/writes to AccountingConnection.oauthCredentials JSON field.
 */

import { prisma } from "@/lib/prisma";
import type { OAuthTokens } from "./provider-types";
import { qboProvider } from "./qbo-provider";
import { logger } from "@/lib/logger";

/**
 * Store tokens in DB against the AccountingConnection.
 * Also updates providerCompanyId from tokens.realmId if present.
 */
export async function storeTokens(
  connectionId: string,
  tokens: OAuthTokens
): Promise<void> {
  await prisma.accountingConnection.update({
    where: { id: connectionId },
    data: {
      oauthCredentials: tokens as unknown as import("@prisma/client").Prisma.InputJsonValue,
      ...(tokens.realmId ? { providerCompanyId: tokens.realmId } : {}),
    },
  });
}

/**
 * Get valid tokens for a connection.
 * If the access token is expired, automatically refreshes using the refresh token.
 * If the refresh token is also expired, sets syncStatus ERROR and returns null.
 */
export async function getValidTokens(connectionId: string): Promise<OAuthTokens | null> {
  const connection = await prisma.accountingConnection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      oauthCredentials: true,
      syncStatus: true,
    },
  });

  if (!connection || !connection.oauthCredentials) {
    return null;
  }

  const tokens = connection.oauthCredentials as unknown as OAuthTokens;

  if (!tokens.accessToken || !tokens.refreshToken) {
    return null;
  }

  const now = new Date();

  // Check if refresh token is expired (100-day cycle)
  if (tokens.refreshTokenExpiresAt) {
    const refreshExpiry = new Date(tokens.refreshTokenExpiresAt);
    if (now >= refreshExpiry) {
      // Refresh token expired — user must reconnect
      await prisma.accountingConnection.update({
        where: { id: connectionId },
        data: {
          syncStatus: "ERROR",
          lastSyncError: "OAuth refresh token expired. Please reconnect.",
        },
      });
      return null;
    }
  }

  // Check if access token is expired (1-hour cycle)
  if (tokens.accessTokenExpiresAt) {
    const accessExpiry = new Date(tokens.accessTokenExpiresAt);
    // Add 60-second buffer to avoid borderline expiry
    const expiryWithBuffer = new Date(accessExpiry.getTime() - 60 * 1000);

    if (now >= expiryWithBuffer) {
      // Access token expired — refresh it
      try {
        const newTokens = await qboProvider.refreshAccessToken(tokens.refreshToken);
        // Preserve realmId from existing tokens since refresh doesn't return it
        newTokens.realmId = tokens.realmId;

        await storeTokens(connectionId, newTokens);
        return newTokens;
      } catch (err) {
        logger.error("[token-manager] Failed to refresh access token", { error: err instanceof Error ? err.message : String(err) });
        await prisma.accountingConnection.update({
          where: { id: connectionId },
          data: {
            syncStatus: "ERROR",
            lastSyncError:
              err instanceof Error ? err.message : "Token refresh failed. Please reconnect.",
          },
        });
        return null;
      }
    }
  }

  // Access token is still valid
  return tokens;
}

/**
 * Convenience wrapper: get tokens, refreshing if needed.
 * Returns valid tokens or null if refresh failed / disconnected.
 */
export async function refreshTokensIfNeeded(connectionId: string): Promise<OAuthTokens | null> {
  return getValidTokens(connectionId);
}
