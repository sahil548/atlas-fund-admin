"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface WorkstreamDetailPanelProps {
  dealId: string;
  workstreamId: string;
  onClose: () => void;
  onWorkstreamUpdate: () => void;
  teamMembers: { id: string; name: string; initials: string }[];
}

export function WorkstreamDetailPanel({
  dealId,
  workstreamId,
  onClose,
  onWorkstreamUpdate,
  teamMembers,
}: WorkstreamDetailPanelProps) {
  const toast = useToast();
  const { data: ws, isLoading } = useSWR(
    `/api/deals/${dealId}/workstreams/${workstreamId}`,
    fetcher,
  );

  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Reset state when switching workstreams
  useEffect(() => {
    setCommentText("");
    setReplyingTo(null);
    setReplyText("");
    setEditingField(null);
  }, [workstreamId]);

  if (isLoading || !ws) {
    return (
      <div className="border-l border-gray-200 bg-white p-4 w-full">
        <div className="text-sm text-gray-400">Loading workstream...</div>
      </div>
    );
  }

  async function patchWorkstream(updates: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/deals/${dealId}/workstreams/${workstreamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to update";
        toast.error(msg);
        return;
      }
      mutate(`/api/deals/${dealId}/workstreams/${workstreamId}`);
      mutate(`/api/deals/${dealId}`);
      onWorkstreamUpdate();
      setEditingField(null);
    } catch {
      toast.error("Failed to update workstream");
    }
  }

  async function postComment() {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/workstreams/${workstreamId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to post comment";
        toast.error(msg);
        return;
      }
      setCommentText("");
      mutate(`/api/deals/${dealId}/workstreams/${workstreamId}`);
      mutate(`/api/deals/${dealId}`);
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function postReply(parentId: string) {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/workstreams/${workstreamId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim(), parentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to post reply";
        toast.error(msg);
        return;
      }
      setReplyText("");
      setReplyingTo(null);
      mutate(`/api/deals/${dealId}/workstreams/${workstreamId}`);
      mutate(`/api/deals/${dealId}`);
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  }

  async function uploadAttachment(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/deals/${dealId}/workstreams/${workstreamId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Upload failed";
        toast.error(msg);
        return;
      }
      toast.success("File uploaded");
      mutate(`/api/deals/${dealId}/workstreams/${workstreamId}`);
      mutate(`/api/deals/${dealId}`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAttachment(attachmentId: string) {
    try {
      const res = await fetch(
        `/api/deals/${dealId}/workstreams/${workstreamId}/attachments?attachmentId=${attachmentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Failed to delete attachment");
        return;
      }
      mutate(`/api/deals/${dealId}/workstreams/${workstreamId}`);
      mutate(`/api/deals/${dealId}`);
    } catch {
      toast.error("Failed to delete attachment");
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const comments = ws.comments || [];
  const attachments = ws.attachments || [];
  const analysisResult = ws.analysisResult;

  return (
    <div className="border-l border-gray-200 bg-white overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 truncate flex-1 mr-2">
            {ws.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Status */}
          <div>
            <span className="text-gray-500 font-medium">Status</span>
            <Select
              value={ws.status}
              onChange={(e) => patchWorkstream({ status: e.target.value })}
              options={[
                { value: "NOT_STARTED", label: "Not Started" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "COMPLETE", label: "Complete" },
              ]}
              className="text-xs mt-0.5"
            />
          </div>

          {/* Assignee */}
          <div>
            <span className="text-gray-500 font-medium">Assignee</span>
            <Select
              value={ws.assigneeId || ""}
              onChange={(e) =>
                patchWorkstream({ assigneeId: e.target.value || null })
              }
              options={[
                { value: "", label: "Unassigned" },
                ...teamMembers.map((u) => ({ value: u.id, label: u.name })),
              ]}
              className="text-xs mt-0.5"
            />
          </div>

          {/* Priority */}
          <div>
            <span className="text-gray-500 font-medium">Priority</span>
            <Select
              value={ws.priority || "MEDIUM"}
              onChange={(e) => patchWorkstream({ priority: e.target.value })}
              options={[
                { value: "HIGH", label: "High" },
                { value: "MEDIUM", label: "Medium" },
                { value: "LOW", label: "Low" },
              ]}
              className="text-xs mt-0.5"
            />
          </div>

          {/* Due Date */}
          <div>
            <span className="text-gray-500 font-medium">Due Date</span>
            {editingField === "dueDate" ? (
              <input
                type="date"
                defaultValue={ws.dueDate ? new Date(ws.dueDate).toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  patchWorkstream({ dueDate: e.target.value || null });
                }}
                onBlur={() => setEditingField(null)}
                autoFocus
                className="text-xs mt-0.5 w-full border border-gray-300 rounded px-2 py-1"
              />
            ) : (
              <button
                onClick={() => setEditingField("dueDate")}
                className="text-xs mt-0.5 w-full text-left border border-gray-200 rounded px-2 py-1 hover:border-gray-400"
              >
                {ws.dueDate
                  ? new Date(ws.dueDate).toLocaleDateString()
                  : "Set date..."}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* AI Analysis Section */}
        {analysisResult && (
          <div>
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1"
            >
              <span className={`transition-transform ${showAnalysis ? "rotate-90" : ""}`}>
                &#9654;
              </span>
              AI Analysis
              {analysisResult.aiPowered && (
                <Badge color="indigo">AI</Badge>
              )}
            </button>
            {showAnalysis && (
              <div className="mt-2 bg-gray-50 rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {analysisResult.summary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Comments Section */}
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Comments ({comments.length})
          </div>

          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment: any) => (
                <div key={comment.id} className="space-y-2">
                  {/* Root comment */}
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {comment.author?.initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-800">
                          {comment.author?.name || "Unknown"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString()}{" "}
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      <button
                        onClick={() => {
                          setReplyingTo(replyingTo === comment.id ? null : comment.id);
                          setReplyText("");
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium mt-1"
                      >
                        Reply
                      </button>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-8 space-y-2">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id} className="flex gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                            {reply.author?.initials || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-gray-700">
                                {reply.author?.name || "Unknown"}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 mt-0.5 whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="ml-8 space-y-1.5">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => postReply(comment.id)}
                          disabled={!replyText.trim()}
                          loading={submittingReply}
                        >
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No comments yet.</p>
          )}

          {/* New comment form */}
          <div className="mt-3 space-y-1.5">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="text-xs"
            />
            <Button
              size="sm"
              onClick={postComment}
              disabled={!commentText.trim()}
              loading={submittingComment}
            >
              Post Comment
            </Button>
          </div>
        </div>

        {/* Attachments Section */}
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Attachments ({attachments.length})
          </div>

          {attachments.length > 0 ? (
            <div className="space-y-1.5">
              {attachments.map((att: any) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between bg-gray-50 rounded border border-gray-200 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <div className="min-w-0">
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 truncate block"
                      >
                        {att.fileName}
                      </a>
                      {att.fileSize && (
                        <span className="text-[10px] text-gray-400">
                          {formatFileSize(att.fileSize)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAttachment(att.id)}
                    className="text-gray-400 hover:text-red-500 text-xs ml-2"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No attachments.</p>
          )}

          {/* Upload button */}
          <div className="mt-2">
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAttachment(file);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {uploading ? "Uploading..." : "Upload File"}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
