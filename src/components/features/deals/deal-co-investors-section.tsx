"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { fmt } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const ROLE_OPTIONS = [
  { value: "Lead", label: "Lead" },
  { value: "Participant", label: "Participant" },
  { value: "Syndicate Member", label: "Syndicate Member" },
];

const STATUS_OPTIONS = [
  { value: "Interested", label: "Interested" },
  { value: "Committed", label: "Committed" },
  { value: "Funded", label: "Funded" },
  { value: "Passed", label: "Passed" },
];

const STATUS_COLORS: Record<string, string> = {
  Interested: "gray",
  Committed: "blue",
  Funded: "green",
  Passed: "red",
};

const ROLE_COLORS: Record<string, string> = {
  Lead: "indigo",
  Participant: "purple",
  "Syndicate Member": "orange",
};

interface CoInvestorFormState {
  mode: "contact" | "company";
  searchQuery: string;
  selectedContactId: string;
  selectedContactName: string;
  selectedCompanyId: string;
  selectedCompanyName: string;
  role: string;
  allocation: string;
  status: string;
  notes: string;
}

const defaultForm = (): CoInvestorFormState => ({
  mode: "contact",
  searchQuery: "",
  selectedContactId: "",
  selectedContactName: "",
  selectedCompanyId: "",
  selectedCompanyName: "",
  role: "Participant",
  allocation: "",
  status: "Interested",
  notes: "",
});

interface Props {
  dealId: string;
}

