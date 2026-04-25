"use client";

/**
 * Entity Disbursement Bank section.
 *
 * Appears under the Operations tab of an entity. Lets Kathryn link the bank
 * account used to fund outbound distributions for THIS entity (e.g. PCF II → Citi,
 * Silver Horse → Chase). Each entity can have multiple accounts with one flagged
 * as the default.
 *
 * Linking uses Plaid Link → Dwolla processor token (same flow as investor
 * bank-link), but the Dwolla Verified Business Customer id for the entity must
 * already exist (created manually in the Dwolla dashboard in Phase A; Phase B
 * can automate creation via Dwolla's Verified Customer API).
 */

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { PlaidLinkButton } from "@/components/features/banking/plaid-link-button";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface FundingSource {
  id: string;
  dwollaFundingSourceId: string;
  dwollaCustomerId: string;
  bankName: string;
  accountNickname: string | null;
  accountType: string | null;
  last4: string | null;
  status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REMOVED";
  isDefault: boolean;
  createdAt: string;
}

const statusColor: Record<string, "green" | "yellow" | "gray" | "red"> = {
  VERIFIED: "green",
  PENDING: "yellow",
  UNVERIFIED: "gray",
  REMOVED: "red",
};

export function EntityFundingSourceSection({ entityId }: { entityId: string }) {
  const toast = useToast();
  const listUrl = `/api/entities/${entityId}/funding-sources`;
  const { data, mutate, isLoading } = useSWR<{ fundingSources: FundingSource[] }>(listUrl, fetcher);
  const sources = data?.fundingSources ?? [];

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [dwollaCustomerId, setDwollaCustomerId] = useState("");
  const [nickname, setNickname] = useState("");
  const [pendingLink, setPendingLink] = useState<null | {
    publicToken: string;
    accounts: { id: string; name: string | null; mask: string | null }[];
    institutionName: string | null;
  }>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function submitLink() {
    if (!pendingLink || !dwollaCustomerId.trim()) {
      toast.error("Please enter the Dwolla Verified Customer id for this entity.");
      return;
    }
    if (pendingLink.accounts.length === 0) {
      toast.error("No account selected in Plaid Link.");
      return;
    }
    // Disbursement bank is typically a single operating account — register
    // only the first selected account. (Plaid sandbox often pre-selects all.)
    const account = pendingLink.accounts[0];
    setSubmitting(true);
    try {
      const r = await fetch(listUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dwollaCustomerId: dwollaCustomerId.trim(),
          publicToken: pendingLink.publicToken,
          accountId: account.id,
          accountNickname: nickname.trim() || undefined,
        }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error ?? "Failed to link account");
      toast.success(`Linked ${pendingLink.institutionName ?? "account"}`);
      setLinkModalOpen(false);
      setPendingLink(null);
      setDwollaCustomerId("");
      setNickname("");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not link account");
    } finally {
      setSubmitting(false);
    }
  }

  async function setDefault(id: string) {
    setBusyId(id);
    try {
      const r = await fetch(`${listUrl}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!r.ok) throw new Error("Failed");
      await mutate();
      toast.success("Default updated");
    } catch {
      toast.error("Could not update default");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this funding source?")) return;
    setBusyId(id);
    try {
      const r = await fetch(`${listUrl}/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      await mutate();
      toast.success("Funding source removed");
    } catch {
      toast.error("Could not remove");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Disbursement Bank Accounts</h3>
          <p className="text-xs text-gray-500 mt-1">
            Linked bank accounts used to fund outbound distributions for this entity via ACH (Dwolla).
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={() => setLinkModalOpen(true)}>
          + Link Account
        </Button>
      </div>

      {isLoading && <div className="text-sm text-gray-400">Loading…</div>}

      {!isLoading && sources.length === 0 && (
        <div className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded">
          No disbursement accounts linked. Link one to enable ACH distributions for this entity.
        </div>
      )}

      {!isLoading && sources.length > 0 && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {s.accountNickname ?? s.bankName}
                  </span>
                  {s.isDefault && <Badge color="indigo">Default</Badge>}
                  <Badge color={statusColor[s.status] ?? "gray"}>{s.status.toLowerCase()}</Badge>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {s.bankName}
                  {s.last4 && ` • ••••${s.last4}`}
                  {s.accountType && ` • ${s.accountType}`}
                  {" • "} Dwolla FS: <code className="font-mono">{s.dwollaFundingSourceId.slice(0, 8)}…</code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!s.isDefault && (
                  <Button size="sm" variant="secondary" onClick={() => setDefault(s.id)} disabled={busyId === s.id}>
                    Set Default
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(s.id)} disabled={busyId === s.id}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={linkModalOpen} onClose={() => { setLinkModalOpen(false); setPendingLink(null); }} title="Link Disbursement Bank">
        <div className="space-y-4">
          <FormField label="Dwolla Verified Customer ID">
            <Input
              value={dwollaCustomerId}
              onChange={(e) => setDwollaCustomerId(e.target.value)}
              placeholder="e.g. c7f4a2b8-1234-5678-..."
            />
            <p className="text-[11px] text-gray-400 mt-1">
              The Dwolla customer id for this entity (from the Dwolla dashboard).
              Each fund entity has its own Verified Business Customer.
            </p>
          </FormField>
          <FormField label="Account Nickname (optional)">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. PCF II — Citi Operating"
            />
          </FormField>

          {!pendingLink ? (
            <div className="pt-2">
              <PlaidLinkButton
                linkTokenUrl={`/api/entities/${entityId}/funding-sources/link-token`}
                onLinked={(r) => setPendingLink(r)}
                label="Connect bank via Plaid"
                variant="secondary"
              />
              <p className="text-xs text-gray-400 mt-2">
                Plaid Link will open. After connecting, we&apos;ll register the account with Dwolla
                so Atlas can debit it for outbound distributions.
              </p>
            </div>
          ) : (
            <div className="pt-2 space-y-3">
              <div className="text-sm text-emerald-600 dark:text-emerald-400">
                ✓ Connected via Plaid: {pendingLink.institutionName ?? "Bank"} — {pendingLink.accounts[0]?.name ?? "Account"}
                {pendingLink.accounts.length > 1 && (
                  <span className="block text-[11px] text-amber-600 mt-1">
                    {pendingLink.accounts.length} accounts were selected; only the first will be registered as the disbursement bank.
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={submitLink} disabled={submitting || !dwollaCustomerId.trim()}>
                  {submitting ? "Linking…" : "Save as Funding Source"}
                </Button>
                <Button variant="ghost" onClick={() => setPendingLink(null)} disabled={submitting}>
                  Use a different account
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
