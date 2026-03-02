"use client";

import { Badge } from "@/components/ui/badge";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DealDocumentsTabProps {
  deal: any;
}

export function DealDocumentsTab({ deal }: DealDocumentsTabProps) {
  const documents = deal.documents || [];

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">
        Documents ({documents.length})
      </h3>
      {documents.length > 0 ? (
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Document", "Category", "Upload Date"].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 font-semibold text-gray-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(documents as any[]).map((d: any) => (
              <tr
                key={d.id}
                className="border-t border-gray-50 hover:bg-gray-50"
              >
                <td className="px-3 py-2.5 font-medium">{d.name}</td>
                <td className="px-3 py-2.5">
                  <Badge color="indigo">
                    {d.category?.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-gray-500">
                  {new Date(d.uploadDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="py-8 text-center text-sm text-gray-400">
          No documents yet.
        </div>
      )}
    </div>
  );
}
