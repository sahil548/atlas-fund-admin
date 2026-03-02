"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/entities": "Entities",
  "/assets": "Assets",
  "/deals": "Deal Desk",
  "/capital": "Transactions",
  "/meetings": "Meetings",
  "/directory": "Directory",
  "/investors": "Investors",
  "/documents": "Documents",
  "/tasks": "Tasks",
  "/accounting": "Accounting",
  "/settings": "Settings",
  "/lp-dashboard": "My Overview",
  "/lp-account": "Capital Account",
  "/lp-portfolio": "Portfolio",
  "/lp-activity": "Notices & Activity",
  "/lp-documents": "Documents",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLpRoute = pathname.startsWith("/lp-");
  const [portal, setPortal] = useState<"gp" | "lp">(isLpRoute ? "lp" : "gp");

  const handlePortalChange = (p: "gp" | "lp") => {
    setPortal(p);
    router.push(p === "gp" ? "/dashboard" : "/lp-dashboard");
  };

  const title =
    pageTitles[pathname] ||
    (pathname.startsWith("/assets/") ? "Asset Detail" :
     pathname.startsWith("/deals/") ? "Deal Detail" :
     pathname.startsWith("/entities/") ? "Entity Detail" :
     pathname.startsWith("/investors/") ? "Investor Detail" : "Atlas");

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
