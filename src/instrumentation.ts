/**
 * Runs once when the server starts. Refuses to boot if a live Stripe key is
 * configured, so a misconfigured deploy fails loudly instead of ever touching
 * real money. Test-mode keys (or none) are fine.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertTestKeysOnly } = await import("./payment/stripe");
    assertTestKeysOnly();
  }
}
