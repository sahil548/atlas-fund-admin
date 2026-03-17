"use client";

import { useState, useRef, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useUser } from "@/components/providers/user-provider";
import { useFirm } from "@/components/providers/firm-provider";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const NOTIF_TYPE_ICONS: Record<string, string> = {
  STAGE_CHANGE: "\u2197",
  IC_VOTE: "\u2713",
  DOCUMENT_UPLOAD: "\ud83d\udcc4",
  CAPITAL_CALL: "\ud83d\udcb0",
  DISTRIBUTION: "\ud83d\udcb8",
  REPORT: "\ud83d\udcca",
  TASK_ASSIGNED: "\ud83d\udccb",
  CLOSING_UPDATE: "\ud83d\udd12",
  GENERAL: "\ud83d\udce2",
};

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  DEAL_ACTIVITY: "\u2197",
  CAPITAL_CALL: "\ud83d\udcb0",
  DISTRIBUTION: "\ud83d\udcb8",
  MEETING: "\ud83d\udcc5",
  TASK: "\ud83d\udccb",
  DOCUMENT: "\ud83d\udcc4",
  ENTITY_CHANGE: "\ud83d\udd04",
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
  const { firmId } = useFirm();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"notifications" | "activity">("notifications");
  const [filterType, setFilterType] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const userId = user?.id;

  // Notifications SWR
  const notifKey =
    userId
      ? `/api/notifications${filterType ? `?type=${filterType}` : ""}`
      : null;

  const { data: notifData } = useSWR(notifKey, fetcher, {
    refreshInterval: 30000,
  });

  // Activity SWR
  const activityKey =
    firmId && open && activeTab === "activity"
      ? `/api/activity?firmId=${firmId}&limit=20`
      : null;

  const { data: activityData, isLoading: activityLoading } = useSWR(activityKey, fetcher, {
    refreshInterval: 60000,
  });

  const unreadCount = notifData?.unreadCount || 0;
  const notifications = notifData?.notifications || [];
  const activities = activityData?.items || [];

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
    mutate(notifKey);
  }

  async function markAllRead() {
    if (!userId) return;
    await fetch(`/api/notifications/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "MARK_ALL_READ" }),
    });
    mutate(notifKey);
  }

  // Don't render until user is loaded
  if (userLoading || !userId) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-96 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-50 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex-1 text-xs font-medium py-2.5 transition-colors ${
                activeTab === "notifications"
                  ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-red-500 text-white rounded-full">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex-1 text-xs font-medium py-2.5 transition-colors ${
                activeTab === "activity"
                  ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Activity
            </button>
          </div>

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Filter by type</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Type filter */}
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex gap-1.5 overflow-x-auto">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterType(opt.value)}
                    className={`text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full font-medium transition-colors ${
                      filterType === opt.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-500">No notifications</div>
                ) : (
                  notifications.map((n: { id: string; type: string; isRead: boolean; subject: string; body?: string; createdAt: string }) => (
                    <div
                      key={n.id}
                      className={`px-4 py-2.5 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                        !n.isRead ? "bg-indigo-50/50 dark:bg-indigo-950/30" : ""
                      }`}
                      onClick={() => !n.isRead && markRead(n.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs mt-0.5">{NOTIF_TYPE_ICONS[n.type] || "\ud83d\udce2"}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs ${!n.isRead ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                            {n.subject}
                          </div>
                          {n.body && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{n.body}</div>
                          )}
                          <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(n.createdAt)}</div>
                        </div>
                        {!n.isRead && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="max-h-80 overflow-y-auto">
              {activityLoading ? (
                <div className="space-y-0">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-500">No recent activity</div>
              ) : (
                activities.map((a: { id: string; type: string; description: string; entityName?: string; linkPath?: string; date: string }) => (
                  <div
                    key={a.id}
                    className="px-4 py-2.5 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => {
                      if (a.linkPath) {
                        router.push(a.linkPath);
                        setOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs mt-0.5">{ACTIVITY_TYPE_ICONS[a.type] || "\ud83d\udce2"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                          {a.description}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {a.entityName && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{a.entityName}</span>
                          )}
                          <span className="text-[9px] text-gray-400 dark:text-gray-500">{timeAgo(a.date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
