import { eligibility } from "@/facts";

/**
 * Eligibility checks for About you. Every rule comes from `src/facts`.
 * These run locally the moment an answer arrives. The raw date of birth
 * never leaves this module's callers except as a pass or fail result.
 */

export type Criterion = "texas" | "age" | "coverage";
export type CheckResult = "pass" | "fail" | "unconfirmed";

export type YesNo = "yes" | "no";
export type CoverageAnswer = "yes" | "no" | "unsure";

export interface DateOfBirth {
  year: number;
  month: number; // 1 to 12
  day: number;
}

export type DobProblem = "incomplete" | "not_a_date" | "in_future" | "too_long_ago";

const OLDEST_PLAUSIBLE_AGE = 120;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Parses the three text fields of the date of birth input. */
export function parseDob(fields: { day: string; month: string; year: string }): DateOfBirth | DobProblem {
  const [day, month, year] = [fields.day, fields.month, fields.year].map((v) => v.trim());
  if (!day || !month || !year) return "incomplete";
  if (![day, month, year].every((v) => /^\d+$/.test(v)) || year.length !== 4) return "not_a_date";
  const dob = { day: Number(day), month: Number(month), year: Number(year) };
  if (dob.month < 1 || dob.month > 12) return "not_a_date";
  if (dob.day < 1 || dob.day > daysInMonth(dob.year, dob.month)) return "not_a_date";
  return dob;
}

/**
 * Whole years between the date of birth and today.
 * Someone born on February 29 has their birthday on March 1 in non-leap years,
 * so nobody is counted as a year older before they are.
 */
export function ageOn(dob: DateOfBirth, today: Date): number {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  let age = year - dob.year;
  const hadBirthday = month > dob.month || (month === dob.month && day >= dob.day);
  if (!hadBirthday) age -= 1;
  return age;
}

/** A date of birth that parses but cannot be right, such as one in the future. */
export function dobProblem(dob: DateOfBirth, today: Date): DobProblem | null {
  const age = ageOn(dob, today);
  const birth = new Date(dob.year, dob.month - 1, dob.day);
  if (birth > today) return "in_future";
  if (age > OLDEST_PLAUSIBLE_AGE) return "too_long_ago";
  return null;
}

export function checkTexas(answer: YesNo): CheckResult {
  return answer === "yes" ? "pass" : "fail";
}

export function checkAge(dob: DateOfBirth, today: Date): CheckResult {
  return ageOn(dob, today) >= eligibility.minimumAge.value ? "pass" : "fail";
}

/** "Not sure" continues the flow and is confirmed at the Insurance step. */
export function checkCoverage(answer: CoverageAnswer): CheckResult {
  if (answer === "unsure") return "unconfirmed";
  return answer === "yes" ? "fail" : "pass";
}
