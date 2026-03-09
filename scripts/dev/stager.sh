#!/bin/bash
cd "$(dirname "$0")/../.."
git add src/lib/computations/performance-attribution.ts
git add "src/app/api/assets/[id]/attribution/route.ts"
git add "src/app/api/entities/[id]/attribution/route.ts"
git add "src/components/features/assets/asset-performance-tab.tsx"
git add "src/app/(gp)/assets/[id]/page.tsx"
git add "src/app/api/assets/[id]/route.ts"
git status
