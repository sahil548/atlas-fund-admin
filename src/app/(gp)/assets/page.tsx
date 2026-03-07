"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditAssetForm } from "@/components/features/assets/edit-asset-form";
import { fmt, pct } from "@/lib/utils";
import { useFirm } from "@/components/providers/firm-provider";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
  CAPITAL_INSTRUMENT_LABELS,
  PARTICIPATION_LABELS,
  PARTICIPATION_COLORS,
} from "@/lib/constants";

export default function AssetsPage() {
  const { firmId } = useFirm();
  const { data: assets, isLoading } = useSWR(`/api/assets?firmId=${firmId}`, fetcher);
  const [filter, setFilter] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingAsset, setEditingAsset] = useState<any>(null);
  if (isLoading || !assets) return <div className="text-sm text-gray-400">Loading...</div>;

  const filtered = filter ? assets.filter((a: { assetClass: string }) => a.assetClass === filter) : assets;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-sm font-semibold">All Assets ({filtered.length})</h3>
        <div className="flex gap-1">
          {Object.entries(ASSET_CLASS_LABELS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setFilter(filter === k ? null : k)}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                filter === k
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            {["Asset", "Asset Class", "Instrument", "Participation", "Sector", "Entities", "Cost Basis", "Fair Value", "Unrealized", "MOIC", "IRR", "Status", ""].map((h) => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((a: { id: string; name: string; assetClass: string; capitalInstrument?: string; participationStructure?: string; sector: string; entityAllocations: { entity: { name: string } }[]; costBasis: number; fairValue: number; moic: number; irr: number; incomeType: string; status: string }) => {
            const ur = a.fairValue - a.costBasis;
            return (
              <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/assets/${a.id}`}>
                <td className="px-3 py-2.5 font-medium text-indigo-700">{a.name}</td>
                <td className="px-3 py-2.5"><Badge color={ASSET_CLASS_COLORS[a.assetClass]}>{ASSET_CLASS_LABELS[a.assetClass]}</Badge></td>
                <td className="px-3 py-2.5">{a.capitalInstrument ? <Badge color={a.capitalInstrument === "DEBT" ? "orange" : "blue"}>{CAPITAL_INSTRUMENT_LABELS[a.capitalInstrument]}</Badge> : <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2.5">{a.participationStructure ? <Badge color={PARTICIPATION_COLORS[a.participationStructure] || "gray"}>{PARTICIPATION_LABELS[a.participationStructure] || a.participationStructure}</Badge> : <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2.5 text-gray-600">{a.sector}</td>
                <td className="px-3 py-2.5">
                  {a.entityAllocations?.map((ea) => (
                    <span key={ea.entity.name} className="text-[10px] bg-gray-100 px-1 py-0.5 rounded mr-1">{ea.entity.name}</span>
                  ))}
                </td>
                <td className="px-3 py-2.5">{fmt(a.costBasis)}</td>
                <td className="px-3 py-2.5 font-medium">{fmt(a.fairValue)}</td>
                <td className={`px-3 py-2.5 font-medium ${ur > 0 ? "text-emerald-700" : "text-gray-500"}`}>
                  {ur > 0 ? "+" : ""}{fmt(ur)}
                </td>
                <td className={`px-3 py-2.5 font-medium ${(a.moic || 0) >= 2 ? "text-emerald-600" : ""}`}>
                  {a.moic?.toFixed(2)}x
                </td>
                <td className="px-3 py-2.5 text-emerald-700">{a.irr ? pct(a.irr) : "—"}</td>
                <td className="px-3 py-2.5"><Badge color={a.status === "ACTIVE" ? "green" : "purple"}>{a.status.toLowerCase()}</Badge></td>
                <td className="px-3 py-2.5">
                  <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setEditingAsset(a); setShowEdit(true); }}>Edit</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editingAsset && (
        <EditAssetForm open={showEdit} onClose={() => { setShowEdit(false); setEditingAsset(null); }} asset={editingAsset} />
      )}
    </div>
  );
}
