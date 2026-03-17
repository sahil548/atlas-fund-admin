"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ProspectKanbanBoard } from "@/components/features/fundraising/prospect-kanban-board";
import { CreateProspectForm } from "@/components/features/fundraising/create-prospect-form";
import { CreateRoundForm } from "@/components/features/fundraising/create-round-form";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface Props {
  entityId: string;
}

const EXCLUDED_STATUSES = new Set(["DECLINED", "WITHDRAWN"]);

export function EntityFundraisingTab({ entityId }: Props) {
  const { data, isLoading, mutate } = useSWR(`/api/fundraising?entityId=${entityId}`, fetcher);
  const [activeRoundIdx, setActiveRoundIdx] = useState(0);
  const [showAddRound, setShowAddRound] = useState(false);
  const [showAddProspect, setShowAddProspect] = useState(false);

  if (isLoading || !data) return <div className="text-sm text-gray-400">Loading fundraising data...</div>;

  const rounds: any[] = Array.isArray(data) ? data : data?.data ?? [];

  if (rounds.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="text-sm text-gray-500 mb-3">
          No fundraising rounds yet. Create one to track your investor pipeline.
        </div>
        <Button size="sm" onClick={() => setShowAddRound(true)}>+ Add Round</Button>
        <CreateRoundForm
          open={showAddRound}
          onClose={() => setShowAddRound(false)}
          entityId={entityId}
          onCreated={() => mutate()}
        />
      </div>
    );
  }

  const activeRound = rounds[activeRoundIdx] || rounds[0];
  const prospects: any[] = activeRound?.prospects ?? [];

  const hardCommits = prospects
    .filter((p: any) => p.status === "HARD_COMMIT")
    .reduce((sum: number, p: any) => sum + (p.hardCommitAmount || 0), 0);

  const softCommits = prospects
    .filter((p: any) => p.status === "SOFT_COMMIT")
    .reduce((sum: number, p: any) => sum + (p.softCommitAmount || 0), 0);

  const pipelineTotal = prospects
    .filter((p: any) => !EXCLUDED_STATUSES.has(p.status))
    .reduce((sum: number, p: any) => sum + (p.targetAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        {/* Round selector pills */}
        {rounds.length > 1 && (
          <div className="flex gap-1.5">
            {rounds.map((r: any, i: number) => (
              <button
                key={r.id}
                onClick={() => setActiveRoundIdx(i)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  i === activeRoundIdx
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
        {rounds.length <= 1 && <div />}
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowAddRound(true)}>+ Add Round</Button>
          <Button size="sm" onClick={() => setShowAddProspect(true)}>+ Add Prospect</Button>
        </div>
      </div>

      {/* Pipeline summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Target Raise</div>
          <div className="text-lg font-bold mt-1">{fmt(activeRound.targetAmount || 0)}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Hard Commits</div>
          <div className="text-lg font-bold text-green-600 mt-1">{fmt(hardCommits)}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Soft Commits</div>
          <div className="text-lg font-bold text-blue-600 mt-1">{fmt(softCommits)}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pipeline Total</div>
          <div className="text-lg font-bold text-amber-600 mt-1">{fmt(pipelineTotal)}</div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold mb-4">Fundraising Pipeline</h3>
        <ProspectKanbanBoard prospects={prospects} />
      </div>

      {/* Modals */}
      <CreateRoundForm
        open={showAddRound}
        onClose={() => setShowAddRound(false)}
        entityId={entityId}
        onCreated={() => mutate()}
      />
      {activeRound && (
        <CreateProspectForm
          open={showAddProspect}
          onClose={() => setShowAddProspect(false)}
          roundId={activeRound.id}
          onCreated={() => mutate()}
        />
      )}
    </div>
  );
}
