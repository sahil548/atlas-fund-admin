"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { mutate } from "swr";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DealScreeningTabProps {
  deal: any;
}

export function DealScreeningTab({ deal }: DealScreeningTabProps) {
  const toast = useToast();
  const [screeningLoading, setScreeningLoading] = useState(false);
  const canRerun =
    deal.stage === "DUE_DILIGENCE" ||
    deal.stage === "IC_REVIEW" ||
    deal.stage === "CLOSING";

  async function runScreening() {
    setScreeningLoading(true);
    try {
      await fetch(`/api/deals/${deal.id}/screen`, { method: "POST" });
      toast.success("AI screening complete");
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Screening failed");
    } finally {
      setScreeningLoading(false);
    }
  }

  if (!deal.screeningResult) {
    return (
      <div className="py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-purple-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div className="text-sm font-semibold text-purple-900">
          AI Screening not yet run
        </div>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          Run AI screening to auto-analyze and advance to Due Diligence.
        </p>
        <Button loading={screeningLoading} onClick={runScreening}>
          Run AI Screening
        </Button>
      </div>
    );
  }

  const sr = deal.screeningResult;
  const score = sr.score ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`text-2xl font-bold px-4 py-2 rounded-xl ${
              score >= 70
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : score >= 40
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {sr.score}/100
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              AI Screening Score
            </div>
            <div className="text-xs text-gray-500">
              Processed{" "}
              {new Date(sr.processedAt).toLocaleDateString()}
            </div>
          </div>
          {sr.recommendation && (
            <Badge
              color={
                sr.recommendation === "STRONG_PROCEED"
                  ? "green"
                  : sr.recommendation === "PROCEED"
                  ? "blue"
                  : "yellow"
              }
            >
              {sr.recommendation.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
        {canRerun && (
          <Button
            variant="secondary"
            size="sm"
            loading={screeningLoading}
            onClick={runScreening}
          >
            Re-run Screening
          </Button>
        )}
      </div>

      {sr.summary && (
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1">
            Summary
          </div>
          <p className="text-sm text-gray-600">{sr.summary}</p>
        </div>
      )}

      {sr.strengths && (
        <div>
          <div className="text-xs font-semibold text-emerald-700 mb-1">
            Strengths
          </div>
          <ul className="space-y-1">
            {(Array.isArray(sr.strengths) ? sr.strengths : []).map(
              (s: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <span className="text-emerald-500 mt-0.5">+</span>
                  <span>{s}</span>
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {sr.risks && (
        <div>
          <div className="text-xs font-semibold text-red-700 mb-1">Risks</div>
          <ul className="space-y-1">
            {(Array.isArray(sr.risks) ? sr.risks : []).map(
              (r: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <span className="text-red-500 mt-0.5">-</span>
                  <span>{r}</span>
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
