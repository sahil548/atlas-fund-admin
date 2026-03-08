"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { CreateMeetingForm } from "@/components/features/meetings/create-meeting-form";
import Link from "next/link";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ExportButton } from "@/components/ui/export-button";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  meetingType: string | null;
  source: string;
  hasTranscript: boolean;
  actionItems: number;
  decisions: string[] | null;
  summary: string | null;
  asset?: { id: string; name: string } | null;
  deal?: { id: string; name: string } | null;
  entity?: { id: string; name: string } | null;
}

const MEETING_TYPES = ["IC Meeting", "DD Session", "GP Review", "Portfolio Review", "Board Meeting"];
const SOURCES = ["FIREFLIES", "MANUAL", "ZOOM", "TEAMS"];

const TYPE_COLORS: Record<string, string> = {
  "IC Meeting": "red", "DD Session": "orange", "GP Review": "purple",
  "Portfolio Review": "blue", "Board Meeting": "indigo",
};
const SOURCE_COLORS: Record<string, string> = { FIREFLIES: "purple", MANUAL: "gray", ZOOM: "blue", TEAMS: "indigo" };
const SOURCE_LABELS: Record<string, string> = { FIREFLIES: "Fireflies", MANUAL: "Manual", ZOOM: "Zoom", TEAMS: "Teams" };

const MEETING_FILTERS = [
  {
    key: "source",
    label: "Source",
    options: SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] || s })),
  },
];

export default function MeetingsPage() {
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const buildUrl = useCallback(
    (currentCursor?: string | null) => {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      for (const [k, v] of Object.entries(activeFilters)) {
        if (v) params.set(k, v);
      }
      if (currentCursor) params.set("cursor", currentCursor);
      return `/api/meetings?${params.toString()}`;
    },
    [search, activeFilters],
  );

  const { isLoading } = useSWR(buildUrl(null), fetcher, {
    onSuccess: (result) => {
      setAllMeetings(result.data ?? []);
      setCursor(result.nextCursor ?? null);
    },
    revalidateOnFocus: false,
  });

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setAllMeetings([]);
    setCursor(null);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setAllMeetings([]);
    setCursor(null);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(cursor));
      const result = await res.json();
      setAllMeetings((prev) => [...prev, ...(result.data ?? [])]);
      setCursor(result.nextCursor ?? null);
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, buildUrl]);

  // Stats computed from loaded data
  const totalMeetings = allMeetings.length;
  const withTranscripts = allMeetings.filter((m) => m.hasTranscript).length;
  const totalActionItems = allMeetings.reduce((s, m) => s + m.actionItems, 0);
  const now = new Date();
  const thisMonth = allMeetings.filter((m) => {
    const d = new Date(m.meetingDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  if (isLoading && allMeetings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading meetings...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Meetings</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
        >
          + Log Meeting
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Meetings" value={String(totalMeetings)} small />
        <StatCard label="With Transcripts" value={String(withTranscripts)} sub={`${totalMeetings > 0 ? Math.round((withTranscripts / totalMeetings) * 100) : 0}% have transcripts`} small />
        <StatCard label="Total Action Items" value={String(totalActionItems)} small />
        <StatCard label="This Month" value={String(thisMonth)} small />
      </div>

      {/* Filters + Export */}
      <SearchFilterBar
        filters={MEETING_FILTERS}
        onFilterChange={handleFilterChange}
        activeFilters={activeFilters}
      >
        <ExportButton
          data={allMeetings.map((m) => ({
            id: m.id,
            title: m.title,
            date: new Date(m.meetingDate).toLocaleDateString(),
            type: m.meetingType ?? "",
            source: SOURCE_LABELS[m.source] ?? m.source,
            hasTranscript: m.hasTranscript ? "Yes" : "No",
            actionItems: m.actionItems,
            asset: m.asset?.name ?? "",
            deal: m.deal?.name ?? "",
            entity: m.entity?.name ?? "",
          }))}
          fileName="Meetings_Export"
        />
      </SearchFilterBar>

      {/* Meeting Cards */}
      {allMeetings.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
          <p className="text-sm text-gray-500">No meetings found</p>
          <p className="text-xs text-gray-400">
            {search || Object.values(activeFilters).some(Boolean)
              ? "Try different search terms or clear filters"
              : "Log your first meeting to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allMeetings.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">{m.title}</h3>
                    {m.meetingType && <Badge color={TYPE_COLORS[m.meetingType] || "gray"}>{m.meetingType}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span>{new Date(m.meetingDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                    <span className="text-gray-300">|</span>
                    <Badge color={SOURCE_COLORS[m.source] || "gray"}>{SOURCE_LABELS[m.source] || m.source}</Badge>
                    <span className="text-gray-300">|</span>
                    <span>{m.hasTranscript ? "Transcript available" : "No transcript"}</span>
                    <span className="text-gray-300">|</span>
                    <span>{m.actionItems} action item{m.actionItems !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {m.asset && (
                      <Link href={`/assets/${m.asset.id}`} className="text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">
                        Asset: {m.asset.name}
                      </Link>
                    )}
                    {m.deal && (
                      <Link href={`/deals/${m.deal.id}`} className="text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">
                        Deal: {m.deal.name}
                      </Link>
                    )}
                    {m.entity && (
                      <Link href={`/entities/${m.entity.id}`} className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                        Entity: {m.entity.name}
                      </Link>
                    )}
                  </div>
                  {m.decisions && Array.isArray(m.decisions) && m.decisions.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">Decisions:</span>
                      {m.decisions.map((d, i) => (
                        <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <LoadMoreButton hasMore={!!cursor} loading={loadingMore} onLoadMore={handleLoadMore} />

      <CreateMeetingForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
