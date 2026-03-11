"use client";

import useSWR from "swr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
} from "@/lib/constants";
import { useInvestor } from "@/components/providers/investor-provider";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface EntityMetric {
  entityId: string;
  entityName: string;
  commitment: number;
  calledAmount: number;
  irr: number | null;
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  nav: number;
  totalCalled: number;
  totalDistributed: number;
}

interface EntitySnapshot {
  entityId: string;
  snapshots: { periodDate: string; irr: number | null; tvpi: number | null }[];
}

function Sparkline({ data }: { data: { v: number | null }[] }) {
  if (data.length < 2) return null;
  return (
    <ResponsiveContainer width={60} height={24}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="#4f46e5"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function LPPortfolioPage() {
  const { investorId } = useInvestor();
  const { data, isLoading } = useSWR(
    investorId ? `/api/lp/${investorId}/portfolio` : null,
    fetcher
  );
  const { data: dashboard } = useSWR(
    investorId ? `/api/lp/${investorId}/dashboard` : null,
    fetcher
  );

  if (!investorId || isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

  const allAssets = data.assets || [];
  const entityMetrics: EntityMetric[] = dashboard?.entityMetrics ?? [];
  const entitySnapshotHistory: EntitySnapshot[] = dashboard?.entitySnapshotHistory ?? [];

  // Build snapshot lookup by entityId
  const snapshotByEntity = new Map<string, { v: number | null }[]>();
  for (const es of entitySnapshotHistory) {
    snapshotByEntity.set(
      es.entityId,
      es.snapshots.map((s) => ({ v: s.tvpi }))
    );
  }

  return (
    <div className="space-y-5">
      {/* Per-Entity Performance Section — LP-07 */}
      {entityMetrics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold mb-1 dark:text-gray-100">Fund Performance</h3>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Per-entity IRR, TVPI, DPI, RVPI and NAV
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {entityMetrics.map((em) => {
              const sparkData = snapshotByEntity.get(em.entityId) ?? [];
              return (
                <Link
                  key={em.entityId}
                  href={`/lp-account?entityId=${em.entityId}`}
                  className="block"
                >
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{em.entityName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Committed: {fmt(em.commitment)} · Called: {fmt(em.totalCalled)}
                        </div>
                      </div>
                      {sparkData.length >= 2 && (
                        <div className="flex-shrink-0 ml-3">
                          <Sparkline data={sparkData} />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500 dark:text-gray-400">IRR</div>
                        <div className={`font-semibold mt-0.5 ${em.irr != null && em.irr > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-gray-400"}`}>
                          {em.irr != null ? `${(em.irr * 100).toFixed(1)}%` : "---"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500 dark:text-gray-400">TVPI</div>
                        <div className={`font-semibold mt-0.5 ${em.tvpi != null && em.tvpi > 1 ? "text-emerald-700 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300"}`}>
                          {em.tvpi != null ? `${em.tvpi.toFixed(2)}x` : "---"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500 dark:text-gray-400">DPI</div>
                        <div className="font-semibold mt-0.5 text-gray-700 dark:text-gray-300">
                          {em.dpi != null ? `${em.dpi.toFixed(2)}x` : "---"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500 dark:text-gray-400">RVPI</div>
                        <div className="font-semibold mt-0.5 text-gray-700 dark:text-gray-300">
                          {em.rvpi != null ? `${em.rvpi.toFixed(2)}x` : "---"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500 dark:text-gray-400">NAV</div>
                        <div className="font-semibold mt-0.5 text-gray-700 dark:text-gray-300">
                          {fmt(em.nav)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Portfolio Look-Through */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold dark:text-gray-100 mb-1">Portfolio Look-Through</h3>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Your pro-rata exposure to underlying assets ({allAssets.length} assets)
        </div>
        <div className="space-y-3">
          {allAssets.map(({ asset: a, proRata, investorPct }: { asset: { id: string; name: string; assetClass: string; sector: string; fairValue: number; moic: number; incomeType: string; status: string }; proRata: number; investorPct: number }) => (
            <div key={a.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge color={ASSET_CLASS_COLORS[a.assetClass]}>{ASSET_CLASS_LABELS[a.assetClass]}</Badge>
                  <span className="text-sm font-semibold dark:text-gray-100">{a.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold dark:text-gray-100">{fmt(proRata)}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Your pro-rata ({(investorPct * 100).toFixed(1)}%)</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div><span className="text-gray-500 dark:text-gray-400">Sector:</span> <span className="font-medium dark:text-gray-200">{a.sector}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">MOIC:</span> <span className={`font-medium ${a.moic >= 2 ? "text-emerald-600" : "dark:text-gray-200"}`}>{a.moic?.toFixed(2)}x</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">Income:</span> <span className="font-medium dark:text-gray-200">{a.incomeType || "—"}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">Status:</span> <Badge color="green">{a.status.toLowerCase()}</Badge></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
