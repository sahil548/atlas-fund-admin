"use client";

/**
 * Plaid Link launcher.
 *
 * Flow:
 *   1. Fetches a link_token from the caller-supplied endpoint (which scopes
 *      the token to either an investor or an entity).
 *   2. Opens Plaid Link.
 *   3. On success, calls onSuccess(publicToken, metadata) — the parent is
 *      responsible for POSTing the public_token + account_id to the server
 *      exchange endpoint.
 */

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";

interface PlaidLinkButtonProps {
  linkTokenUrl: string; // POST endpoint that returns { link_token }
  onLinked: (args: { publicToken: string; accountId: string; institutionName: string | null; accountName: string | null; mask: string | null }) => void | Promise<void>;
  disabled?: boolean;
  label?: string;
  variant?: "primary" | "secondary";
}

export function PlaidLinkButton({
  linkTokenUrl,
  onLinked,
  disabled,
  label = "Add Bank Account",
  variant = "primary",
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(linkTokenUrl, { method: "POST" });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error ?? "Failed to get link token");
      setLinkToken(body.link_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [linkTokenUrl]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      // metadata.accounts is an array; if user selected exactly one, use it.
      // If multiple, parent can handle selection, but for Auth typically 1.
      const acct = metadata.accounts?.[0];
      if (!acct) {
        setError("No account selected in Plaid Link");
        return;
      }
      await onLinked({
        publicToken,
        accountId: acct.id,
        institutionName: metadata.institution?.name ?? null,
        accountName: acct.name ?? null,
        mask: acct.mask ?? null,
      });
      // Refresh token so the user can link another account without page reload
      setLinkToken(null);
      fetchToken();
    },
    onExit: (err) => {
      if (err) setError(err.display_message ?? err.error_message ?? "Plaid exited with error");
    },
  });

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        onClick={() => open()}
        disabled={disabled || loading || !ready || !linkToken}
        variant={variant}
      >
        {loading ? "Preparing…" : label}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
