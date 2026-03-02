# Find and Fix All Errors

Run a comprehensive error sweep across the Atlas codebase:

1. Run `npm run build` — capture ALL TypeScript errors
2. Check for common Atlas-specific bugs using parallel searches:
   - Grep for `const { toast }` (destructured toast — will crash)
   - Grep for `"firm-1"` in components (should be `useFirm()`)
   - Grep for `new PrismaClient` (should use singleton from `@/lib/prisma`)
   - Grep for `createPortal` in command bar (removed in v8.2)
   - Grep for routes not registered in `routes.ts`
3. Fix every issue found
4. Run `npm run build` again to confirm zero errors
5. Report in plain english:
   - What was broken
   - What was fixed
   - What to watch out for
