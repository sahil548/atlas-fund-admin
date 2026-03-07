"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const COMPANY_TYPE_LABELS: Record<string, string> = {
  GP: "GP",
  LP: "LP",
  COUNTERPARTY: "Counterparty",
  SERVICE_PROVIDER: "Service Provider",
  OPERATING_COMPANY: "Operating Co.",
  OTHER: "Other",
};

const COMPANY_TYPE_COLORS: Record<string, string> = {
  GP: "indigo",
  LP: "blue",
  COUNTERPARTY: "green",
  SERVICE_PROVIDER: "orange",
  OPERATING_COMPANY: "purple",
  OTHER: "gray",
};

function EditCompanyModal({ open, onClose, company }: { open: boolean; onClose: () => void; company: any }) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/companies/${company.id}`, {
    method: "PUT",
    revalidateKeys: [`/api/companies/${company.id}`],
  });
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    type: "OTHER",
    website: "",
    industry: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: company.name || "",
        legalName: company.legalName || "",
        type: company.type || "OTHER",
        website: company.website || "",
        industry: company.industry || "",
        address: company.address || "",
        notes: company.notes || "",
      });
    }
  }, [open, company]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    try {
      await trigger(form);
      toast.success("Company updated");
      mutate(`/api/companies/${company.id}`);
      onClose();
    } catch {
      toast.error("Failed to update company");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Company"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="Company Name" required>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label="Legal Name">
          <Input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} placeholder="Full legal entity name" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type">
            <Select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              options={Object.entries(COMPANY_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
          </FormField>
          <FormField label="Industry">
            <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Financial Services" />
          </FormField>
        </div>
        <FormField label="Website">
          <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://company.com" />
        </FormField>
        <FormField label="Address">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St, City, ST" />
        </FormField>
        <FormField label="Notes">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notes..." rows={2} />
        </FormField>
      </div>
    </Modal>
  );
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading } = useSWR(id ? `/api/companies/${id}` : null, fetcher);
  const [showEdit, setShowEdit] = useState(false);

  if (isLoading || !company) return <div className="text-sm text-gray-400">Loading...</div>;
  if (company.error) return <div className="text-sm text-red-400">Company not found.</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link href="/directory" className="text-xs text-indigo-600 hover:underline mb-1 inline-block">&larr; Back to Directory</Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{company.name}</h2>
            <div className="flex gap-2 mt-1">
              <Badge color={COMPANY_TYPE_COLORS[company.type] || "gray"}>
                {COMPANY_TYPE_LABELS[company.type] || company.type}
              </Badge>
              {company.industry && <Badge color="gray">{company.industry}</Badge>}
            </div>
          </div>
          <Button onClick={() => setShowEdit(true)}>Edit Company</Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase font-semibold">Contacts</div>
          <div className="text-2xl font-bold mt-1">{company.contacts?.length || 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase font-semibold">Investor Profile</div>
          <div className="text-sm font-medium mt-2">
            {company.investorProfile ? (
              <Link href={`/investors/${company.investorProfile.id}`} className="text-indigo-600 hover:underline">
                {company.investorProfile.name}
              </Link>
            ) : (
              <span className="text-gray-400">&mdash;</span>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase font-semibold">Website</div>
          <div className="text-sm font-medium mt-2">
            {company.website ? (
              <span className="text-indigo-600">{company.website.replace(/^https?:\/\//, "")}</span>
            ) : (
              <span className="text-gray-400">&mdash;</span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      {(company.legalName || company.address || company.notes) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {company.legalName && (
              <div>
                <span className="text-gray-500">Legal Name:</span>{" "}
                <span className="font-medium">{company.legalName}</span>
              </div>
            )}
            {company.address && (
              <div>
                <span className="text-gray-500">Address:</span>{" "}
                <span className="font-medium">{company.address}</span>
              </div>
            )}
          </div>
          {company.notes && (
            <div className="mt-3 text-sm">
              <span className="text-gray-500">Notes:</span>{" "}
              <span className="text-gray-700">{company.notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Contacts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold">Contacts at {company.name}</h3>
        </div>
        {company.contacts && company.contacts.length > 0 ? (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Title", "Email", "Phone", "Type"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {company.contacts.map((c: any) => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </span>
                      {c.firstName} {c.lastName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.title || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || "\u2014"}</td>
                  <td className="px-4 py-3">
                    <Badge color={c.type === "INTERNAL" ? "blue" : "gray"}>{c.type}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-sm text-gray-400">No contacts at this company.</div>
        )}
      </div>

      {/* Investor Profile */}
      {company.investorProfile && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Investor Profile</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{company.investorProfile.name}</div>
              <div className="flex gap-2 mt-1">
                <Badge>{company.investorProfile.investorType}</Badge>
                <Badge color={company.investorProfile.kycStatus === "Verified" ? "green" : "red"}>
                  {company.investorProfile.kycStatus}
                </Badge>
              </div>
            </div>
            <Link href={`/investors/${company.investorProfile.id}`}>
              <Button variant="secondary" size="sm">View Investor</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditCompanyModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        company={company}
      />
    </div>
  );
}
