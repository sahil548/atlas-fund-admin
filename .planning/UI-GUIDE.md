# Atlas — UI Components & Workflows

Reference for all UI components and step-by-step workflows for testing.

Last updated: 2026-03-05

---

## UI Primitives (`src/components/ui/`)

### Button
```typescript
<Button variant="primary" onClick={handler} loading={isSaving}>Save</Button>
// Variants: "primary" | "secondary" | "danger"
// Sizes: "sm" (default) | "md"
// Loading state auto-disables
```

### Input / Textarea / Select
```typescript
<Input placeholder="Name" error={hasError} />
<Textarea rows={3} placeholder="Notes" error={hasError} />
<Select options={[{value: "1", label: "Option 1"}]} placeholder="Choose..." error={hasError} />
```

### Modal
```typescript
<Modal open={isOpen} onClose={() => setOpen(false)} title="Title" size="md"
  footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="danger" onClick={confirm}>Confirm</Button></>}>
  <p>Content</p>
</Modal>
// Sizes: "sm" | "md" | "lg" | "xl" | "full" — Escape key closes
```

### Toast
```typescript
const toast = useToast();
toast.success("Saved");  toast.error("Failed");
// CRITICAL: NEVER destructure — const { toast } = useToast() CRASHES
// Auto-dismisses after 4 seconds
```

### Badge
```typescript
<Badge color="green">Active</Badge>
// Colors: blue, green, yellow, red, gray, purple, indigo, orange, pink
```

### ConfirmDialog
```typescript
<ConfirmDialog open={isOpen} onClose={() => setOpen(false)} onConfirm={handleDelete}
  title="Delete?" message="This cannot be undone." variant="danger" loading={isDeleting} />
// Always variant="danger" for destructive actions
```

### FileUpload
```typescript
<FileUpload onFileSelect={setFile} maxSizeMB={25} selectedFile={file} />
// Returns File object — use in FormData. Default: PDF, Word, Excel, CSV
```

### FormField
```typescript
<FormField label="Name" required error={errors.name}>
  <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} error={!!errors.name} />
</FormField>
```

### Other Primitives
- **Tabs** — `<Tabs tabs={["overview", "docs"]} active={tab} onChange={setTab} />`
- **ProgressBar** — `<ProgressBar percent={65} colorClass="bg-indigo-500" />`
- **StatCard** — `<StatCard label="AUM" value="$2.5B" sub="Dec 31" trend={12} />`
- **DocumentPreviewModal** — PDF/image preview with download
- **NotificationBell** — Top-bar bell with 30s polling, unread badge

---

## Layout Components (`src/components/layout/`)

- **AppShell** — Root wrapper: sidebar + topbar + content. Auto-detects `/lp-` routes for LP portal.
- **Sidebar** — Left nav with firm selector, portal toggle (GP/LP), route links from `routes.ts`.
- **TopBar** — Header with page title, CommandBar, NotificationBell, QBO sync indicator.

---

## Providers (`src/components/providers/`)

- **FirmProvider** — Multi-tenant context. `const { firmId } = useFirm()` — never hardcode "firm-1".
- **UserProvider** — Clerk in production, mock for dev. 8 pre-seeded dev users: user-jk (James Kim, GP_ADMIN), user-sm (Sarah Mitchell, GP_TEAM), user-al (Alex Lee, GP_TEAM) + 5 LP investor users.
- **InvestorProvider** — LP context with investorId for portfolio routing.
- **ThemeProvider** — Dark/light mode toggle (localStorage persisted).

---

## Feature Components (`src/components/features/`)

### Deals (10 components)
| Component | Purpose |
|-----------|---------|
| `create-deal-wizard.tsx` | Multi-step deal creation modal |
| `deal-overview-tab.tsx` | Overview with IC memo, AI screening CTA |
| `deal-dd-tab.tsx` | Due diligence workstreams and tasks |
| `deal-documents-tab.tsx` | Document browser and upload |
| `deal-closing-tab.tsx` | Closing checklist |
| `deal-ic-review-tab.tsx` | IC vote tracking |
| `deal-activity-tab.tsx` | Activity timeline |
| `deal-notes-tab.tsx` | Notes editor |
| `edit-deal-form.tsx` | Deal info editor (modal) |
| `inline-edit-field.tsx` | Click-to-edit text/textarea |

### Assets (5), Capital (2), Settings (4), Entities (2), Investors (2), Meetings (1), Waterfall (3), Dashboard (1), Command Bar (2)

See `src/components/features/` for full listing.

---

## Common Patterns

### File Upload Flow
```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("category", "FINANCIAL");
await fetch(`/api/assets/${id}/documents`, { method: "POST", body: formData });
// CRITICAL: Do NOT set Content-Type header — browser auto-sets multipart boundary
```

### Modal + Confirm
```typescript
const [isOpen, setIsOpen] = useState(false);
<ConfirmDialog open={isOpen} onClose={() => setIsOpen(false)} onConfirm={handleDelete}
  title="Delete?" message="Cannot undo." variant="danger" />
```

### Inline Edit (Click-to-Edit)
- Read-only until clicked, shows pencil on hover
- Saves on blur (Input) or Enter (Textarea)
- Escape cancels, auto-revalidates SWR after save

---

