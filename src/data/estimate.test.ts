import { describe, expect, it } from "vitest";
import { estimateLine, estimateNumbersAllowed, resultFromInsurance } from "./estimate";
import { programForPlan } from "./plans";
import type { SessionAnswers } from "@/session/store";

const insured = (payerId?: string, addLater = false): SessionAnswers => ({
  insurance: { path: "insured", payerId, addLater },
});

describe("eligibility result from the insurance answers", () => {
  it("copay plan -> copay", () => {
    expect(resultFromInsurance(insured("example_health"))).toEqual({ result: "copay", payerId: "example_health" });
  });
  it("deductible-not-met plan -> deductible", () => {
    expect(resultFromInsurance(insured("sample_insurance"))).toEqual({ result: "deductible", payerId: "sample_insurance" });
  });
  it("plan that doesn't cover psychiatry -> not_covered", () => {
    expect(resultFromInsurance(insured("demo_care"))).toEqual({ result: "not_covered", payerId: "demo_care" });
  });
  it("an unknown plan or add-later -> failed", () => {
    expect(resultFromInsurance(insured("other")).result).toBe("failed");
    expect(resultFromInsurance(insured(undefined, true)).result).toBe("failed");
  });
  it("self pay -> self_pay (no check)", () => {
    expect(resultFromInsurance({ insurance: { path: "self_pay" } }).result).toBe("self_pay");
  });
});

describe("government-program discovery (late exclusion)", () => {
  it("flags a Medicaid plan as a government program", () => {
    expect(programForPlan("sample_medicaid")).toBe("medicaid");
  });
  it("leaves ordinary plans unflagged", () => {
    for (const id of ["example_health", "sample_insurance", "demo_care", "mountain_health", undefined, "other"]) {
      expect(programForPlan(id)).toBeNull();
    }
  });
});

describe("estimate line per result type", () => {
  it("copay names the per-visit cost and the plan", () => {
    expect(estimateLine({ result: "copay", payerId: "example_health" })).toBe(
      "Your estimated cost per visit: $30 with Example Health Plan. We'll confirm before your visit.",
    );
  });
  it("deductible names the remaining amount and never calls the self-pay price a ceiling", () => {
    const line = estimateLine({ result: "deductible", payerId: "sample_insurance" });
    expect(line).toContain("$500 left on your deductible");
    expect(line).not.toMatch(/up to|at most|maximum|no more than/i);
  });
  it("not covered and failed both fall back to the self-pay prices", () => {
    for (const result of ["not_covered", "failed"] as const) {
      const line = estimateLine({ result });
      expect(line).toContain("couldn't confirm your coverage");
      expect(line).toContain("$250 for the first and $150 for follow ups");
    }
  });
  it("self pay shows the self-pay prices", () => {
    expect(estimateLine({ result: "self_pay" })).toBe("$250 for your first visit, $150 for follow ups.");
  });
});

describe("estimate number validator", () => {
  it("accepts every generated line", () => {
    const lines = [
      estimateLine({ result: "copay", payerId: "example_health" }),
      estimateLine({ result: "copay", payerId: "placeholder_health" }),
      estimateLine({ result: "deductible", payerId: "sample_insurance" }),
      estimateLine({ result: "not_covered" }),
      estimateLine({ result: "self_pay" }),
    ];
    for (const line of lines) expect(estimateNumbersAllowed(line), line).toBe(true);
  });
  it("rejects an invented number", () => {
    expect(estimateNumbersAllowed("Your estimated cost per visit: $17 with Example Health Plan.")).toBe(false);
  });
});
