import type { Fact } from "./index";

/**
 * Every price and term the Cost and terms screen may state. AI phrases these
 * values and never creates them: the cost summary validator rejects any amount,
 * number or time period that is not in COST_FACT_VALUES below.
 *
 * TO RE-CHECK: values marked "needs_recheck" were taken from Legion's payment
 * page and Legion's email, and must be re-checked before launch.
 */

export const selfPayPrices = {
  currency: "USD",
  initialVisit: {
    value: 250,
    status: "needs_recheck",
    // Source: Legion's payment page (self pay price for the first visit).
    source: "Legion's payment page",
  },
  followUp: {
    value: 150,
    status: "needs_recheck",
    // Source: Legion's payment page (self pay price for follow-up visits).
    source: "Legion's payment page",
  },
} satisfies { currency: string; initialVisit: Fact<number>; followUp: Fact<number> };

export const insuredCost = {
  /** The copay estimate arrives after booking, so it is never shown before it. */
  estimateBeforePayment: {
    value: null,
    status: "unknown",
    // Source: PRD cost wording. Coverage is confirmed after booking.
    source: "PRD cost wording: insured cost is confirmed after verification",
  },
} satisfies Record<string, Fact<null>>;

export const cardTerms = {
  authorizationAmount: {
    value: 1,
    status: "needs_recheck",
    // Source: Legion's payment page ($1 authorization when the card is saved).
    source: "Legion's payment page",
  },
  chargeDaysAfterVisit: {
    value: 5,
    status: "needs_recheck",
    // Source: Legion's email (the visit is charged about 5 days after it happens).
    source: "Legion's email",
  },
} satisfies Record<string, Fact<number>>;

export const cancellation = {
  windowHours: {
    value: 48,
    status: "needs_recheck",
    // Source: Legion's payment page and email (48 hour cancellation policy).
    source: "Legion's payment page and email",
  },
  initialVisitFee: {
    value: 100,
    status: "needs_recheck",
    // Source: Legion email, Oct 2026. Older payment page showed $250 for first visit; email is newer.
    source: "Legion email, Oct 2026 (supersedes the older payment page's $250)",
  },
  followUpFee: {
    value: 100,
    status: "needs_recheck",
    // Source: Legion email, Oct 2026. The 48 hour policy can trigger a $100 fee.
    source: "Legion email, Oct 2026",
  },
} satisfies Record<string, Fact<number>>;

/**
 * Illustrative amounts for the after-visit reminder cost-confirmation variants
 * (slice 7, a design proposal). `estimated` is the number shown before the
 * visit; `confirmed` is the different amount used by the "estimate changed"
 * variant. Synthetic, for the prototype only.
 */
export const reminderEstimate = {
  estimated: {
    value: 30,
    status: "assumption",
    source: "Illustrative copay estimate for the reminder cost variants (prototype).",
  },
  confirmed: {
    value: 45,
    status: "assumption",
    source: "Illustrative confirmed copay for the 'estimate changed' reminder variant (prototype).",
  },
} satisfies Record<string, Fact<number>>;

/** The only amounts, numbers and periods a cost summary may contain. */
export const COST_FACT_VALUES = {
  dollars: [
    selfPayPrices.initialVisit.value,
    selfPayPrices.followUp.value,
    cardTerms.authorizationAmount.value,
    cancellation.initialVisitFee.value,
    cancellation.followUpFee.value,
  ],
  hours: [cancellation.windowHours.value],
  days: [cardTerms.chargeDaysAfterVisit.value],
} as const;
