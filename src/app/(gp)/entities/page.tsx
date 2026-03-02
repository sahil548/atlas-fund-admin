"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";
import { CreateEntityForm } from "@/components/features/entities/create-entity-form";
import { useFirm } from "@/components/providers/firm-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface EntityRow {
  id: string;
  name: string;
  entityType: string;
  vintageYear: number;
  totalCommitments: number;
  totalCalled: number;
  totalDistributed: number;
  status: string;
  formationStatus?: string;
  accountingConnection?: { provider: string; syncStatus: string };
}

export default function EntitiesPage() {
  const { firmId } = useFirm();
  const { data: entities, isLoading } = useSWR<EntityRow[]>(`/api/entities?firmId=${firmId}`, fetcher);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading || !entities) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold">All Entities ({entities.length})</h3>
          <Button onClick={() => setShowCreate(true)}>+ Create Entity</Button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Entity", "Type", "Vintage", "Committed", "Called", "Distributed", "Formation", "Accounting", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entities.map((e) => (
              <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2.5">
                  <Link href={`/entities/${e.id}`} className="font-medium text-indigo-700 hover:underline">{e.name}</Link>
                </td>
                <td className="px-3 py-2.5">
                  <Badge color={e.entityType === "MAIN_FUND" ? "indigo" : e.entityType === "SIDECAR" ? "purple" : "blue"}>
                    {e.entityType.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">{e.vintageYear}</td>
                <td className="px-3 py-2.5">{fmt(e.totalCommitments || 0)}</td>
                <td className="px-3 py-2.5">{fmt(e.totalCalled)}</td>
                <td className="px-3 py-2.5">{fmt(e.totalDistributed)}</td>
                <td className="px-3 py-2.5">
                  {e.formationStatus === "FORMING" && <Badge color="yellow">Forming</Badge>}
                  {e.formationStatus === "FORMED" && <Badge color="green">Formed</Badge>}
                  {e.formationStatus === "REGISTERED" && <Badge color="blue">Registered</Badge>}
                  {(!e.formationStatus || e.formationStatus === "NOT_STARTED") && <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <Badge color={e.accountingConnection?.syncStatus === "CONNECTED" ? "green" : e.accountingConnection?.syncStatus === "ERROR" ? "red" : "gray"}>
                    {e.accountingConnection?.syncStatus || "—"}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/entities/${e.id}`}>
                    <Button variant="secondary" size="sm">View</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateEntityForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
