/** The ten steps to payment, in the PRD's order. The progress indicator counts these. */
export const JOURNEY = [
  { id: "start", label: "Start", path: "/start" },
  { id: "about", label: "About you", path: "/about" },
  { id: "conditions", label: "Conditions", path: "/conditions" },
  { id: "safety", label: "Safety", path: "/safety" },
  { id: "insurance", label: "Insurance", path: "/insurance" },
  { id: "needs", label: "Needs", path: "/needs" },
  { id: "match", label: "Match", path: "/match" },
  { id: "cost", label: "Cost and terms", path: "/cost" },
  { id: "account", label: "Account", path: "/account" },
  { id: "payment", label: "Payment", path: "/payment" },
] as const;

export type JourneyStepId = (typeof JOURNEY)[number]["id"];

export function stepNumber(id: JourneyStepId): number {
  return JOURNEY.findIndex((step) => step.id === id) + 1;
}

/** Where Safety goes next. Insurance (slice 4) now sits between Safety and Needs. */
export const AFTER_SAFETY = "/insurance";
