# Atlas — Fund Administration Platform

## What This Is

Atlas is a family office operating system replacing spreadsheets, portals, and emails. It covers deal pipeline, asset management, LP relations, accounting, capital activity, and entity management. Built for ~9 fund entities, ~10 LPs, scaling toward $1B AUM.

**Tech stack:** Next.js 16 · TypeScript · React 19 · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Zod 4 · SWR 2 · Recharts 3

---

## How to Work With Me

### Before every task

1. **For non-trivial tasks, confirm your understanding first.** For clear, specific requests — just do it.
2. **If ambiguous, ask as many clarifying questions as needed.** But if the request is specific and clear, just do it.
3. **Always enter plan mode before writing code,** unless I say "just do it" or the change is a single obvious fix (typo, one-liner, simple rename).
4. **Consult reference docs** when the task involves a new page, new API route, new domain feature, or schema changes. For small edits to existing code, reading the existing file is enough.
   - `docs/architecture-spec.md` — data models, entity relationships, domain features
   - `docs/deal-desk-guide.md` — deal workflow, stages, DD, IC process
   - `docs/data-model-guide.md` — all 56 Prisma models by domain
   - `docs/ui-guide.md` — existing UI components and usage patterns
   - `docs/api-guide.md` — all API endpoints, what they accept/return
   - `docs/workflows.md` — labeled step-by-step workflows for testing and verification
   - `docs/roadmap.md` — what's built, what's not, what to build next (priority ranked)
   - `.claude/rules/coding-patterns.md` — auto-loaded, bug-preventing patterns
   - `.claude/rules/project-structure.md` — auto-loaded, file layout and checklists

### While working

- **Use parallel agents whenever possible** — research in parallel, edit independent files concurrently, run build + preview verification simultaneously.
- **When I say "don't change any code" or "test this," investigate and report only.** No edits.
- **When I ask "what should we do next" or "what would you suggest,"** propose the next logical feature or fix based on what you know about the codebase.
- **When I ask you to "score" or "evaluate" something,** be honest and specific. Give numbers, say what's strong, what's weak, what's missing.

### After every change

1. **Explain what changed in plain English.** No jargon. Tell me what's different and why.
2. **Give me specific testing steps.** Not "test the feature" — tell me exactly what to click, what page to go to, what I should see.
3. **Tell me what might break.** Be honest about edge cases or things that could go wrong.
4. **Run `npm run build`** — zero errors before telling me you're done.

### Testing

- **When testing, use localhost in a browser when possible.** Don't just check build output — actually open the page and interact with it.
- **Test using real workflows as a user would.** Click through the actual UI flow end-to-end, not just verify individual components in isolation.

### Version workflow

- **Do NOT commit or push after every change.** Batch your work.
- **Only commit when I say** "commit", "ship it", "push it", or explicitly ask for a commit.
- **When I approve a version**, commit with a clear message describing all changes in that batch.

### Continuous improvement

- **When something breaks or you make a mistake**, suggest a one-line addition to `.claude/rules/coding-patterns.md` so future sessions don't repeat it.
- **When you find outdated docs**, flag it and suggest the specific update. Don't silently work around stale info. Never update docs without asking first.

---

## Things I Don't Know

I'm not a developer. I don't read code. When you explain things to me:
- Use plain English, not technical jargon
- If you must use a technical term, explain what it means
- Focus on what the user sees and experiences, not implementation details
- Show me screenshots or tell me where to click, not which function was refactored

---

## Dev Commands

```bash
npm run dev            # Dev server on port 3000
npm run build          # Production build — catches ALL type errors
npx prisma studio      # Visual database browser
npx prisma db seed     # Re-seed demo data
```

After ANY schema.prisma change:
```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset
npx prisma generate && npx prisma db seed
# Then restart dev server
```
