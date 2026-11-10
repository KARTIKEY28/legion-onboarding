import { describe, expect, it } from "vitest";
import { CLINICIANS } from "./data";
import {
  allRanked,
  cardEvidence,
  displayMatches,
  evidenceTier,
  matchClinicians,
  passesHardConstraints,
  widenGains,
  type MatchInput,
} from "./match";
import { nextSlots, openSlots } from "./schedule";

const NOW = new Date("2026-11-02T12:00:00.000Z");

const clinician = (id: string) => CLINICIANS.find((c) => c.id === id)!;
const ids = (list: { clinician: { id: string } }[]) => list.map((m) => m.clinician.id);

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
  it("uses outcomes only when the cohort is at least 50", () => {
    expect(evidenceTier(clinician("c1")).tier).toBe(3); // cohort 64
    expect(evidenceTier(clinician("c5")).tier).toBe(2); // outcomes cohort 41 < 50 -> tier 2
    expect(evidenceTier(clinician("c11")).tier).toBe(2); // outcomes cohort 22 < 50 -> tier 2
    expect(evidenceTier(clinician("c4")).tier).toBe(2); // experience, no outcomes
  });

  it("never lets a card show outcomes (tier 3 is profile-only)", () => {
    for (const c of CLINICIANS) {
      expect(cardEvidence(c).tier).toBeLessThanOrEqual(2);
    }
  });
});

describe("the ranking bug: low mood + weekday mornings", () => {
  const input: MatchInput = { topics: ["low_mood"], windows: ["weekday_mornings"] };

  it("ranks Dana (matches both, has a morning opening) above Marco (no morning opening)", () => {
    const full = ids(allRanked(input, NOW));
    expect(full.indexOf("c1")).toBeLessThan(full.indexOf("c2"));
  });

  it("makes Dana a strong match but not Marco, who has no morning opening", () => {
    const result = matchClinicians(input, NOW);
    expect(ids(result.strongMatches)).toContain("c1"); // Dana
    expect(ids(result.strongMatches)).not.toContain("c2"); // Marco
  });

  it("keeps Marco out of the top three, which strong matches fill", () => {
    const top = ids(displayMatches(matchClinicians(input, NOW)));
    expect(top).toContain("c1");
    expect(top).not.toContain("c2");
  });
});

describe("hard constraints decide who can be strong", () => {
  it("a: every strong match covers a chosen concern", () => {
    const result = matchClinicians({ topics: ["grief"], windows: [] }, NOW);
    for (const m of result.strongMatches) {
      expect(m.clinician.specialties).toContain("grief");
    }
  });

  it("b: every strong match has an opening in the chosen window", () => {
    const result = matchClinicians({ topics: ["low_mood"], windows: ["weekday_mornings"] }, NOW);
    for (const m of result.strongMatches) {
      expect(openSlots(m.clinician, NOW, ["weekday_mornings"]).length).toBeGreaterThan(0);
    }
  });

  it("c: every strong match accepts the chosen plan", () => {
    const result = matchClinicians({ topics: ["low_mood"], windows: [], payerId: "sample_insurance" }, NOW);
    expect(result.strongMatches.length).toBeGreaterThan(0);
    for (const m of result.strongMatches) {
      expect(m.clinician.acceptedPayers).toContain("sample_insurance");
    }
  });

  it("d: every strong match speaks the chosen language", () => {
    const result = matchClinicians({ topics: ["low_mood"], windows: [], language: "es" }, NOW);
    expect(result.strongMatches.length).toBeGreaterThan(0);
    for (const m of result.strongMatches) {
      expect(m.clinician.languages).toContain("es");
    }
  });

  it("a fully booked clinician is never a strong match", () => {
    expect(passesHardConstraints(clinician("c7"), { topics: ["eating"], windows: [] }, NOW)).toBe(false);
  });
});

describe("no-strong-match state fires only at zero strong matches", () => {
  it("shows matches (not the no-match state) when one or two clinicians are strong", () => {
    // grief + weekday mornings: only Dana and Elena are strong (two), so it is not a no-match state.
    const result = matchClinicians({ topics: ["grief"], windows: ["weekday_mornings"] }, NOW);
    expect(result.strongMatches.length).toBe(2);
    expect(result.noStrongMatch).toBe(false);
    expect(result.alsoAvailable.length).toBe(1); // filled to three, labeled honestly
    expect(displayMatches(result)).toHaveLength(3);
  });

  it("falls to the no-strong-match state only when nobody is strong", () => {
    // low mood + weekends: no low-mood clinician works weekends (weekends are thin by design).
    const result = matchClinicians({ topics: ["low_mood"], windows: ["weekends"] }, NOW);
    expect(result.noStrongMatch).toBe(true);
    expect(result.strongMatches).toHaveLength(0);
    expect(result.closest.length).toBeGreaterThan(0);
  });
});

describe("soft score orders strong matches", () => {
  it("ranks a clinician who covers more concerns higher", () => {
    // c1 covers both low_mood and worry; c3 covers only worry.
    const full = ids(allRanked({ topics: ["low_mood", "worry"], windows: [] }, NOW));
    expect(full.indexOf("c1")).toBeLessThan(full.indexOf("c3"));
  });

  it("is deterministic", () => {
    const input: MatchInput = { topics: ["low_mood", "worry"], windows: [] };
    expect(ids(matchClinicians(input, NOW).strongMatches)).toEqual(ids(matchClinicians(input, NOW).strongMatches));
  });
});

describe("distinct schedules", () => {
  it("no two clinicians show the same first two times in the default view", () => {
    const firstTwo = CLINICIANS.filter((c) => !c.fullyBooked).map((c) =>
      nextSlots(c, NOW, undefined, 2)
        .map((s) => s.iso)
        .join("|"),
    );
    expect(new Set(firstTwo).size).toBe(firstTwo.length);
  });
});

describe("widen gains", () => {
  it("counts how many more clinicians dropping the time window would add", () => {
    const input: MatchInput = { topics: ["low_mood"], windows: ["weekends"] };
    const gains = widenGains(input, NOW);
    expect(gains.any_time).toBeGreaterThan(0);
  });
});
