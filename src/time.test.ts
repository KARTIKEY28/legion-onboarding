import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatInZone, timeInZone, dayInZone, zoneAbbrev } from "./time";

/**
 * Time-zone display is state-derived (Texas -> Central, Utah -> Mountain). The
 * zone abbreviation lives in exactly one place: src/time.ts. No component, page
 * or helper may hardcode "CT", "MT" or a zone name, or a Utah patient would be
 * shown a Texas abbreviation. This test fails if any source file outside
 * src/time.ts contains a hardcoded zone token.
 */

const ZONE_TOKEN = /\b(CT|MT|CST|CDT|MST|MDT)\b|Central Time|Mountain Time/;
const SRC = join(__dirname);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry)) continue; // tests may assert on the rendered abbreviation
    if (full === join(SRC, "time.ts")) continue; // the one allowed home for the abbreviations
    out.push(full);
  }
  return out;
}

describe("time zone display is state-derived", () => {
  it("renders Texas visits in Central and Utah visits in Mountain", () => {
    const iso = "2026-11-10T20:00:00.000Z"; // 2pm CT / 1pm MT
    expect(formatInZone(iso, "TX")).toMatch(/\bCT\b/);
    expect(formatInZone(iso, "UT")).toMatch(/\bMT\b/);
    expect(timeInZone(iso, "TX")).not.toEqual(timeInZone(iso, "UT"));
    expect(zoneAbbrev("TX")).toBe("CT");
    expect(zoneAbbrev("UT")).toBe("MT");
    expect(dayInZone(iso, "TX")).toBeTruthy();
  });

  it("no source file outside src/time.ts hardcodes a zone abbreviation", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, "utf8");
      if (ZONE_TOKEN.test(text)) offenders.push(file.replace(`${SRC}/`, "src/"));
    }
    expect(offenders, `hardcoded zone token found in: ${offenders.join(", ")}`).toEqual([]);
  });
});
