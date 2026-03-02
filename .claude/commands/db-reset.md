# Reset Database

Fully reset the database, regenerate types, and reseed demo data:

1. Run the full Prisma reset sequence:
   ```
   PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset
   npx prisma generate
   npx prisma db seed
   ```
2. Verify the seed completed successfully (check for errors)
3. If the dev server is running, remind the user to restart it (Prisma client is cached)
4. Report what happened:
   - How many models were created
   - Whether seed data loaded correctly
   - Any warnings or errors
