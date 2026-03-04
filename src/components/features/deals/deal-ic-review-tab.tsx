"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/components/providers/user-provider";
import { mutate } from "swr";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DealICReviewTabProps {
  deal: any;
}

export function DealICReviewTab({ deal }: DealICReviewTabProps) {
  const toast = useToast();
  const { userId } = useUser();
  const [icDecisionLoading, setIcDecisionLoading] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [postingQuestion, setPostingQuestion] = useState(false);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [postingReply, setPostingReply] = useState<Record<string, boolean>>({});

  async function handleICDecision(decision: string) {
    setIcDecisionLoading(true);
    try {
      await fetch(`/api/deals/${deal.id}/ic-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, userId }),
      });
      toast.success(
        `IC decision: ${decision.replace(/_/g, " ")} — deal ${
          decision === "APPROVED"
            ? "moves to Closing"
            : decision === "REJECTED"
            ? "marked dead"
            : "sent back to DD"
        }`
      );
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Failed to record IC decision");
    } finally {
      setIcDecisionLoading(false);
    }
  }

  async function postQuestion() {
    if (!newQuestionText.trim()) return;
    setPostingQuestion(true);
    try {
      await fetch(`/api/deals/${deal.id}/ic-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: userId,
          content: newQuestionText,
        }),
      });
      setNewQuestionText("");
      mutate(`/api/deals/${deal.id}`);
    } catch {
      /* silent */
    } finally {
      setPostingQuestion(false);
    }
  }

  async function postReply(questionId: string) {
    const content = replyTexts[questionId]?.trim();
    if (!content) return;
    setPostingReply((p) => ({ ...p, [questionId]: true }));
    try {
      await fetch(
        `/api/deals/${deal.id}/ic-questions/${questionId}/replies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorId: userId, content }),
        }
      );
      setReplyTexts((p) => ({ ...p, [questionId]: "" }));
      mutate(`/api/deals/${deal.id}`);
    } catch {
      /* silent */
    } finally {
      setPostingReply((p) => ({ ...p, [questionId]: false }));
    }
  }

  async function updateQuestionStatus(questionId: string, status: string) {
    try {
      await fetch(`/api/deals/${deal.id}/ic-questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: questionId, status }),
      });
      mutate(`/api/deals/${deal.id}`);
    } catch {
      /* silent */
    }
  }

  return (
    <div className="space-y-4">
      {/* ── IC Decision & Voting ── */}
      {deal.icProcess ? (
        <div className="space-y-4">
          {/* Decision panel */}
          {deal.icProcess.finalDecision ? (
            <div
              className={`p-4 rounded-xl border ${
                deal.icProcess.finalDecision === "APPROVED"
                  ? "bg-emerald-50 border-emerald-200"
                  : deal.icProcess.finalDecision === "REJECTED"
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-700">IC Decision</div>
                  <div className="text-lg font-bold mt-1">
                    {deal.icProcess.finalDecision.replace(/_/g, " ")}
                  </div>
                </div>
                {deal.icProcess.decidedBy && (
                  <div className="text-right text-xs text-gray-500">
                    <div>by {deal.icProcess.decidedBy.name}</div>
                    {deal.icProcess.decidedAt && (
                      <div>{new Date(deal.icProcess.decidedAt).toLocaleDateString()}</div>
                    )}
                  </div>
                )}
              </div>
              {deal.icProcess.decisionNotes && (
                <p className="text-sm text-gray-600 mt-2">{deal.icProcess.decisionNotes}</p>
              )}
            </div>
          ) : deal.stage === "IC_REVIEW" ? (
            <div className="flex gap-2">
              <Button
                loading={icDecisionLoading}
                onClick={() => handleICDecision("APPROVED")}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Approve
              </Button>
              <Button
                variant="danger"
                loading={icDecisionLoading}
                onClick={() => handleICDecision("REJECTED")}
              >
                Reject
              </Button>
              <Button
                variant="secondary"
                loading={icDecisionLoading}
                onClick={() => handleICDecision("SEND_BACK")}
              >
                Send Back to DD
              </Button>
            </div>
          ) : null}

          {/* Slack indicator */}
          {deal.icProcess.slackChannel && (
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
              <span className="text-xs text-purple-700">
                Posted to #{deal.icProcess.slackChannel}
              </span>
              {deal.icProcess.slackLink && (
                <a
                  href={deal.icProcess.slackLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:underline ml-auto"
                >
                  View in Slack
                </a>
              )}
            </div>
          )}

          {/* Vote records */}
          {deal.icProcess.votes && deal.icProcess.votes.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">
                Vote Records ({deal.icProcess.votes.length})
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {["Member", "Vote", "Voted At", "Notes"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(deal.icProcess.votes as any[]).map((v: any) => (
                    <tr key={v.id} className="border-t border-gray-50">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                            {v.user?.initials || v.user?.name?.charAt(0) || "?"}
                          </span>
                          <span className="font-medium">{v.user?.name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge color={v.vote === "APPROVE" ? "green" : v.vote === "REJECT" ? "red" : "yellow"}>
                          {v.vote}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">
                        {new Date(v.votedAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{v.notes || "---"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500">
          No IC process initiated yet. Send the deal to IC Review from the Due Diligence stage.
        </div>
      )}

      {/* ── IC Questions ── */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold mb-3">
          Questions ({(deal.icQuestions || []).length})
        </h4>
        <div className="flex gap-2 mb-4">
          <textarea
            className="flex-1 border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={2}
            placeholder="Post a question for the IC..."
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
          />
          <Button
            size="sm"
            loading={postingQuestion}
            onClick={postQuestion}
            disabled={!newQuestionText.trim()}
          >
            Post
          </Button>
        </div>

        {deal.icQuestions && deal.icQuestions.length > 0 ? (
          <div className="space-y-3">
            {(deal.icQuestions as any[]).map((q: any) => (
              <div key={q.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {q.author?.initials || "?"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{q.author?.name}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{q.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {["OPEN", "RESOLVED", "DEFERRED"].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateQuestionStatus(q.id, status)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          q.status === status
                            ? status === "OPEN"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : status === "RESOLVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                            : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Replies */}
                {q.replies && q.replies.length > 0 && (
                  <div className="ml-8 space-y-2">
                    {q.replies.map((r: any) => (
                      <div key={r.id} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                        <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {r.author?.initials || "?"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium">{r.author?.name}</span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{r.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input */}
                <div className="ml-8 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Reply..."
                    value={replyTexts[q.id] || ""}
                    onChange={(e) => setReplyTexts((p) => ({ ...p, [q.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && postReply(q.id)}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={postingReply[q.id]}
                    onClick={() => postReply(q.id)}
                    disabled={!replyTexts[q.id]?.trim()}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-gray-400">
            No questions posted yet.
          </div>
        )}
      </div>
    </div>
  );
}
