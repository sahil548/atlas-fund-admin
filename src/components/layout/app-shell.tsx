"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { getPageTitle } from "@/lib/routes";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLpRoute = pathname.startsWith("/lp-");
  const [portal, setPortal] = useState<"gp" | "lp">(isLpRoute ? "lp" : "gp");

  const handlePortalChange = (p: "gp" | "lp") => {
    setPortal(p);
    router.push(p === "gp" ? "/dashboard" : "/lp-dashboard");
  };

  const title = getPageTitle(pathname);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <Sidebar portal={portal} onPortalChange={handlePortalChange} />
      <div className="flex-1 overflow-y-auto">
        <TopBar title={title} />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
