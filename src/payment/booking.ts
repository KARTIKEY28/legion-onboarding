import { cardTerms } from "@/facts";

/**
 * Booking simulation, server-safe and deterministic. It mirrors the terms the
 * patient was shown: a one-dollar authorization placed in test mode (a manual-capture
 * PaymentIntent) and cancelled as soon as it succeeds, then the card saved with
 * a SetupIntent for charging about five days after the visit. Nothing is
 * charged now; nothing here stores or logs card data.
 *
 * The outcome is driven by a scenario the browser derives from the (test) card
 * number, so the card number itself never leaves the browser, exactly as a real
 * Stripe Payment Element tokenizes the card client-side. When real test keys are
 * present the API route would run the same sequence against Stripe instead.
 */

export type PaymentScenario = "success" | "declined" | "auth_required" | "processing_error";

export type PaymentFailureReason = "card_declined" | "authentication_required" | "processing_error";

export interface BookingSteps {
  /** The hold was placed to check the card. */
  authorizationPlaced: boolean;
  /** The hold was released right after it succeeded. */
  authorizationReleased: boolean;
  /** The card was saved (SetupIntent) for charging after the visit. */
  cardSaved: boolean;
}

export interface BookingResult {
  status: "succeeded" | "requires_action" | "failed";
  reason?: PaymentFailureReason;
  steps: BookingSteps;
}

const NONE: BookingSteps = { authorizationPlaced: false, authorizationReleased: false, cardSaved: false };

/** The authorization amount is a fact, never a literal here. */
export const AUTH_AMOUNT = cardTerms.authorizationAmount.value;

export function simulateBooking(scenario: PaymentScenario, authenticated: boolean): BookingResult {
  // The authorization is attempted first in every path.
  switch (scenario) {
    case "declined":
      // The authorization is declined, so no hold is placed and no card is saved.
      return { status: "failed", reason: "card_declined", steps: NONE };
    case "processing_error":
      return { status: "failed", reason: "processing_error", steps: NONE };
    case "auth_required":
      if (!authenticated) {
        // Card needs a challenge (3-D Secure) before the authorization can proceed.
        return { status: "requires_action", reason: "authentication_required", steps: NONE };
      }
    // falls through: once authenticated, it completes like a success.
    case "success":
      return {
        status: "succeeded",
        steps: { authorizationPlaced: true, authorizationReleased: true, cardSaved: true },
      };
  }
}
