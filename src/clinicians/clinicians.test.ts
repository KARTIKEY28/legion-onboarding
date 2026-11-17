import { describe, expect, it } from "vitest";
import { conditionTopics } from "@/facts";
import { samplePayers } from "@/facts";
import { COVERAGE, UNCOVERED_TOPICS } from "./condition-coverage";
import { CLINICIANS } from "./data";
import { AVAILABILITY_WINDOWS, CLINICIAN_GENDERS, LANGUAGES } from "./model";

const topicIds = new Set<string>(conditionTopics.value.map((t) => t.id));
const windowIds = new Set<string>(AVAILABILITY_WINDOWS.map((w) => w.id));
const langIds = new Set<string>(LANGUAGES.map((l) => l.id));
const genderIds = new Set<string>(CLINICIAN_GENDERS.map((g) => g.id));
const payerIds = new Set<string>(samplePayers.value.map((p) => p.id));

describe("synthetic clinicians", () => {
  it("has 18 clinicians with unique ids", () => {
    expect(CLINICIANS).toHaveLength(18);
    expect(new Set(CLINICIANS.map((c) => c.id)).size).toBe(18);
  });

  it("only uses valid specialties, availability, languages, gender, payers and licensed states", () => {
    const stateIds = new Set<string>(["TX", "UT"]);
    for (const c of CLINICIANS) {
      expect(c.specialties.every((s) => topicIds.has(s)), `${c.id} specialties`).toBe(true);
      expect(c.availability.every((w) => windowIds.has(w)), `${c.id} availability`).toBe(true);
      expect(c.languages.every((l) => langIds.has(l)), `${c.id} languages`).toBe(true);
      expect(genderIds.has(c.gender), `${c.id} gender`).toBe(true);
      expect(c.acceptedPayers.every((p) => payerIds.has(p)), `${c.id} payers`).toBe(true);
      // Every clinician must be licensed in at least one served state.
      expect(c.licensedStates.length, `${c.id} licensedStates`).toBeGreaterThan(0);
      expect(c.licensedStates.every((s) => stateIds.has(s)), `${c.id} licensedStates`).toBe(true);
    }
  });

  it("has at least three clinicians licensed in Utah", () => {
    expect(CLINICIANS.filter((c) => c.licensedStates.includes("UT")).length).toBeGreaterThanOrEqual(3);
  });

  it("labels every experience and outcome figure as illustrative", () => {
    for (const c of CLINICIANS) {
      if (c.experience) expect(c.experience.illustrative).toBe(true);
      if (c.outcomes) expect(c.outcomes.illustrative).toBe(true);
    }
  });
});

describe("condition coverage", () => {
  it("covers every Conditions option with at least one clinician", () => {
    // If this ever fails, do not remove the option: list it in docs/DECISIONS.md.
    expect(UNCOVERED_TOPICS).toEqual([]);
  });

  it("maps each topic to the clinicians whose specialties include it", () => {
    for (const topic of conditionTopics.value) {
      const expected = CLINICIANS.filter((c) => c.specialties.includes(topic.id)).map((c) => c.id);
      expect(COVERAGE[topic.id]).toEqual(expected);
    }
  });
});
