import { describe, expect, it, vi } from "vitest";
import {
  costSummary,
  extractQuantities,
  parseCostOutput,
  personalizedPay,
  templateCost,
  validateCost,
  wordsToDigits,
  type CostSections,
  type CostWriter,
} from "./cost";

describe("personalized pay", () => {
  it("self pay shows the self-pay prices only", () => {
    expect(personalizedPay("self_pay")).toEqual(["Your first visit is $250. Follow ups are $150."]);
  });

  it("insured with a plan names the plan and the self-pay floor", () => {
    expect(personalizedPay("insured", "Sample Insurance Co.")).toEqual([
      "You chose Sample Insurance Co. Your cost is confirmed after we verify your coverage. If your plan doesn't cover the visit, it's $250 without insurance.",
    ]);
  });

  it("not sure shows both paths, insured first", () => {
    const lines = personalizedPay("not_sure");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("confirmed after we verify your coverage");
    expect(lines[1]).toBe("Your first visit is $250. Follow ups are $150.");
  });

  it("insured but adding the plan later is treated like not sure", () => {
    expect(personalizedPay("insured", undefined, true)).toEqual(personalizedPay("not_sure"));
  });
});

const good: CostSections = {
  pay: "Without insurance, your first visit is $250 and follow ups are $150. With insurance, we confirm your cost after checking your coverage.",
  charged: "We keep your card on file with a $1 authorization, and charge you about five days after each visit.",
  cancel: "Cancel at least 48 hours ahead to avoid a fee. A late cancellation may cost $100.",
};

const asOutput = (s: CostSections) => `PAY: ${s.pay}\nCHARGED: ${s.charged}\nCANCEL: ${s.cancel}`;
const writer = (writeCost: CostWriter["writeCost"]): CostWriter => ({ writeCost });

describe("number extraction", () => {
  it("reads dollar amounts in different formats", () => {
    expect(extractQuantities("It's $250, or 250 dollars, or $250.00, or 1,000 USD")).toEqual([
      { value: 250, unit: "dollars" },
      { value: 250, unit: "dollars" },
      { value: 250, unit: "dollars" },
      { value: 1000, unit: "dollars" },
    ]);
  });

  it("reads time periods, number words and percentages", () => {
    expect(extractQuantities("forty-eight hours, five days, 2 weeks, 10%")).toEqual([
      { value: 10, unit: "percent" },
      { value: 48, unit: "hours" },
      { value: 5, unit: "days" },
      { value: 2, unit: "other_period" },
    ]);
    expect(wordsToDigits("a hundred and fifty dollars")).toBe("150 dollars");
    expect(wordsToDigits("two hundred fifty")).toBe("250");
  });
});

describe("cost summary validator", () => {
  it("accepts a summary that uses only the fixed values", () => {
    expect(validateCost(good, "insured")).toBeNull();
    expect(validateCost(templateCost("insured"), "insured")).toBeNull();
    expect(validateCost(templateCost("self_pay"), "self_pay")).toBeNull();
    expect(validateCost(templateCost("not_sure"), "not_sure")).toBeNull();
  });

  it("rejects an invented price", () => {
    expect(validateCost({ ...good, pay: good.pay.replace("$150", "$150, or $199 for a long visit") }, "insured")).toBe(
      "number_not_allowed",
    );
  });

  it("rejects a changed number", () => {
    expect(validateCost({ ...good, cancel: good.cancel.replace("48 hours", "24 hours") }, "insured")).toBe(
      "number_not_allowed",
    );
    expect(validateCost({ ...good, charged: good.charged.replace("five days", "seven days") }, "insured")).toBe(
      "number_not_allowed",
    );
    expect(validateCost({ ...good, pay: good.pay.replace("$250", "250 dollars").replace("$150", "$175") }, "insured")).toBe(
      "number_not_allowed",
    );
  });

  it("accepts a fixed value written as words or as 'dollars'", () => {
    const words = { ...good, pay: good.pay.replace("$250", "250 dollars").replace("$150", "one hundred fifty dollars") };
    expect(validateCost(words, "insured")).toBeNull();
  });

  it("rejects a fixed amount in the wrong unit", () => {
    expect(validateCost({ ...good, cancel: good.cancel.replace("48 hours", "48 days") }, "insured")).toBe("number_not_allowed");
  });

  it("rejects $250 as a cancellation fee, though $250 is a valid first-visit price", () => {
    // $250 is the self-pay first-visit price (allowed in "pay"), never a cancellation fee.
    expect(validateCost({ ...good, cancel: good.cancel.replace("$100", "$250") }, "insured")).toBe("number_not_allowed");
    expect(validateCost(good, "insured")).toBeNull();
  });

  it("rejects a missing fact, ceiling wording and a missing coverage note", () => {
    expect(validateCost({ ...good, cancel: "Cancel at least 48 hours ahead to avoid a fee." }, "insured")).toBe("missing_fact");
    expect(validateCost({ ...good, pay: `${good.pay} You'll never pay more than $250.` }, "insured")).toBe("ceiling_language");
    expect(validateCost({ ...good, pay: "Your first visit is $250 and follow ups are $150." }, "insured")).toBe("missing_fact");
    expect(validateCost({ ...good, pay: "Your first visit is $250 and follow ups are $150." }, "self_pay")).toBeNull();
  });
});

describe("cost summary fallback", () => {
  it("uses the model's summary when it passes validation", async () => {
    expect(await costSummary("insured", writer(async () => asOutput(good)))).toEqual({ sections: good, source: "model" });
  });

  it("falls back to the template on an invented number, and says why", async () => {
    const bad = asOutput({ ...good, charged: good.charged.replace("$1", "$5") });
    expect(await costSummary("insured", writer(async () => bad))).toEqual({
      sections: templateCost("insured"),
      source: "template",
      validationFailed: "number_not_allowed",
    });
  });

  it("falls back on an error, an unreadable answer, no key, or a slow answer", async () => {
    const template = { sections: templateCost("self_pay"), source: "template" };
    expect(await costSummary("self_pay", writer(async () => Promise.reject(new Error("down"))))).toEqual(template);
    expect(await costSummary("self_pay", writer(async () => "Here is your summary!"))).toEqual({ ...template, validationFailed: "format" });
    expect(await costSummary("self_pay", null)).toEqual(template);

    vi.useFakeTimers();
    const slow = writer(() => new Promise((resolve) => setTimeout(() => resolve(asOutput(good)), 10_000)));
    const pending = costSummary("self_pay", slow, 2500);
    await vi.advanceTimersByTimeAsync(2500);
    expect(await pending).toEqual(template);
    vi.useRealTimers();
  });

  it("parses the three labeled lines", () => {
    expect(parseCostOutput(asOutput(good))).toEqual(good);
    expect(parseCostOutput("PAY: only one")).toBeNull();
  });
});

describe("templates", () => {
  it("uses the required insured wording and never calls the self pay price a ceiling", () => {
    expect(templateCost("insured").pay).toBe(
      "Without insurance, the visit is $250 for the first visit and $150 for follow ups. With insurance, your cost is confirmed after we verify your coverage.",
    );
    expect(templateCost("not_sure").pay).toBe(templateCost("insured").pay);
    expect(templateCost("self_pay").pay).not.toMatch(/insurance/i);
  });
});
