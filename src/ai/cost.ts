import { z } from "zod";
import { cancellation, cardTerms, selfPayPrices } from "@/facts";

/**
 * Cost and terms summary (AI feature 3). The model only phrases the fixed
 * values in src/facts/terms.ts. Its output is checked: every dollar amount,
 * number and time period must be one of the fixed values, each section must
 * still state its facts, and nothing may describe a price as a ceiling.
 * Anything else, an error, a slow answer or no key means the template is used.
 */

export const costPathSchema = z.enum(["insured", "self_pay", "not_sure"]);
export type CostPath = z.infer<typeof costPathSchema>;

export interface CostSections {
  /** What you pay */
  pay: string;
  /** When you are charged */
  charged: string;
  /** What happens if you cancel */
  cancel: string;
}

export type CostValidationFailure = "number_not_allowed" | "missing_fact" | "ceiling_language" | "format";

export interface CostSummary {
  sections: CostSections;
  source: "model" | "template";
  /** Set when the model answered but its answer was rejected. */
  validationFailed?: CostValidationFailure;
}

export interface CostWriter {
  writeCost(path: CostPath): Promise<string>;
}

export const COST_TIMEOUT_MS = 2500;

const initial = selfPayPrices.initialVisit.value;
const followUp = selfPayPrices.followUp.value;

export function templateCost(path: CostPath): CostSections {
  const pay =
    path === "self_pay"
      ? `Your first visit is $${initial}. Follow-up visits are $${followUp} each.`
      : `Without insurance, the visit is $${initial} for the first visit and $${followUp} for follow ups. With insurance, your cost is confirmed after we verify your coverage.`;
  return {
    pay,
    charged: `We save your card and place a $${cardTerms.authorizationAmount.value} authorization to check it. You're charged about ${cardTerms.chargeDaysAfterVisit.value} days after each visit.`,
    cancel: `If you cancel with less than ${cancellation.windowHours.value} hours' notice, there may be a $${cancellation.followUpFee.value} fee.`,
  };
}

// ---- Number extraction ----

const UNITS: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19" };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** Turns number words ("forty-eight", "five", "a hundred and fifty") into digits. */
export function wordsToDigits(text: string): string {
  const tens = new RegExp(`\\b(${Object.keys(TENS).join("|")})(?:[ -](${Object.keys(UNITS).slice(0, 9).join("|")}))?\\b`, "g");
  const units = new RegExp(`\\b(${Object.keys(UNITS).join("|")})\\b`, "g");
  return text
    .toLowerCase()
    .replace(tens, (_m, ten: string, unit?: string) => String(TENS[ten] + (unit ? Number(UNITS[unit]) : 0)))
    .replace(units, (word) => UNITS[word])
    .replace(/\b(a|\d) hundred(?: and)?(?: (\d{1,2}))?\b/g, (_m, lead: string, rest?: string) =>
      String((lead === "a" ? 1 : Number(lead)) * 100 + (rest ? Number(rest) : 0)),
    );
}

export type QuantityUnit = "dollars" | "hours" | "days" | "other_period" | "percent" | "number";
export interface Quantity {
  value: number;
  unit: QuantityUnit;
}

/** Finds every dollar amount, time period, percentage and bare number in the text. */
export function extractQuantities(text: string): Quantity[] {
  let rest = wordsToDigits(text);
  const found: Quantity[] = [];
  const num = (s: string) => Number(s.replace(/,/g, ""));
  const take = (pattern: RegExp, toQuantity: (m: RegExpExecArray) => Quantity) => {
    rest = rest.replace(pattern, (...args) => {
      found.push(toQuantity(args.slice(0, -2) as unknown as RegExpExecArray));
      return " ";
    });
  };
  take(/\$\s?(\d[\d,]*(?:\.\d+)?)/g, (m) => ({ value: num(m[1]), unit: "dollars" }));
  take(/(\d[\d,]*(?:\.\d+)?)\s*(?:us )?(?:dollars?|usd)\b/g, (m) => ({ value: num(m[1]), unit: "dollars" }));
  take(/(\d+(?:\.\d+)?)\s*(?:%|percent)/g, (m) => ({ value: num(m[1]), unit: "percent" }));
  take(/(\d+(?:\.\d+)?)[\s-]*(?:hours?|hrs?)\b/g, (m) => ({ value: num(m[1]), unit: "hours" }));
  take(/(\d+(?:\.\d+)?)[\s-]*(?:business |calendar )?days?\b/g, (m) => ({ value: num(m[1]), unit: "days" }));
  take(/(\d+(?:\.\d+)?)[\s-]*(?:weeks?|months?|years?|minutes?|mins?)\b/g, (m) => ({ value: num(m[1]), unit: "other_period" }));
  take(/(\d[\d,]*(?:\.\d+)?)/g, (m) => ({ value: num(m[1]), unit: "number" }));
  return found;
}

