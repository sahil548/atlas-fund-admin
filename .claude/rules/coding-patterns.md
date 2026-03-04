# Coding Patterns & Anti-Patterns

Critical patterns that prevent bugs and crashes. Follow these exactly.

---

## Toast — will crash if destructured

```typescript
const toast = useToast();
toast.success("Saved");  toast.error("Failed");
// NEVER: const { toast } = useToast()  ← CRASHES (shadows React internals)
```

## API Route Body Parsing — always use parseBody + Zod

```typescript
import { parseBody } from "@/lib/api-helpers";
import { CreateDealSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDealSchema);
  if (error) return error;  // auto 400 with field errors
  const deal = await prisma.deal.create({ data: { ...data! } });
  return NextResponse.json(deal, { status: 201 });
}
```

## Dynamic Route Params — Next.js 16 requires await

```typescript
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // MUST await — it's a Promise now
}
```

## SWR + FirmProvider — never hardcode firm-1

```typescript
const { firmId } = useFirm();  // from @/components/providers/firm-provider
const { data, isLoading } = useSWR(`/api/deals?firmId=${firmId}`, fetcher);
if (isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;
```

## Mutations — two patterns, both valid

```typescript
// Pattern A: fetch + SWR revalidation
const res = await fetch(`/api/deals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
if (!res.ok) throw new Error("Failed");
mutate(`/api/deals/${id}`);

// Pattern B: useMutation hook
const { trigger } = useMutation("/api/tasks", { method: "POST", revalidateKeys: ["/api/tasks"] });
await trigger({ title: "New task" });
```

## File Upload — FormData pattern

```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("name", file.name);
formData.append("category", "CIM");
await fetch(`/api/deals/${dealId}/documents`, { method: "POST", body: formData });
// Do NOT set Content-Type header — browser sets multipart boundary automatically
```

## Prisma — singleton import

```typescript
import { prisma } from "@/lib/prisma";  // always from here, never instantiate PrismaClient
```

## Utilities

```typescript
import { fmt, pct, cn } from "@/lib/utils";
fmt(1500000)  // "$1.5M"    pct(0.15)  // "15.0%"
cn("base", isActive && "text-white")  // conditional Tailwind classes
```

---

## Anti-Patterns (NEVER do these)

```typescript
// ❌ Hardcoding firm ID
const { data } = useSWR("/api/deals?firmId=firm-1", fetcher);
// ✅ Dynamic firm ID
const { firmId } = useFirm();
const { data } = useSWR(`/api/deals?firmId=${firmId}`, fetcher);

// ❌ Setting Content-Type on FormData (breaks multipart boundary)
await fetch(url, { method: "POST", headers: { "Content-Type": "multipart/form-data" }, body: formData });
// ✅ Let browser handle it
await fetch(url, { method: "POST", body: formData });

// ❌ Forgetting loading guard (crashes on first render)
export default function Page() {
  const { data } = useSWR("/api/stuff", fetcher);
  return <div>{data.items.map(...)}</div>;  // data is undefined on first render
}
// ✅ Always guard
const { data, isLoading } = useSWR("/api/stuff", fetcher);
if (isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

// ❌ Direct PrismaClient instantiation
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();  // creates new connection every hot-reload
// ✅ Singleton
import { prisma } from "@/lib/prisma";

// ❌ Client component without directive (silently breaks hooks)
import useSWR from "swr";
export default function Page() { ... }
// ✅ Must have "use client" at top of file
"use client";
import useSWR from "swr";

// ❌ Mutating SWR cache without revalidation (stale UI)
await fetch(`/api/deals/${id}`, { method: "DELETE" });
// ✅ Revalidate after mutation
await fetch(`/api/deals/${id}`, { method: "DELETE" });
mutate(`/api/deals?firmId=${firmId}`);  // refresh the list

// ❌ Nested fetch in useEffect (race conditions, no caching)
useEffect(() => { fetch("/api/deals").then(r => r.json()).then(setData); }, []);
// ✅ Use SWR (handles caching, dedup, revalidation, loading state)
const { data } = useSWR(`/api/deals?firmId=${firmId}`, fetcher);

// ❌ Catching Prisma errors generically
try { await prisma.deal.create({ data }) } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
// ✅ Return specific errors
try { ... } catch (e: any) {
  if (e.code === "P2002") return NextResponse.json({ error: "Already exists" }, { status: 409 });
  if (e.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ error: e.message }, { status: 500 });
}
```

---

## Likely Failure Points

| Problem | Cause | Fix |
|---------|-------|-----|
| Page crashes with "undefined" | SWR data not loaded yet | Add `if (isLoading \|\| !data) return <Loading />` guard |
| Toast crashes entire page | Destructured useToast | Change to `const toast = useToast()` (no destructuring) |
| New page missing from sidebar | Not in routes.ts | Add entry to `APP_ROUTES` in `src/lib/routes.ts` |
| AI suggests 404 URLs | Route not in registry | Add to `routes.ts` — AI prompt auto-generates from it |
| Wrong tenant data | Hardcoded "firm-1" | Use `const { firmId } = useFirm()` instead |
| Prisma errors after schema edit | Stale generated client | Run full reset: `db push --force-reset && generate && seed` |
| Build type errors | Missing await, wrong imports | Run `npm run build` — error shows exact file:line |
| File upload broken | Wrong component or missing FormData | Use `FileUpload` from `ui/file-upload`, upload via FormData |
| Command bar is a modal | Old createPortal code | `command-bar-provider.tsx` must NOT use createPortal |
