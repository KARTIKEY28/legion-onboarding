import { describe, expect, it } from "vitest";
import { CLINICIANS } from "@/clinicians/data";
import { cardEvidence, evidenceTier, type MatchReasonFacts } from "@/clinicians/match";
import { cardEvidenceLine, profileOutcomeLine, reasonsTemplate, validateReasons } from "./matchReasons";

const c1 = CLINICIANS.find((c) => c.id === "c1")!; // low_mood, worry, sleep, panic; experience 180; outcomes cohort 64

const facts = (over: Partial<MatchReasonFacts> = {}): MatchReasonFacts => ({
  matchedTopics: [],
  matchedTopicIds: [],
  windows: [],
  ...over,
});

describe("reason templates", () => {
  it("builds reasons from phrases, in order: concern, time, then plan or language", () => {
    expect(
      reasonsTemplate(
        facts({ matchedTopicIds: ["sleep", "worry"], windows: ["weekday_mornings"], language: "es" }),
      ),
    ).toEqual(["Focuses on sleep and ongoing worry", "Weekday morning openings", "Speaks Spanish"]);
  });

  it("prefers a plan over a language when both are present", () => {
    expect(reasonsTemplate(facts({ matchedTopicIds: ["low_mood"], payer: "Sample Insurance Co.", language: "es" }))).toEqual([
      "Focuses on low mood",
      "Takes Sample Insurance Co.",
    ]);
  });
});

describe("evidence lines", () => {
  it("card evidence leads with the illustrative label and the concern, never outcomes", () => {
    const line = cardEvidenceLine(cardEvidence(c1), facts({ matchedTopicIds: ["low_mood"] }));
    expect(line).toBe("Illustrative: has worked with about 180 patients with low mood");
  });

  it("profile outcome line labels illustrative data and names the cohort size", () => {
    const line = profileOutcomeLine(evidenceTier(c1));
    expect(line).toContain("Illustrative data");
    expect(line).toContain("64");
    expect(line).toContain("7 in 10");
  });

  it("gives no profile outcome line when the cohort is too small", () => {
    const c11 = CLINICIANS.find((c) => c.id === "c11")!; // outcomes cohort 22 < 50
    expect(profileOutcomeLine(evidenceTier(c11))).toBeNull();
  });
});

describe("reason validator", () => {
  it("accepts the template reasons for a clinician", () => {
    const lines = reasonsTemplate(facts({ matchedTopicIds: ["low_mood", "sleep"], windows: ["weekday_mornings"] }));
    expect(validateReasons(lines, c1)).toBe(true);
  });

  it("rejects an invented number", () => {
    expect(validateReasons(["Illustrative: has worked with about 999 patients with low mood"], c1)).toBe(false);
  });

  it("rejects a concern the clinician does not list", () => {
    // c1 does not specialise in mood swings.
    expect(validateReasons(["Focuses on mood swings"], c1)).toBe(false);
  });
});
