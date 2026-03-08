"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useFirm } from "@/components/providers/firm-provider";
import { useUser } from "@/components/providers/user-provider";
import useSWR, { mutate as swrMutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const ASSET_CLASS_OPTIONS = [
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "PUBLIC_SECURITIES", label: "Public Securities" },
  { value: "OPERATING_BUSINESS", label: "Operating Business" },
  { value: "INFRASTRUCTURE", label: "Infrastructure" },
  { value: "COMMODITIES", label: "Commodities" },
  { value: "DIVERSIFIED", label: "Diversified" },
  { value: "NON_CORRELATED", label: "Non-Correlated" },
  { value: "CASH_AND_EQUIVALENTS", label: "Cash & Equivalents" },
];
const CAPITAL_INSTRUMENT_OPTIONS = [
  { value: "DEBT", label: "Debt" },
  { value: "EQUITY", label: "Equity" },
];

const PARTICIPATION_STRUCTURE_OPTIONS = [
  { value: "DIRECT_GP", label: "GP / Direct" },
  { value: "LP_STAKE_SILENT_PARTNER", label: "LP / Passive" },
  { value: "CO_INVEST_JV_PARTNERSHIP", label: "Co-GP / Co-Invest / JV" },
];

const DOC_CATEGORIES = [
  "Term Sheet",
  "CIM",
  "Financials",
  "Legal",
  "Insurance",
  "Tax",
  "Other",
];

