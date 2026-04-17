"use client";

import { useFirm } from "@/components/providers/firm-provider";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetcher } from "@/lib/fetcher";
import { fmt, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ActionItem {
  id: string;
  text: string;
}

interface MeetingDetail {
  id: string;
  title: string;
  meetingDate: string;
  source: string;
  meetingType: string | null;
  summary: string | null;
  keywords: string[];
  decisions: {
    actionItemsList?: string[];
    keywords?: string[];
    actionItemsText?: string | null;
  } | null;
  actionItems: number;
  hasTranscript: boolean;
  transcript?: string | null;
  linkedDealId?: string | null;
  linkedEntityId?: string | null;
  linkedAssetId?: string | null;
  deal?: { id: string; name: string } | null;
  entity?: { id: string; name: string } | null;
  asset?: { id: string; name: string } | null;
  error?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  FIREFLIES: "Fireflies",
  MANUAL: "Manual",
  ZOOM: "Zoom",
  TEAMS: "Teams",
};

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { firmId } = useFirm();
  const { data: meeting, isLoading } = useSWR<MeetingDetail>(
    id ? `/api/meetings/${id}?firmId=${firmId}` : null,
    fetcher,
  );

  if (isLoading || !meeting) return <div className="text-sm text-gray-400">Loading...</div>;
  if (meeting.error) return <div className="text-sm text-red-600">{meeting.error}</div>;

  // Extract action items list from decisions blob
  const actionItemsList: string[] =
    meeting.decisions &&
    typeof meeting.decisions === "object" &&
    !Array.isArray(meeting.decisions) &&
    Array.isArray(meeting.decisions.actionItemsList)
      ? meeting.decisions.actionItemsList
      : [];

  // Extract keywords from decisions blob
  const keywords: string[] =
    meeting.decisions &&
    typeof meeting.decisions === "object" &&
    !Array.isArray(meeting.decisions) &&
    Array.isArray(meeting.decisions.keywords)
      ? meeting.decisions.keywords
      : [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back navigation */}
      <Link href="/meetings" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        &larr; Back to Meetings
      </Link>

      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{meeting.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
          <span>{formatDate(meeting.meetingDate)}</span>
          {meeting.meetingType && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <Badge color="purple">{meeting.meetingType}</Badge>
            </>
          )}
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>Source: {SOURCE_LABELS[meeting.source] || meeting.source}</span>
          {meeting.hasTranscript && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-purple-600 dark:text-purple-400 font-medium">Transcript available</span>
            </>
          )}
        </div>
      </header>

      {/* Summary */}
      {meeting.summary && (
        <section className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Summary</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{meeting.summary}</p>
        </section>
      )}

      {/* Action Items */}
      {actionItemsList.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Action Items ({actionItemsList.length})
          </h2>
          <ul className="space-y-1.5">
            {actionItemsList.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="mt-1 w-4 h-4 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
              >
                {kw}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Linked context */}
      {(meeting.deal || meeting.entity || meeting.asset) && (
        <section className="flex flex-wrap gap-3 text-sm">
          {meeting.deal && (
            <Link
              href={`/deals/${meeting.deal.id}`}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-100 dark:border-emerald-800"
            >
              Deal: {meeting.deal.name}
            </Link>
          )}
          {meeting.entity && (
            <Link
              href={`/entities/${meeting.entity.id}`}
              className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-100 dark:border-blue-800"
            >
              Vehicle: {meeting.entity.name}
            </Link>
          )}
          {meeting.asset && (
            <Link
              href={`/assets/${meeting.asset.id}`}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100 dark:border-indigo-800"
            >
              Asset: {meeting.asset.name}
            </Link>
          )}
        </section>
      )}

      {/* Transcript */}
      {meeting.hasTranscript && meeting.transcript && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Transcript</h2>
          <pre className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300 overflow-x-auto">
            {meeting.transcript}
          </pre>
        </section>
      )}
    </div>
  );
}
