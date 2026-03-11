/**
 * Google Calendar integration client.
 * Uses raw fetch to Google Calendar API v3.
 * Bidirectional sync: Atlas meetings <-> Google Calendar events.
 */

import type { IntegrationConnection } from "@prisma/client";
import { logger } from "@/lib/logger";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export interface AtlasMeeting {
  id: string;
  title: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  description?: string | null;
  location?: string | null;
}

export interface AtlasTaskForCalendar {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  description?: string | null;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
  htmlLink?: string;
}

function getGoogleBasicCredentials(): { clientId: string; clientSecret: string } {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  };
}

function expiresAtFromSeconds(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

export class GoogleCalendarClient {
  private connection: IntegrationConnection;

  constructor(connection: IntegrationConnection) {
    this.connection = connection;
  }

  /**
   * Build Google OAuth2 authorization URL.
   */
  static getAuthUrl(firmId: string): string {
    const { clientId } = getGoogleBasicCredentials();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
    const redirectUri = `${appUrl}/api/integrations/google-calendar/callback`;
    const nonce = crypto.randomUUID();
    const state = Buffer.from(JSON.stringify({ firmId, nonce })).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_CALENDAR_SCOPE,
      state,
      access_type: "offline",
      prompt: "consent", // force refresh_token on every auth
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access + refresh tokens.
   */
  static async exchangeCode(
    code: string,
    _firmId: string
  ): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date;
  }> {
    const { clientId, clientSecret } = getGoogleBasicCredentials();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
    const redirectUri = `${appUrl}/api/integrations/google-calendar/callback`;

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code,
    });

    const resp = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Google token exchange failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: expiresAtFromSeconds(data.expires_in ?? 3600),
    };
  }

  /**
   * Refresh access token if expired (within 5 minutes of expiry).
   * Mutates and returns the updated connection tokens.
   */
  async refreshTokenIfNeeded(): Promise<{ accessToken: string; expiresAt: Date } | null> {
    if (!this.connection.tokenExpiry) return null;

    const expiresAt = new Date(this.connection.tokenExpiry);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      // Token is still valid
      return null;
    }

    if (!this.connection.refreshToken) {
      throw new Error("Google token expired and no refresh token available. Please reconnect.");
    }

    const { clientId, clientSecret } = getGoogleBasicCredentials();

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: this.connection.refreshToken,
    });

    const resp = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Google token refresh failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();
    const newExpiresAt = expiresAtFromSeconds(data.expires_in ?? 3600);

    // Update in-memory connection token
    this.connection.accessToken = data.access_token;
    this.connection.tokenExpiry = newExpiresAt;

    return { accessToken: data.access_token, expiresAt: newExpiresAt };
  }

  private async apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${GOOGLE_CALENDAR_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.connection.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });
  }

  /**
   * List events from a calendar within a time range.
   */
  async listEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<GoogleCalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const resp = await this.apiFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Google Calendar listEvents failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();
    return (data.items ?? []) as GoogleCalendarEvent[];
  }

  /**
   * Create a single event in a calendar.
   */
  async createEvent(
    calendarId: string,
    event: Omit<GoogleCalendarEvent, "id" | "htmlLink">
  ): Promise<GoogleCalendarEvent> {
    const resp = await this.apiFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        body: JSON.stringify(event),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Google Calendar createEvent failed (${resp.status}): ${text}`);
    }

    return resp.json() as Promise<GoogleCalendarEvent>;
  }

  /**
   * Push Atlas meetings to Google Calendar (primary calendar).
   */
  async syncMeetings(
    meetings: AtlasMeeting[]
  ): Promise<{ synced: number; errors: number }> {
    const calendarId = "primary";
    let synced = 0;
    let errors = 0;

    for (const meeting of meetings) {
      try {
        await this.createEvent(calendarId, {
          summary: meeting.title,
          description: meeting.description
            ? `${meeting.description}\n\nAtlas Meeting ID: ${meeting.id}`
            : `Atlas Meeting ID: ${meeting.id}`,
          location: meeting.location ?? undefined,
          start: { dateTime: meeting.startTime },
          end: { dateTime: meeting.endTime },
        });
        synced++;
      } catch (err) {
        errors++;
        logger.error(`[google-calendar] Error syncing meeting ${meeting.id}`, { error: err instanceof Error ? err.message : String(err) });
      }
    }

    return { synced, errors };
  }

  /**
   * Create all-day Google Calendar events for Atlas task due dates.
   */
  async syncTaskDueDates(
    tasks: AtlasTaskForCalendar[]
  ): Promise<{ synced: number; errors: number }> {
    const calendarId = "primary";
    let synced = 0;
    let errors = 0;

    for (const task of tasks) {
      try {
        // All-day event on the due date
        const nextDay = new Date(task.dueDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const endDate = nextDay.toISOString().split("T")[0];

        await this.createEvent(calendarId, {
          summary: `Due: ${task.title}`,
          description: task.description
            ? `${task.description}\n\nAtlas Task ID: ${task.id}`
            : `Atlas Task ID: ${task.id}`,
          start: { date: task.dueDate },
          end: { date: endDate },
        });
        synced++;
      } catch (err) {
        errors++;
        logger.error(`[google-calendar] Error syncing task due date ${task.id}`, { error: err instanceof Error ? err.message : String(err) });
      }
    }

    return { synced, errors };
  }
}

/** Exported standalone functions for convenience */
export async function syncMeetings(
  connection: IntegrationConnection,
  meetings: AtlasMeeting[]
): Promise<{ synced: number; errors: number }> {
  const client = new GoogleCalendarClient(connection);
  return client.syncMeetings(meetings);
}

export async function syncTaskDueDates(
  connection: IntegrationConnection,
  tasks: AtlasTaskForCalendar[]
): Promise<{ synced: number; errors: number }> {
  const client = new GoogleCalendarClient(connection);
  return client.syncTaskDueDates(tasks);
}
