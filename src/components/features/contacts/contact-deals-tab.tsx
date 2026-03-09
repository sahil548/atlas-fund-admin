"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ContactDealsTabProps {
  contact: any;
}

const STAGE_COLORS: Record<string, string> = {
  SCREENING: "yellow",
  DUE_DILIGENCE: "blue",
  IC_REVIEW: "purple",
  CLOSING: "orange",
  CLOSED: "green",
  DEAD: "red",
};

const STAGE_LABELS: Record<string, string> = {
  SCREENING: "Screening",
  DUE_DILIGENCE: "Due Diligence",
  IC_REVIEW: "IC Review",
  CLOSING: "Closing",
  CLOSED: "Closed",
  DEAD: "Dead",
};

const ASSET_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "green",
  EXITED: "gray",
  WRITTEN_OFF: "red",
};

export function ContactDealsTab({ contact }: ContactDealsTabProps) {
  const linkedDeals: any[] = contact.linkedDeals || [];
  const linkedAssets: any[] = contact.linkedAssets || [];

  return (
    <div className="space-y-6">
      {/* Sourced Deals section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Deals Sourced</h3>
        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No sourced deals yet. Deal sourcing attribution will be available in a future update.
          </p>
        </div>
      </div>

      {/* Linked Deals section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Linked Deals
          <span className="ml-2 text-[11px] font-normal text-gray-400">({linkedDeals.length})</span>
        </h3>
        {linkedDeals.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">No linked deals.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Deal", "Stage", "Asset Class", "Target Size"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linkedDeals.map((deal: any) => (
                  <tr key={deal.id} className="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/deals/${deal.id}`} className="text-indigo-700 dark:text-indigo-400 hover:underline">
                        {deal.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STAGE_COLORS[deal.stage] || "gray"}>
                        {STAGE_LABELS[deal.stage] || deal.stage}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={ASSET_CLASS_COLORS[deal.assetClass] || "gray"}>
                        {ASSET_CLASS_LABELS[deal.assetClass] || deal.assetClass}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {deal.targetSize || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Linked Assets section (CRM-04) */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Linked Assets
          <span className="ml-2 text-[11px] font-normal text-gray-400">({linkedAssets.length})</span>
        </h3>
        {linkedAssets.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">No linked assets.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Asset", "Class", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linkedAssets.map((asset: any) => (
                  <tr key={asset.id} className="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/assets/${asset.id}`} className="text-indigo-700 dark:text-indigo-400 hover:underline">
                        {asset.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={ASSET_CLASS_COLORS[asset.assetClass] || "gray"}>
                        {ASSET_CLASS_LABELS[asset.assetClass] || asset.assetClass}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={ASSET_STATUS_COLORS[asset.status] || "gray"}>
                        {asset.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
