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

/** Single account as returned by Plaid Link's onSuccess metadata. */
export interface PlaidLinkedAccount {
  id: string;
  name: string | null;
  mask: string | null;
}

interface PlaidLinkButtonProps {
  linkTokenUrl: string; // POST endpoint that returns { link_token }
  onLinked: (args: {
    publicToken: string;
    accounts: PlaidLinkedAccount[];
    institutionName: string | null;
  }) => void | Promise<void>;
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
      const accounts = (metadata.accounts ?? []).map((a) => ({
        id: a.id,
        name: a.name ?? null,
        mask: a.mask ?? null,
      }));
      if (accounts.length === 0) {
        setError("No accounts selected in Plaid Link");
        return;
      }
      await onLinked({
        publicToken,
        accounts,
        institutionName: metadata.institution?.name ?? null,
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
