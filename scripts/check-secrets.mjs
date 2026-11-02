#!/usr/bin/env node
// Fails (exit 1) if any file that would be committed contains a secret.
// Runs before every build (npm "prebuild") and in CI.
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { envFileProblem, findSecrets } from "./secrets.mjs";

const root = process.cwd();
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".next-e2e", "test-results", "playwright-report", ".vercel"]);

function filesToCheck() {
  try {
    // Tracked files plus untracked ones that are not ignored: everything a commit could include.
    const out = execSync("git ls-files --cached --others --exclude-standard -z", { cwd: root, encoding: "utf8" });
    return out.split("\0").filter(Boolean);
  } catch {
    // No git (for example some build environments): walk the tree instead, skipping ignored folders.
    const walk = (dir) =>
      readdirSync(dir).flatMap((entry) => {
        if (SKIP_DIRS.has(entry)) return [];
        const path = join(dir, entry);
        return statSync(path).isDirectory() ? walk(path) : [relative(root, path)];
      });
    return walk(root).filter((path) => !path.split("/").pop().match(/^\.env(?!\.example$)/));
  }
}

const problems = [];
for (const path of filesToCheck()) {
  let text;
  try {
    if (statSync(join(root, path)).size > 2_000_000) continue;
    text = readFileSync(join(root, path), "utf8");
  } catch {
    continue;
  }
  const envProblem = envFileProblem(path, text);
  if (envProblem) problems.push(envProblem);
  for (const name of findSecrets(text)) problems.push(`${path}: looks like a ${name}`);
}

if (problems.length) {
  console.error("Secret check failed. Remove these before building or committing:\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log("Secret check passed.");
