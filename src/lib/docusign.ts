/**
 * DocuSign API client — raw fetch, no SDK.
 * Handles OAuth (authorization URL, code exchange, token refresh),
 * envelope creation, status checks, and document download.
 *
 * Mirrors the QBO OAuth pattern from Phase 5.
 */

import { prisma } from "@/lib/prisma";

// ── Env helpers ────────────────────────────────────────────

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[DocuSign] Missing env var: ${name}`);
  return v;
}

function getIntegrationKey(): string { return env("DOCUSIGN_INTEGRATION_KEY"); }
function getSecretKey(): string { return env("DOCUSIGN_SECRET_KEY"); }
function getOAuthBase(): string { return env("DOCUSIGN_OAUTH_BASE"); }
function getCallbackUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  return `${appUrl}/api/docusign/callback`;
}

// ── Types ──────────────────────────────────────────────────

export interface DocuSignTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  accountId: string;
  baseUri: string;
}

export interface DocuSignSigner {
  name: string;
  email: string;
  role?: string;
}

export interface CreateEnvelopeOptions {
  documentBuffer: Buffer;
  documentName: string;
  signers: DocuSignSigner[];
  subject: string;
}

// ── DocuSignClient ─────────────────────────────────────────

export class DocuSignClient {
  private firmId: string;
  private accessToken: string;
  private refreshToken: string;
  private tokenExpiry: Date;
  private accountId: string;
  private baseUri: string;

  constructor(connection: {
    firmId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiry: Date;
    accountId: string;
    baseUri: string;
  }) {
    this.firmId = connection.firmId;
    this.accessToken = connection.accessToken;
    this.refreshToken = connection.refreshToken;
    this.tokenExpiry = connection.tokenExpiry;
    this.accountId = connection.accountId;
    this.baseUri = connection.baseUri;
  }

  /**
   * Generates the OAuth authorization URL + sets CSRF state.
   * firmId embedded in state so callback knows which firm to connect.
   */
  static getAuthUrl(firmId: string, stateParam: string): string {
    const oAuthBase = getOAuthBase();
    const integrationKey = getIntegrationKey();
    const callbackUrl = getCallbackUrl();
    const params = new URLSearchParams({
      response_type: "code",
      scope: "signature",
      client_id: integrationKey,
      redirect_uri: callbackUrl,
      state: stateParam,
    });
    return `${oAuthBase}/oauth/auth?${params.toString()}`;
  }

  /**
   * Exchanges auth code for access + refresh tokens.
   * Also calls /oauth/userinfo to get accountId and baseUri.
   */
  static async exchangeCode(code: string): Promise<DocuSignTokens> {
    const oAuthBase = getOAuthBase();
    const integrationKey = getIntegrationKey();
    const secretKey = getSecretKey();
    const callbackUrl = getCallbackUrl();

    // Basic auth: base64(integrationKey:secretKey)
    const credentials = Buffer.from(`${integrationKey}:${secretKey}`).toString("base64");

    const tokenRes = await fetch(`${oAuthBase}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`[DocuSign] Token exchange failed: ${tokenRes.status} — ${body}`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
      throw new Error("[DocuSign] Token exchange response missing access_token or refresh_token");
    }

    // Fetch user info to get accountId and baseUri
    const userInfoRes = await fetch(`${oAuthBase}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userInfoRes.ok) {
      throw new Error(`[DocuSign] Failed to fetch userinfo: ${userInfoRes.status}`);
    }

    const userInfo = await userInfoRes.json();
    const account = userInfo.accounts?.[0];
    if (!account) {
      throw new Error("[DocuSign] No accounts found in userinfo response");
    }

    const accountId: string = account.account_id;
    const baseUri: string = account.base_uri;

    const tokenExpiry = new Date(Date.now() + (expires_in ?? 3600) * 1000);

    return { accessToken: access_token, refreshToken: refresh_token, tokenExpiry, accountId, baseUri };
  }

  /**
   * Refreshes access token if it expires within 5 minutes.
   * Updates DB record and in-memory tokens on success.
   */
  async refreshTokenIfNeeded(): Promise<void> {
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (this.tokenExpiry > fiveMinFromNow) return; // still valid

    const oAuthBase = getOAuthBase();
    const integrationKey = getIntegrationKey();
    const secretKey = getSecretKey();
    const credentials = Buffer.from(`${integrationKey}:${secretKey}`).toString("base64");

    const res = await fetch(`${oAuthBase}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[DocuSign] Token refresh failed: ${res.status} — ${body}`);
    }

    const data = await res.json();
    const { access_token, refresh_token, expires_in } = data;

    this.accessToken = access_token;
    this.refreshToken = refresh_token ?? this.refreshToken;
    this.tokenExpiry = new Date(Date.now() + (expires_in ?? 3600) * 1000);

    // Persist updated tokens
    await prisma.docuSignConnection.update({
      where: { firmId: this.firmId },
      data: {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenExpiry: this.tokenExpiry,
      },
    });
  }

  /**
   * Creates a DocuSign envelope and sends it for signature.
   * Returns the envelopeId.
   */
  async createEnvelope(options: CreateEnvelopeOptions): Promise<string> {
    await this.refreshTokenIfNeeded();

    const { documentBuffer, documentName, signers, subject } = options;
    const docBase64 = documentBuffer.toString("base64");

    const signersPayload = signers.map((s, idx) => ({
      email: s.email,
      name: s.name,
      recipientId: String(idx + 1),
      routingOrder: String(idx + 1),
      tabs: {
        signHereTabs: [
          {
            anchorString: "/sig/",
            anchorUnits: "pixels",
            anchorXOffset: "0",
            anchorYOffset: "0",
            // Fallback absolute position if anchor not found
            pageNumber: "1",
            xPosition: "100",
            yPosition: "200",
          },
        ],
      },
    }));

    const body = {
      emailSubject: subject,
      documents: [
        {
          documentBase64: docBase64,
          name: documentName,
          fileExtension: documentName.split(".").pop() || "pdf",
          documentId: "1",
        },
      ],
      recipients: { signers: signersPayload },
      status: "sent",
    };

    const res = await fetch(
      `${this.baseUri}/restapi/v2.1/accounts/${this.accountId}/envelopes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[DocuSign] createEnvelope failed: ${res.status} — ${errText}`);
    }

    const data = await res.json();
    if (!data.envelopeId) throw new Error("[DocuSign] createEnvelope: no envelopeId in response");
    return data.envelopeId as string;
  }

  /**
   * Gets the current status of an envelope.
   */
  async getEnvelopeStatus(envelopeId: string): Promise<string> {
    await this.refreshTokenIfNeeded();

    const res = await fetch(
      `${this.baseUri}/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[DocuSign] getEnvelopeStatus failed: ${res.status} — ${errText}`);
    }

    const data = await res.json();
    return data.status as string;
  }

  /**
   * Downloads the signed document from a completed envelope.
   * Returns a Buffer of the combined PDF.
   */
  async downloadSignedDocument(envelopeId: string): Promise<Buffer> {
    await this.refreshTokenIfNeeded();

    const res = await fetch(
      `${this.baseUri}/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/documents/combined`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[DocuSign] downloadSignedDocument failed: ${res.status} — ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

/**
 * Loads the DocuSignConnection for a firm and returns a ready-to-use client.
 * Returns null if no connection exists.
 */
export async function getDocuSignClient(firmId: string): Promise<DocuSignClient | null> {
  const conn = await prisma.docuSignConnection.findUnique({ where: { firmId } });
  if (!conn) return null;
  return new DocuSignClient(conn);
}
