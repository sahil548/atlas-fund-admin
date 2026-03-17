"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  EntityRegulatoryDataSchema,
  type RegulatoryFiling,
  type JurisdictionRecord,
  type EntityRegulatoryData,
} from "@/lib/schemas";

/* eslint-disable @typescript-eslint/no-explicit-any */

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const FILING_TYPES = [
  { value: "FORM_D", label: "Form D" },
  { value: "FORM_D_AMENDMENT", label: "Form D Amendment" },
  { value: "STATE_BLUE_SKY", label: "State Blue Sky" },
  { value: "ANNUAL_REPORT", label: "Annual Report" },
  { value: "BOI_FINCEN", label: "BOI / FinCEN" },
  { value: "ENTITY_FILING", label: "Entity Filing" },
  { value: "OTHER", label: "Other" },
] as const;

const FILING_STATUSES = [
  { value: "PENDING", label: "Pending", color: "yellow" as const },
  { value: "FILED", label: "Filed", color: "green" as const },
  { value: "OVERDUE", label: "Overdue", color: "red" as const },
  { value: "NOT_DUE", label: "Not Due", color: "gray" as const },
];

const JURISDICTION_STATUSES = [
  { value: "ACTIVE", label: "Active", color: "green" as const },
  { value: "INACTIVE", label: "Inactive", color: "gray" as const },
  { value: "WITHDRAWN", label: "Withdrawn", color: "red" as const },
];

