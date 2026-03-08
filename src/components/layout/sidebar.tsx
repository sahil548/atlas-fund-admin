"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFirm } from "@/components/providers/firm-provider";
import { useUser } from "@/components/providers/user-provider";
import { getSidebarNav } from "@/lib/routes";
import { UserSwitcher } from "@/components/features/directory/user-switcher";
import { useTheme } from "@/components/providers/theme-provider";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

export function Sidebar({
  portal,
  onPortalChange,
}: {
  portal: "gp" | "lp";
  onPortalChange: (p: "gp" | "lp") => void;
}) {
  const pathname = usePathname();
  const { firmId, firmName, firms, setFirmId } = useFirm();
  const { user } = useUser();
  const nav = getSidebarNav(portal);

  const isLpUser = user.role === "LP_INVESTOR";
  const { theme, setTheme } = useTheme();

  // Lightweight unread count poll for sidebar badge
  const { data: notifData } = useSWR(
    user?.id ? `/api/notifications?userId=${user.id}` : null,
    fetcher,
    { refreshInterval: 30000 },
  );
  const unreadCount: number = notifData?.unreadCount ?? 0;

  return (
    <div className="w-52 bg-slate-900 flex flex-col flex-shrink-0 h-screen sticky top-0">
      <div className="p-4 border-b border-slate-700">
        <div className="text-white font-bold text-lg tracking-tight">ATLAS</div>
        {firms.length > 1 ? (
          <select
            value={firmId}
            onChange={(e) => setFirmId(e.target.value)}
            className="mt-1 w-full bg-slate-800 text-slate-300 text-[10px] rounded px-1.5 py-1 border border-slate-600 focus:border-indigo-400 focus:outline-none uppercase tracking-widest"
          >
            {firms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        ) : (
          <div className="text-slate-400 text-[10px] uppercase tracking-widest mt-0.5">
            {firmName}
          </div>
        )}
      </div>

      {/* Portal toggle — hidden for LP-only users */}
      {!isLpUser && (
        <div className="px-3 py-3 border-b border-slate-700">
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => onPortalChange("gp")}
              className={`flex-1 text-[10px] py-1.5 rounded-md font-medium ${
                portal === "gp"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400"
              }`}
            >
              GP Admin
            </button>
            <button
              onClick={() => onPortalChange("lp")}
              className={`flex-1 text-[10px] py-1.5 rounded-md font-medium ${
                portal === "lp"
                  ? "bg-indigo-600 text-white"
                  : "text-slate.400"
              }`}
            >
              LP Portal
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 py-2 overflow-y-auto">
        {nav.map((item) => {
          const isActive = pathname === item.key || (item.key !== "/dashboard" && pathname.startsWith(item.key + "/"));
          return (
            <Link
              key={item.key}
              href={item.key}
              className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 ${
                isActive
                  ? "bg-slate-800 text-white border-l-2 border-indigo-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-2 border-transparent"
              }`}
            >
              <span className="text-[10px] opacity-60">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700 space-y-2">
        {/* Unread notification badge */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 animate-pulse" />
            <span className="text-[10px] text-slate-400">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500">Theme</span>
          <button
            onClick={() =>
              setTheme(
                theme === "system" ? "dark" : theme === "dark" ? "light" : "system"
              )
            }
            className="text-sm bg-slate-800 hover:bg-slate-700 rounded-md px-2 py-1 text-slate-300 transition-colors"
            title={`Theme: ${theme}`}
          >
            {theme === "dark" ? "\u{1F319}" : theme === "light" ? "\u2600\uFE0F" : "\u{1F5A5}\uFE0F"}
          </button>
        </div>
        <UserSwitcher />
      </div>
    </div>
  );
}
