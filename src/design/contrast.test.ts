import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contrast guard over the design tokens (docs/DESIGN.md rule 7). Body text must
 * reach 7:1, other text 4.5:1, and meaningful non-text boundaries 3:1. White on
 * --accent is checked specifically. A violation fails this test (and CI, which
 * runs the tests before the build), so a bad token can't ship.
 *
 * The decorative --line hairline is intentionally low-contrast and is not a
 * required-contrast boundary, so it is excluded.
 */

function tokens(): Record<string, string> {
  const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");
  const map: Record<string, string> = {};
  for (const m of css.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{3,6})/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const srgb = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe("token contrast", () => {
  const t = tokens();
  const pairs: [string, string, number, string][] = [
    // Body text, 7:1
    ["ink", "canvas", 7, "ink on canvas (body)"],
    ["ink", "surface", 7, "ink on surface (body)"],
    // Other text, 4.5:1
    ["ink-muted", "surface", 4.5, "muted text on surface"],
    ["ink-muted", "canvas", 4.5, "muted text on canvas"],
    ["accent", "surface", 4.5, "accent link/text on surface"],
    ["accent", "canvas", 4.5, "accent link/text on canvas"],
    ["accent-ink", "accent", 4.5, "white on accent (primary button)"],
    ["accent-ink", "accent-dark", 4.5, "white on accent-dark (hover)"],
    ["confirmed", "surface", 4.5, "confirmed text on surface"],
    ["confirmed", "confirmed-tint", 4.5, "confirmed text on its tint"],
    ["caution", "surface", 4.5, "caution text on surface"],
    ["caution", "caution-tint", 4.5, "caution text on its tint"],
    // Meaningful non-text boundaries, 3:1
    ["accent", "surface", 3, "selected/accent border on surface"],
    ["accent-dark", "surface", 3, "focus ring on surface"],
  ];

  for (const [fg, bg, min, label] of pairs) {
    it(`${label} >= ${min}:1`, () => {
      expect(t[fg], `missing token ${fg}`).toBeTruthy();
      expect(t[bg], `missing token ${bg}`).toBeTruthy();
      const ratio = contrast(t[fg], t[bg]);
      expect(ratio, `${label} was ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
    });
  }
});
