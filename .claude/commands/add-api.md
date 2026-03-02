# Add a New API Route

Create a new API endpoint for: $ARGUMENTS

Steps:
1. Create Zod validation schema in `src/lib/schemas.ts` (Create + Update variants)
2. Create route file at `src/app/api/<resource>/route.ts` with GET and POST handlers
3. If it needs a detail route, also create `src/app/api/<resource>/[id]/route.ts` with GET, PUT, PATCH, DELETE
4. Follow these patterns exactly:
   - Use `parseBody(req, Schema)` for body validation
   - Filter by `firmId` from query params on all GET requests
   - Return `NextResponse.json(data, { status: 201 })` for creates
   - Return `NextResponse.json({ error: "message" }, { status: 404 })` for not found
   - Use `prisma` singleton from `@/lib/prisma`
   - Wrap in try/catch, return 500 on unexpected errors
5. Check the architecture spec (`docs/architecture-spec.md` §14) for the correct Prisma model
6. Run `npm run build` to verify
7. Tell me the endpoint URLs and how to test them with curl
