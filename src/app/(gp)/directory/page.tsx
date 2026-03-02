"use client";

import { useState } from "react";
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
import { fmt } from "@/lib/utils";
import { CreateInvestorForm } from "@/components/features/investors/create-investor-form";
import { EditInvestorForm } from "@/components/features/investors/edit-investor-form";
import { useFirm } from "@/components/providers/firm-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* eslint-disable @typescript-eslint/no-explicit-any */

type InvestorRow = { id: string; name: string; investorType: string; totalCommitted: number; commitments: { entity: { name: string } }[]; kycStatus: string; advisoryBoard: boolean; contactPreference: string; contact?: { id: string; firstName: string; lastName: string; email: string } | null; company?: { id: string; name: string; type: string } | null };

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

const CONTACT_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Internal",
  EXTERNAL: "External",
};

export default function DirectoryPage() {
  const { firmId } = useFirm();
  const [tab, setTab] = useState<"investors" | "companies" | "contacts" | "team" | "sideLetters">("investors");
  const toast = useToast();

  // Data fetching
  const { data: investors, isLoading: investorsLoading } = useSWR(`/api/investors?firmId=${firmId}`, fetcher);
  const { data: companies } = useSWR(`/api/companies?firmId=${firmId}`, fetcher);
  const { data: contacts } = useSWR(`/api/contacts?firmId=${firmId}`, fetcher);
  const { data: users } = useSWR(`/api/users?firmId=${firmId}`, fetcher);
  const { data: sideLetters } = useSWR("/api/side-letters", fetcher);

  // Investor modals
  const [showCreateInvestor, setShowCreateInvestor] = useState(false);
  const [showEditInvestor, setShowEditInvestor] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<InvestorRow | null>(null);

  // Create company modal
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: "", type: "OTHER", industry: "", website: "", notes: "" });

  // Create contact modal
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", email: "", phone: "", title: "", type: "EXTERNAL", companyId: "", notes: "" });

  async function handleCreateCompany() {
    try {
      await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...companyForm, firmId }),
      });
      toast.success("Company created");
      mutate(`/api/companies?firmId=${firmId}`);
      setShowCreateCompany(false);
      setCompanyForm({ name: "", type: "OTHER", industry: "", website: "", notes: "" });
    } catch {
      toast.error("Failed to create company");
    }
  }

  async function handleCreateContact() {
    try {
      await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contactForm, firmId }),
      });
      toast.success("Contact created");
      mutate(`/api/contacts?firmId=${firmId}`);
      setShowCreateContact(false);
      setContactForm({ firstName: "", lastName: "", email: "", phone: "", title: "", type: "EXTERNAL", companyId: "", notes: "" });
    } catch {
      toast.error("Failed to create contact");
    }
  }

  async function addInvestorProfile(type: "contact" | "company", record: any) {
    const name = type === "contact" ? `${record.firstName} ${record.lastName}` : record.name;
    try {
      await fetch("/api/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          investorType: type === "contact" ? "Individual" : "Institutional",
          [type === "contact" ? "contactId" : "companyId"]: record.id,
        }),
      });
      toast.success(`Investor profile created for ${name}`);
      mutate(`/api/investors?firmId=${firmId}`);
      mutate(`/api/${type === "contact" ? "contacts" : "companies"}?firmId=${firmId}`);
    } catch {
      toast.error("Failed to create investor profile");
    }
  }

  const tabs = [
    { key: "investors" as const, label: "Investors", count: investors?.length || 0 },
    { key: "companies" as const, label: "Companies", count: companies?.length || 0 },
    { key: "contacts" as const, label: "Contacts", count: contacts?.length || 0 },
    { key: "team" as const, label: "Team", count: users?.length || 0 },
    { key: "sideLetters" as const, label: "Side Letters", count: sideLetters?.length || 0 },
  ];

  if (investorsLoading || !investors) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                tab === t.key
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        {tab === "investors" && (
          <Button onClick={() => setShowCreateInvestor(true)}>+ Add Investor</Button>
        )}
        {tab === "companies" && (
          <Button onClick={() => setShowCreateCompany(true)}>+ Add Company</Button>
        )}
        {tab === "contacts" && (
          <Button onClick={() => setShowCreateContact(true)}>+ Add Contact</Button>
        )}
      </div>

      {/* Investors Tab */}
      {tab === "investors" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Investor", "Type", "Total Committed", "Entities", "KYC", "Linked To", "Advisory", "Pref. Contact", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {investors.map((inv: InvestorRow) => (
                <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer">
                  <td className="px-3 py-2.5 font-medium"><Link href={`/investors/${inv.id}`} className="text-indigo-700 hover:underline font-medium">{inv.name}</Link></td>
                  <td className="px-3 py-2.5"><Badge>{inv.investorType}</Badge></td>
                  <td className="px-3 py-2.5 font-medium">{fmt(inv.totalCommitted)}</td>
                  <td className="px-3 py-2.5">
                    {inv.commitments?.map((c) => (
                      <span key={c.entity.name} className="text-[10px] bg-gray-100 px-1 py-0.5 rounded mr-1">{c.entity.name}</span>
                    ))}
                  </td>
                  <td className="px-3 py-2.5"><Badge color={inv.kycStatus === "Verified" ? "green" : "red"}>{inv.kycStatus}</Badge></td>
                  <td className="px-3 py-2.5">
                    {inv.contact ? (
                      <span className="text-xs text-indigo-600">{inv.contact.firstName} {inv.contact.lastName}</span>
                    ) : inv.company ? (
                      <span className="text-xs text-indigo-600">{inv.company.name}</span>
                    ) : (
                      <span className="text-gray-400">\u2014</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{inv.advisoryBoard ? <Badge color="indigo">Yes</Badge> : <span className="text-gray-400">\u2014</span>}</td>
                  <td className="px-3 py-2.5"><Badge color={inv.contactPreference === "text" ? "purple" : "blue"}>{inv.contactPreference === "text" ? "Text" : "Email"}</Badge></td>
                  <td className="px-3 py-2.5">
                    <button
                      className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                      onClick={(e) => { e.stopPropagation(); setEditingInvestor(inv); setShowEditInvestor(true); }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Companies Tab */}
      {tab === "companies" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Company", "Type", "Industry", "Contacts", "Investor", "Website", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(companies || []).map((c: any) => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-indigo-700">{c.name}</td>
                  <td className="px-4 py-3">
                    <Badge color={COMPANY_TYPE_COLORS[c.type] || "gray"}>
                      {COMPANY_TYPE_LABELS[c.type] || c.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.industry || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600">{c._count?.contacts || 0}</td>
                  <td className="px-4 py-3">
                    {c.investorProfile ? (
                      <Link href={`/investors/${c.investorProfile.id}`}>
                        <Badge color="green">Investor</Badge>
                      </Link>
                    ) : (
                      <button
                        onClick={() => addInvestorProfile("company", c)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        + Add Investor Profile
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.website ? (
                      <span className="text-indigo-600 hover:underline cursor-pointer">{c.website.replace(/^https?:\/\//, "")}</span>
                    ) : "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="secondary" size="sm" onClick={() => {}}>View</Button>
                  </td>
                </tr>
              ))}
              {(!companies || companies.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No companies yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Contacts Tab */}
      {tab === "contacts" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Title", "Company", "Email", "Phone", "Type", "Investor", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(contacts || []).map((c: any) => (
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
                  <td className="px-4 py-3 text-indigo-600">{c.company?.name || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || "\u2014"}</td>
                  <td className="px-4 py-3">
                    <Badge color={c.type === "INTERNAL" ? "blue" : "gray"}>
                      {CONTACT_TYPE_LABELS[c.type] || c.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {c.investorProfile ? (
                      <Link href={`/investors/${c.investorProfile.id}`}>
                        <Badge color="green">Investor</Badge>
                      </Link>
                    ) : (
                      <button
                        onClick={() => addInvestorProfile("contact", c)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        + Add Investor Profile
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="secondary" size="sm" onClick={() => {}}>Edit</Button>
                  </td>
                </tr>
              ))}
              {(!contacts || contacts.length === 0) && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No contacts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Team Tab */}
      {tab === "team" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Email", "Role", "Status", "Deals Led", "Joined"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u: any) => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {u.initials || u.name?.split(" ").map((n: string) => n[0]).join("")}
                      </span>
                      {u.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge color={u.role === "GP_ADMIN" ? "indigo" : u.role === "GP_TEAM" ? "blue" : u.role === "LP_INVESTOR" ? "green" : "orange"}>
                      {u.role?.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={u.isActive ? "green" : "red"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">\u2014</td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "\u2014"}
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No team members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Side Letters Tab */}
      {tab === "sideLetters" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="space-y-2">
            {sideLetters?.map((sl: { id: string; investor: { name: string }; entity: { name: string }; terms: string }) => (
              <div key={sl.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium">{sl.investor.name} \u2014 <span className="text-indigo-600">{sl.entity.name}</span></div>
                  <div className="text-xs text-gray-500 mt-0.5">{sl.terms}</div>
                </div>
                <Badge color="purple">Side Letter</Badge>
              </div>
            ))}
            {(!sideLetters || sideLetters.length === 0) && (
              <div className="px-4 py-8 text-center text-gray-400 text-xs">No side letters yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Investor Modals */}
      <CreateInvestorForm open={showCreateInvestor} onClose={() => setShowCreateInvestor(false)} />
      {editingInvestor && (
        <EditInvestorForm
          open={showEditInvestor}
          onClose={() => { setShowEditInvestor(false); setEditingInvestor(null); }}
          investor={editingInvestor}
        />
      )}

      {/* Create Company Modal */}
      <Modal
        open={showCreateCompany}
        onClose={() => setShowCreateCompany(false)}
        title="Add Company"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateCompany(false)}>Cancel</Button>
            <Button onClick={handleCreateCompany}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Company Name" required>
            <Input value={companyForm.name} onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Acme Capital" />
          </FormField>
          <FormField label="Type">
            <Select
              value={companyForm.type}
              onChange={(e) => setCompanyForm((p) => ({ ...p, type: e.target.value }))}
              options={Object.entries(COMPANY_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
          </FormField>
          <FormField label="Industry">
            <Input value={companyForm.industry} onChange={(e) => setCompanyForm((p) => ({ ...p, industry: e.target.value }))} placeholder="e.g. Financial Services" />
          </FormField>
          <FormField label="Website">
            <Input value={companyForm.website} onChange={(e) => setCompanyForm((p) => ({ ...p, website: e.target.value }))} placeholder="e.g. https://acme.com" />
          </FormField>
          <FormField label="Notes">
            <Textarea value={companyForm.notes} onChange={(e) => setCompanyForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes about this company..." rows={2} />
          </FormField>
        </div>
      </Modal>

      {/* Create Contact Modal */}
      <Modal
        open={showCreateContact}
        onClose={() => setShowCreateContact(false)}
        title="Add Contact"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateContact(false)}>Cancel</Button>
            <Button onClick={handleCreateContact}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name" required>
              <Input value={contactForm.firstName} onChange={(e) => setContactForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
            </FormField>
            <FormField label="Last Name" required>
              <Input value={contactForm.lastName} onChange={(e) => setContactForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
            </FormField>
          </div>
          <FormField label="Email">
            <Input type="email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@company.com" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone">
              <Input value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
            </FormField>
            <FormField label="Title">
              <Input value={contactForm.title} onChange={(e) => setContactForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Managing Director" />
            </FormField>
          </div>
          <FormField label="Company">
            <Select
              value={contactForm.companyId}
              onChange={(e) => setContactForm((p) => ({ ...p, companyId: e.target.value }))}
              options={[
                { value: "", label: "\u2014 No company \u2014" },
                ...(companies || []).map((c: any) => ({ value: c.id, label: c.name })),
              ]}
            />
          </FormField>
          <FormField label="Type">
            <Select
              value={contactForm.type}
              onChange={(e) => setContactForm((p) => ({ ...p, type: e.target.value }))}
              options={[
                { value: "EXTERNAL", label: "External" },
                { value: "INTERNAL", label: "Internal" },
              ]}
            />
          </FormField>
          <FormField label="Notes">
            <Textarea value={contactForm.notes} onChange={(e) => setContactForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes..." rows={2} />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
