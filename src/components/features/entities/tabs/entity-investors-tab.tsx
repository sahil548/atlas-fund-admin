"use client";

import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { CreateSideLetterForm } from "@/components/features/side-letters/create-side-letter-form";
import { SideLetterRulesPanel } from "@/components/features/side-letters/side-letter-rules-panel";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function EntityInvestorsTab({ entity, entityId }: { entity: any; entityId: string }) {
  const toast = useToast();
  const e = entity;

  const [showCreateSideLetter, setShowCreateSideLetter] = useState(false);
  const [selectedSideLetterId, setSelectedSideLetterId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Committed Investors Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold">Committed Investors ({(e.commitments || []).length})</h3></div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>{["Investor", "Type", "Commitment", "Ownership %", "Called", "Uncalled", "KYC"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(e.commitments || []).map((c: { id: string; amount: number; calledAmount: number; investor: { id: string; name: string; investorType: string; kycStatus: string } }) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-3 py-2.5"><Link href={`/investors/${c.investor.id}`} className="text-indigo-700 hover:underline font-medium">{c.investor.name}</Link></td>
                <td className="px-3 py-2.5"><Badge color="blue">{c.investor.investorType}</Badge></td>
                <td className="px-3 py-2.5 font-medium">{fmt(c.amount)}</td>
                <td className="px-3 py-2.5 font-medium">{((c.amount / (e.totalCommitments || 1)) * 100).toFixed(1)}%</td>
                <td className="px-3 py-2.5">{fmt(c.calledAmount)}</td>
                <td className="px-3 py-2.5">{fmt(c.amount - c.calledAmount)}</td>
                <td className="px-3 py-2.5"><Badge color={c.investor.kycStatus === "Verified" ? "green" : "red"}>{c.investor.kycStatus}</Badge></td>
              </tr>
            ))}
            {(!e.commitments || e.commitments.length === 0) && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">No committed investors.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Side Letters Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Side Letters ({(e.sideLetters || []).length})</h3>
          <Button size="sm" onClick={() => setShowCreateSideLetter(true)}>+ Add Side Letter</Button>
        </div>
        {(e.sideLetters || []).length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No side letters. Add one to track investor-specific terms.</div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {(e.sideLetters || []).map((sl: { id: string; investor: { id: string; name: string }; entity: { id: string; name: string }; terms: string; rules: { id: string; ruleType: string; isActive: boolean }[] }) => (
              <div key={sl.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/investors/${sl.investor.id}`} className="text-xs font-medium text-indigo-700 hover:underline">{sl.investor.name}</Link>
                      {(sl.rules || []).filter((r) => r.isActive).length > 0 && (
                        <Badge color="blue">{(sl.rules || []).filter((r) => r.isActive).length} rule{(sl.rules || []).filter((r) => r.isActive).length !== 1 ? "s" : ""}</Badge>
                      )}
                    </div>
                    {sl.terms && <p className="text-xs text-gray-500 line-clamp-2">{sl.terms}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedSideLetterId(selectedSideLetterId === sl.id ? null : sl.id)}
                  >
                    {selectedSideLetterId === sl.id ? "Hide Rules" : "Manage Rules"}
                  </Button>
                </div>
                {selectedSideLetterId === sl.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <SideLetterRulesPanel
                      sideLetterId={sl.id}
                      investorName={sl.investor.name}
                      entityName={sl.entity.name}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Side Letter Modal */}
      <CreateSideLetterForm
        open={showCreateSideLetter}
        onClose={() => setShowCreateSideLetter(false)}
        onCreated={() => mutate(`/api/entities/${entityId}`)}
      />
    </div>
  );
}
