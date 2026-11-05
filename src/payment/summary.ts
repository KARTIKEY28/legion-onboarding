import { cancellation, cardTerms, selfPayPrices } from "@/facts";

/**
 * One-line booking-summary helpers. Every amount comes from src/facts/terms.ts,
 * never a literal here (a test checks for dollar literals outside src/facts).
 */

export type PaymentPath = "insured" | "self_pay" | "not_sure";

/** The patient's cost path in one line. */
export function bookingCostLine(path: PaymentPath): string {
  if (path === "self_pay") {
    return `Paying without insurance — $${selfPayPrices.initialVisit.value} for your first visit.`;
  }
  return "Using insurance — your cost is confirmed after we verify your coverage.";
}

/** The cancellation terms in one line. */
export function cancellationLine(): string {
  return `If you cancel with less than ${cancellation.windowHours.value} hours' notice, there may be a $${cancellation.followUpFee.value} fee.`;
}

/** The exact card-hold copy the patient agreed to, built from the card-term facts. */
export function cardHoldLine(): string {
  return `We'll place a $${cardTerms.authorizationAmount.value} hold to check your card, then release it. You're charged about ${cardTerms.chargeDaysAfterVisit.value} days after your visit.`;
}
