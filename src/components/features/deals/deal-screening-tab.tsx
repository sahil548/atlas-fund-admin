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

const REC_COLORS: Record<string, string> = {
  STRONG_PROCEED: "green",
  PROCEED: "blue",
  PROCEED_WITH_CAUTION: "yellow",
  WATCHLIST: "orange",
  PASS: "red",
};

export function DealScreeningTab({ deal }: DealScreeningTabProps) {
  const toast = useToast();
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoExpanded, setMemoExpanded] = useState(true);
  const canRerun =
    deal.stage === "DUE_DILIGENCE" ||
    deal.stage === "IC_REVIEW" ||
    deal.stage === "CLOSING";

  // Find IC Memo workstream if it exists
  const icMemoWs = (deal.workstreams || []).find(
    (ws: any) => ws.analysisType === "IC_MEMO"
  );

  async function runScreening(rerun = false) {
    setScreeningLoading(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rerun ? { rerun: true } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      toast.success("AI screening complete");
      mutate(`/api/deals/${deal.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Screening failed: ${msg}`);
    } finally {
      setScreeningLoading(false);
    }
  }

  async function generateICMemo(rerun = false) {
    setMemoLoading(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/dd-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "IC_MEMO", rerun }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error?.includes("already exists") && !rerun) {
          return generateICMemo(true);
        }
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      toast.success("IC Memo generated");
      mutate(`/api/deals/${deal.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`IC Memo failed: ${msg}`);
    } finally {
      setMemoLoading(false);
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
          {" "}If you have an API key configured in Settings, screening will use real AI analysis.
        </p>
        <Button loading={screeningLoading} onClick={() => runScreening(false)}>
          Run AI Screening
        </Button>
      </div>
    );
  }

  const sr = deal.screeningResult;
  const score = sr.score ?? 0;
  const isMock = sr.summary?.includes("Mock") || sr.summary?.includes("mock");

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
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-gray-900">
                AI Screening Score
              </div>
              <Badge color={isMock ? "gray" : "purple"}>
                {isMock ? "Mock" : "AI-Powered"}
              </Badge>
            </div>
            <div className="text-xs text-gray-500">
              Processed{" "}
              {new Date(sr.processedAt).toLocaleDateString()}
            </div>
          </div>
          {sr.recommendation && (
            <Badge color={REC_COLORS[sr.recommendation] || "gray"}>
              {sr.recommendation.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
        {canRerun && (
          <Button
            variant="secondary"
            size="sm"
            loading={screeningLoading}
            onClick={() => runScreening(true)}
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

      {/* Financials (shown when AI returns them) */}
      {sr.financials && typeof sr.financials === "object" && Object.keys(sr.financials).length > 0 && (
        <div>
          <div className="text-xs font-semibold text-indigo-700 mb-1">
            Key Financials
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(sr.financials).map(([key, value]) => (
              <div
                key={key}
                className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2"
              >
                <div className="text-[10px] text-indigo-500 uppercase tracking-wide">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
                <div className="text-sm font-semibold text-indigo-800">
                  {String(value)}
                </div>
              </div>
            ))}
          </div>
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

      {/* IC Memo Section */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">IC Memo</div>
            <p className="text-xs text-gray-500 mt-0.5">
              AI-generated Investment Committee memo synthesizing screening results
            </p>
          </div>
          <div className="flex items-center gap-2">
            {icMemoWs?.analysisResult && (
              <Badge color="green">Generated</Badge>
            )}
            <Button
              size="sm"
              variant={icMemoWs?.analysisResult ? "secondary" : "primary"}
              loading={memoLoading}
              onClick={() => generateICMemo(!!icMemoWs)}
            >
              {icMemoWs?.analysisResult ? "Regenerate" : "Generate IC Memo"}
            </Button>
          </div>
        </div>

        {icMemoWs?.analysisResult && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setMemoExpanded((p) => !p)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-semibold text-amber-900">Investment Committee Memo</span>
                {icMemoWs.analysisResult.recommendation && (
                  <Badge
                    color={
                      icMemoWs.analysisResult.recommendation.includes("APPROVE") ? "green" :
                      icMemoWs.analysisResult.recommendation === "DECLINE" ? "red" : "yellow"
                    }
                  >
                    {icMemoWs.analysisResult.recommendation.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${memoExpanded ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {memoExpanded && (
              <div className="p-4 space-y-4">
                {/* Summary */}
                <p className="text-sm text-gray-700">{icMemoWs.analysisResult.summary}</p>

                {/* Memo Sections */}
                {Array.isArray(icMemoWs.analysisResult.sections) &&
                  icMemoWs.analysisResult.sections.map((section: any, i: number) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{section.name}</h4>
                        {section.riskLevel && (
                          <Badge
                            color={section.riskLevel === "HIGH" ? "red" : section.riskLevel === "MEDIUM" ? "yellow" : "green"}
                          >
                            {section.riskLevel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{section.content}</p>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