export function DealCoInvestorsSection({ dealId }: Props) {
  const { firmId } = useFirm();
  const toast = useToast();

  const coInvestorsKey = `/api/deals/${dealId}/co-investors?firmId=${firmId}`;
  const { data: coInvestors, isLoading } = useSWR(coInvestorsKey, fetcher);

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<CoInvestorFormState>(defaultForm());
  const [addLoading, setAddLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: "", allocation: "", status: "", notes: "" });
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Search contacts/companies ──
  async function handleSearch(query: string) {
    setAddForm((p) => ({ ...p, searchQuery: query, selectedContactId: "", selectedContactName: "", selectedCompanyId: "", selectedCompanyName: "" }));
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    try {
      const endpoint =
        addForm.mode === "contact"
          ? `/api/contacts?firmId=${firmId}&search=${encodeURIComponent(query)}`
          : `/api/companies?firmId=${firmId}&search=${encodeURIComponent(query)}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      const results =
        addForm.mode === "contact"
          ? (data.contacts || data || []).map((c: any) => ({
              id: c.id,
              label: `${c.firstName} ${c.lastName}${c.email ? ` — ${c.email}` : ""}`,
            }))
          : (data.companies || data || []).map((c: any) => ({
              id: c.id,
              label: c.name,
            }));
      setSearchResults(results);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function selectResult(item: { id: string; label: string }) {
    if (addForm.mode === "contact") {
      setAddForm((p) => ({ ...p, selectedContactId: item.id, selectedContactName: item.label, searchQuery: item.label }));
    } else {
      setAddForm((p) => ({ ...p, selectedCompanyId: item.id, selectedCompanyName: item.label, searchQuery: item.label }));
    }
    setShowDropdown(false);
    setSearchResults([]);
  }

  // ── Add co-investor ──
  async function handleAdd() {
    const hasEntity = addForm.mode === "contact" ? !!addForm.selectedContactId : !!addForm.selectedCompanyId;
    if (!hasEntity) {
      toast.error("Please select a contact or company");
      return;
    }
    if (!addForm.role || !addForm.status) {
      toast.error("Role and status are required");
      return;
    }
    setAddLoading(true);
    try {
      const payload: Record<string, unknown> = {
        role: addForm.role,
        status: addForm.status,
        notes: addForm.notes || undefined,
        allocation: addForm.allocation ? parseFloat(addForm.allocation) : undefined,
      };
      if (addForm.mode === "contact") {
        payload.contactId = addForm.selectedContactId;
      } else {
        payload.companyId = addForm.selectedCompanyId;
      }
      const res = await fetch(`/api/deals/${dealId}/co-investors?firmId=${firmId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.error === "string" ? err.error : "Failed to add co-investor";
        toast.error(msg);
        return;
      }
      toast.success("Co-investor added");
      mutate(coInvestorsKey);
      setShowAdd(false);
      setAddForm(defaultForm());
    } catch {
      toast.error("Failed to add co-investor");
    } finally {
      setAddLoading(false);
    }
  }

  // ── Edit co-investor ──
  function openEdit(ci: any) {
    setEditingId(ci.id);
    setEditForm({
      role: ci.role,
      allocation: ci.allocation != null ? String(ci.allocation) : "",
      status: ci.status,
      notes: ci.notes || "",
    });
  }

  async function handleEdit() {
    if (!editingId) return;
    setEditLoading(true);
    try {
      const payload: Record<string, unknown> = {
        role: editForm.role || undefined,
        status: editForm.status || undefined,
        notes: editForm.notes || null,
        allocation: editForm.allocation ? parseFloat(editForm.allocation) : null,
      };
      const res = await fetch(`/api/deals/${dealId}/co-investors/${editingId}?firmId=${firmId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.error === "string" ? err.error : "Failed to update co-investor";
        toast.error(msg);
        return;
      }
      toast.success("Co-investor updated");
      mutate(coInvestorsKey);
      setEditingId(null);
    } catch {
      toast.error("Failed to update co-investor");
    } finally {
      setEditLoading(false);
    }
  }

  // ── Delete co-investor ──
  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/co-investors/${deleteId}?firmId=${firmId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to remove co-investor");
        return;
      }
      toast.success("Co-investor removed");
      mutate(coInvestorsKey);
    } catch {
      toast.error("Failed to remove co-investor");
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  }

  const list: any[] = coInvestors || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Co-Investors
          <span className="ml-2 text-[11px] font-normal text-gray-400">({list.length})</span>
        </h3>
        <Button size="sm" onClick={() => { setShowAdd(true); setAddForm(defaultForm()); }}>
          + Add Co-Investor
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : list.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No co-investors added. Add co-investors to track deal participation.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {["Name", "Role", "Allocation", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((ci: any) => {
                const name = ci.contact
                  ? `${ci.contact.firstName} ${ci.contact.lastName}`
                  : ci.company?.name || "Unknown";
                const href = ci.contact
                  ? `/contacts/${ci.contact.id}`
                  : ci.company
                  ? `/directory?company=${ci.company.id}`
                  : "#";

                return (
                  <tr
                    key={ci.id}
                    className="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link href={href} className="text-indigo-700 dark:text-indigo-400 hover:underline">
                        {name}
                      </Link>
                      {ci.notes && (
                        <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[160px]" title={ci.notes}>
                          {ci.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={ROLE_COLORS[ci.role] || "gray"}>{ci.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {ci.allocation != null ? fmt(ci.allocation) : "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLORS[ci.status] || "gray"}>{ci.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(ci)}
                          className="text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(ci.id)}
                          className="text-[11px] text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Co-Investor Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setAddForm(defaultForm()); setShowDropdown(false); }}
        title="Add Co-Investor"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAdd(false); setAddForm(defaultForm()); }}>
              Cancel
            </Button>
            <Button loading={addLoading} onClick={handleAdd}>
              Add Co-Investor
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Contact or Company toggle */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Type
            </div>
            <div className="flex gap-2">
              {(["contact", "company"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setAddForm((p) => ({ ...defaultForm(), mode: m }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    addForm.mode === m
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-indigo-300"
                  }`}
                >
                  {m === "contact" ? "Contact" : "Company"}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <FormField label={addForm.mode === "contact" ? "Search Contact" : "Search Company"}>
            <div className="relative">
              <Input
                value={addForm.searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={addForm.mode === "contact" ? "Type name or email..." : "Type company name..."}
              />
              {searchLoading && (
                <div className="absolute right-3 top-2.5 text-xs text-gray-400">Searching...</div>
              )}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectResult(item)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && searchResults.length === 0 && !searchLoading && addForm.searchQuery.length >= 2 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg px-3 py-2">
                  <span className="text-xs text-gray-400">No results found</span>
                </div>
              )}
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Role">
              <Select
                value={addForm.role}
                onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
                options={ROLE_OPTIONS}
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={addForm.status}
                onChange={(e) => setAddForm((p) => ({ ...p, status: e.target.value }))}
                options={STATUS_OPTIONS}
              />
            </FormField>
          </div>

          <FormField label="Allocation ($)" >
            <Input
              type="number"
              value={addForm.allocation}
              onChange={(e) => setAddForm((p) => ({ ...p, allocation: e.target.value }))}
              placeholder="e.g. 5000000"
            />
          </FormField>

          <FormField label="Notes">
            <Textarea
              value={addForm.notes}
              onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
            />
          </FormField>
        </div>
      </Modal>

      {/* Edit Co-Investor Modal */}
      <Modal
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title="Edit Co-Investor"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button loading={editLoading} onClick={handleEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Role">
              <Select
                value={editForm.role}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                options={ROLE_OPTIONS}
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={editForm.status}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                options={STATUS_OPTIONS}
              />
            </FormField>
          </div>
          <FormField label="Allocation ($)">
            <Input
              type="number"
              value={editForm.allocation}
              onChange={(e) => setEditForm((p) => ({ ...p, allocation: e.target.value }))}
              placeholder="e.g. 5000000"
            />
          </FormField>
          <FormField label="Notes">
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
            />
          </FormField>
        </div>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove Co-Investor"
        message="Are you sure you want to remove this co-investor from the deal?"
        confirmLabel="Remove"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
