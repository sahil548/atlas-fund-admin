"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const gpNav = [
  { key: "/dashboard", label: "Dashboard", icon: "\u25FB" },
  { key: "/assets", label: "Assets", icon: "\u25C8" },
  { key: "/deals", label: "Deal Desk", icon: "\u25C6" },
  { key: "/funds", label: "Funds & NAV", icon: "\u25A3" },
  { key: "/investors", label: "Investors", icon: "\u25C9" },
  { key: "/capital", label: "Capital Activity", icon: "\u25C7" },
  { key: "/meetings", label: "Meetings & Notes", icon: "\u25A5" },
  { key: "/waterfall", label: "Waterfall Config", icon: "\u2699" },
  { key: "/accounting", label: "Accounting", icon: "\u2B21" },
];

const lpNav = [
  { key: "/lp-dashboard", label: "My Overview", icon: "\u25FB" },
  { key: "/lp-account", label: "Capital Account", icon: "\u25C8" },
  { key: "/lp-portfolio", label: "Portfolio", icon: "\u25C9" },
  { key: "/lp-activity", label: "Notices & Activity", icon: "\u25C7" },
  { key: "/lp-documents", label: "Documents", icon: "\u25A5" },
];

export function Sidebar({
  portal,
  onPortalChange,
}: {
  portal: "gp" | "lp";
  onPortalChange: (p: "gp" | "lp") => void;
}) {
  const pathname = usePathname();
  const nav = portal === "gp" ? gpNav : lpNav;

  return (
    <div className="w-52 bg-slate-900 flex flex-col flex-shrink-0 h-screen sticky top-0">
      <div className="p-4 border-b border-slate-700">
        <div className="text-white font-bold text-lg tracking-tight">ATLAS</div>
        <div className="text-slate-400 text-[10px] uppercase tracking-widest mt-0.5">
          Family Office GP
        </div>
      </div>

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
                : "text-slate-400"
            }`}
          >
            LP Portal
          </button>
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {nav.map((item) => {
          const isActive = pathname === item.key;
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

      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            {portal === "gp" ? "JK" : "CP"}
          </div>
          <div>
            <div className="text-[10px] text-white font-medium">
              {portal === "gp" ? "James Kim" : "CalPERS"}
            </div>
            <div className="text-[9px] text-slate-500">
              {portal === "gp" ? "GP Admin" : "LP Investor"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
