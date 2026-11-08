import { describe, expect, it } from "vitest";
import { buildMatchHeadline, joinPhrases } from "./phrases";

describe("joinPhrases", () => {
  it("joins one, two and three items naturally", () => {
    expect(joinPhrases(["low mood"])).toBe("low mood");
    expect(joinPhrases(["low mood", "ongoing worry"])).toBe("low mood and ongoing worry");
    expect(joinPhrases(["low mood", "ongoing worry", "sleep"])).toBe("low mood, ongoing worry and sleep");
  });
});

describe("buildMatchHeadline", () => {
  it("one concern, no window", () => {
    expect(buildMatchHeadline({ concerns: ["low mood"], windows: [] })).toBe("Clinicians who work with low mood.");
  });

  it("one concern and one window", () => {
    expect(buildMatchHeadline({ concerns: ["low mood"], windows: ["weekday morning"] })).toBe(
      "Clinicians who work with low mood and have weekday morning openings.",
    );
  });

  it("two concerns and one window", () => {
    expect(buildMatchHeadline({ concerns: ["low mood", "ongoing worry"], windows: ["weekday morning"] })).toBe(
      "Clinicians who work with low mood and ongoing worry and have weekday morning openings.",
    );
  });

  it("three concerns", () => {
    expect(buildMatchHeadline({ concerns: ["low mood", "ongoing worry", "sleep"], windows: [] })).toBe(
      "Clinicians who work with low mood, ongoing worry and sleep.",
    );
  });

  it("adds plan and language only when given", () => {
    expect(
      buildMatchHeadline({ concerns: ["low mood"], windows: [], language: "Spanish", payer: "Sample Insurance Co." }),
    ).toBe("Clinicians who work with low mood, speak Spanish and take Sample Insurance Co.");
  });

  it("falls back when nothing was chosen", () => {
    expect(buildMatchHeadline({ concerns: [], windows: [] })).toBe("Clinicians who could be a good fit for you.");
  });
});
