import { cancellation, cardTerms, selfPayPrices } from "@/facts";
import { formatCentral } from "@/time";

/**
 * One-line booking-summary helpers. Every amount comes from src/facts/terms.ts,
 * never a literal here (a test checks for dollar literals outside src/facts).
 */

export type PaymentPath = "insured" | "self_pay" | "not_sure";

/** The patient's cost path in one line. */
export function bookingCostLine(path: PaymentPath): string {
  if (path === "self_pay") {
    return `Paying without insurance. $${selfPayPrices.initialVisit.value} for your first visit.`;
  }
  return "Using insurance. Your cost is confirmed after we verify your coverage.";
}

/** The cancellation terms in one line. */
export function cancellationLine(): string {
  return `If you cancel with less than ${cancellation.windowHours.value} hours' notice, there may be a $${cancellation.followUpFee.value} fee.`;
}

/** The exact card-hold copy the patient agreed to, built from the card-term facts. */
export function cardHoldLine(): string {
  return `We'll place a $${cardTerms.authorizationAmount.value} hold to check your card, then release it. You're charged about ${cardTerms.chargeDaysAfterVisit.value} days after your visit.`;
}

/** The free-change cutoff: the visit time minus the cancellation window, in Central Time. */
export function cancellationCutoff(slotIso: string): string {
  const cutoff = new Date(new Date(slotIso).getTime() - cancellation.windowHours.value * 60 * 60 * 1000);
  return formatCentral(cutoff.toISOString());
}

/** "Free to change until [cutoff]. After that, cancelling may cost the cancellation fee." */
export function freeToChangeLine(slotIso: string): string {
  return `Free to change until ${cancellationCutoff(slotIso)}. After that, cancelling may cost $${cancellation.followUpFee.value}.`;
}

/** The reminder variant: "Free to reschedule until [cutoff]. After that, cancelling may cost [fee]." */
export function freeToRescheduleLine(slotIso: string): string {
  return `Free to reschedule until ${cancellationCutoff(slotIso)}. After that, cancelling may cost $${cancellation.followUpFee.value}.`;
}

/** The on-file card line for the confirmation; insured adds a coverage line. */
export function cardOnFileLines(path: PaymentPath): string[] {
  const lines = [`Your card is on file. You're charged about ${cardTerms.chargeDaysAfterVisit.value} days after your visit.`];
  if (path !== "self_pay") lines.push("We'll confirm your coverage before your visit.");
  return lines;
}
