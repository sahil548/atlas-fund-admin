import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ── Public routes (no auth required) ───────────────────────

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/slack/interactions",
  "/api/integrations/(.*)/webhook",
  "/api/integrations/(.*)/callback",
  // DocuSign OAuth callback (no auth — called by DocuSign servers)
  "/api/docusign/callback",
  // DocuSign webhook (no auth — called by DocuSign Connect)
  "/api/docusign/webhook",
]);

// ── LP portal routes (LP_INVESTOR only) ────────────────────

const isLPRoute = createRouteMatcher([
  "/lp(.*)",
  "/api/lp(.*)",
]);

// ── GP routes that LP_INVESTOR must be redirected from ─────

const isGPPageRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/deals(.*)",
  "/entities(.*)",
  "/assets(.*)",
  "/directory(.*)",
  "/documents(.*)",
  "/tasks(.*)",
  "/accounting(.*)",
  "/analytics(.*)",
  "/meetings(.*)",
  "/transactions(.*)",
  "/settings(.*)",
]);

// ── GP API routes that LP_INVESTOR must be blocked from ────

const isGPAPIRoute = createRouteMatcher([
  "/api/deals(.*)",
  "/api/entities(.*)",
  "/api/assets(.*)",
  "/api/users(.*)",
  "/api/documents(.*)",
  "/api/tasks(.*)",
  "/api/accounting(.*)",
  "/api/analytics(.*)",
  "/api/meetings(.*)",
  "/api/capital-calls(.*)",
  "/api/distributions(.*)",
  "/api/firms(.*)",
  "/api/contacts(.*)",
  "/api/companies(.*)",
  "/api/investors(.*)",
  "/api/notes(.*)",
  "/api/nav(.*)",
  "/api/waterfall(.*)",
  "/api/fees(.*)",
  "/api/reports(.*)",
  "/api/settings(.*)",
  "/api/ai(.*)",
  "/api/agent(.*)",
  "/api/decision-structures(.*)",
  "/api/audit-log(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Step 1: Protect all non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Step 2: Role-based routing
  // Get the Clerk session claims — role stored in publicMetadata
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;

  // Only enforce if we have a role (production Clerk with metadata)
  // In dev/mock mode (no Clerk session claims), skip role enforcement
  if (role) {
    const { pathname } = req.nextUrl;

    // LP_INVESTOR must not access GP pages → redirect to /lp/dashboard
    if (role === "LP_INVESTOR") {
      if (isGPPageRoute(req)) {
        const url = req.nextUrl.clone();
        url.pathname = "/lp/dashboard";
        return NextResponse.redirect(url);
      }

      // LP_INVESTOR must not call GP API routes → 403
      if (isGPAPIRoute(req) && !isLPRoute(req)) {
        return NextResponse.json(
          { error: "Forbidden: LP users cannot access GP resources" },
          { status: 403 },
        );
      }
    }

    // SERVICE_PROVIDER — read-only enforcement (write methods blocked)
    if (role === "SERVICE_PROVIDER") {
      const method = req.method;
      const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
      if (isWriteMethod && !isPublicRoute(req)) {
        return NextResponse.json(
          { error: "Forbidden: Service providers have read-only access" },
          { status: 403 },
        );
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
