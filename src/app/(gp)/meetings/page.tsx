"use client";

import { useState } from "react";
import useSWR from "swr";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { CreateMeetingForm } from "@/components/features/meetings/create-meeting-form";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  "IC Meeting": "red",
  "DD Session": "orange",
  "GP Review": "purple",
  "Portfolio Review": "blue",
  "Board Meeting": "indigo",
};

const SOURCE_COLORS: Record<string, string> = {
  FIREFLIES: "purple",
  MANUAL: "gray",
  ZOOM: "blue",
  TEAMS: "indigo",
};

const SOURCE_LABELS: Record<string, string> = {
  FIREFLIES: "Fireflies",
  MANUAL: "Manual",
  ZOOM: "Zoom",
  TEAMS: "Teams",
};

export default function MeetingsPage() {
  const { data: meetings = [] } = useSWR<Meeting[]>("/api/meetings", fetcher);

  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Stats
  const totalMeetings = meetings.length;
  const withTranscripts = meetings.filter((m) => m.hasTranscript).length;
  const totalActionItems = meetings.reduce((s, m) => s + m.actionItems, 0);
  const now = new Date();
  const thisMonth = meetings.filter((m) => {
    const d = new Date(m.meetingDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Filtered meetings
  const filtered = meetings.filter((m) => {
    if (typeFilter && m.meetingType !== typeFilter) return false;
    if (sourceFilter && m.source !== sourceFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Types</option>
          {MEETING_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s] || s}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search meetings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Meeting Cards */}
      <div className="space-y-2">
        {filtered.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-4">
              {/* Left side */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900">{m.title}</h3>
                  {m.meetingType && (
                    <Badge color={TYPE_COLORS[m.meetingType] || "gray"}>{m.meetingType}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span>{new Date(m.meetingDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                  <span className="text-gray-300">|</span>
                  <Badge color={SOURCE_COLORS[m.source] || "gray"}>{SOURCE_LABELS[m.source] || m.source}</Badge>
                  <span className="text-gray-300">|</span>
                  <span>{m.hasTranscript ? "✓ Transcript" : "— No transcript"}</span>
                  <span className="text-gray-300">|</span>
                  <span>{m.actionItems} action item{m.actionItems !== 1 ? "s" : ""}</span>
                </div>
                {/* Linked asset/deal/entity */}
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
                {/* Decisions */}
                {m.decisions && Array.isArray(m.decisions) && m.decisions.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Decisions:</span>
                    {m.decisions.map((d, i) => (
                      <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
            No meetings found. Log your first meeting to get started.
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateMeetingForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
