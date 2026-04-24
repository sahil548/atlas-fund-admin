"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInvestor } from "@/components/providers/investor-provider";
import { useToast } from "@/components/ui/toast";
import { PlaidLinkButton } from "@/components/features/banking/plaid-link-button";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface PaymentMethod {
  id: string;
  dwollaFundingSourceId: string;
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

export default function LPBankingPage() {
  const { investorId } = useInvestor();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const listUrl = investorId ? `/api/investors/${investorId}/payment-methods` : null;
  const { data, isLoading, mutate } = useSWR<{ paymentMethods: PaymentMethod[] }>(listUrl, fetcher);

  const methods = data?.paymentMethods ?? [];

  async function handleLinked(args: { publicToken: string; accountId: string; institutionName: string | null; accountName: string | null }) {
    if (!investorId) return;
    try {
      const resp = await fetch(`/api/investors/${investorId}/payment-methods/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken: args.publicToken,
          accountId: args.accountId,
          nickname: args.accountName ?? undefined,
        }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error ?? "Failed to link account");
      toast.success(`${args.institutionName ?? "Account"} added.`);
      mutate();
    } catch (e) {
      toast.error(
        "Could not link account: " + (e instanceof Error ? e.message : "Unknown error"),
      );
    }
  }

  async function setDefault(pmId: string) {
    if (!investorId) return;
    setBusyId(pmId);
    try {
      const resp = await fetch(`/api/investors/${investorId}/payment-methods/${pmId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!resp.ok) throw new Error("Failed");
      await mutate();
      toast.success("Default account updated");
    } catch {
      toast.error("Could not update default");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(pmId: string) {
    if (!investorId) return;
    if (!confirm("Remove this bank account? You can always link it again.")) return;
    setBusyId(pmId);
    try {
      const resp = await fetch(`/api/investors/${investorId}/payment-methods/${pmId}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error("Failed");
      await mutate();
      toast.success("Bank account removed");
    } catch {
      toast.error("Could not remove account");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Banking</h1>
        <p className="text-sm text-gray-500 mt-1">
          Link a bank account to receive distributions by ACH. Your account details are
          secured by your bank and Plaid — Atlas never sees your routing or account number.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Linked Accounts</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Distributions go to your default account unless you select another.
            </p>
          </div>
          {investorId && (
            <PlaidLinkButton
              linkTokenUrl={`/api/investors/${investorId}/payment-methods/link-token`}
              onLinked={handleLinked}
              label="+ Add Bank Account"
            />
          )}
        </div>

        {isLoading && <div className="text-sm text-gray-400">Loading…</div>}

        {!isLoading && methods.length === 0 && (
          <div className="text-sm text-gray-500 italic py-6 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded">
            No bank accounts linked yet. Click <span className="font-medium">Add Bank Account</span> to get started.
          </div>
        )}

        {!isLoading && methods.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {methods.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {m.accountNickname ?? m.bankName}
                    </span>
                    {m.isDefault && (
                      <Badge color="indigo">Default</Badge>
                    )}
                    <Badge color={statusColor[m.status] ?? "gray"}>{m.status.toLowerCase()}</Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {m.bankName}
                    {m.last4 && ` • ••••${m.last4}`}
                    {m.accountType && ` • ${m.accountType}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!m.isDefault && (
                    <Button size="sm" variant="secondary" onClick={() => setDefault(m.id)} disabled={busyId === m.id}>
                      Set Default
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(m.id)} disabled={busyId === m.id}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
        <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">How it works</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You authenticate with your bank via Plaid to link an account — Atlas never sees your credentials or account number.</li>
          <li>Dwolla receives a secure token from Plaid to process ACH transfers on your behalf.</li>
          <li>Incoming distributions arrive in 1–3 business days.</li>
          <li>You can remove a linked account at any time.</li>
        </ul>
      </div>
    </div>
  );
}
