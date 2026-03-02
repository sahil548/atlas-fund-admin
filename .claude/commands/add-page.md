# Add a New Page

Create a new page at the route: $ARGUMENTS

Steps:
1. Create the page file at `src/app/(gp)/<page-name>/page.tsx` with the `"use client"` directive
2. Add the route entry to `APP_ROUTES` in `src/lib/routes.ts` (this auto-updates sidebar, command bar, AI, page titles)
3. Use the standard page pattern:
   - Import `useFirm` from providers
   - Import `useSWR` with fetcher
   - Import `useToast` (NOT destructured)
   - Add loading guard: `if (isLoading || !data) return <Loading />`
4. Run `npm run build` to verify zero errors
5. Tell me what was created and how to test it
