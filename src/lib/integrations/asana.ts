/**
 * Asana integration client.
 * Uses raw fetch (no SDK) — consistent with QBO pattern.
 * Supports bidirectional task sync: Atlas tasks <-> Asana tasks.
 */

import type { IntegrationConnection } from "@prisma/client";
import { logger } from "@/lib/logger";

const ASANA_AUTH_URL = "https://app.asana.com/-/oauth_authorize";
const ASANA_TOKEN_URL = "https://app.asana.com/-/oauth_token";
const ASANA_API_BASE = "https://app.asana.com/api/1.0";

export interface AtlasTask {
  id: string;
  title: string;
  status: string; // "OPEN" | "IN_PROGRESS" | "COMPLETE"
  assigneeEmail?: string | null;
  dueDate?: string | null; // ISO date string
}

export interface AsanaTask {
  gid: string;
  name: string;
  completed: boolean;
  due_on: string | null;
  assignee: { gid: string; email?: string; name?: string } | null;
  notes?: string;
}

function getAsanaBasicAuth(): string {
  const clientId = process.env.ASANA_CLIENT_ID ?? "";
  const clientSecret = process.env.ASANA_CLIENT_SECRET ?? "";
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

function expiresAtFromSeconds(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

export class AsanaClient {
  private connection: IntegrationConnection;

  constructor(connection: IntegrationConnection) {
    this.connection = connection;
  }

  /**
   * Build Asana OAuth2 authorization URL.
   * State encodes { firmId, nonce } as base64url JSON.
   */
  static getAuthUrl(firmId: string): string {
    const clientId = process.env.ASANA_CLIENT_ID ?? "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
    const redirectUri = `${appUrl}/api/integrations/asana/callback`;
    const nonce = crypto.randomUUID();
    const state = Buffer.from(JSON.stringify({ firmId, nonce })).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });

    return `${ASANA_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access + refresh tokens.
   * Returns { accessToken, refreshToken, expiresAt, workspaceGid }.
   */
  static async exchangeCode(
    code: string,
    firmId: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    workspaceGid: string | null;
  }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
    const redirectUri = `${appUrl}/api/integrations/asana/callback`;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const resp = await fetch(ASANA_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: getAsanaBasicAuth(),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Asana token exchange failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();

    // Asana token response shape
    const accessToken: string = data.access_token;
    const refreshToken: string = data.refresh_token;
    const expiresIn: number = data.expires_in ?? 3600;
    const expiresAt = expiresAtFromSeconds(expiresIn);

    // Extract default workspace from token data
    const workspaceGid: string | null = data.data?.workspaces?.[0]?.gid ?? null;

    return { accessToken, refreshToken, expiresAt, workspaceGid };
  }

  private async apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${ASANA_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.connection.accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  /** GET /api/1.0/workspaces — list workspaces accessible to the connected user. */
  async listWorkspaces(): Promise<Array<{ gid: string; name: string }>> {
    const resp = await this.apiFetch("/workspaces?opt_fields=gid,name");
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Asana listWorkspaces failed (${resp.status}): ${text}`);
    }
    const data = await resp.json();
    return data.data ?? [];
  }

  /**
   * Push Atlas tasks to Asana. Creates or updates tasks in the configured project.
   * Uses metadata.projectGid from connection to find project.
   */
  async syncTasksToAsana(tasks: AtlasTask[]): Promise<{ synced: number; errors: number }> {
    const metadata = (this.connection.metadata as Record<string, string>) ?? {};
    const projectGid = metadata.projectGid;
    if (!projectGid) {
      throw new Error("No Asana project configured. Set projectGid in connection metadata.");
    }

    let synced = 0;
    let errors = 0;

    for (const task of tasks) {
      try {
        const body = {
          data: {
            name: task.title,
            completed: task.status === "COMPLETE",
            due_on: task.dueDate ?? null,
            projects: [projectGid],
            notes: `Atlas Task ID: ${task.id}`,
          },
        };

        const resp = await this.apiFetch("/tasks", {
          method: "POST",
          body: JSON.stringify(body),
        });

        if (resp.ok) {
          synced++;
        } else {
          errors++;
          logger.error(`[asana] Failed to sync task ${task.id}`, { status: resp.status });
        }
      } catch (err) {
        errors++;
        logger.error(`[asana] Error syncing task ${task.id}`, { error: err instanceof Error ? err.message : String(err) });
      }
    }

    return { synced, errors };
  }

  /**
   * Pull tasks from Asana project. Returns normalized task array for Atlas import.
   */
  async syncTasksFromAsana(projectGid: string): Promise<AsanaTask[]> {
    const fields = "gid,name,completed,due_on,assignee,assignee.email,assignee.name,notes";
    const resp = await this.apiFetch(
      `/projects/${projectGid}/tasks?opt_fields=${fields}&limit=100`
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Asana syncTasksFromAsana failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();
    return (data.data ?? []) as AsanaTask[];
  }
}

/** Exported standalone functions for convenience */
export async function syncTasksToAsana(
  connection: IntegrationConnection,
  tasks: AtlasTask[]
): Promise<{ synced: number; errors: number }> {
  const client = new AsanaClient(connection);
  return client.syncTasksToAsana(tasks);
}

export async function syncTasksFromAsana(
  connection: IntegrationConnection,
  projectGid: string
): Promise<AsanaTask[]> {
  const client = new AsanaClient(connection);
  return client.syncTasksFromAsana(projectGid);
}
