import { execSync } from "child_process";
import path from "path";
const cwd = path.join(import.meta.dirname, "..");

const files = [
  "src/lib/computations/performance-attribution.ts",
  "src/app/api/assets/[id]/attribution/route.ts",
  "src/app/api/entities/[id]/attribution/route.ts",
  "src/components/features/assets/asset-performance-tab.tsx",
];

for (const f of files) {
  try {
    execSync(`git add "${f}"`, { stdio: "inherit", cwd });
    console.log("Staged:", f);
  } catch (e: unknown) {
    if (e instanceof Error) console.error("Failed:", f, e.message);
  }
}

execSync("git status --short", { stdio: "inherit", cwd });
