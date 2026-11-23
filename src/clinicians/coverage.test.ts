import { describe, expect, it } from "vitest";
import { conditionTopics, type TopicId } from "@/facts";
import { CLINICIANS } from "./data";
import { AVAILABILITY_WINDOWS, type AvailabilityWindow } from "./model";
import { openSlots } from "./schedule";

/**
 * Data coverage: for every concern combined with every WEEKDAY window, at least
 * two clinicians are strong matches (cover the concern and have an opening in
 * that window). Weekend availability is deliberately thin, to exercise the
 * no-strong-match / widen flow, so weekend combinations are exempt and are
 * listed in docs/DECISIONS.md.
 */

const NOW = new Date("2026-11-02T12:00:00.000Z");
const WEEKDAY_WINDOWS: AvailabilityWindow[] = ["weekday_mornings", "weekday_afternoons", "weekday_evenings"];

function strongCount(topic: TopicId, window: AvailabilityWindow): number {
  return CLINICIANS.filter((c) => c.specialties.includes(topic) && openSlots(c, NOW, [window]).length > 0).length;
}

describe("concern x weekday-window coverage", () => {
  for (const topic of conditionTopics.value) {
    for (const window of WEEKDAY_WINDOWS) {
      it(`${topic.id} + ${window} has at least two strong matches`, () => {
        expect(strongCount(topic.id as TopicId, window)).toBeGreaterThanOrEqual(2);
      });
    }
  }
});

describe("every condition is covered in each served state", () => {
  // Each published condition must have at least two clinicians licensed in each
  // state who treat it, so neither a Texas nor a Utah patient is ever left with
  // a single option (or none) for a concern they chose.
  for (const topic of conditionTopics.value) {
    for (const state of ["TX", "UT"] as const) {
      it(`${topic.id} has at least two ${state} clinicians who treat it`, () => {
        const n = CLINICIANS.filter((c) => c.licensedStates.includes(state) && c.specialties.includes(topic.id)).length;
        expect(n).toBeGreaterThanOrEqual(2);
      });
    }
  }
});

describe("weekends are deliberately thin", () => {
  it("lists the weekend as a real, selectable window", () => {
    expect(AVAILABILITY_WINDOWS.map((w) => w.id)).toContain("weekends");
  });

  it("leaves most concern + weekend combinations below two (the demo no-match case)", () => {
    const thin = conditionTopics.value.filter((t) => strongCount(t.id as TopicId, "weekends") < 2);
    // The majority of concerns have no weekend strong match: that is intentional.
    expect(thin.length).toBeGreaterThan(conditionTopics.value.length / 2);
  });
});
