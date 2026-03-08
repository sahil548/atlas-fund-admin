"use client";

import { useState, useRef, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useUser } from "@/components/providers/user-provider";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const TYPE_ICONS: Record<string, string> = {
  STAGE_CHANGE: "↗",
  IC_VOTE: "✓",
  DOCUMENT_UPLOAD: "📄",
  CAPITAL_CALL: "💰",
  DISTRIBUTION: "💸",
  REPORT: "📊",
  TASK_ASSIGNED: "📋",
  CLOSING_UPDATE: "🔒",
  GENERAL: "📢",
};

const FILTER_OPTIONS = [
  { label: "All", value: "" },
  { label: "Capital Call", value: "CAPITAL_CALL" },
  { label: "Distribution", value: "DISTRIBUTION" },
  { label: "Report", value: "REPORT" },
  { label: "Document", value: "DOCUMENT_UPLOAD" },
  { label: "General", value: "GENERAL" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const { user, isLoading: userLoading } = useUser();
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const userId = user?.id;

  const swrKey =
    userId
      ? `/api/notifications?userId=${userId}${filterType ? `&type=${filterType}` : ""}`
      : null;

  const { data } = useSWR(swrKey, fetcher, {
    refreshInterval: 30000,
  });

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markRead(notifId: string) {
    await fetch(`/api/notifications/${notifId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "MARK_READ" }),
    });
    mutate(swrKey);
  }

  async function markAllRead() {
    if (!userId) return;
    await fetch(`/api/notifications/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "MARK_ALL_READ" }),
    });
    mutate(swrKey);
  }

  // Don't render until user is loaded
  if (userLoading || !userId) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-700">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="px-4 py-2 border-b border-gray-100 flex gap-1.5 overflow-x-auto">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={`text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full font-medium transition-colors ${
                  filterType === opt.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">No notifications</div>
            ) : (
              notifications.map((n: { id: string; type: string; isRead: boolean; subject: string; body?: string; createdAt: string }) => (
                <div
                  key={n.id}
                  className={`px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${
                    !n.isRead ? "bg-indigo-50/50" : ""
                  }`}
                  onClick={() => !n.isRead && markRead(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs mt-0.5">{TYPE_ICONS[n.type] || "📢"}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {n.subject}
                      </div>
                      {n.body && (
                        <div className="text-[10px] text-gray-500 mt-0.5 truncate">{n.body}</div>
                      )}
                      <div className="text-[9px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
