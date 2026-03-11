"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { useUser } from "@/components/providers/user-provider";
import { ContactHeaderCard } from "@/components/features/contacts/contact-header-card";
import { ContactActivityTab } from "@/components/features/contacts/contact-activity-tab";
import { ContactDealsTab } from "@/components/features/contacts/contact-deals-tab";
import { ContactConnectionsTab } from "@/components/features/contacts/contact-connections-tab";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

type TabId = "activity" | "deals" | "connections";

const TABS: { id: TabId; label: string }[] = [
  { id: "activity", label: "Activity" },
  { id: "deals", label: "Deals & Assets" },
  { id: "connections", label: "Team Connections" },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ContactDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { firmId } = useFirm();
  const { userId } = useUser();

  const [activeTab, setActiveTab] = useState<TabId>("activity");

  const { data: contact, isLoading } = useSWR(
    firmId ? `/api/contacts/${id}?firmId=${firmId}` : null,
    fetcher
  );

  if (isLoading || !contact) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Link href="/directory" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          Directory
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">{fullName}</span>
      </div>

      {/* Header card */}
      <ContactHeaderCard contact={contact} />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 pb-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-700 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="min-h-64">
        {activeTab === "activity" && (
          <ContactActivityTab contactId={id} userId={userId} />
        )}
        {activeTab === "deals" && (
          <ContactDealsTab contact={contact} />
        )}
        {activeTab === "connections" && (
          <ContactConnectionsTab contact={contact} />
        )}
      </div>
    </div>
  );
}
