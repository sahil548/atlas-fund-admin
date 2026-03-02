# Build, Verify & Report

Run the full build-and-verify cycle for Atlas. Do ALL of these steps:

1. Run `npm run build` in the atlas directory
2. If build fails, show the exact errors and fix them. Repeat until clean.
3. Start or verify the preview server is running (use preview tools)
4. Take a screenshot of the page at `/dashboard`
5. Check server logs and console logs for errors
6. Report back in plain english:
   - ✅ Build status (pass/fail, any warnings)
   - ✅ Runtime status (any console errors)
   - ✅ Screenshot confirmation
   - ❌ Any issues found and what was done to fix them

Use parallel agents where possible (e.g., build + check server logs simultaneously).
