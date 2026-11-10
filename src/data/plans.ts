import { samplePayers } from "@/facts";

/**
 * Synthetic per-plan eligibility values, for the prototype only. These stand in
 * for a real eligibility check and are NEVER real benefits. Keyed by the sample
 * payer ids in src/facts/insurance.ts. The simulated check on Insurance reads
 * only from here; the estimate wording uses these numbers and the prices/terms
 * in src/facts/terms.ts, and nothing else.
 */

export interface PlanEligibility {
  /** Whether psychiatry is a covered benefit under this plan. */
  psychiatryCovered: boolean;
  /** Flat copay per visit, when the plan is a copay plan. */
  copay: number | null;
  /** Dollars left on the deductible before the plan starts paying. */
  deductibleRemaining: number | null;
  /** Coinsurance percent after the deductible is met. */
  coinsurance: number | null;
}

/** Synthetic, for prototype only. */
export const PLANS: Record<string, PlanEligibility> = {
  // A copay plan: a predictable per-visit cost.
  example_health: { psychiatryCovered: true, copay: 30, deductibleRemaining: 0, coinsurance: null },
  // A plan whose deductible is not yet met: early visits cost more.
  sample_insurance: { psychiatryCovered: true, copay: null, deductibleRemaining: 500, coinsurance: 20 },
  // A second copay plan, so copay is not tied to one insurer.
  placeholder_health: { psychiatryCovered: true, copay: 45, deductibleRemaining: 0, coinsurance: null },
  // Psychiatry not covered under this plan.
  demo_care: { psychiatryCovered: false, copay: null, deductibleRemaining: null, coinsurance: null },
};

export type EligibilityResult = "copay" | "deductible" | "not_covered" | "failed" | "self_pay";

/** The result type for a known plan, from its synthetic eligibility. */
export function resultForPlan(payerId: string | undefined): EligibilityResult {
  if (!payerId) return "failed";
  const plan = PLANS[payerId];
  if (!plan) return "failed"; // unknown / "Other" plan: can't confirm
  if (!plan.psychiatryCovered) return "not_covered";
  if (plan.copay != null) return "copay";
  if (plan.deductibleRemaining != null && plan.deductibleRemaining > 0) return "deductible";
  return "failed";
}

export function planLabel(payerId: string | undefined): string {
  return samplePayers.value.find((p) => p.id === payerId)?.label ?? "your plan";
}

/** Every number that may appear in an estimate line, for the validator. */
export function planNumbers(): number[] {
  const nums: number[] = [];
  for (const plan of Object.values(PLANS)) {
    for (const v of [plan.copay, plan.deductibleRemaining, plan.coinsurance]) {
      if (v != null) nums.push(v);
    }
  }
  return nums;
}
