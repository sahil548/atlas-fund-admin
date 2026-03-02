"use client";

import useSWR from "swr";
import { Search } from "lucide-react";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useCommandBar } from "@/components/features/command-bar/command-bar-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function TopBar({ title }: { title: string }) {
  const { toggle } = useCommandBar();
  const { data: connections } = useSWR("/api/accounting/connections", fetcher);

  const latestSync = connections
    ?.filter((c: { accountingConnection: { lastSyncAt: string } | null }) => c.accountingConnection?.lastSyncAt)
    .map((c: { accountingConnection: { lastSyncAt: string } }) => new Date(c.accountingConnection.lastSyncAt).getTime())
    .sort((a: number, b: number) => b - a)[0];

  const syncLabel = latestSync ? timeAgo(new Date(latestSync).toISOString()) : "not connected";
  const hasError = connections?.some((c: { accountingConnection: { syncStatus: string } | null }) => c.accountingConnection?.syncStatus === "ERROR");

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3 flex justify-between items-center sticky top-0 z-10">
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <Search className="w-3 h-3" />
          <span>Search or ask AI...</span>
          <kbd className="text-[9px] bg-gray-200 px-1 py-0.5 rounded font-mono">⌘K</kbd>
        </button>
        <NotificationBell />
        <span className="text-[10px] text-gray-500">QBO synced {syncLabel}</span>
        <span className={`w-2 h-2 rounded-full ${hasError ? "bg-red-400" : "bg-emerald-400"}`} />
      </div>
    </div>
  );
}
