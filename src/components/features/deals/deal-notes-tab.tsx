"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mutate } from "swr";
import useSWR from "swr";
import { useUser } from "@/components/providers/user-provider";
import { formatDate } from "@/lib/utils";
import {
  MessageSquare,
  Phone,
  Mail,
  Video,
  Sparkles,
  StickyNote,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcherFn = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "note", label: "Notes" },
  { key: "meeting", label: "Meetings" },
  { key: "interaction", label: "Interactions" },
  { key: "conversation", label: "AI Chats" },
] as const;

type FilterKey = (typeof FILTER_OPTIONS)[number]["key"];

const TYPE_CONFIG: Record<
  string,
  { icon: typeof StickyNote; color: string; dotColor: string; label: string }
> = {
  note: {
    icon: StickyNote,
    color: "text-blue-600",
    dotColor: "bg-blue-500",
    label: "Note",
  },
  meeting: {
    icon: Video,
    color: "text-purple-600",
    dotColor: "bg-purple-500",
    label: "Meeting",
  },
  interaction: {
    icon: Phone,
    color: "text-green-600",
    dotColor: "bg-green-500",
    label: "Interaction",
  },
  conversation: {
    icon: Sparkles,
    color: "text-indigo-600",
    dotColor: "bg-indigo-500",
    label: "AI Chat",
  },
};

const INTERACTION_ICONS: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Video,
  NOTE: MessageSquare,
};

interface DealNotesTabProps {
  deal: any;
}

export function DealNotesTab({ deal }: DealNotesTabProps) {
  const { userId } = useUser();
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());

  const { data: timeline, isLoading } = useSWR(
    `/api/deals/${deal.id}/timeline`,
    fetcherFn
  );

  async function addNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await fetch(`/api/deals/${deal.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText, authorId: userId }),
      });
      setNoteText("");
      mutate(`/api/deals/${deal.id}/timeline`);
      mutate(`/api/deals/${deal.id}`);
    } catch {
      /* silent */
    } finally {
      setSavingNote(false);
    }
  }

  const toggleConversation = (id: string) => {
    setExpandedConversations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered =
    filter === "all"
      ? timeline || []
      : (timeline || []).filter((item: any) => item.type === filter);

  // Group items by date
  const grouped: Record<string, any[]> = {};
  for (const item of filtered) {
    const dateKey = formatDate(item.date);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  }

  return (
    <div className="space-y-4">
      {/* Add Note */}
      <div className="flex gap-2">
        <textarea
          className="flex-1 border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          rows={2}
          placeholder="Add a note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
          }}
        />
        <Button
          size="sm"
          loading={savingNote}
          onClick={addNote}
          disabled={!noteText.trim()}
        >
          Add Note
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
              filter === opt.key
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {opt.label}
            {timeline &&
              opt.key !== "all" &&
              (() => {
                const count = (timeline as any[]).filter(
                  (i) => i.type === opt.key
                ).length;
                return count > 0 ? ` (${count})` : "";
              })()}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">
          Loading timeline...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          {filter === "all"
            ? "No activity yet. Add a note, link a meeting, or save an AI conversation."
            : `No ${FILTER_OPTIONS.find((o) => o.key === filter)?.label?.toLowerCase()} yet.`}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {dateLabel}
              </div>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200" />

                <div className="space-y-3">
                  {(items as any[]).map((item: any) => {
                    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.note;
                    const Icon = config.icon;

                    return (
                      <div key={item.id} className="relative flex gap-3">
                        {/* Dot */}
                        <div
                          className={`relative z-10 mt-1.5 w-[15px] h-[15px] rounded-full border-2 border-white ${config.dotColor} shrink-0`}
                        />

                        {/* Card */}
                        <div className="flex-1 min-w-0">
                          {item.type === "note" && (
                            <NoteCard item={item} />
                          )}
                          {item.type === "meeting" && (
                            <MeetingCard item={item} />
                          )}
                          {item.type === "interaction" && (
                            <InteractionCard item={item} />
                          )}
                          {item.type === "conversation" && (
                            <ConversationCard
                              item={item}
                              expanded={expandedConversations.has(item.id)}
                              onToggle={() => toggleConversation(item.id)}
                            />
                          )}

                          {/* Meta line */}
                          <div className="flex items-center gap-2 mt-1">
                            <Icon className={`w-3 h-3 ${config.color}`} />
                            <span className="text-[10px] text-gray-400">
                              {config.label}
                            </span>
                            {item.author && (
                              <>
                                <span className="text-[10px] text-gray-300">
                                  ·
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {item.author.name}
                                </span>
                              </>
                            )}
                            <span className="text-[10px] text-gray-300">
                              ·
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(item.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────

function NoteCard({ item }: { item: any }) {
  return (
    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
      {item.content}
    </p>
  );
}

function MeetingCard({ item }: { item: any }) {
  const source = item.metadata?.source;
  return (
    <div className="bg-purple-50/50 border border-purple-100 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-800">{item.title}</span>
        {source && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 uppercase">
            {source}
          </span>
        )}
      </div>
      {item.content && (
        <p className="text-xs text-gray-600 line-clamp-3">{item.content}</p>
      )}
      <div className="flex items-center gap-3 mt-1.5">
        {item.metadata?.actionItems > 0 && (
          <span className="text-[10px] text-purple-600 font-medium">
            {item.metadata.actionItems} action item
            {item.metadata.actionItems > 1 ? "s" : ""}
          </span>
        )}
        {item.metadata?.hasTranscript && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <FileText className="w-2.5 h-2.5" /> Transcript
          </span>
        )}
      </div>
    </div>
  );
}

function InteractionCard({ item }: { item: any }) {
  const interactionType = item.metadata?.interactionType || "NOTE";
  const InteractionIcon = INTERACTION_ICONS[interactionType] || MessageSquare;
  return (
    <div className="bg-green-50/50 border border-green-100 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <InteractionIcon className="w-3.5 h-3.5 text-green-600" />
        <span className="text-sm font-medium text-gray-800">{item.title}</span>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700 uppercase">
          {interactionType}
        </span>
      </div>
      {item.content && (
        <p className="text-xs text-gray-600 line-clamp-3">{item.content}</p>
      )}
    </div>
  );
}

function ConversationCard({
  item,
  expanded,
  onToggle,
}: {
  item: any;
  expanded: boolean;
  onToggle: () => void;
}) {
  const messages = (item.metadata?.messages || []) as any[];
  const messageCount = item.metadata?.messageCount || messages.length;

  return (
    <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg px-3 py-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-800 truncate">
          {item.title}
        </span>
        <span className="text-[10px] text-indigo-500 shrink-0">
          {messageCount} message{messageCount !== 1 ? "s" : ""}
        </span>
      </button>

      {!expanded && item.content && (
        <p className="text-xs text-gray-500 mt-1 ml-5.5 line-clamp-2">
          {item.content}
        </p>
      )}

      {expanded && messages.length > 0 && (
        <div className="mt-2 space-y-2 ml-5.5 max-h-80 overflow-y-auto">
          {messages.map((msg: any, i: number) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-1.5 rounded-lg text-xs ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200 text-gray-700"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
