/**
 * Stripe keys are TEST MODE ONLY. The prototype must never run against a live
 * key: saving a card or placing a hold on Legion's live Stripe would touch a
 * real patient's money. `assertTestKeysOnly` throws if any configured Stripe
 * key is a live key, so a misconfigured deploy fails loudly at startup
 * (see src/instrumentation.ts) rather than taking a real payment. A unit test
 * covers it, and `scripts/check-secrets.mjs` already stops a key being committed.
 *
 * Prototype note: a real Stripe Payment Element needs a publishable key plus a
 * server secret to create PaymentIntents and SetupIntents. This public repo
 * ships with neither (`.env.example` is empty), so `stripeConfigured` is false
 * and the booking runs through the deterministic mock in src/payment/booking.ts.
 * When real test keys are present the same flow is wired to Stripe.
 */

const LIVE_PREFIXES = ["sk_live_", "pk_live_", "rk_live_"];

const KEY_NAMES = ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] as const;

/** Returns the name of the first configured live key, or null if none are live. */
export function findLiveKey(env: Record<string, string | undefined>): string | null {
  for (const name of KEY_NAMES) {
    const value = env[name];
    if (value && LIVE_PREFIXES.some((prefix) => value.startsWith(prefix))) return name;
  }
  return null;
}

/** Throws if a live Stripe key is configured. Called at startup. */
export function assertTestKeysOnly(env: Record<string, string | undefined> = process.env): void {
  const live = findLiveKey(env);
  if (live) {
    throw new Error(`Refusing to start: ${live} is a live Stripe key. This prototype is Stripe test mode only.`);
  }
}

/** True only when a full set of (test) Stripe keys is present. */
export function stripeConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return KEY_NAMES.every((name) => Boolean(env[name]));
}
