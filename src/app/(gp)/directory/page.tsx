"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { CreateInvestorForm } from "@/components/features/investors/create-investor-form";
import { EditInvestorForm } from "@/components/features/investors/edit-investor-form";
import { CreateUserForm } from "@/components/features/directory/create-user-form";
import { EditUserForm } from "@/components/features/directory/edit-user-form";
import { EditContactForm } from "@/components/features/contacts/edit-contact-form";
import { CreateCompanyForm } from "@/components/features/companies/create-company-form";
import { CreateContactForm } from "@/components/features/contacts/create-contact-form";
import { CreateSideLetterForm } from "@/components/features/side-letters/create-side-letter-form";
import { useFirm } from "@/components/providers/firm-provider";
import { fmt } from "@/lib/utils";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ExportButton } from "@/components/ui/export-button";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

/* eslint-disable @typescript-eslint/no-explicit-any */

type InvestorRow = { id: string; name: string; investorType: string; totalCommitted: number; commitments: { entity: { name: string } }[]; kycStatus: string; advisoryBoard: boolean; contactPreference: string; contact?: { id: string; firstName: string; lastName: string; email: string } | null; company?: { id: string; name: string; type: string } | null };

const COMPANY_TYPE_LABELS: Record<string, string> = {
  GP: "GP", LP: "LP", COUNTERPARTY: "Counterparty", SERVICE_PROVIDER: "Service Provider", OPERATING_COMPANY: "Operating Co.", OTHER: "Other",
};
const COMPANY_TYPE_COLORS: Record<string, string> = {
  GP: "indigo", LP: "blue", COUNTERPARTY: "green", SERVICE_PROVIDER: "orange", OPERATING_COMPANY: "purple", OTHER: "gray",
};
const CONTACT_TYPE_LABELS: Record<string, string> = { INTERNAL: "Internal", EXTERNAL: "External" };

