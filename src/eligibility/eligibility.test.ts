import { describe, expect, it } from "vitest";
import { ageOn, checkAge, checkCoverage, checkTexas, dobProblem, parseDob } from "./index";

// Months are 0-based in Date; dates of birth use 1-based months.
const on = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12);

describe("age", () => {
  it("is 18 on the 18th birthday", () => {
    const dob = { year: 2008, month: 10, day: 26 };
    expect(ageOn(dob, on(2026, 10, 26))).toBe(18);
    expect(checkAge(dob, on(2026, 10, 26))).toBe("pass");
  });

  it("is 17 at 17 years and 364 days", () => {
    const dob = { year: 2008, month: 10, day: 27 };
    expect(ageOn(dob, on(2026, 10, 26))).toBe(17);
    expect(checkAge(dob, on(2026, 10, 26))).toBe("fail");
  });

  it("treats a February 29 birthday as March 1 in non-leap years", () => {
    const dob = { year: 2008, month: 2, day: 29 };
    expect(ageOn(dob, on(2026, 2, 28))).toBe(17);
    expect(checkAge(dob, on(2026, 2, 28))).toBe("fail");
    expect(ageOn(dob, on(2026, 3, 1))).toBe(18);
    expect(checkAge(dob, on(2026, 3, 1))).toBe("pass");
  });

  it("counts a February 29 birthday on the day in leap years", () => {
    const dob = { year: 2008, month: 2, day: 29 };
    expect(ageOn(dob, on(2028, 2, 28))).toBe(19);
    expect(ageOn(dob, on(2028, 2, 29))).toBe(20);
  });

  it("passes adults well over 18", () => {
    expect(checkAge({ year: 1960, month: 1, day: 1 }, on(2026, 10, 26))).toBe("pass");
  });
});

describe("date of birth input", () => {
  it("parses a valid date", () => {
    expect(parseDob({ day: "5", month: "4", year: "1990" })).toEqual({ day: 5, month: 4, year: 1990 });
  });

  it("reports missing parts", () => {
    expect(parseDob({ day: "", month: "4", year: "1990" })).toBe("incomplete");
  });

  it("rejects days that do not exist", () => {
    expect(parseDob({ day: "31", month: "4", year: "1990" })).toBe("not_a_date");
    expect(parseDob({ day: "29", month: "2", year: "2026" })).toBe("not_a_date");
    expect(parseDob({ day: "29", month: "2", year: "2024" })).toEqual({ day: 29, month: 2, year: 2024 });
    expect(parseDob({ day: "29", month: "2", year: "1900" })).toBe("not_a_date");
    expect(parseDob({ day: "29", month: "2", year: "2000" })).toEqual({ day: 29, month: 2, year: 2000 });
  });

  it("rejects text, two-digit years and month 13", () => {
    expect(parseDob({ day: "a", month: "4", year: "1990" })).toBe("not_a_date");
    expect(parseDob({ day: "5", month: "4", year: "90" })).toBe("not_a_date");
    expect(parseDob({ day: "5", month: "13", year: "1990" })).toBe("not_a_date");
  });

  it("flags dates in the future or implausibly long ago", () => {
    expect(dobProblem({ year: 2027, month: 1, day: 1 }, on(2026, 10, 26))).toBe("in_future");
    expect(dobProblem({ year: 1890, month: 1, day: 1 }, on(2026, 10, 26))).toBe("too_long_ago");
    expect(dobProblem({ year: 1990, month: 1, day: 1 }, on(2026, 10, 26))).toBeNull();
  });
});

describe("Texas and coverage", () => {
  it("passes only patients who will be in Texas", () => {
    expect(checkTexas("yes")).toBe("pass");
    expect(checkTexas("no")).toBe("fail");
  });

  it("excludes Medicare or Medicaid and lets not sure continue as unconfirmed", () => {
    expect(checkCoverage("yes")).toBe("fail");
    expect(checkCoverage("no")).toBe("pass");
    expect(checkCoverage("unsure")).toBe("unconfirmed");
  });
});
