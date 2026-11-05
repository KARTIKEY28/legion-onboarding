import { describe, expect, it } from "vitest";
import { composeSummary, isAcceptableSummary, templateSummary, type PrevisitInput, type SummaryWriter } from "./previsit";

const INPUT: PrevisitInput = {
  topics: ["Low mood", "Worry"],
  availability: ["Weekday afternoons"],
  path: "self_pay",
};

describe("pre-visit summary", () => {
  it("the template uses only the picked labels and the payment path", () => {
    const text = templateSummary(INPUT);
    expect(text).toContain("low mood");
    expect(text).toContain("worry");
    expect(text).toContain("without insurance");
    expect(text).not.toMatch(/diagnos|should|medication/i);
  });

  it("rejects a draft that gives advice or names medication", () => {
    expect(isAcceptableSummary("You should take medication for this.")).toBe(false);
    expect(isAcceptableSummary("")).toBe(false);
    expect(isAcceptableSummary("I'd like to talk through what's been going on.")).toBe(true);
  });

  it("uses the model draft when it passes, and falls back to the template otherwise", async () => {
    const good: SummaryWriter = { writeSummary: async () => "I want to talk through what's been on my mind." };
    expect(await composeSummary(INPUT, good)).toEqual({
      text: "I want to talk through what's been on my mind.",
      source: "model",
    });

    const risky: SummaryWriter = { writeSummary: async () => "You should take 2 pills daily." };
    expect((await composeSummary(INPUT, risky)).source).toBe("template");

    const broken: SummaryWriter = { writeSummary: async () => { throw new Error("down"); } };
    expect((await composeSummary(INPUT, broken)).source).toBe("template");

    expect((await composeSummary(INPUT, null)).source).toBe("template");
  });

  it("times out slow drafts and falls back", async () => {
    const slow: SummaryWriter = { writeSummary: () => new Promise((r) => setTimeout(() => r("late"), 50)) };
    expect((await composeSummary(INPUT, slow, 10)).source).toBe("template");
  });
});
