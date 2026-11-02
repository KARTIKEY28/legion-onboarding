import { describe, expect, it } from "vitest";
import { CLINICIANS } from "@/clinicians/data";
import { evidenceTier } from "@/clinicians/match";
import { evidenceLine, reasonsTemplate, validateReasons } from "./matchReasons";

const c1 = CLINICIANS.find((c) => c.id === "c1")!; // specialties low_mood, worry, sleep; outcomes cohort 64, share .71

describe("reason templates", () => {
  it("builds record-only reason lines", () => {
    expect(
      reasonsTemplate({ matchedTopics: ["Trouble sleeping", "Worry that's hard to shake"], windows: ["Weekday mornings"], language: "Spanish" }),
    ).toEqual([
      "Works with Trouble sleeping and Worry that's hard to shake",
      "Has weekday mornings openings",
      "Speaks Spanish",
    ]);
  });

  it("writes the right evidence line per tier", () => {
    expect(evidenceLine({ tier: 1 })).toMatch(/focus area/);
    expect(evidenceLine({ tier: 2, similarPatients: 180 })).toContain("180 patients");
    expect(evidenceLine(evidenceTier(c1))).toContain("64 patients");
    expect(evidenceLine(evidenceTier(c1))).toContain("7 in 10");
  });
});

describe("reason validator", () => {
  it("accepts the template reasons and evidence for a clinician", () => {
    const lines = [...reasonsTemplate({ matchedTopics: ["Trouble sleeping"], windows: [] }), evidenceLine(evidenceTier(c1))!];
    expect(validateReasons(lines, c1)).toBe(true);
  });

  it("rejects an invented number", () => {
    expect(validateReasons(["Has seen 999 patients with concerns like yours (illustrative)"], c1)).toBe(false);
  });

  it("rejects a condition the clinician does not list", () => {
    // c1 does not specialise in substances.
    expect(validateReasons(["Works with Alcohol or drug use"], c1)).toBe(false);
  });
});
