"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MeetingsPage() {
  const { data: meetings, isLoading } = useSWR("/api/meetings", fetcher);
  if (isLoading || !meetings) return <div className="text-sm text-gray-400">Loading...</div>;

  const typeColor: Record<string, string> = {
    "IC Meeting": "yellow",
    "DD Session": "blue",
    "GP Review": "purple",
    "Portfolio Review": "green",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Badge color="purple">Fireflies Connected</Badge>
        <span className="text-xs text-gray-500">
          {meetings.filter((m: { hasTranscript: boolean }) => m.hasTranscript).length} transcripts synced
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="space-y-3">
          {meetings.map((m: { id: string; meetingDate: string; meetingType: string; title: string; hasTranscript: boolean; actionItems: number; decisions: string[] | null; asset?: { name: string }; deal?: { name: string } }) => (
            <div key={m.id} className="p-3 border border-gray-100 rounded-lg hover:border-indigo-200 cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">{new Date(m.meetingDate).toLocaleDateString()}</span>
                    <Badge color={typeColor[m.meetingType || ""] || "gray"}>{m.meetingType}</Badge>
                  </div>
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Linked to: <span className="text-indigo-600">{m.asset?.name || m.deal?.name || "—"}</span>
                  </div>
                  {m.decisions && (m.decisions as string[]).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(m.decisions as string[]).map((d: string, i: number) => (
                        <span key={i} className="text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 ml-4">
                  {m.hasTranscript && <Badge color="purple">Transcript</Badge>}
                  <span className="text-[10px] text-gray-500">{m.actionItems} action items</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
