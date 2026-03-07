"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { getPageTitle } from "@/lib/routes";
import { useUser } from "@/components/providers/user-provider";
import { OnboardingModal } from "@/components/features/onboarding/onboarding-modal";
import { PageErrorBoundary } from "@/components/ui/error-boundary";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUser();

  const isAuthRoute = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isLpRoute = pathname.startsWith("/lp-");
  const isLpUser = user.role === "LP_INVESTOR";

  // All hooks must be called before any early returns
  const [portal, setPortal] = useState<"gp" | "lp">(
    isLpUser ? "lp" : isLpRoute ? "lp" : "gp"
  );

  useEffect(() => {
    if (isLpUser && !isLpRoute) {
      setPortal("lp");
      router.push("/lp-dashboard");
    }
  }, [isLpUser, isLpRoute, router]);

  useEffect(() => {
    if (isLpRoute && portal !== "lp") {
      setPortal("lp");
    } else if (!isLpRoute && portal !== "gp" && !isLpUser) {
      setPortal("gp");
    }
  }, [isLpRoute, portal, isLpUser]);

  // Auth pages render without shell
  if (isAuthRoute) return <>{children}</>;

  // Show loading while fetching auth user
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="animate-pulse text-lg">Loading...</div>
        </div>
      </div>
    );
  }

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
        <div className="p-6">
          <PageErrorBoundary>{children}</PageErrorBoundary>
        </div>
      </div>
      <OnboardingModal />
    </div>
  );
}
