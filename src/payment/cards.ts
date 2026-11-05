import type { PaymentScenario } from "./booking";

/**
 * Stripe's published test card numbers, and the scenario each one drives. The
 * browser maps the entered card to a scenario and sends only that to the server,
 * so the card number never leaves the page.
 */
export const TEST_CARDS = {
  success: "4242 4242 4242 4242",
  declined: "4000 0000 0000 0002",
  authRequired: "4000 0027 6000 3184",
  processingError: "4000 0000 0000 0119",
} as const;

export function scenarioForCard(raw: string): PaymentScenario {
  switch (raw.replace(/\D/g, "")) {
    case "4000000000000002":
      return "declined";
    case "4000002760003184":
      return "auth_required";
    case "4000000000000119":
      return "processing_error";
    case "4242424242424242":
      return "success";
    default:
      // Any other number is a calm generic decline, so a typo never "books".
      return "declined";
  }
}

/** Groups digits into 4s as they are typed, up to 19 digits. */
export function maskCard(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, (m) => `${m} `).trim();
}
