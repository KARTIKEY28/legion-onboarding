import { describe, expect, it } from "vitest";
import { CLINICIANS } from "./data";
import { evidenceTier, matchClinicians, type MatchInput } from "./match";
import { openSlots } from "./schedule";

const NOW = new Date("2026-11-02T12:00:00.000Z");
const base: MatchInput = { topics: [], windows: [] };

const clinician = (id: string) => CLINICIANS.find((c) => c.id === id)!;

describe("open slots", () => {
  it("gives a fully booked clinician no slots, and others some", () => {
    expect(openSlots(clinician("c7"), NOW)).toEqual([]); // c7 is fullyBooked
    expect(openSlots(clinician("c1"), NOW).length).toBeGreaterThan(0);
  });

  it("only returns slots inside the chosen windows", () => {
    const slots = openSlots(clinician("c1"), NOW, ["weekday_mornings"]);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.window === "weekday_mornings")).toBe(true);
  });
});

describe("evidence tier", () => {
  it("uses outcomes only when the cohort is large enough", () => {
    expect(evidenceTier(clinician("c1")).tier).toBe(3); // cohort 64
    expect(evidenceTier(clinician("c3")).tier).toBe(2); // experience, no outcomes
    expect(evidenceTier(clinician("c11")).tier).toBe(2); // outcomes cohort 22 < 30 -> falls to tier 2
  });
});

describe("matching", () => {
  it("returns the top 3 strong matches when enough clinicians qualify", () => {
    const result = matchClinicians({ ...base, topics: ["low_mood", "worry"] }, NOW);
    expect(result.strong).toBe(true);
    expect(result.matches).toHaveLength(3);
    // Every strong match overlaps a chosen topic and has an open slot.
    for (const m of result.matches) {
      expect(m.clinician.specialties.some((s) => ["low_mood", "worry"].includes(s))).toBe(true);
      expect(m.slots.length).toBeGreaterThan(0);
    }
  });

  it("never puts a fully booked clinician in the matches", () => {
    const result = matchClinicians({ ...base, topics: ["eating"] }, NOW);
    expect(result.matches.map((m) => m.clinician.id)).not.toContain("c7");
  });

  it("excludes a clinician with no opening in the chosen windows from strong matches", () => {
    // c12 is evenings only; a mornings-only patient can't get a strong match with them.
    const result = matchClinicians({ ...base, topics: ["low_mood"], windows: ["weekday_mornings"] }, NOW);
    const ids = result.matches.map((m) => m.clinician.id);
    if (result.strong) expect(ids).not.toContain("c12");
  });

  it("falls back to the no-strong-match state when fewer than 3 qualify", () => {
    // Spanish + eating + weekends matches no one strongly (eating clinicians don't speak Spanish).
    const result = matchClinicians({ topics: ["eating"], windows: ["weekends"], language: "es" }, NOW);
    expect(result.strong).toBe(false);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const input = { ...base, topics: ["low_mood", "worry"] } as MatchInput;
    expect(matchClinicians(input, NOW).matches.map((m) => m.clinician.id)).toEqual(
      matchClinicians(input, NOW).matches.map((m) => m.clinician.id),
    );
  });
});
