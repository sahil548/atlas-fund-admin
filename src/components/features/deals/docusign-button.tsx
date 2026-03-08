"use client";

import { useState } from "react";
import useSWR from "swr";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { Badge } from "@/components/ui/badge";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  });

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "gray",
  SENT: "blue",
  VIEWED: "yellow",
  PARTIALLY_SIGNED: "orange",
  COMPLETED: "green",
  DECLINED: "red",
  EXPIRED: "gray",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PARTIALLY_SIGNED: "Partially Signed",
  COMPLETED: "Signed",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

interface DocuSignButtonProps {
  /** Document model ID (preferred — for Document Center docs) */
  documentId?: string;
  /** Direct file URL (for closing checklist attachments that aren't Document model records) */
  fileUrl?: string;
  documentName: string;
  dealId?: string;
  entityId?: string;
}

interface Signer {
  name: string;
  email: string;
}

export function DocuSignButton({ documentId, fileUrl, documentName, dealId, entityId }: DocuSignButtonProps) {
  const toast = useToast();
  const { firmId } = useFirm();

  // Check DocuSign connection status
  const { data: connectionData } = useSWR(
    `/api/docusign/status?firmId=${firmId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch existing signature package for this document (only when we have a documentId)
  const { data: packages, mutate: mutatePackages } = useSWR(
    documentId ? `/api/esignature?documentId=${documentId}` : null,
    fetcher
  );

  const [showModal, setShowModal] = useState(false);
  const [signers, setSigners] = useState<Signer[]>([{ name: "", email: "" }]);
  const [sending, setSending] = useState(false);

  const isConnected = connectionData?.connected === true;
  const existingPackage = Array.isArray(packages) ? packages[0] : null;

  function addSigner() {
    setSigners((prev) => [...prev, { name: "", email: "" }]);
  }

  function removeSigner(idx: number) {
    setSigners((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSigner(idx: number, field: keyof Signer, value: string) {
    setSigners((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  async function handleSend() {
    const validSigners = signers.filter((s) => s.name.trim() && s.email.trim());
    if (validSigners.length === 0) {
      toast.error("Please add at least one signer with name and email");
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, any> = {
        title: documentName,
        dealId: dealId ?? null,
        entityId: entityId ?? null,
        signers: validSigners,
      };

      if (documentId) {
        payload.documentId = documentId;
      } else if (fileUrl) {
        payload.fileUrl = fileUrl;
        payload.documentName = documentName;
      }

      const res = await fetch("/api/esignature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Failed to send for signature";
        if (data.code === "DOCUSIGN_NOT_CONNECTED") {
          toast.error("DocuSign not connected. Go to Settings to connect.");
        } else {
          toast.error(msg);
        }
        return;
      }

      toast.success("Document sent for signature via DocuSign");
      setShowModal(false);
      setSigners([{ name: "", email: "" }]);
      if (documentId) mutatePackages();
    } catch {
      toast.error("Failed to send for signature");
    } finally {
      setSending(false);
    }
  }

  // If DocuSign not connected, show connect prompt
  if (!isConnected) {
    return (
      <a
        href="/api/docusign/connect"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        Connect DocuSign
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Existing package status badge */}
      {existingPackage && (
        <Badge color={STATUS_COLORS[existingPackage.status] || "gray"}>
          {STATUS_LABELS[existingPackage.status] || existingPackage.status}
        </Badge>
      )}

      {/* Send / Resend button */}
      {(!existingPackage || existingPackage.status === "DECLINED" || existingPackage.status === "EXPIRED") && (
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          {existingPackage ? "Resend for Signature" : "Send for Signature"}
        </button>
      )}

      {/* Signer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Send for Signature</h3>
              <p className="text-xs text-gray-500 mt-0.5">{documentName}</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Signers</div>
              {signers.map((signer, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      placeholder="Full name"
                      value={signer.name}
                      onChange={(e) => updateSigner(idx, "name", e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={signer.email}
                      onChange={(e) => updateSigner(idx, "email", e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  {signers.length > 1 && (
                    <button
                      onClick={() => removeSigner(idx)}
                      className="mt-1 text-xs text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addSigner}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add another signer
              </button>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => { setShowModal(false); setSigners([{ name: "", email: "" }]); }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {sending && (
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {sending ? "Sending..." : "Send for Signature"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
