import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Copy rules (Part 5):
 *  - No em dashes anywhere in the copy or data files. Use a period, comma or
 *    colon instead. This scans every source file and fails on an em dash.
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) && !entry.includes(".test.") ? [path] : [];
  });
}

describe("copy rules", () => {
  it("has no em dashes in any copy or data file", () => {
    const src = join(__dirname);
    const offenders = sourceFiles(src).filter((file) => readFileSync(file, "utf8").includes("—"));
    expect(offenders).toEqual([]);
  });
});