## Workflows — Step-by-Step Testing Reference

### Deal Workflows

**DEAL-CREATE: Create a new deal**
1. `/deals` → "New Deal" → fill name, asset class, instrument, entity, lead
2. Upload document → "Create Deal"
3. Verify: lands on `/deals/[id]` in SCREENING, DD tab shows workstreams matching asset class

**DEAL-CREATE-SCREEN: Create and screen (one-click)**
1. `/deals` → "New Deal" → fill details + upload doc → "Create & Screen"
2. Verify: lands in DUE_DILIGENCE, AI auto-triggers, workstream pills turn green, IC Memo populates

**DEAL-SCREEN: Run screening on existing deal**
1. Deal in SCREENING → Overview → "Run AI Screening"
2. Verify: advances to DUE_DILIGENCE, analyses complete, IC Memo generates

**DEAL-SEND-IC: Send to IC Review**
1. Deal in DUE_DILIGENCE → "Send to IC Review"
2. Verify: advances to IC_REVIEW, IC Review tab appears
3. **Known issue:** DD tab may show 0%/NOT_STARTED for this deal (BUG-01)

**DEAL-IC-DECISION: Record IC decision**
1. Deal in IC_REVIEW → IC Review tab → post questions, cast votes
2. Record: APPROVED → "Advance to Closing", REJECTED → stays, SEND_BACK → returns to DD

**DEAL-CLOSE: Close a deal**
1. Deal in CLOSING → Closing tab → complete all checklist items → "Close Deal"
2. Verify: advances to CLOSED, moves to "Closed Deals", asset created

**DEAL-KILL: Kill a deal**
1. Any deal at any stage → "Kill Deal" → confirm
2. Verify: stage = DEAD, moves to "Dead Deals" section

### Asset Workflows

**ASSET-BROWSE:** `/assets` → filter by class pills → verify table filters
**ASSET-EDIT:** `/assets/[id]` → "Edit Asset" → change fields → verify reflected
**ASSET-VALUATION:** `/assets/[id]` → Valuation tab → "+ Valuation" → fill date, method, FV → verify in history
**ASSET-INCOME:** `/assets/[id]` → Cash Flows → "+ Income" → fill date, amount, type → verify in list
**ASSET-TASK:** `/assets/[id]` → Tasks → "+ Task" → fill details → verify on asset + global `/tasks`

### Entity Workflows

**ENTITY-CREATE:** `/entities` → "+ Create Entity" → fill name, type → verify in table
**ENTITY-FORMATION:** `/entities/[id]` → Formation tab → check off tasks → "Mark as Formed" → verify FORMED

### Capital Workflows

**CAPITAL-CALL:** `/transactions` → Capital Calls → "+ Capital Call" → fill entity, amount, dates → save DRAFT → verify
**CAPITAL-DISTRIBUTION:** `/transactions` → Distributions → "+ Distribution" → fill with breakdown → save → verify
**CAPITAL-WATERFALL:** `/transactions` → Waterfall Templates → "+ New Template" → add tiers → verify order

### LP Portal Workflows

**LP-DASHBOARD:** `/lp-dashboard` → verify: stat cards, performance metrics, commitments table
**LP-PORTFOLIO:** `/lp-portfolio` → verify: pro-rata asset exposure with class badges
**LP-DOCUMENTS:** `/lp-documents` → verify: GP-shared documents with entity and category
**LP-ACTIVITY:** `/lp-activity` → verify: capital calls with status, distributions with breakdown
**LP-ACCOUNT:** `/lp-account` → verify: period statement with color-coded line items

### Other Workflows

**DOC-UPLOAD:** `/documents` → "+ Upload" → select file, name, category → verify in list
**TASK-CREATE:** `/tasks` → "+ New Task" → fill details → verify in "My Tasks"
**MEETING-LOG:** `/meetings` → "+ Log Meeting" → fill details, link context → verify card appears
**SETTINGS-AI:** `/settings` → AI Config → enter key, provider, model → save → verify masked
**DIRECTORY-ADD-COMPANY:** `/directory` → Companies → "+ Add Company" → fill details → verify
**DIRECTORY-ADD-CONTACT:** `/directory` → Contacts → "+ Add Contact" → fill details → verify

### Additional GP Pages

**TRANSACTIONS:** `/transactions` — Capital calls, distributions, waterfall templates (the main capital activity hub)
**ACCOUNTING:** `/accounting` — QBO/Xero connection status UI (no real OAuth yet)
**DIRECTORY:** `/directory` — Team member management
**MEETINGS:** `/meetings` — Meeting notes and scheduling
**DOCUMENTS:** `/documents` — Firm-wide document library
**TASKS:** `/tasks` — Global task management
**DASHBOARD:** `/dashboard` — Firm overview with stat cards and charts
**SETTINGS:** `/settings` — AI config, DD templates, prompt editor

**Redirect Routes:**
- `/capital` → redirects to `/transactions`
- `/waterfall` → redirects to `/transactions`
- `/funds` → redirects to `/entities`

### Accounting Workflows — UI-only, no real integration

**ACCOUNTING-CONNECT:** `/accounting` → find entity → "Reconnect" → (would do OAuth) → verify status
**ACCOUNTING-SYNC:** `/accounting` → "Sync" → verify timestamp updates
