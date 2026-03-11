"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useInvestor } from "@/components/providers/investor-provider";
import { useToast } from "@/components/ui/toast";
import { fmt } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface EntityAffiliation {
  entityId: string;
  entityName: string;
  commitment: number;
}

interface ProfileData {
  investorId: string;
  legalName: string;
  email: string | null;
  phone: string | null;
  mailingAddress: string | null;
  taxId: string | null;
  entityAffiliations: EntityAffiliation[];
}

interface FormState {
  phone: string;
  mailingAddress: string;
  taxId: string;
}

function maskTaxId(taxId: string | null): string {
  if (!taxId) return "Not provided";
  const digits = taxId.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***-**-${digits.slice(-4)}`;
}

export default function LPProfilePage() {
  const { investorId } = useInvestor();
  const toast = useToast();

  const profileUrl = investorId
    ? `/api/investors/${investorId}/profile`
    : null;
  const { data, isLoading } = useSWR<ProfileData>(profileUrl, fetcher);

  const [editing, setEditing] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    phone: "",
    mailingAddress: "",
    taxId: "",
  });

  // Sync form when data loads
  useEffect(() => {
    if (data) {
      setForm({
        phone: data.phone ?? "",
        mailingAddress: data.mailingAddress ?? "",
        taxId: data.taxId ?? "",
      });
    }
  }, [data]);

  if (!investorId || isLoading || !data) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  function handleCancel() {
    setEditing(false);
    setEditingTaxId(false);
    setForm({
      phone: data?.phone ?? "",
      mailingAddress: data?.mailingAddress ?? "",
      taxId: data?.taxId ?? "",
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/investors/${investorId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailingAddress: form.mailingAddress || null,
          taxId: form.taxId || null,
          phone: form.phone || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          typeof body.error === "string" ? body.error : "Failed to save profile";
        toast.error(msg);
        return;
      }

      toast.success("Profile updated");
      setEditing(false);
      setEditingTaxId(false);
      mutate(profileUrl!);
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const isAnyEditing = editing || editingTaxId;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Page header */}
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Your Profile
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          View and manage your investor contact information
        </p>
      </div>

      {/* Legal Name — read-only */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
          Legal Name
        </h3>
        <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {data.legalName}
          </p>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1.5">
          Legal name is managed by the fund administrator
        </p>
      </div>

      {/* Contact Information */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Contact Information
          </h3>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Email — read-only */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Email
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {data.email ?? <span className="text-gray-400 dark:text-gray-500">Not provided</span>}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              Managed via notification preferences
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Phone
            </label>
            {editing ? (
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="e.g. 555-0100"
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {data.phone ?? (
                  <span className="text-gray-400 dark:text-gray-500">Not provided</span>
                )}
              </p>
            )}
          </div>

          {/* Mailing Address */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Mailing Address
            </label>
            {editing ? (
              <textarea
                value={form.mailingAddress}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mailingAddress: e.target.value }))
                }
                placeholder="Enter mailing address"
                rows={3}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            ) : (
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">
                {data.mailingAddress ?? (
                  <span className="text-gray-400 dark:text-gray-500">Not provided</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tax ID — masked, separate edit toggle */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Tax Identification
          </h3>
          {!editingTaxId ? (
            <button
              onClick={() => setEditingTaxId(true)}
              className="px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Tax ID / SSN / EIN
          </label>
          {editingTaxId ? (
            <input
              type="text"
              value={form.taxId}
              onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
              placeholder="XXX-XX-XXXX"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : (
            <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
              {maskTaxId(data.taxId)}
            </p>
          )}
          <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1.5">
            Your tax ID is encrypted and displayed in masked format for security
          </p>
        </div>
      </div>

      {/* Entity Affiliations — read-only */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
          Entity Affiliations
        </h3>
        {data.entityAffiliations.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No entity affiliations found
          </p>
        ) : (
          <div className="space-y-2">
            {data.entityAffiliations.map((aff) => (
              <div
                key={aff.entityId}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {aff.entityName}
                  </p>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {aff.commitment ? fmt(aff.commitment) : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
          Entity affiliations are managed by the fund administrator
        </p>
      </div>

      {/* Save button at bottom when editing */}
      {isAnyEditing && (
        <div className="flex justify-end gap-2 pb-4">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel All
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
