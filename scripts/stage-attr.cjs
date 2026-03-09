#!/usr/bin/env node
const { execSync } = require("child_process");
const cwd = require("path").join(__dirname, "..");

const files = [
  "src/lib/computations/performance-attribution.ts",
  "src/app/api/assets/[id]/attribution/route.ts",
  "src/app/api/entities/[id]/attribution/route.ts",
  "src/components/features/assets/asset-performance-tab.tsx",
  "src/app/(gp)/assets/[id]/page.tsx",
  "src/app/api/assets/[id]/route.ts",
];

for (const f of files) {
  try {
    execSync(`git add "${f}"`, { stdio: "inherit", cwd });
    console.log("Staged:", f);
  } catch (e) {
    console.error("Failed:", f, e.message);
  }
}

execSync("git status --short", { stdio: "inherit", cwd });
