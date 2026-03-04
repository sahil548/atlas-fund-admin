# UI Component Guide

Reference for all UI components in Atlas. Check here before building new UI to reuse existing components.

---

## Primitives (`src/components/ui/`)

### Button
Clickable action button with variants and loading states.
```typescript
<Button variant="primary" onClick={handler} loading={isSaving}>Save</Button>
// Variants: "primary" | "secondary" | "danger"
// Sizes: "sm" (default) | "md"
// Loading state auto-disables the button
```

### Input
Text input with optional error state.
```typescript
<Input placeholder="Name" error={hasError} />
// Uses forwardRef — error shows red border
```

### Textarea
Multi-line text input.
```typescript
<Textarea rows={3} placeholder="Notes" error={hasError} />
// Default min-height: 80px
```

### Select
Native dropdown select.
```typescript
<Select options={[{value: "1", label: "Option 1"}]} placeholder="Choose..." error={hasError} />
// Empty value = placeholder option
```

### Modal
Centered portal modal with overlay.
```typescript
<Modal open={isOpen} onClose={() => setOpen(false)} title="Delete?" size="md"
  footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="danger" onClick={confirm}>Confirm</Button></>}>
  <p>Are you sure?</p>
</Modal>
// Sizes: "sm" | "md" | "lg" | "xl" | "full"
// Escape key auto-closes
// Uses createPortal to document.body
```

### Toast (via useToast hook)
Context-based toast notifications.
```typescript
const toast = useToast();
toast.success("Saved");
toast.error("Failed");
// CRITICAL: NEVER destructure — const { toast } = useToast() CRASHES
// Auto-dismisses after 4 seconds
```

### Badge
Small colored pill for labels and statuses.
```typescript
<Badge color="green">Active</Badge>
// Colors: "blue" | "green" | "yellow" | "red" | "gray" | "purple" | "indigo" | "orange" | "pink"
```

### ConfirmDialog
Modal wrapper for delete/confirm patterns.
```typescript
<ConfirmDialog open={isOpen} onClose={() => setOpen(false)} onConfirm={handleDelete}
  title="Delete Deal?" message="This cannot be undone." variant="danger" loading={isDeleting} />
// Always use variant="danger" for destructive actions
// Size locked to "sm", Cancel + Confirm buttons auto-generated
```

### FileUpload
Drag-and-drop + click file picker.
```typescript
<FileUpload onFileSelect={setFile} maxSizeMB={25} selectedFile={file} />
// Returns File object — use in FormData for upload
// Default accept: PDF, Word, Excel, CSV
// Shows selected file name + size, error if exceeds maxSize
```

### FormField
Label + input wrapper with error display.
```typescript
<FormField label="Deal Name" required error={errors.name}>
  <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} error={!!errors.name} />
</FormField>
// Red asterisk if required, error text below input
```

### Tabs
Horizontal tab switcher.
```typescript
<Tabs tabs={["overview", "docs"]} active={tab} onChange={setTab} />
// Tab names auto-capitalized
// Active tab: indigo, inactive: gray
// Must manage tab state in parent component
```

### ProgressBar
Horizontal progress indicator.
```typescript
<ProgressBar percent={65} colorClass="bg-indigo-500" />
// At 100%, color locks to emerald regardless of colorClass
```

### StatCard
Dashboard stat display.
```typescript
<StatCard label="AUM" value="$2.5B" sub="Dec 31" trend={12} small={false} />
// Trend arrow: up (green) or down (red)
```

### DocumentPreviewModal
File preview for PDFs, images, or download fallback.
```typescript
<DocumentPreviewModal open={isOpen} onClose={() => setOpen(false)} document={{name, fileUrl, mimeType}} />
// PDFs and images render inline, other types show "Preview not available"
// Always has Download button
```

### NotificationBell
Top-bar notification dropdown.
```typescript
<NotificationBell userId={userId} />
// Fetches /api/notifications every 30s
// Red badge shows unread count (max "9+")
// Click notification marks as read
```

---

## Layout Components (`src/components/layout/`)

### AppShell
Root layout wrapper — sidebar + topbar + content. Auto-detects `/lp-` routes and switches to LP portal.

