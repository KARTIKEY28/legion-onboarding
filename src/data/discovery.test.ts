import { describe, expect, it } from "vitest";
import { discoverCoverage } from "./discovery";
import { resultForPlan, programForPlan } from "./plans";

describe("insurance discovery (synthetic)", () => {
  it("returns a clean one-match copay for the demo persona", () => {
    const r = discoverCoverage("Alex", "Rivera");
    expect(r.kind).toBe("one");
    if (r.kind === "one") {
      expect(r.plan.payerId).toBe("example_health");
      expect(r.plan.memberId).toBeTruthy();
      expect(resultForPlan(r.plan.payerId)).toBe("copay");
    }
  });

  it("returns several plans for a multi-match name", () => {
    const r = discoverCoverage("Jordan", "Lee");
    expect(r.kind).toBe("multi");
    if (r.kind === "multi") expect(r.plans.length).toBeGreaterThan(1);
  });

  it("surfaces a Medicaid plan (government program) for the exclusion path", () => {
    const r = discoverCoverage("Sam", "Carter");
    expect(r.kind).toBe("one");
    if (r.kind === "one") expect(programForPlan(r.plan.payerId)).toBe("medicaid");
  });

  it("returns a specialist-only plan where psychiatry isn't named", () => {
    const r = discoverCoverage("Taylor", "Brooks");
    expect(r.kind).toBe("one");
    if (r.kind === "one") expect(resultForPlan(r.plan.payerId)).toBe("specialist");
  });

  it("returns a failed lookup for the error name, and no-match for unknown names", () => {
    expect(discoverCoverage("Jamie", "Fox").kind).toBe("failed");
    expect(discoverCoverage("Pat", "Morgan").kind).toBe("none");
    expect(discoverCoverage("Nobody", "Here").kind).toBe("none");
  });

  it("is case- and whitespace-insensitive on the name", () => {
    expect(discoverCoverage("  alex ", "  RIVERA ").kind).toBe("one");
  });
});
