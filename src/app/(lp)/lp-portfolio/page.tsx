"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const INVESTOR_ID = "investor-1";

const TC: Record<string, string> = {
  DIRECT_EQUITY: "indigo", PRIVATE_CREDIT: "orange", REAL_ESTATE_DIRECT: "green",
  FUND_LP_POSITION: "purple", CO_INVESTMENT: "blue",
};
const TL: Record<string, string> = {
  DIRECT_EQUITY: "Equity", PRIVATE_CREDIT: "Credit", REAL_ESTATE_DIRECT: "Real Estate",
  FUND_LP_POSITION: "Fund LP", CO_INVESTMENT: "Co-Invest",
};

export default function LPPortfolioPage() {
  const { data, isLoading } = useSWR(`/api/lp/${INVESTOR_ID}/portfolio`, fetcher);
  if (isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

  // Flatten all assets from all entity commitments
  const allAssets: { asset: { id: string; name: string; assetType: string; sector: string; fairValue: number; moic: number; incomeType: string; status: string }; proRata: number }[] = [];
  const seen = new Set<string>();
  data.commitments?.forEach((c: { entity: { assetAllocations: { asset: { id: string; name: string; assetType: string; sector: string; fairValue: number; moic: number; incomeType: string; status: string } }[] } }) => {
    c.entity?.assetAllocations?.forEach((aa: { asset: { id: string; name: string; assetType: string; sector: string; fairValue: number; moic: number; incomeType: string; status: string } }) => {
      if (!seen.has(aa.asset.id) && aa.asset.status === "ACTIVE") {
        seen.add(aa.asset.id);
        allAssets.push({ asset: aa.asset, proRata: aa.asset.fairValue * 0.15 });
      }
    });
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold mb-1">Portfolio Look-Through</h3>
      <div className="text-xs text-gray-500 mb-4">Your pro-rata exposure to underlying assets</div>
      <div className="space-y-3">
        {allAssets.slice(0, 8).map(({ asset: a, proRata }) => (
          <div key={a.id} className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge color={TC[a.assetType]}>{TL[a.assetType]}</Badge>
                <span className="text-sm font-semibold">{a.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{fmt(proRata)}</div>
                <div className="text-[10px] text-gray-500">Your pro-rata</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div><span className="text-gray-500">Sector:</span> <span className="font-medium">{a.sector}</span></div>
              <div><span className="text-gray-500">MOIC:</span> <span className={`font-medium ${a.moic >= 2 ? "text-emerald-600" : ""}`}>{a.moic?.toFixed(2)}x</span></div>
              <div><span className="text-gray-500">Income:</span> <span className="font-medium">{a.incomeType || "—"}</span></div>
              <div><span className="text-gray-500">Status:</span> <Badge color="green">{a.status.toLowerCase()}</Badge></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
