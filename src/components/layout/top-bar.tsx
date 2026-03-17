"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/ui/notification-bell";
import { CommandBar } from "@/components/features/command-bar/command-bar";
import { useUser } from "@/components/providers/user-provider";

export function TopBar({ title }: { title: string }) {
  const { user } = useUser();

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
      <h1 className="text-sm font-semibold whitespace-nowrap">{title}</h1>
      <div className="flex-1 min-w-0">
        <CommandBar />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <NotificationBell />
        {/* User avatar — click to navigate to profile page */}
        <Link
          href="/profile"
          title={`${user.name} — View Profile`}
          className="w-7 h-7 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center hover:bg-indigo-700 transition-colors shrink-0"
        >
          {user.initials || user.name?.slice(0, 2).toUpperCase() || "??"}
        </Link>
      </div>
    </div>
  );
}
