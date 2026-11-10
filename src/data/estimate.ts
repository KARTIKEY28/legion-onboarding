import { cancellation, selfPayPrices } from "@/facts";
import type { SessionAnswers } from "@/session/store";
import { PLANS, planLabel, planNumbers, resultForPlan, type EligibilityResult } from "./plans";

/**
 * The cost estimate line (A1), shown in four places: under the Match headline,
 * on Cost and terms, on the Confirmation card, and in the reminders. It is built
 * deterministically from the simulated eligibility result (src/data/plans.ts)
 * and the self-pay prices (src/facts/terms.ts), never from a literal.
 */

const initial = selfPayPrices.initialVisit.value;
const followUp = selfPayPrices.followUp.value;

export interface CostEstimate {
  result: EligibilityResult;
  payerId?: string;
}

/** The estimate to show, from the stored eligibility result, or self pay. */
export function estimateFromAnswers(a: SessionAnswers): CostEstimate {
  if (a.eligibilityCost) return a.eligibilityCost;
  return { result: "self_pay" };
}

/** The one-line estimate for a result. Prices and benefits come from the fixed sources. */
export function estimateLine({ result, payerId }: CostEstimate): string {
  switch (result) {
    case "copay": {
      const copay = PLANS[payerId ?? ""]?.copay ?? 0;
      return `Your estimated cost per visit: $${copay} with ${planLabel(payerId)}. We'll confirm before your visit.`;
    }
    case "deductible": {
      const left = PLANS[payerId ?? ""]?.deductibleRemaining ?? 0;
      return `Your plan has $${left} left on your deductible, so your first visits may cost more until it's met. We'll confirm the exact amount before your visit.`;
    }
    case "not_covered":
    case "failed":
      return `We couldn't confirm your coverage right now. We'll check before your visit. Without insurance, visits are $${initial} for the first and $${followUp} for follow ups.`;
    case "self_pay":
    default:
      return `$${initial} for your first visit, $${followUp} for follow ups.`;
  }
}

/** The result type for the insured path, from the chosen plan (or failed when unknown). */
export function resultFromInsurance(a: SessionAnswers): CostEstimate {
  const ins = a.insurance;
  if (!ins || ins.path !== "insured") return { result: "self_pay" };
  if (ins.addLater || !ins.payerId) return { result: "failed" };
  return { result: resultForPlan(ins.payerId), payerId: ins.payerId };
}

/** Allowed numbers in an estimate line: plan values plus the self-pay prices and the fee. */
const ALLOWED = new Set<number>([
  ...planNumbers(),
  selfPayPrices.initialVisit.value,
  selfPayPrices.followUp.value,
  cancellation.initialVisitFee.value,
  cancellation.followUpFee.value,
]);

/** True when every number in the line is a value from plans.ts or terms.ts. */
export function estimateNumbersAllowed(line: string): boolean {
  for (const n of line.match(/\d+/g) ?? []) {
    if (!ALLOWED.has(Number(n))) return false;
  }
  return true;
}
