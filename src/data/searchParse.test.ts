import { describe, expect, it } from "vitest";
import { parseSearch, hasAnyFilter } from "./searchParse";

describe("deterministic search parsing", () => {
  it("maps a Spanish + depression + ADHD phrase", () => {
    const p = parseSearch("A Spanish-speaking clinician for depression and ADHD");
    expect(p.language).toBe("es");
    expect(p.topics).toEqual(expect.arrayContaining(["low_mood", "focus"]));
    expect(p.gender).toBeUndefined();
  });

  it("maps a woman + anxiety phrase, ignoring the unfilterable 'psychiatrist'", () => {
    const p = parseSearch("A woman psychiatrist for anxiety");
    expect(p.gender).toBe("woman");
    expect(p.topics).toEqual(["worry"]);
  });

  it("maps trauma + evenings", () => {
    const p = parseSearch("Someone who understands trauma, evenings");
    expect(p.topics).toEqual(["past_events"]);
    expect(p.time).toBe("weekday_evenings");
  });

  it("'woman' never triggers the man filter, 'female' never 'male'", () => {
    expect(parseSearch("a woman").gender).toBe("woman");
    expect(parseSearch("a female clinician").gender).toBe("woman");
    expect(parseSearch("a man").gender).toBe("man");
  });

  it("cultural phrasing sets the cultural flag (background + languages, not race)", () => {
    for (const t of ["A Latina clinician who understands my culture", "someone Hispanic", "a clinician who gets my culture"]) {
      expect(parseSearch(t).cultural, t).toBe(true);
    }
    expect(parseSearch("a clinician for sleep").cultural).toBe(false);
  });

  it("returns nothing for an unrecognised phrase", () => {
    const p = parseSearch("I just want someone kind and patient");
    expect(hasAnyFilter(p)).toBe(false);
  });
});