### Sidebar
Left nav with firm selector, portal toggle (GP/LP), and route links. Reads from `routes.ts` for nav items. Dark slate background.

### TopBar
Header with page title, CommandBar, NotificationBell, and QBO sync status indicator.

---

## Providers (`src/components/providers/`)

### FirmProvider
Multi-tenant context. **Always use `useFirm()` to get firmId — never hardcode "firm-1".**
```typescript
const { firmId, firmName, firms, setFirmId } = useFirm();
```

### UserProvider
Demo auth context. Pre-seeded users: user-jk (James Kim, GP_ADMIN), user-sm (Sarah Mitchell), user-al (Alex Lee).
```typescript
const { user, userId } = useUser();
```

---

## Feature Components by Domain (`src/components/features/`)

### Deals
| Component | Purpose |
|-----------|---------|
| `create-deal-wizard.tsx` | Multi-step deal creation modal |
| `deal-overview-tab.tsx` | Overview tab with IC memo, AI screening CTA |
| `deal-dd-tab.tsx` | Due diligence workstreams and tasks |
| `deal-documents-tab.tsx` | Document browser and upload |
| `deal-closing-tab.tsx` | Closing checklist |
| `deal-ic-review-tab.tsx` | IC vote tracking |
| `deal-activity-tab.tsx` | Activity timeline |
| `deal-notes-tab.tsx` | Notes editor |
| `edit-deal-form.tsx` | Deal info editor (modal) |
| `inline-edit-field.tsx` | Click-to-edit text/textarea (saves on blur) |

### Assets
| Component | Purpose |
|-----------|---------|
| `edit-asset-form.tsx` | Edit asset info (modal) |
| `upload-document-form.tsx` | Add document to asset |
| `log-valuation-form.tsx` | Log asset valuation |
| `log-income-form.tsx` | Log asset income |
| `create-task-form.tsx` | Create asset task |

### Capital
| Component | Purpose |
|-----------|---------|
| `create-capital-call-form.tsx` | Capital call wizard |
| `create-distribution-form.tsx` | Distribution form |

### Settings
| Component | Purpose |
|-----------|---------|
| `ai-global-config.tsx` | AI screening model configuration |
| `dd-category-editor.tsx` | Edit DD category templates |
| `deal-pipeline-editor.tsx` | Edit deal stages + mapping |
| `prompt-templates-editor.tsx` | AI prompt templates |

### Other Domains
- **Entities:** `create-entity-form.tsx`
- **Funds:** `edit-entity-form.tsx`
- **Investors:** `create-investor-form.tsx`, `edit-investor-form.tsx`
- **Meetings:** `create-meeting-form.tsx`
- **Waterfall:** `create-template-form.tsx`, `add-tier-form.tsx`, `edit-tier-form.tsx`
- **Dashboard:** `asset-allocation-chart.tsx` (donut chart)
- **Command Bar:** `command-bar.tsx` + `command-bar-provider.tsx` (Cmd+K)

---

## Common Patterns

### File Upload Flow
```typescript
const [file, setFile] = useState<File | null>(null);
<FileUpload onFileSelect={setFile} maxSizeMB={25} selectedFile={file} />

// Submit: CRITICAL — do NOT set Content-Type header
const formData = new FormData();
formData.append("file", file);
formData.append("category", "FINANCIAL");
await fetch(`/api/assets/${id}/documents`, { method: "POST", body: formData });
```

### Modal + Confirm Pattern
```typescript
const [isOpen, setIsOpen] = useState(false);
<ConfirmDialog open={isOpen} onClose={() => setIsOpen(false)} onConfirm={handleDelete}
  title="Delete?" message="This cannot be undone." variant="danger" />
```

### Form with Validation
```typescript
<FormField label="Name" required error={errors.name}>
  <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} error={!!errors.name} />
</FormField>
```

### Inline Edit (Click-to-Edit)
- Displays as read-only until clicked
- Shows edit pencil on hover
- Saves on blur (Input) or Enter (Textarea)
- Escape cancels
- Auto-revalidates SWR after save