export default function DirectoryPage() {
  const { firmId } = useFirm();
  const [tab, setTab] = useState<"investors" | "companies" | "contacts" | "team" | "sideLetters">("investors");
  const toast = useToast();

  // Investor search/pagination state
  const [investorSearch, setInvestorSearch] = useState("");
  const [investorFilters, setInvestorFilters] = useState<Record<string, string>>({});
  const [investorCursor, setInvestorCursor] = useState<string | null>(null);
  const [allInvestors, setAllInvestors] = useState<any[]>([]);
  const [investorLoadingMore, setInvestorLoadingMore] = useState(false);

  const buildInvestorUrl = useCallback(
    (currentCursor?: string | null) => {
      const params = new URLSearchParams({ firmId, limit: "50" });
      if (investorSearch) params.set("search", investorSearch);
      for (const [k, v] of Object.entries(investorFilters)) {
        if (v) params.set(k, v);
      }
      if (currentCursor) params.set("cursor", currentCursor);
      return `/api/investors?${params.toString()}`;
    },
    [firmId, investorSearch, investorFilters],
  );

  // Data fetching
  const { isLoading: investorsLoading } = useSWR(buildInvestorUrl(null), fetcher, {
    onSuccess: (result) => {
      setAllInvestors(result.data ?? []);
      setInvestorCursor(result.nextCursor ?? null);
    },
    revalidateOnFocus: false,
  });
  const { data: companies } = useSWR(`/api/companies?firmId=${firmId}`, fetcher);
  const { data: contacts } = useSWR(`/api/contacts?firmId=${firmId}`, fetcher);
  const { data: users } = useSWR(`/api/users?firmId=${firmId}`, fetcher);
  const { data: sideLetters } = useSWR("/api/side-letters", fetcher);

  const handleInvestorSearch = useCallback((q: string) => {
    setInvestorSearch(q);
    setAllInvestors([]);
    setInvestorCursor(null);
  }, []);

  const handleInvestorFilter = useCallback((key: string, value: string) => {
    setInvestorFilters((prev) => ({ ...prev, [key]: value }));
    setAllInvestors([]);
    setInvestorCursor(null);
  }, []);

  const handleInvestorLoadMore = useCallback(async () => {
    if (!investorCursor || investorLoadingMore) return;
    setInvestorLoadingMore(true);
    try {
      const res = await fetch(buildInvestorUrl(investorCursor));
      const result = await res.json();
      setAllInvestors((prev) => [...prev, ...(result.data ?? [])]);
      setInvestorCursor(result.nextCursor ?? null);
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setInvestorLoadingMore(false);
    }
  }, [investorCursor, investorLoadingMore, buildInvestorUrl]);

  // Modals
  const [showCreateInvestor, setShowCreateInvestor] = useState(false);
  const [showEditInvestor, setShowEditInvestor] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<InvestorRow | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showEditContact, setShowEditContact] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [showCreateSideLetter, setShowCreateSideLetter] = useState(false);
  const [companyTypeFilter, setCompanyTypeFilter] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { type, id, name } = deleteTarget;
    const endpoint = type === "investor" ? `/api/investors/${id}` : type === "company" ? `/api/companies/${id}` : type === "contact" ? `/api/contacts/${id}` : `/api/side-letters/${id}`;
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error || `Failed to delete ${name}`);
        setDeleteLoading(false);
        setDeleteTarget(null);
        return;
      }
      toast.success(`${name} deleted`);
      mutate(`/api/investors?firmId=${firmId}`);
      mutate(`/api/companies?firmId=${firmId}`);
      mutate(`/api/contacts?firmId=${firmId}`);
      mutate("/api/side-letters");
    } catch {
      toast.error(`Failed to delete ${name}`);
    }
    setDeleteLoading(false);
    setDeleteTarget(null);
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

  async function handleDeactivateUser(userId: string, isActive: boolean) {
    try {
      await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      toast.success(isActive ? "User deactivated" : "User activated");
      mutate(`/api/users?firmId=${firmId}`);
    } catch {
      toast.error("Failed to update user status");
    }
  }

  const tabs = [
    { key: "investors" as const, label: "Investors", count: allInvestors?.length || 0 },
    { key: "companies" as const, label: "Companies", count: companies?.length || 0 },
    { key: "contacts" as const, label: "Contacts", count: contacts?.length || 0 },
    { key: "team" as const, label: "Team", count: users?.length || 0 },
    { key: "sideLetters" as const, label: "Side Letters", count: sideLetters?.length || 0 },
  ];

  const hasInvestorFilters = !!(investorSearch || Object.values(investorFilters).some(Boolean));
  const handleClearInvestorFilters = () => {
    setInvestorSearch("");
    setInvestorFilters({});
    setAllInvestors([]);
    setInvestorCursor(null);
  };

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
                tab === t.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        {tab === "investors" && <Button onClick={() => setShowCreateInvestor(true)}>+ Add Investor</Button>}
        {tab === "companies" && <Button onClick={() => setShowCreateCompany(true)}>+ Add Company</Button>}
        {tab === "contacts" && <Button onClick={() => setShowCreateContact(true)}>+ Add Contact</Button>}
        {tab === "team" && <Button onClick={() => setShowCreateUser(true)}>+ Add Team Member</Button>}
        {tab === "sideLetters" && <Button onClick={() => setShowCreateSideLetter(true)}>+ Add Side Letter</Button>}
      </div>

      {/* Investors Tab */}
      {tab === "investors" && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <SearchFilterBar
                filters={[
                  { key: "type", label: "Type", options: [
                    { value: "Individual", label: "Individual" },
                    { value: "Institutional", label: "Institutional" },
                    { value: "Family Office", label: "Family Office" },
                  ]},
                ]}
                onFilterChange={handleInvestorFilter}
                activeFilters={investorFilters}
              >
                <ExportButton
                  data={allInvestors.map((inv: any) => ({
                    id: inv.id,
                    name: inv.name,
                    type: inv.investorType,
                    totalCommitted: inv.totalCommitted ?? 0,
                    kycStatus: inv.kycStatus ?? "",
                    email: inv.contact?.email ?? "",
                    company: inv.company?.name ?? "",
                    advisoryBoard: inv.advisoryBoard ? "Yes" : "No",
                    contactPreference: inv.contactPreference ?? "",
                  }))}
                  fileName="Directory_Export"
                />
              </SearchFilterBar>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {["Investor", "Type", "Total Committed", "Entities", "KYC", "Linked To", "Advisory", "Pref. Contact", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investorsLoading && allInvestors.length === 0 ? (
                  <TableSkeleton columns={9} />
                ) : allInvestors.length === 0 ? (
                  <tr><td colSpan={9}>
                    <EmptyState
                      icon={<Users className="h-10 w-10" />}
                      title={hasInvestorFilters ? "No results match your filters" : "No investors yet"}
                      description={!hasInvestorFilters ? "Add your first investor to get started" : undefined}
                      action={!hasInvestorFilters ? { label: "+ Add Investor", onClick: () => setShowCreateInvestor(true) } : undefined}
                      filtered={hasInvestorFilters}
                      onClearFilters={hasInvestorFilters ? handleClearInvestorFilters : undefined}
                    />
                  </td></tr>
                ) : (
                  allInvestors.map((inv: InvestorRow) => (
                    <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50">
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
                          <span className="text-gray-400">{"\u2014"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">{inv.advisoryBoard ? <Badge color="indigo">Yes</Badge> : <span className="text-gray-400">{"\u2014"}</span>}</td>
                      <td className="px-3 py-2.5"><Badge color={inv.contactPreference === "text" ? "purple" : "blue"}>{inv.contactPreference === "text" ? "Text" : "Email"}</Badge></td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-2">
                          <button className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline" onClick={(e) => { e.stopPropagation(); setEditingInvestor(inv); setShowEditInvestor(true); }}>Edit</button>
                          <button className="text-xs text-red-500 hover:text-red-700 hover:underline" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "investor", id: inv.id, name: inv.name }); }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <LoadMoreButton hasMore={!!investorCursor} loading={investorLoadingMore} onLoadMore={handleInvestorLoadMore} />
        </div>
      )}

      {/* Companies Tab */}
      {tab === "companies" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-medium">Filter:</span>
            <select value={companyTypeFilter} onChange={(e) => setCompanyTypeFilter(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:border-indigo-400 focus:outline-none">
              <option value="">All Types</option>
              {Object.entries(COMPANY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Company", "Type", "Industry", "Contacts", "Investor", "Website", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(companies || []).filter((c: any) => !companyTypeFilter || c.type === companyTypeFilter).map((c: any) => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium"><Link href={`/companies/${c.id}`} className="text-indigo-700 hover:underline">{c.name}</Link></td>
                  <td className="px-4 py-3"><Badge color={COMPANY_TYPE_COLORS[c.type] || "gray"}>{COMPANY_TYPE_LABELS[c.type] || c.type}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{c.industry || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600">{c._count?.contacts || 0}</td>
                  <td className="px-4 py-3">
                    {c.investorProfile ? (
                      <Link href={`/investors/${c.investorProfile.id}`}><Badge color="green">Investor</Badge></Link>
                    ) : (
                      <button onClick={() => addInvestorProfile("company", c)} className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline">+ Add Investor Profile</button>
                    )}
                  </td>
                  <td className="px-4 py-3">{c.website ? <span className="text-indigo-600">{c.website.replace(/^https?:\/\//, "")}</span> : "\u2014"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/companies/${c.id}`}><Button variant="secondary" size="sm">View</Button></Link>
                      <button className="text-xs text-red-500 hover:text-red-700 hover:underline" onClick={() => setDeleteTarget({ type: "company", id: c.id, name: c.name })}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!companies || companies.length === 0) && (
                <tr><td colSpan={7}>
                  <EmptyState
                    icon={<Users className="h-10 w-10" />}
                    title={companyTypeFilter ? "No results match your filters" : "No companies yet"}
                    description={!companyTypeFilter ? "Add your first company to get started" : undefined}
                    action={!companyTypeFilter ? { label: "+ Add Company", onClick: () => setShowCreateCompany(true) } : undefined}
                    filtered={!!companyTypeFilter}
                    onClearFilters={companyTypeFilter ? () => setCompanyTypeFilter("") : undefined}
                  />
                </td></tr>
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
                      <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{c.firstName?.[0]}{c.lastName?.[0]}</span>
                      {c.firstName} {c.lastName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.title || "\u2014"}</td>
                  <td className="px-4 py-3 text-indigo-600">{c.company?.name || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || "\u2014"}</td>
                  <td className="px-4 py-3"><Badge color={c.type === "INTERNAL" ? "blue" : "gray"}>{CONTACT_TYPE_LABELS[c.type] || c.type}</Badge></td>
                  <td className="px-4 py-3">
                    {c.investorProfile ? (
                      <Link href={`/investors/${c.investorProfile.id}`}><Badge color="green">Investor</Badge></Link>
                    ) : (
                      <button onClick={() => addInvestorProfile("contact", c)} className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline">+ Add Investor Profile</button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => { setEditingContact(c); setShowEditContact(true); }}>Edit</Button>
                      <button className="text-xs text-red-500 hover:text-red-700 hover:underline" onClick={() => setDeleteTarget({ type: "contact", id: c.id, name: `${c.firstName} ${c.lastName}` })}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!contacts || contacts.length === 0) && (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={<Users className="h-10 w-10" />}
                    title="No contacts yet"
                    description="Add your first contact to get started"
                    action={{ label: "+ Add Contact", onClick: () => setShowCreateContact(true) }}
                  />
                </td></tr>
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
                {["Name", "Email", "Role", "Status", "Joined", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u: any) => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{u.initials || u.name?.split(" ").map((n: string) => n[0]).join("")}</span>
                      {u.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><Badge color={u.role === "GP_ADMIN" ? "indigo" : u.role === "GP_TEAM" ? "blue" : u.role === "LP_INVESTOR" ? "green" : "orange"}>{u.role?.replace(/_/g, " ")}</Badge></td>
                  <td className="px-4 py-3"><Badge color={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-4 py-3 text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "\u2014"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => { setEditingUser(u); setShowEditUser(true); }}>Edit</Button>
                      <button className={`text-xs ${u.isActive ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"} hover:underline`} onClick={() => handleDeactivateUser(u.id, u.isActive)}>
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr><td colSpan={6}>
                  <EmptyState
                    icon={<Users className="h-10 w-10" />}
                    title="No team members yet"
                    description="Add your first team member to get started"
                    action={{ label: "+ Add Team Member", onClick: () => setShowCreateUser(true) }}
                  />
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Side Letters Tab */}
      {tab === "sideLetters" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Investor", "Entity", "Terms", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sideLetters || []).map((sl: { id: string; investor: { name: string }; entity: { name: string }; terms: string }) => (
                <tr key={sl.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{sl.investor.name}</td>
                  <td className="px-4 py-3 text-indigo-600">{sl.entity.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate">{sl.terms}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-red-500 hover:text-red-700 hover:underline" onClick={() => setDeleteTarget({ type: "sideLetter", id: sl.id, name: `${sl.investor.name} — ${sl.entity.name}` })}>Delete</button>
                  </td>
                </tr>
              ))}
              {(!sideLetters || sideLetters.length === 0) && (
                <tr><td colSpan={4}>
                  <EmptyState
                    icon={<Users className="h-10 w-10" />}
                    title="No side letters yet"
                    description="Add your first side letter to get started"
                    action={{ label: "+ Add Side Letter", onClick: () => setShowCreateSideLetter(true) }}
                  />
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <CreateInvestorForm open={showCreateInvestor} onClose={() => setShowCreateInvestor(false)} />
      {editingInvestor && <EditInvestorForm open={showEditInvestor} onClose={() => { setShowEditInvestor(false); setEditingInvestor(null); }} investor={editingInvestor} />}
      <CreateUserForm open={showCreateUser} onClose={() => setShowCreateUser(false)} />
      {editingUser && <EditUserForm open={showEditUser} onClose={() => { setShowEditUser(false); setEditingUser(null); }} user={editingUser} />}
      {editingContact && <EditContactForm open={showEditContact} onClose={() => { setShowEditContact(false); setEditingContact(null); }} contact={editingContact} />}
      <CreateCompanyForm open={showCreateCompany} onClose={() => setShowCreateCompany(false)} />
      <CreateContactForm open={showCreateContact} onClose={() => setShowCreateContact(false)} />
      <CreateSideLetterForm open={showCreateSideLetter} onClose={() => setShowCreateSideLetter(false)} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.name}?`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
