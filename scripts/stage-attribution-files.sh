#!/bin/bash
# Stage all attribution-related files for the 04-05 plan commit
set -e
cd "$(dirname "$0")/.."

git add "src/lib/computations/performance-attribution.ts"
git add "src/app/api/assets/[id]/attribution/route.ts"
git add "src/app/api/entities/[id]/attribution/route.ts"
git add "src/components/features/assets/asset-performance-tab.tsx"
git add "src/app/(gp)/assets/[id]/page.tsx"
git add "src/app/api/assets/[id]/route.ts"

echo "Staged all attribution files."
git status --short
