"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useInvestor } from "@/components/providers/investor-provider";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface NotificationPreferences {
  preferredChannel: "EMAIL" | "SMS" | "PORTAL_ONLY";
  emailAddress: string | null;
  phoneNumber: string | null;
  digestPreference: "IMMEDIATE" | "DAILY_DIGEST" | "WEEKLY_DIGEST";
  notificationTypes: {
    capitalActivity: boolean;
    reports: boolean;
    portfolio: boolean;
  };
  gpOverrides: {
    capitalCallsAlwaysImmediate: boolean;
  };
}

export default function LPSettingsPage() {
  const { investorId } = useInvestor();
  const toast = useToast();

  const { data, isLoading, mutate } = useSWR<NotificationPreferences>(
    investorId ? `/api/investors/${investorId}/notification-preferences` : null,
    fetcher
  );

  const [form, setForm] = useState<Omit<NotificationPreferences, "gpOverrides">>({
    preferredChannel: "EMAIL",
    emailAddress: null,
    phoneNumber: null,
    digestPreference: "IMMEDIATE",
    notificationTypes: {
      capitalActivity: true,
      reports: true,
      portfolio: true,
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync form state when SWR data changes (e.g. investor switch)
  useEffect(() => {
    if (data) {
      setForm({
        preferredChannel: data.preferredChannel,
        emailAddress: data.emailAddress,
        phoneNumber: data.phoneNumber,
        digestPreference: data.digestPreference,
        notificationTypes: data.notificationTypes,
      });
    }
  }, [data]);

  const save = (updated: Omit<NotificationPreferences, "gpOverrides">) => {
    if (!investorId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const res = await fetch(
          `/api/investors/${investorId}/notification-preferences`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          }
        );
        if (!res.ok) throw new Error("Save failed");
        await mutate();
        toast.success("Preferences saved");
      } catch {
        toast.error("Failed to save preferences");
      } finally {
        setIsSaving(false);
      }
    }, 500);
  };

  const update = <K extends keyof Omit<NotificationPreferences, "gpOverrides">>(
    key: K,
    value: Omit<NotificationPreferences, "gpOverrides">[K]
  ) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    save(updated);
  };

  const updateNotificationType = (
    key: keyof NotificationPreferences["notificationTypes"],
    value: boolean
  ) => {
    const updated = {
      ...form,
      notificationTypes: { ...form.notificationTypes, [key]: value },
    };
    setForm(updated);
    save(updated);
  };

  if (!investorId || isLoading || !data) {
    return <div className="text-sm text-gray-400">Loading...</div>;
  }

  const showSmsWarning =
    form.preferredChannel === "SMS" && !form.phoneNumber;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your notification preferences and contact information.
        </p>
      </div>

      {/* Section 1: Contact Information */}
      <div className={cn("bg-white rounded-xl border border-gray-200 p-5 space-y-4", isSaving && "opacity-70 pointer-events-none")}>
        <h2 className="text-sm font-semibold text-gray-900">Contact Information</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={form.emailAddress ?? ""}
            onChange={(e) =>
              update("emailAddress", e.target.value || null)
            }
            placeholder="your@email.com"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400">Used for email notifications and reports</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700" htmlFor="phone">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phoneNumber ?? ""}
            onChange={(e) =>
              update("phoneNumber", e.target.value || null)
            }
            placeholder="+1 (555) 000-0000"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400">Required for SMS notifications</p>
        </div>
      </div>

      {/* Section 2: Preferred Channel */}
      <div className={cn("bg-white rounded-xl border border-gray-200 p-5 space-y-3", isSaving && "opacity-70 pointer-events-none")}>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Preferred Channel</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose how you&apos;d like to receive notifications
          </p>
        </div>

        <div className="space-y-2">
          {(
            [
              { value: "EMAIL", label: "Email" },
              { value: "SMS", label: "SMS" },
              { value: "PORTAL_ONLY", label: "In-App Only" },
            ] as const
          ).map(({ value, label }) => (
            <label
              key={value}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="radio"
                name="preferredChannel"
                value={value}
                checked={form.preferredChannel === value}
                onChange={() => update("preferredChannel", value)}
                className="accent-indigo-600"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        {showSmsWarning && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Please enter a phone number above to receive SMS notifications.
          </p>
        )}
      </div>

      {/* Section 3: Notification Categories */}
      <div className={cn("bg-white rounded-xl border border-gray-200 p-5 space-y-3", isSaving && "opacity-70 pointer-events-none")}>
        <h2 className="text-sm font-semibold text-gray-900">Notification Categories</h2>

        <div className="space-y-3">
          {(
            [
              {
                key: "capitalActivity" as const,
                label: "Capital Activity",
                description: "Capital calls issued, distributions paid",
              },
              {
                key: "reports" as const,
                label: "Reports",
                description: "Quarterly reports available, K-1 ready",
              },
              {
                key: "portfolio" as const,
                label: "Portfolio",
                description: "NAV updates, valuation changes, new deal closes",
              },
            ]
          ).map(({ key, label, description }) => (
            <label
              key={key}
              className="flex items-start gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={form.notificationTypes[key]}
                onChange={(e) => updateNotificationType(key, e.target.checked)}
                className="mt-0.5 accent-indigo-600"
              />
              <div>
                <div className="text-sm font-medium text-gray-700">{label}</div>
                <div className="text-xs text-gray-400">{description}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 text-xs text-indigo-700">
          Capital call notices are always delivered immediately regardless of your digest preference.
        </div>
      </div>

      {/* Section 4: Digest Preference */}
      <div className={cn("bg-white rounded-xl border border-gray-200 p-5 space-y-3", isSaving && "opacity-70 pointer-events-none")}>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Digest Preference</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose how frequently you receive non-urgent notifications
          </p>
        </div>

        <div className="space-y-3">
          {(
            [
              {
                value: "IMMEDIATE" as const,
                label: "Immediate",
                description: "Receive each notification as it happens",
              },
              {
                value: "DAILY_DIGEST" as const,
                label: "Daily Digest",
                description: "Receive a summary email once per day",
              },
              {
                value: "WEEKLY_DIGEST" as const,
                label: "Weekly Digest",
                description: "Receive a summary email once per week",
              },
            ]
          ).map(({ value, label, description }) => (
            <label
              key={value}
              className="flex items-start gap-3 cursor-pointer"
            >
              <input
                type="radio"
                name="digestPreference"
                value={value}
                checked={form.digestPreference === value}
                onChange={() => update("digestPreference", value)}
                className="mt-0.5 accent-indigo-600"
              />
              <div>
                <div className="text-sm font-medium text-gray-700">{label}</div>
                <div className="text-xs text-gray-400">{description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {isSaving && (
        <p className="text-xs text-gray-400 text-right">Saving preferences...</p>
      )}
    </div>
  );
}
