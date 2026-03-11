"use client";

import { useCallback, useState } from "react";
import useSWR, { mutate } from "swr";
import { StatCard } from "@/components/ui/stat-card";
import { CreateMeetingForm } from "@/components/features/meetings/create-meeting-form";
import { MeetingDetailCard } from "@/components/features/meetings/meeting-detail-card";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ExportButton } from "@/components/ui/export-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Video, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { useToast } from "@/components/ui/toast";

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
  decisions: { actionItemsText?: string | null; actionItemsList?: string[]; keywords?: string[] } | string[] | null;
  summary: string | null;
  asset?: { id: string; name: string } | null;
  deal?: { id: string; name: string } | null;
  entity?: { id: string; name: string } | null;
  dealId?: string | null;
  entityId?: string | null;
  assetId?: string | null;
}

const SOURCES = ["FIREFLIES", "MANUAL", "ZOOM", "TEAMS"];
const SOURCE_LABELS: Record<string, string> = { FIREFLIES: "Fireflies", MANUAL: "Manual", ZOOM: "Zoom", TEAMS: "Teams" };

const MEETING_FILTERS = [
  {
    key: "source",
    label: "Source",
    options: SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] || s })),
  },
];

export default function MeetingsPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
      logger.error("Load more failed", { error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, buildUrl]);

  async function handleSyncMeetings() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/meetings/sync", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        const { synced, skipped, connectedAccounts, errors } = result;
        if (connectedAccounts === 0) {
          toast.error(
            "No Fireflies accounts connected. Connect your account in Profile settings."
          );
        } else if (synced === 0 && skipped > 0) {
          toast.success(`All meetings already synced (${skipped} skipped)`);
        } else {
          const accountLabel = connectedAccounts === 1 ? "1 account" : `${connectedAccounts} accounts`;
          toast.success(
            `Synced ${synced} new meeting${synced !== 1 ? "s" : ""} from ${accountLabel}${skipped > 0 ? ` (${skipped} already imported)` : ""}`
          );
        }
        if (errors && errors.length > 0) {
          toast.error(`${errors.length} account(s) failed to sync`);
        }
        // Revalidate the meetings list to show newly synced meetings
        mutate(buildUrl(null));
      } else {
        toast.error("Failed to sync meetings");
      }
    } catch {
      toast.error("Failed to sync meetings");
    } finally {
      setSyncing(false);
    }
  }

  // Stats computed from loaded data
  const totalMeetings = allMeetings.length;
  const withTranscripts = allMeetings.filter((m) => m.hasTranscript).length;
  const totalActionItems = allMeetings.reduce((s, m) => s + m.actionItems, 0);
  const now = new Date();
  const thisMonth = allMeetings.filter((m) => {
    const d = new Date(m.meetingDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const hasFilters = !!(search || Object.values(activeFilters).some(Boolean));
  const handleClearFilters = () => {
    setSearch("");
    setActiveFilters({});
    setAllMeetings([]);
    setCursor(null);
  };

  return (
    <div className="space-y-4">
      {/* Header + Filters */}
      <PageHeader
        title="Meetings"
        subtitle={`${allMeetings.length} meetings`}
        actions={
          <SearchFilterBar
            filters={MEETING_FILTERS}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            activeFilters={activeFilters}
          >
            <ExportButton
              data={allMeetings.map((m) => ({
                id: m.id,
                title: m.title,
                date: formatDate(m.meetingDate),
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
            {/* Sync Meetings button — triggers Fireflies sync for all connected accounts */}
            <button
              onClick={handleSyncMeetings}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              title="Sync meetings from all connected Fireflies accounts"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Meetings"}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
            >
              + Log Meeting
            </button>
          </SearchFilterBar>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Meetings" value={String(totalMeetings)} small />
        <StatCard label="With Transcripts" value={String(withTranscripts)} sub={`${totalMeetings > 0 ? Math.round((withTranscripts / totalMeetings) * 100) : 0}% have transcripts`} small />
        <StatCard label="Total Action Items" value={String(totalActionItems)} small />
        <StatCard label="This Month" value={String(thisMonth)} small />
      </div>

      {/* Meeting Cards */}
      {isLoading && allMeetings.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/4" />
            </div>
          ))}
        </div>
      ) : allMeetings.length === 0 ? (
        <EmptyState
          icon={<Video className="h-10 w-10" />}
          title={hasFilters ? "No results match your filters" : "No meetings yet"}
          description={!hasFilters ? "Log your first meeting or connect Fireflies to start importing" : undefined}
          action={!hasFilters ? { label: "+ Log Meeting", onClick: () => setShowCreate(true) } : undefined}
          filtered={hasFilters}
          onClearFilters={hasFilters ? handleClearFilters : undefined}
        />
      ) : (
        <div className="space-y-2">
          {allMeetings.map((m) => (
            <MeetingDetailCard
              key={m.id}
              meeting={m}
              onUpdated={() => mutate(buildUrl(null))}
            />
          ))}
        </div>
      )}

      <LoadMoreButton hasMore={!!cursor} loading={loadingMore} onLoadMore={handleLoadMore} />

      <CreateMeetingForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