const GOOD_STANDING_OPTIONS = [
  { value: "GOOD", label: "Good Standing", color: "green" as const },
  { value: "AT_RISK", label: "At Risk", color: "yellow" as const },
  { value: "NOT_IN_GOOD_STANDING", label: "Not in Good Standing", color: "red" as const },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function isOverdue(filing: RegulatoryFiling): boolean {
  if (!filing.dueDate || filing.status !== "PENDING") return false;
  return new Date(filing.dueDate) < new Date();
}

function parseRegulatoryData(raw: any): EntityRegulatoryData {
  if (!raw) {
    return { filings: [], jurisdictions: [], ctaClassification: null, fincenId: null, registeredAgentContactId: null, goodStanding: null };
  }
  const parsed = EntityRegulatoryDataSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { filings: [], jurisdictions: [], ctaClassification: null, fincenId: null, registeredAgentContactId: null, goodStanding: null };
}

interface RegulatoryFilingsTabProps {
  entity: any;
  onUpdate: () => void;
}

interface FilingFormState {
  id?: string;
  filingType: string;
  jurisdiction: string;
  filedDate: string;
  dueDate: string;
  status: string;
  filingNumber: string;
  notes: string;
  documentUrl: string;
}

interface JurisdictionFormState {
  id?: string;
  jurisdiction: string;
  registeredWithAgency: string;
  authorizationDate: string;
  jurisdictionId: string;
  status: string;
  statusDate: string;
}

const emptyFilingForm: FilingFormState = {
  filingType: "FORM_D",
  jurisdiction: "",
  filedDate: "",
  dueDate: "",
  status: "PENDING",
  filingNumber: "",
  notes: "",
  documentUrl: "",
};

const emptyJurisdictionForm: JurisdictionFormState = {
  jurisdiction: "",
  registeredWithAgency: "",
  authorizationDate: "",
  jurisdictionId: "",
  status: "ACTIVE",
  statusDate: "",
};

export function RegulatoryFilingsTab({ entity, onUpdate }: RegulatoryFilingsTabProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [regulatoryData, setRegulatoryData] = useState<EntityRegulatoryData>(() =>
    parseRegulatoryData(entity.regulatoryFilings)
  );

  // Section collapse state
  const [jurisdictionsOpen, setJurisdictionsOpen] = useState(true);
  const [filingsOpen, setFilingsOpen] = useState(true);

  // Compliance summary edit state
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState({
    ctaClassification: regulatoryData.ctaClassification ?? "",
    fincenId: regulatoryData.fincenId ?? "",
    goodStanding: regulatoryData.goodStanding ?? "",
    goodStandingOverride: regulatoryData.goodStandingOverride ?? false,
  });

  // Filing form state
  const [showFilingForm, setShowFilingForm] = useState(false);
  const [editingFiling, setEditingFiling] = useState<RegulatoryFiling | null>(null);
  const [filingForm, setFilingForm] = useState<FilingFormState>(emptyFilingForm);

  // Jurisdiction form state
  const [showJurisdictionForm, setShowJurisdictionForm] = useState(false);
  const [editingJurisdiction, setEditingJurisdiction] = useState<JurisdictionRecord | null>(null);
  const [jurisdictionForm, setJurisdictionForm] = useState<JurisdictionFormState>(emptyJurisdictionForm);

  async function persistData(updated: EntityRegulatoryData) {
    setSaving(true);
    try {
      const res = await fetch(`/api/entities/${entity.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regulatoryFilings: updated }),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to save";
        toast.error(msg);
        return false;
      }
      setRegulatoryData(updated);
      onUpdate();
      return true;
    } catch {
      toast.error("Failed to save regulatory data");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ─── Compliance Summary ────────────────────────────────────────────────────

  async function saveSummary() {
    const updated: EntityRegulatoryData = {
      ...regulatoryData,
      ctaClassification: summaryDraft.ctaClassification || null,
      fincenId: summaryDraft.fincenId || null,
      goodStanding: (summaryDraft.goodStanding as EntityRegulatoryData["goodStanding"]) || null,
      goodStandingOverride: summaryDraft.goodStandingOverride,
    };
    const ok = await persistData(updated);
    if (ok) {
      setEditingSummary(false);
      toast.success("Compliance summary updated");
    }
  }

  // ─── Filings ───────────────────────────────────────────────────────────────

  function openAddFiling() {
    setEditingFiling(null);
    setFilingForm(emptyFilingForm);
    setShowFilingForm(true);
  }

  function openEditFiling(filing: RegulatoryFiling) {
    setEditingFiling(filing);
    setFilingForm({
      id: filing.id,
      filingType: filing.filingType,
      jurisdiction: filing.jurisdiction,
      filedDate: filing.filedDate ?? "",
      dueDate: filing.dueDate ?? "",
      status: filing.status,
      filingNumber: filing.filingNumber ?? "",
      notes: filing.notes ?? "",
      documentUrl: filing.documentUrl ?? "",
    });
    setShowFilingForm(true);
  }

  async function saveFiling() {
    const newFiling: RegulatoryFiling = {
      id: editingFiling?.id ?? generateId(),
      filingType: filingForm.filingType as RegulatoryFiling["filingType"],
      jurisdiction: filingForm.jurisdiction,
      filedDate: filingForm.filedDate || null,
      dueDate: filingForm.dueDate || null,
      status: filingForm.status as RegulatoryFiling["status"],
      filingNumber: filingForm.filingNumber || null,
      notes: filingForm.notes || null,
      documentUrl: filingForm.documentUrl || null,
    };

    let updatedFilings: RegulatoryFiling[];
    if (editingFiling) {
      updatedFilings = regulatoryData.filings.map((f) => (f.id === editingFiling.id ? newFiling : f));
    } else {
      updatedFilings = [...regulatoryData.filings, newFiling];
    }

    const updated: EntityRegulatoryData = { ...regulatoryData, filings: updatedFilings };
    const ok = await persistData(updated);
    if (ok) {
      setShowFilingForm(false);
      toast.success(editingFiling ? "Filing updated" : "Filing added");
    }
  }

  async function deleteFiling(filingId: string) {
    const updatedFilings = regulatoryData.filings.filter((f) => f.id !== filingId);
    const updated: EntityRegulatoryData = { ...regulatoryData, filings: updatedFilings };
    const ok = await persistData(updated);
    if (ok) toast.success("Filing deleted");
  }

  // ─── Jurisdictions ─────────────────────────────────────────────────────────

  function openAddJurisdiction() {
    setEditingJurisdiction(null);
    setJurisdictionForm(emptyJurisdictionForm);
    setShowJurisdictionForm(true);
  }

  function openEditJurisdiction(jurisdiction: JurisdictionRecord) {
    setEditingJurisdiction(jurisdiction);
    setJurisdictionForm({
      id: jurisdiction.id,
      jurisdiction: jurisdiction.jurisdiction,
      registeredWithAgency: jurisdiction.registeredWithAgency ?? "",
      authorizationDate: jurisdiction.authorizationDate ?? "",
      jurisdictionId: jurisdiction.jurisdictionId ?? "",
      status: jurisdiction.status,
      statusDate: jurisdiction.statusDate ?? "",
    });
    setShowJurisdictionForm(true);
  }

  async function saveJurisdiction() {
    const newJurisdiction: JurisdictionRecord = {
      id: editingJurisdiction?.id ?? generateId(),
      jurisdiction: jurisdictionForm.jurisdiction,
      registeredWithAgency: jurisdictionForm.registeredWithAgency || null,
      authorizationDate: jurisdictionForm.authorizationDate || null,
      jurisdictionId: jurisdictionForm.jurisdictionId || null,
      status: jurisdictionForm.status as JurisdictionRecord["status"],
      statusDate: jurisdictionForm.statusDate || null,
    };

    let updatedJurisdictions: JurisdictionRecord[];
    if (editingJurisdiction) {
      updatedJurisdictions = regulatoryData.jurisdictions.map((j) =>
        j.id === editingJurisdiction.id ? newJurisdiction : j
      );
    } else {
      updatedJurisdictions = [...regulatoryData.jurisdictions, newJurisdiction];
    }

    const updated: EntityRegulatoryData = { ...regulatoryData, jurisdictions: updatedJurisdictions };
    const ok = await persistData(updated);
    if (ok) {
      setShowJurisdictionForm(false);
      toast.success(editingJurisdiction ? "Jurisdiction updated" : "Jurisdiction added");
    }
  }

  async function deleteJurisdiction(jurisdictionId: string) {
    const updatedJurisdictions = regulatoryData.jurisdictions.filter((j) => j.id !== jurisdictionId);
    const updated: EntityRegulatoryData = { ...regulatoryData, jurisdictions: updatedJurisdictions };
    const ok = await persistData(updated);
    if (ok) toast.success("Jurisdiction deleted");
  }

  const filings = regulatoryData.filings ?? [];
  const jurisdictions = regulatoryData.jurisdictions ?? [];

  return (
    <div className="space-y-4">
      {/* ── Compliance Summary Card ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Compliance Summary</h3>
          {!editingSummary ? (
            <Button size="sm" onClick={() => setEditingSummary(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={saveSummary} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" onClick={() => setEditingSummary(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        {editingSummary ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block uppercase font-semibold">CTA Classification</label>
              <input
                type="text"
                value={summaryDraft.ctaClassification}
                onChange={(e) => setSummaryDraft({ ...summaryDraft, ctaClassification: e.target.value })}
                placeholder="e.g. Exempt Reporting Adviser"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block uppercase font-semibold">FinCEN ID</label>
              <input
                type="text"
                value={summaryDraft.fincenId}
                onChange={(e) => setSummaryDraft({ ...summaryDraft, fincenId: e.target.value })}
                placeholder="e.g. 12-3456789"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block uppercase font-semibold">Good Standing</label>
              <select
                value={summaryDraft.goodStanding}
                onChange={(e) => setSummaryDraft({ ...summaryDraft, goodStanding: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Not set</option>
                {GOOD_STANDING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="goodStandingOverride"
                checked={summaryDraft.goodStandingOverride}
                onChange={(e) => setSummaryDraft({ ...summaryDraft, goodStandingOverride: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="goodStandingOverride" className="text-xs text-gray-600">Manual override (bypass auto-detection)</label>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">CTA Classification</div>
              <div className="text-sm text-gray-900">{regulatoryData.ctaClassification || <span className="text-gray-400">Not set</span>}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">FinCEN ID</div>
              <div className="text-sm text-gray-900">{regulatoryData.fincenId || <span className="text-gray-400">Not set</span>}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Good Standing</div>
              {regulatoryData.goodStanding ? (
                <Badge
                  color={
                    regulatoryData.goodStanding === "GOOD" ? "green" :
                    regulatoryData.goodStanding === "AT_RISK" ? "yellow" :
                    "red"
                  }
                >
                  {GOOD_STANDING_OPTIONS.find((o) => o.value === regulatoryData.goodStanding)?.label ?? regulatoryData.goodStanding}
                </Badge>
              ) : (
                <span className="text-gray-400 text-xs">Not set</span>
              )}
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Registered Agent</div>
              <div className="text-sm text-gray-900">
                {regulatoryData.registeredAgentContactId || <span className="text-gray-400">Not assigned</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Jurisdictions Section ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => setJurisdictionsOpen(!jurisdictionsOpen)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setJurisdictionsOpen(!jurisdictionsOpen); } }}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${jurisdictionsOpen ? "rotate-0" : "-rotate-90"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            <span className="text-sm font-semibold text-gray-900">
              Jurisdictions ({jurisdictions.length})
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); openAddJurisdiction(); }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
          >
            + Add Jurisdiction
          </button>
        </div>

        {jurisdictionsOpen && (
          <div className="border-t border-gray-100">
            {/* Add/Edit Jurisdiction Form */}
            {showJurisdictionForm && (
              <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100">
                <h4 className="text-xs font-semibold text-indigo-900 mb-3">
                  {editingJurisdiction ? "Edit Jurisdiction" : "Add Jurisdiction"}
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Jurisdiction *</label>
                    <select
                      value={jurisdictionForm.jurisdiction}
                      onChange={(e) => setJurisdictionForm({ ...jurisdictionForm, jurisdiction: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Select...</option>
                      <option value="Federal">Federal</option>
                      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Registered With Agency</label>
                    <input
                      type="text"
                      value={jurisdictionForm.registeredWithAgency}
                      onChange={(e) => setJurisdictionForm({ ...jurisdictionForm, registeredWithAgency: e.target.value })}
                      placeholder="e.g. Division of Corporations"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Authorization Date</label>
                    <input
                      type="date"
                      value={jurisdictionForm.authorizationDate}
                      onChange={(e) => setJurisdictionForm({ ...jurisdictionForm, authorizationDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Jurisdiction ID / Filing #</label>
                    <input
                      type="text"
                      value={jurisdictionForm.jurisdictionId}
                      onChange={(e) => setJurisdictionForm({ ...jurisdictionForm, jurisdictionId: e.target.value })}
                      placeholder="e.g. LLC-123456"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Status</label>
                    <select
                      value={jurisdictionForm.status}
                      onChange={(e) => setJurisdictionForm({ ...jurisdictionForm, status: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {JURISDICTION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Status Date</label>
                    <input
                      type="date"
                      value={jurisdictionForm.statusDate}
                      onChange={(e) => setJurisdictionForm({ ...jurisdictionForm, statusDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveJurisdiction} disabled={saving || !jurisdictionForm.jurisdiction}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" onClick={() => setShowJurisdictionForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Jurisdiction Cards */}
            {jurisdictions.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {jurisdictions.map((j) => {
                  const statusInfo = JURISDICTION_STATUSES.find((s) => s.value === j.status);
                  return (
                    <div key={j.id} className="px-5 py-3 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{j.jurisdiction}</span>
                          <Badge color={statusInfo?.color ?? "gray"}>{statusInfo?.label ?? j.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs text-gray-500">
                          {j.registeredWithAgency && (
                            <span>Agency: <span className="text-gray-700">{j.registeredWithAgency}</span></span>
                          )}
                          {j.authorizationDate && (
                            <span>Auth: <span className="text-gray-700">{j.authorizationDate}</span></span>
                          )}
                          {j.jurisdictionId && (
                            <span>ID: <span className="text-gray-700 font-mono">{j.jurisdictionId}</span></span>
                          )}
                          {j.statusDate && (
                            <span>Status Date: <span className="text-gray-700">{j.statusDate}</span></span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditJurisdiction(j)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteJurisdiction(j.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                No jurisdictions added yet.{" "}
                <button
                  onClick={openAddJurisdiction}
                  className="text-indigo-600 hover:underline"
                >
                  Add one
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Filings Section ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => setFilingsOpen(!filingsOpen)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFilingsOpen(!filingsOpen); } }}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${filingsOpen ? "rotate-0" : "-rotate-90"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            <span className="text-sm font-semibold text-gray-900">
              Filings ({filings.length})
            </span>
            {filings.some(isOverdue) && (
              <Badge color="red">
                {filings.filter(isOverdue).length} Overdue
              </Badge>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); openAddFiling(); }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
          >
            + Add Filing
          </button>
        </div>

        {filingsOpen && (
          <div className="border-t border-gray-100">
            {/* Add/Edit Filing Form */}
            {showFilingForm && (
              <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100">
                <h4 className="text-xs font-semibold text-indigo-900 mb-3">
                  {editingFiling ? "Edit Filing" : "Add Filing"}
                </h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Filing Type *</label>
                    <select
                      value={filingForm.filingType}
                      onChange={(e) => setFilingForm({ ...filingForm, filingType: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {FILING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Jurisdiction *</label>
                    <select
                      value={filingForm.jurisdiction}
                      onChange={(e) => setFilingForm({ ...filingForm, jurisdiction: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Select...</option>
                      <option value="Federal">Federal</option>
                      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Status *</label>
                    <select
                      value={filingForm.status}
                      onChange={(e) => setFilingForm({ ...filingForm, status: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {FILING_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Filed Date</label>
                    <input
                      type="date"
                      value={filingForm.filedDate}
                      onChange={(e) => setFilingForm({ ...filingForm, filedDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Due Date</label>
                    <input
                      type="date"
                      value={filingForm.dueDate}
                      onChange={(e) => setFilingForm({ ...filingForm, dueDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Filing Number</label>
                    <input
                      type="text"
                      value={filingForm.filingNumber}
                      onChange={(e) => setFilingForm({ ...filingForm, filingNumber: e.target.value })}
                      placeholder="e.g. D-12345"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-[10px] text-gray-500 mb-1 block">Notes</label>
                  <textarea
                    value={filingForm.notes}
                    onChange={(e) => setFilingForm({ ...filingForm, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional notes..."
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveFiling}
                    disabled={saving || !filingForm.jurisdiction}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" onClick={() => setShowFilingForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Filings Table */}
            {filings.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Type", "Jurisdiction", "Filed", "Due", "Status", "Filing #", "Actions"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filings.map((filing) => {
                    const overdue = isOverdue(filing);
                    const statusInfo = FILING_STATUSES.find((s) => s.value === filing.status);
                    const filingTypeLabel = FILING_TYPES.find((t) => t.value === filing.filingType)?.label ?? filing.filingType;
                    return (
                      <tr key={filing.id} className={`border-t border-gray-50 hover:bg-gray-50 ${overdue ? "bg-red-50/30" : ""}`}>
                        <td className="px-3 py-2.5 font-medium text-gray-900">
                          {filingTypeLabel}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{filing.jurisdiction}</td>
                        <td className="px-3 py-2.5 text-gray-500">{filing.filedDate ?? "—"}</td>
                        <td className={`px-3 py-2.5 ${overdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                          {filing.dueDate ?? "—"}
                          {overdue && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded">OVERDUE</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge color={overdue ? "red" : statusInfo?.color ?? "gray"}>
                            {overdue ? "Overdue" : (statusInfo?.label ?? filing.status)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 font-mono">{filing.filingNumber ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditFiling(filing)}
                              className="text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5 rounded hover:bg-indigo-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteFiling(filing.id)}
                              className="text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                No filings added yet.{" "}
                <button
                  onClick={openAddFiling}
                  className="text-indigo-600 hover:underline"
                >
                  Add one
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
