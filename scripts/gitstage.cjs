#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");
const cwd = path.join(__dirname, "..");

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
    console.log("OK:", f);
  } catch (e) {
    console.error("ERR:", f);
  }
}

execSync("git status", { stdio: "inherit", cwd });