interface DocEntry {
  file: File | null;
  name: string;
  category: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export function CreateDealWizard({ open, onClose }: Props) {
  const toast = useToast();
  const router = useRouter();
  const { firmId } = useFirm();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { data: users } = useSWR(`/api/users?firmId=${firmId}`, fetcher);
  const { data: companies } = useSWR(`/api/companies?firmId=${firmId}`, fetcher);
  const { data: entities } = useSWR(`/api/entities?firmId=${firmId}`, (url: string) =>
    fetcher(url).then((r: any) => r.data ?? r),
  );

  // Step 1: Deal Identity
  const [identity, setIdentity] = useState({
    name: "",
    assetClass: "REAL_ESTATE",
    capitalInstrument: "",
    participationStructure: "",
    targetCheckSize: "",
    dealLeadId: "",
    gpName: "",
    counterparty: "",
    source: "",
    entityId: "",
  });

  // Step 2: Materials & Context
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCategory, setPendingCategory] = useState("CIM");
  const [additionalContext, setAdditionalContext] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Counterparty inline creation state
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Default deal lead to current user when users load and no lead is selected
  useEffect(() => {
    if (users && Array.isArray(users) && users.length > 0 && !identity.dealLeadId && user?.id) {
      const currentUserExists = users.some((u: any) => u.id === user.id);
      if (currentUserExists) {
        setIdentity((p) => ({ ...p, dealLeadId: user.id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, user?.id]);

  function resetForm() {
    setStep(1);
    setIdentity({
      name: "", assetClass: "REAL_ESTATE", capitalInstrument: "",
      participationStructure: "", targetCheckSize: "", dealLeadId: "", gpName: "",
      counterparty: "", source: "", entityId: "",
    });
    setDocs([]);
    setPendingFile(null);
    setPendingCategory("CIM");
    setAdditionalContext("");
    setErrors({});
    setShowNewCompany(false);
    setNewCompanyName("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!identity.name.trim()) errs.name = "Deal name is required";
    if (!identity.assetClass) errs.assetClass = "Asset class is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const missing = Object.values(errs).join(", ");
      toast.error(`Missing required fields: ${missing}`);
      return false;
    }
    return true;
  }

  /** Clear individual field error when user interacts */
  function clearFieldError(field: string) {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function addDoc() {
    if (!pendingFile) return;
    setDocs((prev) => [
      ...prev,
      { file: pendingFile, name: pendingFile.name, category: pendingCategory },
    ]);
    setPendingFile(null);
    setPendingCategory("CIM");
  }

  function removeDoc(index: number) {
    setDocs((prev) => prev.filter((_, i) => i !== index));
  }

  // Documents are optional — no validation required

  /** Create new counterparty company inline */
  async function handleCreateCompany() {
    if (!newCompanyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setCreatingCompany(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmId,
          name: newCompanyName.trim(),
          type: "COUNTERPARTY",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to create company";
        toast.error(msg);
        return;
      }
      const company = await res.json();
      // Revalidate companies list so the new one shows up
      swrMutate(`/api/companies?firmId=${firmId}`);
      // Auto-select the new company as counterparty
      setIdentity((p) => ({ ...p, counterparty: company.name }));
      setShowNewCompany(false);
      setNewCompanyName("");
      toast.success(`Created "${company.name}"`);
    } catch {
      toast.error("Failed to create company");
    } finally {
      setCreatingCompany(false);
    }
  }

  /** Shared: create deal + upload docs -> returns deal ID */
  async function createDealAndUploadDocs(): Promise<string> {
    const dealRes = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...identity,
        additionalContext: additionalContext || undefined,
      }),
    });
    if (!dealRes.ok) throw new Error("Failed to create deal");
    const deal = await dealRes.json();

    let uploadFails = 0;
    for (const doc of docs) {
      const formData = new FormData();
      formData.append("name", doc.name);
      formData.append("category", mapDocCategory(doc.category));
      if (doc.file) formData.append("file", doc.file);
      try {
        const uploadRes = await fetch(`/api/deals/${deal.id}/documents`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) uploadFails++;
      } catch {
        uploadFails++;
      }
    }
    if (uploadFails > 0) {
      toast.error(`${uploadFails} of ${docs.length} document${docs.length > 1 ? "s" : ""} failed to upload`);
    }

    return deal.id;
  }

  async function handleCreateDeal() {
    setIsLoading(true);
    try {
      const dealId = await createDealAndUploadDocs();
      // Create workstreams (scaffolding) -- stays in SCREENING
      await fetch(`/api/deals/${dealId}/screen`, { method: "POST" });
      toast.success("Deal created");
      handleClose();
      router.push(`/deals/${dealId}`);
    } catch {
      toast.error("Failed to create deal");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateAndScreen() {
    setIsLoading(true);
    try {
      const dealId = await createDealAndUploadDocs();
      // Create workstreams -- deal page auto-starts analyses via ?autoscreen=1
      await fetch(`/api/deals/${dealId}/screen`, { method: "POST" });
      toast.success("Deal created — AI screening starting...");
      handleClose();
      router.push(`/deals/${dealId}?autoscreen=1`);
    } catch {
      toast.error("Failed to create deal");
    } finally {
      setIsLoading(false);
    }
  }

  const stepTitles = ["Deal Identity", "Materials & Context"];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`New Deal — Step ${step}: ${stepTitles[step - 1]}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              onClick={() => {
                if (!validateStep1()) return;
                setStep(2);
              }}
            >
              Next
            </Button>
          ) : (
            <>
              <Button variant="secondary" loading={isLoading} onClick={handleCreateDeal}>
                Create Deal
              </Button>
              <Button loading={isLoading} onClick={handleCreateAndScreen}>
                Create & Screen
              </Button>
            </>
          )}
        </>
      }
    >
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                s === step
                  ? "bg-indigo-600 text-white"
                  : s < step
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {s < step ? "\u2713" : s}
            </div>
            {s < 2 && (
              <div
                className={`flex-1 h-0.5 ${
                  s < step ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Deal Identity */}
      {step === 1 && (
        <div className="space-y-3">
          <FormField label="Deal Name" required>
            <Input
              value={identity.name}
              onChange={(e) => {
                setIdentity((p) => ({ ...p, name: e.target.value }));
                clearFieldError("name");
              }}
              placeholder="e.g. Apex Manufacturing Acquisition"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Asset Class" required>
              <Select
                value={identity.assetClass}
                onChange={(e) => {
                  setIdentity((p) => ({ ...p, assetClass: e.target.value }));
                  clearFieldError("assetClass");
                }}
                options={ASSET_CLASS_OPTIONS}
              />
              {errors.assetClass && (
                <p className="text-xs text-red-600 mt-1">{errors.assetClass}</p>
              )}
            </FormField>
            <FormField label="Capital Instrument">
              <Select
                value={identity.capitalInstrument}
                onChange={(e) =>
                  setIdentity((p) => ({ ...p, capitalInstrument: e.target.value }))
                }
                options={[{ value: "", label: "\u2014 Select \u2014" }, ...CAPITAL_INSTRUMENT_OPTIONS]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Participation Structure">
              <Select
                value={identity.participationStructure}
                onChange={(e) =>
                  setIdentity((p) => ({ ...p, participationStructure: e.target.value }))
                }
                options={[{ value: "", label: "\u2014 Select \u2014" }, ...PARTICIPATION_STRUCTURE_OPTIONS]}
              />
            </FormField>
            <FormField label="Target Check Size">
              <Input
                value={identity.targetCheckSize}
                onChange={(e) =>
                  setIdentity((p) => ({ ...p, targetCheckSize: e.target.value }))
                }
                placeholder="e.g. $5-10M"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Deal Lead">
              <Select
                value={identity.dealLeadId}
                onChange={(e) =>
                  setIdentity((p) => ({ ...p, dealLeadId: e.target.value }))
                }
                options={[
                  { value: "", label: "\u2014 Select \u2014" },
                  ...(users || []).map((u: any) => ({ value: u.id, label: u.name })),
                ]}
              />
            </FormField>
            <FormField label="GP / Sponsor">
              <Select
                value={identity.gpName}
                onChange={(e) =>
                  setIdentity((p) => ({ ...p, gpName: e.target.value }))
                }
                options={[
                  { value: "", label: "\u2014 Select \u2014" },
                  ...(companies || []).filter((c: any) => c.type === "GP").map((c: any) => ({ value: c.name, label: c.name })),
                  ...(companies || []).filter((c: any) => c.type !== "GP").map((c: any) => ({ value: c.name, label: c.name })),
                ]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Counterparty">
              {!showNewCompany ? (
                <>
                  <Select
                    value={identity.counterparty}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setShowNewCompany(true);
                        return;
                      }
                      setIdentity((p) => ({ ...p, counterparty: e.target.value }));
                    }}
                    options={[
                      { value: "", label: "\u2014 Select \u2014" },
                      ...(companies || []).filter((c: any) => ["COUNTERPARTY", "OPERATING_COMPANY"].includes(c.type)).map((c: any) => ({ value: c.name, label: c.name })),
                      ...(companies || []).filter((c: any) => !["COUNTERPARTY", "OPERATING_COMPANY"].includes(c.type)).map((c: any) => ({ value: c.name, label: c.name })),
                      { value: "__NEW__", label: "+ Add New Company" },
                    ]}
                  />
                </>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Company name"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateCompany}
                      loading={creatingCompany}
                    >
                      Create
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setShowNewCompany(false);
                        setNewCompanyName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </FormField>
            <FormField label="Source">
              <Select
                value={identity.source}
                onChange={(e) =>
                  setIdentity((p) => ({ ...p, source: e.target.value }))
                }
                options={[
                  { value: "", label: "\u2014 Select \u2014" },
                  { value: "Direct / Proprietary", label: "Direct / Proprietary" },
                  { value: "Broker", label: "Broker" },
                  { value: "Advisor referral", label: "Advisor referral" },
                  { value: "GP relationship", label: "GP relationship" },
                  { value: "LP co-invest", label: "LP co-invest" },
                  { value: "Conference / Event", label: "Conference / Event" },
                  { value: "GP direct outreach", label: "GP direct outreach" },
                ]}
              />
            </FormField>
          </div>

          <FormField label="Entity Link">
            <Select
              value={identity.entityId}
              onChange={(e) =>
                setIdentity((p) => ({ ...p, entityId: e.target.value }))
              }
              options={[
                { value: "", label: "\u2014 None \u2014" },
                ...(entities || []).map((e: any) => ({ value: e.id, label: e.name })),
              ]}
            />
          </FormField>
        </div>
      )}

      {/* Step 2: Materials & Context */}
      {step === 2 && (
        <div className="space-y-4">
          {/* File upload */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Upload documents for AI screening (optional).
            </p>
            <FormField label="Select File">
              <FileUpload
                onFileSelect={setPendingFile}
                selectedFile={pendingFile}
              />
            </FormField>
            {pendingFile && (
              <div className="flex items-end gap-2">
                <FormField label="Category" className="flex-1">
                  <Select
                    value={pendingCategory}
                    onChange={(e) => setPendingCategory(e.target.value)}
                    options={DOC_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                </FormField>
                <Button onClick={addDoc} variant="secondary" className="mb-0">
                  Add
                </Button>
              </div>
            )}
          </div>

          {/* Queued docs */}
          {docs.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
              No documents queued. You can add documents later.
            </div>
          ) : (
            <div className="space-y-1.5">
              {docs.map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">&#128196;</span>
                    <span className="text-sm font-medium truncate">{doc.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full shrink-0">
                      {doc.category}
                    </span>
                    {doc.file && (
                      <span className="text-[10px] text-gray-400">
                        {(doc.file.size / 1024).toFixed(0)} KB
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeDoc(i)}
                    className="text-gray-400 hover:text-red-500 text-sm ml-2"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Additional Context */}
          <FormField label="Additional Context">
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Provide any context about this deal: description, thesis, rationale, background, etc. The AI will use this along with uploaded documents for screening."
              rows={5}
            />
          </FormField>

          {/* AI Screening info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm font-medium text-purple-800">
              AI Screening
            </div>
            <p className="text-xs text-purple-600 mt-1">
              &quot;Create & Screen&quot; will create the deal, upload documents, and trigger AI screening.
              The deal will automatically advance to Due Diligence once screening completes.
              Or use &quot;Create Deal&quot; to skip screening and add more context later.
            </p>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-700">
              Deal Summary
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-gray-500">Name:</span>{" "}
                <span className="font-medium">{identity.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Asset Class:</span>{" "}
                <span className="font-medium">
                  {ASSET_CLASS_OPTIONS.find((c) => c.value === identity.assetClass)?.label}
                </span>
              </div>
              {identity.capitalInstrument && (
                <div>
                  <span className="text-gray-500">Instrument:</span>{" "}
                  <span className="font-medium">
                    {CAPITAL_INSTRUMENT_OPTIONS.find((c) => c.value === identity.capitalInstrument)?.label}
                  </span>
                </div>
              )}
              {identity.participationStructure && (
                <div>
                  <span className="text-gray-500">Participation:</span>{" "}
                  <span className="font-medium">
                    {PARTICIPATION_STRUCTURE_OPTIONS.find((c) => c.value === identity.participationStructure)?.label}
                  </span>
                </div>
              )}
              {identity.targetCheckSize && (
                <div>
                  <span className="text-gray-500">Check Size:</span>{" "}
                  <span className="font-medium">{identity.targetCheckSize}</span>
                </div>
              )}
              {identity.gpName && (
                <div>
                  <span className="text-gray-500">GP:</span>{" "}
                  <span className="font-medium">{identity.gpName}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Documents:</span>{" "}
                <span className="font-medium">{docs.length} queued</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function mapDocCategory(cat: string): string {
  const map: Record<string, string> = {
    "Term Sheet": "LEGAL",
    CIM: "REPORT",
    Financials: "FINANCIAL",
    Legal: "LEGAL",
    Insurance: "OTHER",
    Tax: "TAX",
    Other: "OTHER",
  };
  return map[cat] || "OTHER";
}
