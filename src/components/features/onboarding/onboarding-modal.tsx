"use client";

import { useState } from "react";
import { useFirm } from "@/components/providers/firm-provider";
import { useUser } from "@/components/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mutate } from "swr";

/**
 * Shows an onboarding modal for newly provisioned users whose firm
 * name still matches the auto-generated pattern ("X's Organization").
 */
export function OnboardingModal() {
  const { firmId, firmName } = useFirm();
  const { user } = useUser();

  // Detect auto-generated firm name
  const needsOnboarding = firmName.endsWith("'s Organization") || firmName === "Atlas";
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firmName: "",
    legalName: "",
  });

  if (!needsOnboarding || dismissed || !firmId || !user.id) return null;

  async function handleSave() {
    if (!form.firmName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/firms/${firmId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.firmName.trim(),
          legalName: form.legalName.trim() || undefined,
        }),
      });
      if (res.ok) {
        mutate(`/api/firms/${firmId}`);
        mutate("/api/firms");
        setDismissed(true);
        // Reload to refresh firm name throughout the app
        window.location.reload();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-5 text-white">
          <h2 className="text-lg font-bold">Welcome to Atlas</h2>
          <p className="text-indigo-200 text-sm mt-1">
            Let&apos;s set up your workspace in just a moment.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-6 pt-4">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-indigo-600" : "bg-gray-200"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-indigo-600" : "bg-gray-200"}`} />
        </div>

        <div className="px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Firm / Organization Name *
                </label>
                <Input
                  placeholder="e.g. Calafia Group, Blackstone, etc."
                  value={form.firmName}
                  onChange={(e) => setForm((f) => ({ ...f, firmName: e.target.value }))}
                  autoFocus
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  This is how your workspace will appear to your team.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Legal Entity Name (optional)
                </label>
                <Input
                  placeholder="e.g. Calafia Group LLC"
                  value={form.legalName}
                  onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto text-xl">
                &#x1F680;
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                You&apos;re all set!
              </h3>
              <p className="text-xs text-gray-500">
                Your workspace <strong className="text-gray-700 dark:text-gray-300">{form.firmName}</strong> is ready.
                Start by creating entities, adding deals, or inviting your team from Settings.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between">
          {step === 1 && (
            <>
              <Button variant="secondary" onClick={() => setDismissed(true)}>
                Skip for now
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.firmName.trim()}
              >
                Continue
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Launch Workspace
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
