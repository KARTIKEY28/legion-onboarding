/**
 * The single source of fixed facts for the prototype.
 *
 * Every number, eligibility rule, price, term and crisis resource the patient
 * sees comes from this file. UI copy and AI output may phrase these values but
 * must never create or change them. If a value is unknown, it is `null` and
 * the UI must say it is still being confirmed rather than filling a guess.
 */

/** How much we trust a fact: confirmed by Legion, taken from Legion but to be re-checked, a PRD working assumption, or not known yet. */
export type FactStatus = "confirmed" | "needs_recheck" | "assumption" | "unknown";

export interface Fact<T> {
  value: T;
  status: FactStatus;
  /** Where the value comes from, so a reviewer can trace it. */
  source: string;
}

export const eligibility = {
  state: {
    value: "TX",
    status: "confirmed",
    source: "PRD constraints: Texas only",
  },
  stateName: {
    value: "Texas",
    status: "confirmed",
    // The prototype patient is in Texas; Legion itself now serves Texas and Utah (servedStates).
    source: "Prototype scope: a Texas patient (Legion serves TX + UT)",
  },
  servedStates: {
    value: ["Texas", "Utah"] as const,
    status: "confirmed",
    source: "Legion now serves Texas and Utah (Nov 2026)",
  },
  minimumAge: {
    value: 18,
    status: "confirmed",
    source: "PRD constraints: adults only",
  },
  excludedCoverage: {
    value: ["medicare", "medicaid"] as const,
    status: "confirmed",
    source: "PRD constraints: no Medicare or Medicaid",
  },
  visitFormat: {
    value: "virtual",
    status: "confirmed",
    source: "PRD constraints: virtual only",
  },
} satisfies Record<string, Fact<unknown>>;

/**
 * Legion's payment page shows a countdown, but nothing on the server holds the slot.
 * The prototype does not build a countdown; it checks availability at booking instead.
 * Kept here so the open decision has its number on record.
 */
export const countdown = {
  durationMinutes: {
    value: 10,
    status: "confirmed",
    source: "Legion's answer (PRD open questions): 10 minute countdown, browser only",
  },
  holdsSlot: {
    value: false,
    status: "confirmed",
    source: "Legion's answer (PRD open questions): nothing on the server holds the slot",
  },
} satisfies Record<string, Fact<number | boolean>>;

/**
 * Conditions topics, in plain language. PLACEHOLDER: needs a check against
 * Legion's real Conditions options. No diagnostic or clinical labels.
 */
export const conditionTopics = {
  value: [
    { id: "low_mood", label: "Feeling down or low most days" },
    { id: "worry", label: "Worry that's hard to shake" },
    { id: "mood_swings", label: "Big ups and downs in my mood" },
    { id: "focus", label: "Trouble focusing or staying organized" },
    { id: "sleep", label: "Trouble sleeping" },
    { id: "stress", label: "Stress or feeling overwhelmed" },
    { id: "past_events", label: "Something that happened that still affects me" },
    { id: "relationships", label: "Relationships or family" },
    { id: "grief", label: "Grief or loss" },
    { id: "substances", label: "Alcohol or drug use" },
    { id: "eating", label: "Eating or how I feel about my body" },
    { id: "unwanted_thoughts", label: "Thoughts or habits that are hard to control" },
  ],
  status: "assumption",
  source: "Placeholder until checked against Legion's Conditions options",
} as const satisfies Fact<readonly { id: string; label: string }[]>;

export type TopicId = (typeof conditionTopics.value)[number]["id"];

/** Shown on the Start screen. */
export const effort = {
  // TODO(slice 7): verify by timing the finished flow end to end, then mark confirmed.
  minutesToPayment: {
    value: 10,
    status: "assumption",
    source: "Placeholder until the finished flow is timed",
  },
  sections: {
    value: ["About you", "What's on your mind", "Your safety", "Insurance", "What you're looking for"],
    status: "confirmed",
    source: "PRD proposed journey: the asking steps before the match",
  },
} satisfies Record<string, Fact<unknown>>;

export const providers = {
  count: {
    value: 107,
    status: "assumption",
    source: "PRD constraints: about 107 providers",
  },
} satisfies Record<string, Fact<number>>;

/** Shown on every screen. Crisis help never blocks progress. */
export const crisisResources = [
  {
    id: "988",
    label: "988 Suicide & Crisis Lifeline",
    action: "Call or text 988",
    href: "tel:988",
  },
  {
    id: "911",
    label: "Emergency services",
    action: "Call 911 if you are in immediate danger",
    href: "tel:911",
  },
] as const;

export * from "./terms";
export * from "./insurance";
