/**
 * Feature flags. Each defaults to OFF and turns on only when its
 * NEXT_PUBLIC_FLAG_* environment variable is exactly "1". Keep references
 * static so Next.js can inline them into the client bundle.
 */
export const flags = {
  /** "Already started? Sign in" on Start. Off until sign-in actually works. */
  signIn: process.env.NEXT_PUBLIC_FLAG_SIGN_IN === "1",
  /** "Add a photo of your card" on Insurance (model reads the card). Off by default. */
  insuranceCardPhoto: process.env.NEXT_PUBLIC_FLAG_INSURANCE_CARD_PHOTO === "1",
  /** "Your story, ready for your clinician" AI pre-visit summary. On by default for the demo; set to "0" to turn off. */
  previsitSummary: process.env.NEXT_PUBLIC_FLAG_PREVISIT_SUMMARY !== "0",
} as const;
