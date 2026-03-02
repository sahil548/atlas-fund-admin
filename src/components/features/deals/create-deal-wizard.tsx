"use client";

import { useState } from "react";
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
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
const PARTICIPATION_OPTIONS = [
  { value: "DIRECT_GP", label: "Direct / GP" },
  { value: "CO_INVEST_JV_PARTNERSHIP", label: "Co-Invest / JV / Partnership" },
  { value: "LP_STAKE_SILENT_PARTNER", label: "LP Stake / Silent Partner" },
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
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { data: users } = useSWR(`/api/users?firmId=${firmId}`, fetcher);
  const { data: companies } = useSWR(`/api/companies?firmId=${firmId}`, fetcher);

  // Step 1: Basics
  const [basics, setBasics] = useState({
    name: "",
    assetClass: "REAL_ESTATE",
    capitalInstrument: "",
    participationStructure: "",
    sector: "",
    targetSize: "",
    targetCheckSize: "",
    targetReturn: "",
    dealLeadId: "",
    gpName: "",
    counterparty: "",
    source: "",
  });

  // Step 2: Documents (real file upload)
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCategory, setPendingCategory] = useState("CIM");

  // Step 3: Context
  const [context, setContext] = useState({
    description: "",
    thesisNotes: "",
    investmentRationale: "",
    additionalContext: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setStep(1);
    setBasics({
      name: "", assetClass: "REAL_ESTATE", capitalInstrument: "",
      participationStructure: "", sector: "", targetSize: "",
      targetCheckSize: "", targetReturn: "", dealLeadId: "",
      gpName: "", counterparty: "", source: "",
    });
    setDocs([]);
    setPendingFile(null);
    setPendingCategory("CIM");
    setContext({ description: "", thesisNotes: "", investmentRationale: "", additionalContext: "" });
    setErrors({});
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!basics.name.trim()) errs.name = "Deal name is required";
    if (!basics.assetClass) errs.assetClass = "Asset class is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
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

  async function handleCreateAndScreen() {
    setIsLoading(true);
    try {
      // 1. Create the deal
      const dealRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basics,
          ...context,
        }),
      });
      if (!dealRes.ok) throw new Error("Failed to create deal");
      const deal = await dealRes.json();

      // 2. Upload documents (real files via FormData)
      for (const doc of docs) {
        const formData = new FormData();
        formData.append("name", doc.name);
        formData.append("category", mapDocCategory(doc.category));
        if (doc.file) {
          formData.append("file", doc.file);
        }
        await fetch(`/api/deals/${deal.id}/documents`, {
          method: "POST",
          body: formData,
        });
      }

      // 3. Trigger AI screening
      const screenRes = await fetch(`/api/deals/${deal.id}/screen`, {
        method: "POST",
      });
      if (!screenRes.ok) {
        toast.success("Deal created (screening will run later)");
      } else {
        toast.success("Deal created & AI screening complete");
      }

      handleClose();
      router.push(`/deals/${deal.id}`);
    } catch {
      toast.error("Failed to create deal");
    } finally {
      setIsLoading(false);
    }
  }

  const stepTitles = ["Deal Basics", "Upload Documents", "Context & Screen"];

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
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && !validateStep1()) return;
                setStep(step + 1);
              }}
            >
              Next
            </Button>
          ) : (
            <Button loading={isLoading} onClick={handleCreateAndScreen}>
              Create & Screen
            </Button>
          )}
        </>
      }
    >
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2, 3].map((s) => (
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
            {s < 3 && (
              <div
                className={`flex-1 h-0.5 ${
                  s < step ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="space-y-3">
          <FormField label="Deal Name" required error={errors.name}>
            <Input
              value={basics.name}
              onChange={(e) =>
                setBasics((p) => ({ ...p, name: e.target.value }))
              }
              error={!!errors.name}
              placeholder="e.g. Apex Manufacturing Acquisition"
            />
          </FormField>

          <FormField label="Asset Class" required error={errors.assetClass}>
            <Select
              value={basics.assetClass}
              onChange={(e) =>
                setBasics((p) => ({ ...p, assetClass: e.target.value }))
              }
              options={ASSET_CLASS_OPTIONS}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Capital Instrument">
              <Select
                value={basics.capitalInstrument}
                onChange={(e) =>
                  setBasics((p) => ({ ...p, capitalInstrument: e.target.value }))
                }
                options={[{ value: "", label: "\u2014 Select \u2014" }, ...CAPITAL_INSTRUMENT_OPTIONS]}
              />
            </FormField>
            <FormField label="Participation Structure">
              <Select
                value={basics.participationStructure}
                onChange={(e) =>
                  setBasics((p) => ({ ...p, participationStructure: e.target.value }))
                }
                options={[{ value: "", label: "\u2014 Select \u2014" }, ...PARTICIPATION_OPTIONS]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Sector">
              <Input
                value={basics.sector}
                onChange={(e) =>
                  setBasics((p) => ({ ...p, sector: e.target.value }))
                }
                placeholder="e.g. Healthcare"
              />
            </FormField>
            <FormField label="Total Raise">
              <Input
                value={basics.targetSize}
                onChange={(e) =>
                  setBasics((p) => ({ ...p, targetSize: e.target.value }))
                }
                placeholder="e.g. $25-50M"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Target Check Size">
              <Input
                value={basics.targetCheckSize}
                onChange={(e) =>
                  setBasics((p) => ({ ...p, targetCheckSize: e.target.value }))
                }
                placeholder="e.g. $5-10M"
              />
            </FormField>
            <FormField label="Target Return">
              <Input
                value={basics.targetReturn}
                onChange={(e) =>
                  setBasics((p) => ({ ...p, targetReturn: e.target.value }))
                }
                placeholder="e.g. 2.5-3x MOIC"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Deal Lead">
              <Select
                value={basics.dealLeadId}
                onChange={(e) =>
                  setBasics((p) => ({ ...p, dealLeadId: e.target.value }))
                }
                options={[
                  { value: "", label: "\u2014 Select \u2014" },
                  ...(users || []).map((u: any) => ({ value: u.id, label: u.name })),
                ]}
              />
            </FormField>
            <FormField label="GP / Sponsor">
              <Select
                value={basics.gpName}
                onChange={(e) =>
                  setBasics((p) => ({ ...p, gpName: e.target.value }))
                }
                options={[
                  { value: "", label: "\u2014 Select \u2014" },
                  ...(companies || []).filter((c: any) => c.type === "GP").map((c: any) => ({ value: c.name, label: c.name })),
                  ...(companies || []).filter((c: any) => c.type !== "GP").map((c: any) => ({ value: c.name, label: `${c.name}` })),
                ]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Counterparty">
              <Select
                value={basics.counterparty}
                onChange={(e) =>
                  setBasics((p) => ({ ...p, counterparty: e.target.value }))
                }
                options={[
                  { value: "", label: "\u2014 Select \u2014" },
                  ...(companies || []).filter((c: any) => ["COUNTERPARTY", "OPERATING_COMPANY"].includes(c.type)).map((c: any) => ({ value: c.name, label: c.name })),
                  ...(companies || []).filter((c: any) => !["COUNTERPARTY", "OPERATING_COMPANY"].includes(c.type)).map((c: any) => ({ value: c.name, label: c.name })),
                ]}
              />
            </FormField>
            <FormField label="Source">
              <Select
                value={basics.source}
                onChange={(e) =>
                  setBasics((p) => ({ ...p, source: e.target.value }))
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
        </div>
      )}

      {/* Step 2: Documents — real file upload */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Upload documents for AI screening. Drag & drop or browse to select files.
          </p>

          {/* File upload + category */}
          <div className="space-y-3">
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
            <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
              No documents queued. You can add them now or later from the deal page.
            </div>
          ) : (
            <div className="space-y-1.5">
              {docs.map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">📄</span>
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
        </div>
      )}

      {/* Step 3: Context & Screen */}
      {step === 3 && (
        <div className="space-y-4">
          <FormField label="Description">
            <Textarea
              value={context.description}
              onChange={(e) =>
                setContext((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Brief overview of the deal opportunity..."
              rows={3}
            />
          </FormField>

          <FormField label="Investment Rationale">
            <Textarea
              value={context.investmentRationale}
              onChange={(e) =>
                setContext((p) => ({ ...p, investmentRationale: e.target.value }))
              }
              placeholder="Why are we looking at this deal? What's the strategic fit?"
              rows={3}
            />
          </FormField>

          <FormField label="Thesis Notes">
            <Textarea
              value={context.thesisNotes}
              onChange={(e) =>
                setContext((p) => ({ ...p, thesisNotes: e.target.value }))
              }
              placeholder="Investment thesis, key value drivers, strategic rationale..."
              rows={3}
            />
          </FormField>

          <FormField label="Additional Context">
            <Textarea
              value={context.additionalContext}
              onChange={(e) =>
                setContext((p) => ({ ...p, additionalContext: e.target.value }))
              }
              placeholder="Anything else the AI should know when screening this deal..."
              rows={2}
            />
          </FormField>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm font-medium text-purple-800">
              AI Screening
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Clicking &quot;Create & Screen&quot; will create the deal, upload
              documents, and trigger AI screening. The deal will automatically
              advance to Due Diligence once screening completes.
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
                <span className="font-medium">{basics.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Asset Class:</span>{" "}
                <span className="font-medium">
                  {ASSET_CLASS_OPTIONS.find((c) => c.value === basics.assetClass)?.label}
                </span>
              </div>
              {basics.capitalInstrument && (
                <div>
                  <span className="text-gray-500">Instrument:</span>{" "}
                  <span className="font-medium">
                    {CAPITAL_INSTRUMENT_OPTIONS.find((c) => c.value === basics.capitalInstrument)?.label}
                  </span>
                </div>
              )}
              {basics.sector && (
                <div>
                  <span className="text-gray-500">Sector:</span>{" "}
                  <span className="font-medium">{basics.sector}</span>
                </div>
              )}
              {basics.targetSize && (
                <div>
                  <span className="text-gray-500">Target Size:</span>{" "}
                  <span className="font-medium">{basics.targetSize}</span>
                </div>
              )}
              {basics.targetCheckSize && (
                <div>
                  <span className="text-gray-500">Check Size:</span>{" "}
                  <span className="font-medium">{basics.targetCheckSize}</span>
                </div>
              )}
              {basics.targetReturn && (
                <div>
                  <span className="text-gray-500">Target Return:</span>{" "}
                  <span className="font-medium">{basics.targetReturn}</span>
                </div>
              )}
              {basics.gpName && (
                <div>
                  <span className="text-gray-500">GP:</span>{" "}
                  <span className="font-medium">{basics.gpName}</span>
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
