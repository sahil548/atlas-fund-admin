/**
 * Fireflies GraphQL client and transcript parsing utilities.
 * Used by /api/users/[id]/fireflies and /api/meetings/sync routes.
 */

const FIREFLIES_API_URL = "https://api.fireflies.ai/graphql";

const TRANSCRIPTS_QUERY = `
  query Transcripts {
    transcripts {
      id
      title
      date
      duration
      summary {
        overview
        action_items
        keywords
      }
      sentences {
        text
        speaker_name
      }
      organizer_email
      participants
    }
  }
`;

const USER_QUERY = `
  query User {
    user {
      email
      name
    }
  }
`;

// ── GraphQL helpers ─────────────────────────────────────

interface FirefliesUser {
  email: string;
  name: string;
}

interface FirefliesTranscriptSummary {
  overview?: string | null;
  action_items?: string | null;
  keywords?: string[] | null;
}

interface FirefliesSentence {
  text: string;
  speaker_name: string;
}

export interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  duration?: number | null;
  summary?: FirefliesTranscriptSummary | null;
  sentences?: FirefliesSentence[] | null;
  organizer_email?: string | null;
  participants?: string[] | null;
}

async function graphqlRequest<T>(
  apiKey: string,
  query: string,
  dataKey: string
): Promise<T> {
  const res = await fetch(FIREFLIES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(
      `Fireflies API request failed with status ${res.status}: ${res.statusText}`
    );
  }

  const json = await res.json();

  if (json.errors && json.errors.length > 0) {
    const errorMessages = json.errors
      .map((e: { message: string }) => e.message)
      .join(", ");
    throw new Error(`Fireflies API error: ${errorMessages}`);
  }

  if (!json.data || json.data[dataKey] === undefined) {
    throw new Error(`Fireflies API returned no data for key "${dataKey}"`);
  }

  return json.data[dataKey] as T;
}

/**
 * Validate a Fireflies API key by calling the User query.
 * Returns the user's email and name, or throws if the key is invalid.
 */
export async function fetchFirefliesUser(
  apiKey: string
): Promise<FirefliesUser> {
  return graphqlRequest<FirefliesUser>(apiKey, USER_QUERY, "user");
}

/**
 * Fetch all transcripts from a connected Fireflies account.
 * Returns an array of transcript objects with summaries and sentences.
 */
export async function fetchTranscripts(
  apiKey: string
): Promise<FirefliesTranscript[]> {
  return graphqlRequest<FirefliesTranscript[]>(
    apiKey,
    TRANSCRIPTS_QUERY,
    "transcripts"
  );
}

// ── Parsing utilities ───────────────────────────────────

/**
 * Parse the raw action_items string from Fireflies transcript summary.
 * Splits on newlines, strips numbered prefixes (1. or 1)), and filters
 * out lines shorter than 4 characters.
 *
 * @param actionItemsText - Raw action_items string from Fireflies, or null
 * @returns Array of cleaned action item strings
 */
export function parseActionItems(
  actionItemsText: string | null
): string[] {
  if (!actionItemsText) return [];

  return actionItemsText
    .split("\n")
    .map((line) => line.trim())
    // Strip numbered prefixes: "1. ", "1) ", "10. ", "10) "
    .map((line) => line.replace(/^\d+[.)]\s*/, "").trim())
    .filter((line) => line.length >= 4);
}

/**
 * Extract decision-like statements from a transcript overview.
 * Simple implementation — returns empty array for now.
 * Plan 06 AI linking will enhance this.
 *
 * @param overview - Raw overview string from Fireflies, or null
 * @returns Array of decision strings (currently always empty)
 */
export function parseDecisions(overview: string | null): string[] {
  if (!overview) return [];
  // Simple implementation: return empty array.
  // Plan 06 will use AI to extract decisions from meeting transcripts.
  return [];
}
