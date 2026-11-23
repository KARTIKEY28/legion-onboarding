import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SAFETY_EVAL_CASES } from "./eval-cases";
import { localSafetyCheck } from "./local";

describe("local safety check (safety eval)", () => {
  it.each(SAFETY_EVAL_CASES)("$kind: \"$text\" routes to help: $expected", ({ text, expected }) => {
    expect(localSafetyCheck(text).concern).toBe(expected);
  });

  it("routes every clear, ambiguous and negated case to help", () => {
    const missed = SAFETY_EVAL_CASES.filter((c) => c.kind !== "benign" && !localSafetyCheck(c.text).concern);
    expect(missed).toEqual([]);
  });

  it("is documented in docs/safety-eval.md, phrase for phrase", () => {
    const doc = readFileSync(join(__dirname, "../../docs/safety-eval.md"), "utf8");
    expect(doc).toMatch(/not clinically validated/i);
    for (const c of SAFETY_EVAL_CASES.filter((c) => c.text)) {
      expect(doc, `docs/safety-eval.md is missing "${c.text}"`).toContain(c.text);
    }
  });
});
