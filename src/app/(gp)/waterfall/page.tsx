"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WaterfallPage() {
  const { data: templates, isLoading } = useSWR("/api/waterfall-templates", fetcher);
  if (isLoading || !templates) return <div className="text-sm text-gray-400">Loading...</div>;

  const tierColors = [
    "bg-emerald-50 border-emerald-200",
    "bg-blue-50 border-blue-200",
    "bg-amber-50 border-amber-200",
    "bg-orange-50 border-orange-200",
    "bg-purple-50 border-purple-200",
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-semibold">Waterfall Configurations</h3>
            <div className="text-xs text-gray-500 mt-0.5">Each entity can have its own waterfall. Fully configurable.</div>
          </div>
          <button className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium">+ New Template</button>
        </div>
        <div className="space-y-3">
          {templates.map((w: { id: string; name: string; description: string; entities: { name: string }[]; tiers: { id: string; name: string; description: string }[] }) => (
            <div key={w.id} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">{w.name}</div>
                <div className="flex gap-1">
                  {w.entities?.map((e) => (
                    <Badge key={e.name} color="indigo">{e.name}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-xs text-gray-600">{w.description || w.tiers?.map((t) => t.name).join(" → ")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed waterfall view for the first template */}
      {templates.length > 0 && templates[0].tiers?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Detailed View — {templates[0].name}</h3>
          <div className="space-y-2">
            {templates[0].tiers.map((t: { id: string; tierOrder: number; name: string; description: string; splitLP: number | null; splitGP: number | null; hurdleRate: number | null; appliesTo: string }, i: number) => (
              <div key={t.id} className={`p-3 rounded-lg border ${tierColors[i % tierColors.length]}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">Tier {t.tierOrder}</span>
                    <span className="text-sm font-semibold">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.appliesTo && <Badge color="gray">{t.appliesTo}</Badge>}
                    <span className="text-xs font-mono text-gray-700">
                      {t.splitLP != null && t.splitGP != null
                        ? `LP: ${t.splitLP}% · GP: ${t.splitGP}%`
                        : t.hurdleRate
                        ? `Hurdle: ${t.hurdleRate}%`
                        : ""}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-600">{t.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
