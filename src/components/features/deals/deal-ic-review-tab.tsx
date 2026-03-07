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
  const { userId, isLoading: userLoading } = useUser();
  const [icDecisionLoading, setIcDecisionLoading] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [conditionsText, setConditionsText] = useState("");
  const [justVoted, setJustVoted] = useState<string | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [postingQuestion, setPostingQuestion] = useState(false);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [postingReply, setPostingReply] = useState<Record<string, boolean>>({});

  // Get the decision structure from deal's entity
  const decisionStructure =
    deal.targetEntity?.decisionStructure ||
    deal.dealEntities?.[0]?.entity?.decisionStructure ||
    null;

  // Check if current user has already voted
  const userHasVoted = deal.icProcess?.votes?.some(
    (v: any) => v.userId === userId,
  );

  // Vote counts
  const votes = deal.icProcess?.votes || [];
  const approveCount = votes.filter((v: any) => v.vote === "APPROVE").length;
  const rejectCount = votes.filter((v: any) => v.vote === "REJECT").length;
  const sendBackCount = votes.filter((v: any) => v.vote === "SEND_BACK").length;

  async function handleICDecision(decision: string) {
    if (!userId) {
      toast.error("User not loaded -- please try again");
      return;
    }
    setIcDecisionLoading(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/ic-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to record IC decision";
        toast.error(msg);
        return;
      }
      toast.success(
        `IC decision: ${decision.replace(/_/g, " ")} -- deal ${
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

  async function handleVote(vote: "APPROVE" | "REJECT" | "SEND_BACK") {
    if (!userId) {
      toast.error("User not loaded -- please try again");
      return;
    }
    setVotingLoading(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/ic/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vote,
          conditions: conditionsText.trim() || undefined,
          userId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to cast vote";
        toast.error(msg);
        return;
      }
      toast.success(
        `Vote cast: ${vote.replace(/_/g, " ")}${
          conditionsText.trim() ? " (with conditions)" : ""
        }`
      );
      setJustVoted(vote);
      setConditionsText("");
      setShowConditions(false);
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Failed to cast vote");
    } finally {
      setVotingLoading(false);
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
      {/* Decision Structure Info */}
      {decisionStructure && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-indigo-800">
                Decision Structure: {decisionStructure.name}
              </div>
              <div className="text-[11px] text-indigo-600 mt-0.5">
                {decisionStructure.quorumRequired} of{" "}
                {decisionStructure.members?.filter(
                  (m: any) => m.role === "VOTER" || !m.role,
                ).length || 0}{" "}
                votes required | {decisionStructure.approvalThreshold} approval
                {decisionStructure.approvalThreshold > 1 ? "s" : ""} needed
              </div>
            </div>
            {deal.icProcess && (
              <div className="text-right">
                <div className="text-xs text-indigo-700 font-medium">
                  {votes.length} vote{votes.length !== 1 ? "s" : ""} cast
                </div>
                <div className="text-[10px] text-indigo-500">
                  {approveCount} approve | {rejectCount} reject | {sendBackCount} send back
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IC Decision & Voting */}
      {deal.icProcess ? (
        <div className="space-y-4">
          {/* Final Decision panel */}
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
            <div className="space-y-3">
              {/* In-app Voting Panel — visible if user hasn't voted */}
              {!userHasVoted && !userLoading && userId ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-700 mb-3">Cast Your Vote</div>
                  <div className="flex gap-2 mb-3">
                    <Button
                      loading={votingLoading}
                      disabled={userLoading || !userId}
                      onClick={() => handleVote("APPROVE")}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      loading={votingLoading}
                      disabled={userLoading || !userId}
                      onClick={() => handleVote("REJECT")}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="secondary"
                      loading={votingLoading}
                      disabled={userLoading || !userId}
                      onClick={() => handleVote("SEND_BACK")}
                    >
                      Send Back to DD
                    </Button>
                  </div>

                  {/* Conditions toggle */}
                  {!showConditions ? (
                    <button
                      className="text-xs text-indigo-600 hover:underline"
                      onClick={() => setShowConditions(true)}
                    >
                      + Add conditions
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600">
                        Conditions (optional)
                      </label>
                      <textarea
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        rows={2}
                        placeholder="e.g., Contingent on side letter review"
                        value={conditionsText}
                        onChange={(e) => setConditionsText(e.target.value)}
                      />
                      <button
                        className="text-xs text-gray-500 hover:underline"
                        onClick={() => {
                          setShowConditions(false);
                          setConditionsText("");
                        }}
                      >
                        Cancel conditions
                      </button>
                    </div>
                  )}
                </div>
              ) : justVoted ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
                  ✓ Your vote: {justVoted.replace(/_/g, " ")}
                </div>
              ) : userHasVoted ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  You have already voted on this deal.
                </div>
              ) : null}

              {/* Final Decision buttons (for deal lead / admin) */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-700 mb-2">Final IC Decision</div>
                <p className="text-[11px] text-gray-500 mb-3">
                  Record the final decision to advance the deal. This moves the deal to the next stage.
                </p>
                <div className="flex gap-2">
                  <Button
                    loading={icDecisionLoading}
                    disabled={userLoading || !userId || votes.length === 0}
                    onClick={() => handleICDecision("APPROVED")}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Approve (Final)
                  </Button>
                  <Button
                    variant="danger"
                    loading={icDecisionLoading}
                    disabled={userLoading || !userId || votes.length === 0}
                    onClick={() => handleICDecision("REJECTED")}
                  >
                    Reject (Final)
                  </Button>
                  <Button
                    variant="secondary"
                    loading={icDecisionLoading}
                    disabled={userLoading || !userId || votes.length === 0}
                    onClick={() => handleICDecision("SEND_BACK")}
                  >
                    Send Back (Final)
                  </Button>
                </div>
                {votes.length === 0 && (
                  <p className="text-[11px] text-gray-500 mt-2">At least one vote must be cast before recording a final decision.</p>
                )}
              </div>
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
          {votes.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">
                Vote Records ({votes.length})
              </div>
              <div className="space-y-2">
                {votes.map((v: any) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg"
                  >
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {v.user?.initials || v.user?.name?.charAt(0) || "?"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{v.user?.name || "Unknown"}</span>
                        <Badge
                          color={
                            v.vote === "APPROVE"
                              ? "green"
                              : v.vote === "REJECT"
                              ? "red"
                              : "yellow"
                          }
                        >
                          {v.vote.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-[10px] text-gray-400">
                          {new Date(v.votedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {(v.conditions || v.notes) && (
                        <div className="mt-1 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                          <span className="font-medium text-gray-600">Conditions: </span>
                          {v.conditions || v.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500">
          No IC process initiated yet. Send the deal to IC Review from the Due Diligence stage.
        </div>
      )}

      {/* IC Questions */}
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
