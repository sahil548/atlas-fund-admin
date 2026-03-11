/**
 * Notion integration client.
 * Uses raw fetch with Authorization: Bearer and Notion-Version headers.
 * Supports bidirectional sync: Atlas deal data <-> Notion database rows.
 */

import type { IntegrationConnection } from "@prisma/client";
import { logger } from "@/lib/logger";

const NOTION_AUTH_URL = "https://api.notion.com/v1/oauth/authorize";
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";
const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export interface NotionDealData {
  id: string;
  name: string;
  stage: string;
  status: string;
  assetClass?: string | null;
  description?: string | null;
}

export interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
  url: string;
  created_time: string;
  last_edited_time: string;
}

function getNotionBasicAuth(): string {
  const clientId = process.env.NOTION_CLIENT_ID ?? "";
  const clientSecret = process.env.NOTION_CLIENT_SECRET ?? "";
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export class NotionClient {
  private connection: IntegrationConnection;

  constructor(connection: IntegrationConnection) {
    this.connection = connection;
  }

  /**
   * Build Notion OAuth2 authorization URL.
   */
  static getAuthUrl(firmId: string): string {
    const clientId = process.env.NOTION_CLIENT_ID ?? "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
    const redirectUri = `${appUrl}/api/integrations/notion/callback`;
    const nonce = crypto.randomUUID();
    const state = Buffer.from(JSON.stringify({ firmId, nonce })).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      owner: "user",
      state,
    });

    return `${NOTION_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token.
   * Notion uses standard OAuth2 code flow (no refresh tokens — tokens don't expire).
   */
  static async exchangeCode(
    code: string,
    _firmId: string
  ): Promise<{
    accessToken: string;
    workspaceId: string | null;
    workspaceName: string | null;
    botId: string | null;
  }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
    const redirectUri = `${appUrl}/api/integrations/notion/callback`;

    const body = JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const resp = await fetch(NOTION_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: getNotionBasicAuth(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Notion token exchange failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();

    return {
      accessToken: data.access_token,
      workspaceId: data.workspace_id ?? null,
      workspaceName: data.workspace_name ?? null,
      botId: data.bot_id ?? null,
    };
  }

  private async apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${NOTION_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.connection.accessToken}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });
  }

  /**
   * Search for databases the integration has access to.
   */
  async listDatabases(): Promise<Array<{ id: string; title: string; url: string }>> {
    const resp = await this.apiFetch("/search", {
      method: "POST",
      body: JSON.stringify({
        filter: { value: "database", property: "object" },
        sort: { direction: "descending", timestamp: "last_edited_time" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Notion listDatabases failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();
    const results = data.results ?? [];

    return results.map((db: Record<string, unknown>) => ({
      id: db.id as string,
      title:
        (db.title as Array<{ plain_text: string }>)?.[0]?.plain_text ??
        "Untitled",
      url: db.url as string,
    }));
  }

  /**
   * Sync Atlas deal data to Notion. Creates or updates pages in the configured database.
   */
  async syncToNotion(data: NotionDealData[]): Promise<{ synced: number; errors: number }> {
    const metadata = (this.connection.metadata as Record<string, string>) ?? {};
    const databaseId = metadata.databaseId;
    if (!databaseId) {
      throw new Error("No Notion database configured. Set databaseId in connection metadata.");
    }

    let synced = 0;
    let errors = 0;

    for (const deal of data) {
      try {
        const properties: Record<string, unknown> = {
          Name: {
            title: [{ type: "text", text: { content: deal.name } }],
          },
          Stage: {
            select: { name: deal.stage },
          },
          Status: {
            select: { name: deal.status },
          },
          "Atlas Deal ID": {
            rich_text: [{ type: "text", text: { content: deal.id } }],
          },
        };

        if (deal.assetClass) {
          properties["Asset Class"] = { select: { name: deal.assetClass } };
        }

        if (deal.description) {
          properties["Description"] = {
            rich_text: [{ type: "text", text: { content: deal.description.slice(0, 2000) } }],
          };
        }

        const resp = await this.apiFetch("/pages", {
          method: "POST",
          body: JSON.stringify({
            parent: { database_id: databaseId },
            properties,
          }),
        });

        if (resp.ok) {
          synced++;
        } else {
          errors++;
          const errText = await resp.text();
          logger.error(`[notion] Failed to sync deal ${deal.id}`, { status: resp.status, body: errText });
        }
      } catch (err) {
        errors++;
        logger.error(`[notion] Error syncing deal ${deal.id}`, { error: err instanceof Error ? err.message : String(err) });
      }
    }

    return { synced, errors };
  }

  /**
   * Pull pages from Notion database. Returns raw pages for Atlas import.
   */
  async syncFromNotion(databaseId: string): Promise<NotionPage[]> {
    const resp = await this.apiFetch(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({ page_size: 100 }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Notion syncFromNotion failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();
    return (data.results ?? []) as NotionPage[];
  }
}

/** Exported standalone functions for convenience */
export async function syncToNotion(
  connection: IntegrationConnection,
  data: NotionDealData[]
): Promise<{ synced: number; errors: number }> {
  const client = new NotionClient(connection);
  return client.syncToNotion(data);
}

export async function syncFromNotion(
  connection: IntegrationConnection,
  databaseId: string
): Promise<NotionPage[]> {
  const client = new NotionClient(connection);
  return client.syncFromNotion(databaseId);
}
