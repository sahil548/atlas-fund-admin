"use client";

import { useUser } from "@/components/providers/user-provider";
import { useState, useRef, useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

const ROLE_LABELS: Record<string, string> = {
  GP_ADMIN: "GP Admin",
  GP_TEAM: "GP Team",
  LP_INVESTOR: "LP Investor",
  SERVICE_PROVIDER: "Service Provider",
};

const ROLE_COLORS: Record<string, string> = {
  GP_ADMIN: "bg-indigo-500",
  GP_TEAM: "bg-blue-500",
  LP_INVESTOR: "bg-green-500",
  SERVICE_PROVIDER: "bg-orange-500",
};

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function UserSwitcher() {
  const { user, setUserId, allUsers } = useUser();
  const clerk = CLERK_ENABLED ? useClerk() : null;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const gpUsers = Object.values(allUsers).filter(u => u.role === "GP_ADMIN" || u.role === "GP_TEAM");
  const lpUsers = Object.values(allUsers).filter(u => u.role === "LP_INVESTOR");

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 hover:bg-slate-800 rounded-lg p-1.5 transition-colors"
      >
        <div className={`w-6 h-6 ${ROLE_COLORS[user.role] || "bg-indigo-600"} rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
          {user.initials}
        </div>
        <div className="text-left min-w-0 flex-1">
          <div className="text-[10px] text-white font-medium truncate">{user.name}</div>
          <div className="text-[9px] text-slate-500">{ROLE_LABELS[user.role] || user.role}</div>
        </div>
        <svg className="w-3 h-3 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          <div className="px-2 py-1.5 text-[9px] text-slate-500 uppercase tracking-wider font-semibold">GP Team</div>
          {gpUsers.map(u => (
            <button
              key={u.id}
              onClick={() => { setUserId(u.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-slate-700 transition-colors ${
                user.id === u.id ? "bg-slate-700" : ""
              }`}
            >
              <div className={`w-5 h-5 ${ROLE_COLORS[u.role]} rounded-full flex items-center justify-center text-white text-[9px] font-bold`}>
                {u.initials}
              </div>
              <div>
                <div className="text-[10px] text-white">{u.name}</div>
                <div className="text-[9px] text-slate-500">{ROLE_LABELS[u.role]}</div>
              </div>
            </button>
          ))}

          {lpUsers.length > 0 && (
            <>
              <div className="border-t border-slate-700 mt-1" />
              <div className="px-2 py-1.5 text-[9px] text-slate-500 uppercase tracking-wider font-semibold">LP Investors</div>
              {lpUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setUserId(u.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-slate-700 transition-colors ${
                    user.id === u.id ? "bg-slate-700" : ""
                  }`}
                >
                  <div className={`w-5 h-5 ${ROLE_COLORS[u.role]} rounded-full flex items-center justify-center text-white text-[9px] font-bold`}>
                    {u.initials}
                  </div>
                  <div>
                    <div className="text-[10px] text-white">{u.name}</div>
                    <div className="text-[9px] text-slate-500">{ROLE_LABELS[u.role]}</div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Sign Out */}
          {clerk && (
            <>
              <div className="border-t border-slate-700 mt-1" />
              <button
                onClick={() => clerk.signOut({ redirectUrl: "/sign-in" })}
                className="w-full flex items-center gap-2 px-2 py-2 text-left hover:bg-red-900/30 transition-colors"
              >
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-[10px] text-red-400 font-medium">Sign Out</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
