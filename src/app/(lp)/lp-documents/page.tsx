"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { useInvestor } from "@/components/providers/investor-provider";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const categoryColor: Record<string, string> = {
  FINANCIAL: "indigo",
  LEGAL: "orange",
  TAX: "green",
  REPORT: "blue",
  CORRESPONDENCE: "purple",
  BOARD: "purple",
  GOVERNANCE: "blue",
  VALUATION: "green",
  STATEMENT: "indigo",
  OTHER: "gray",
};

export default function LPDocumentsPage() {
  const { investorId } = useInvestor();
  const { data, isLoading } = useSWR(
    investorId ? `/api/lp/${investorId}/documents` : null,
    fetcher
  );
  if (!investorId || isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

  const docs = Array.isArray(data) ? data : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold mb-1">Document Center</h3>
      <div className="text-xs text-gray-500 mb-4">
        Reports, statements, and correspondence for your entities
      </div>

      {docs.length === 0 && (
        <div className="text-xs text-gray-400 py-4 text-center">No documents available.</div>
      )}

      <div className="divide-y divide-gray-100">
        {docs.map((doc: {
          id: string;
          name: string;
          category: string;
          uploadDate: string;
          fileSize: number | null;
          entity: { name: string } | null;
        }) => (
          <div key={doc.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500">
                PDF
              </div>
              <div>
                <div className="text-sm font-medium">{doc.name}</div>
                <div className="text-xs text-gray-500">
                  {doc.entity?.name || "General"} · {new Date(doc.uploadDate).toLocaleDateString()}
                  {doc.fileSize ? ` · ${(doc.fileSize / 1024).toFixed(0)} KB` : ""}
                </div>
              </div>
            </div>
            <Badge color={categoryColor[doc.category] || "gray"}>
              {doc.category?.toLowerCase() || "other"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
