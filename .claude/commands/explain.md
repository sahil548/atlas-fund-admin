# Explain What Changed

Look at the most recent git commit(s) and explain everything in plain english for a non-technical user. Specifically:

1. Run `git log --oneline -5` and `git diff HEAD~1` (or the range specified in $ARGUMENTS)
2. For each file changed, explain:
   - **What this file does** in the app (what the user sees/experiences)
   - **What changed** and why
   - **What could break** if this change has a bug
3. Provide a testing checklist — exact click paths to verify everything works
4. List the top 3 most likely failure points and how to fix each one
5. Suggest what to build next

Write as if explaining to someone who has never written code. No jargon without explanation.