/**
 * Allowed amounts and periods PER SECTION, so a value that is fine in one place
 * is rejected in another. The first-visit price is a valid amount in "pay", but is
 * not a valid cancellation fee in "cancel" (the fee is lower; Legion email Oct 2026).
 */
const ALLOWED_BY_SECTION: Record<keyof CostSections, { dollars: number[]; hours: number[]; days: number[] }> = {
  pay: { dollars: [initial, followUp], hours: [], days: [] },
  charged: { dollars: [cardTerms.authorizationAmount.value], hours: [], days: [cardTerms.chargeDaysAfterVisit.value] },
  cancel: {
    dollars: [cancellation.initialVisitFee.value, cancellation.followUpFee.value],
    hours: [cancellation.windowHours.value],
    days: [],
  },
};

export function isAllowedQuantity(q: Quantity, section: keyof CostSections): boolean {
  const allowed = ALLOWED_BY_SECTION[section];
  switch (q.unit) {
    case "dollars":
      return allowed.dollars.includes(q.value);
    case "hours":
      return allowed.hours.includes(q.value);
    case "days":
      return allowed.days.includes(q.value);
    case "number":
      return [...allowed.dollars, ...allowed.hours, ...allowed.days].includes(q.value);
    default:
      return false;
  }
}

const CEILING = /\b(at most|no more than|up to|maximum|max|ceiling|cap(ped)?|won'?t pay more|never pay more|worst case)\b/i;

const REQUIRED: Record<keyof CostSections, Quantity[]> = {
  pay: [
    { value: initial, unit: "dollars" },
    { value: followUp, unit: "dollars" },
  ],
  charged: [
    { value: cardTerms.authorizationAmount.value, unit: "dollars" },
    { value: cardTerms.chargeDaysAfterVisit.value, unit: "days" },
  ],
  cancel: [
    { value: cancellation.windowHours.value, unit: "hours" },
    { value: cancellation.followUpFee.value, unit: "dollars" },
  ],
};

export function validateCost(sections: CostSections, path: CostPath): CostValidationFailure | null {
  for (const key of Object.keys(REQUIRED) as (keyof CostSections)[]) {
    const text = sections[key];
    if (!text || text.length > 320 || /[\n\r]/.test(text)) return "format";
    if (CEILING.test(text)) return "ceiling_language";
    const quantities = extractQuantities(text);
    if (!quantities.every((q) => isAllowedQuantity(q, key))) return "number_not_allowed";
    const has = (need: Quantity) => quantities.some((q) => q.value === need.value && (q.unit === need.unit || q.unit === "number"));
    if (!REQUIRED[key].every(has)) return "missing_fact";
  }
  if (path !== "self_pay" && !/confirm/i.test(sections.pay)) return "missing_fact";
  return null;
}

/** Reads the model's three labeled lines: PAY:, CHARGED:, CANCEL:. */
export function parseCostOutput(text: string): CostSections | null {
  const line = (label: string) => text.match(new RegExp(`^\\s*${label}:\\s*(.+)$`, "im"))?.[1]?.trim();
  const pay = line("PAY");
  const charged = line("CHARGED");
  const cancel = line("CANCEL");
  return pay && charged && cancel ? { pay, charged, cancel } : null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e) => (clearTimeout(timer), reject(e)),
    );
  });
}

export async function costSummary(path: CostPath, writer: CostWriter | null, timeoutMs = COST_TIMEOUT_MS): Promise<CostSummary> {
  const template: CostSummary = { sections: templateCost(path), source: "template" };
  if (!writer) return template;
  let text: string;
  try {
    text = await withTimeout(writer.writeCost(path), timeoutMs);
  } catch {
    return template;
  }
  const sections = parseCostOutput(text);
  if (!sections) return { ...template, validationFailed: "format" };
  const failure = validateCost(sections, path);
  return failure ? { ...template, validationFailed: failure } : { sections, source: "model" };
}
