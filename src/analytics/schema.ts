import { z } from "zod";

/**
 * The event catalog, following the PRD measurement plan.
 *
 * Properties may only be enums, numbers or booleans, so free text (and
 * anything a patient typed) can never reach analytics. A test enforces this.
 * The tracker adds `session_id`, `step`, `device_type` and `timestamp`.
 */

export const STEPS = [
  "start",
  "about",
  "conditions",
  "safety",
  "insurance",
  "needs",
  "match",
  "cost",
  "account",
  "payment",
  "visit",
] as const;
export type Step = (typeof STEPS)[number];

export const DEVICE_TYPES = ["mobile", "tablet", "desktop"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

const count = z.number().int().nonnegative();

const eligibilityCriterion = z.enum(["texas", "age", "coverage"]);

interface EventDefinition {
  /** The step the event belongs to, or null when it can fire on any step (it then carries `on_step`). */
  step: Step | null;
  properties: z.AnyZodObject;
}

function event<S extends z.ZodRawShape = Record<never, never>>(step: Step, shape?: S) {
  return { step, properties: z.object(shape ?? ({} as S)).strict() };
}

/** An event that can fire on any step; the step it fired on is required. */
function anyStepEvent<S extends z.ZodRawShape, O extends readonly [Step, ...Step[]]>(steps: O, shape: S) {
  return {
    step: null,
    properties: z.object({ ...shape, on_step: z.enum(steps) }).strict(),
  };
}

export const EVENTS = {
  // Start
  "onboarding.started": event("start", {
    entry_source: z.enum(["direct", "paid", "organic", "referral", "other"]),
    has_utm: z.boolean(),
  }),

  // About you and eligibility (replaces the old fit check screen)
  "about.viewed": event("about"),
  "about.submitted": event("about"),
  // Fires on About you, and again on Insurance when "not sure" about coverage is confirmed there
  "eligibility.checked": anyStepEvent(["about", "insurance"], {
    criterion: eligibilityCriterion,
    result: z.enum(["pass", "fail", "unconfirmed"]),
  }),
  "exclusion.next_step_shown": event("about", {
    criterion: eligibilityCriterion,
    next_step: z.enum(["guidance", "notify_me", "crisis_resources", "human_help", "referral_list"]),
  }),

  // Conditions
  "conditions.viewed": event("conditions"),
  "conditions.submitted": event("conditions", {
    selected_count: count,
    free_text_used: z.boolean(),
    unsure: z.boolean(),
    skipped: z.boolean(),
  }),

  // Safety
  "safety.viewed": event("safety"),
  "safety.submitted": event("safety"),

  // Insurance
  "insurance.viewed": event("insurance"),
  // The path only: never plan names, IDs or free text
  "insurance.submitted": event("insurance", {
    path: z.enum(["insured", "self_pay", "not_sure"]),
  }),

  // Needs
  "needs.viewed": event("needs"),
  // Which fields were answered, never their values
  "needs.submitted": event("needs", {
    answered_availability: z.boolean(),
    answered_language: z.boolean(),
    answered_gender: z.boolean(),
    free_text_used: z.boolean(),
  }),

  // Match
  "match.viewed": event("match", {
    options_shown: count,
    strong_match: z.boolean(),
  }),
  "match.full_list_opened": event("match"),
  "match.none_selected": event("match"),
  "provider.selected": event("match", {
    options_viewed: count,
    rank: count,
    evidence_tier: z.enum(["declared_fit", "experience", "outcomes"]),
  }),

  // Cost and terms. Confirming a time requests the reservation; nothing holds the slot,
  // so availability is checked here and again when payment is submitted.
  "cost.viewed": event("cost", {
    insurance_path: z.enum(["insured", "self_pay", "not_sure"]),
  }),
  "cost_summary.shown": event("cost", {
    source: z.enum(["model", "template"]),
  }),
  // The model answered but its summary was rejected, so the template was shown instead
  "cost_summary.validation_failed": event("cost", {
    reason: z.enum(["number_not_allowed", "missing_fact", "ceiling_language", "format"]),
  }),
  "reservation.requested": event("cost"),
  "reservation.failed": event("cost", {
    reason: z.enum(["slot_taken", "technical", "unknown"]),
  }),

  // Account
  "account.viewed": event("account"),
  "account.created": event("account", {
    email_prefilled: z.boolean(),
  }),

  // Payment
  "payment.viewed": event("payment"),
  "payment.succeeded": event("payment"),

  // The slot was booked by someone else by the time this patient tried to book it
  "slot.unavailable_at_booking": anyStepEvent(["cost", "payment"], {}),

  // Post payment, planned for a later build
  "visit.booked": event("visit"),
  "visit.completed": event("visit"),

  // Cross-cutting
  // The crisis panel expanded because of an answer or free text. Never carries the text.
  "safety.escalated": anyStepEvent(["conditions", "safety", "needs"], {
    source: z.enum(["local", "model"]),
  }),
  // Reserved for a patient-opened crisis panel (a "get help now" button); not fired yet
  "crisis.panel_opened": anyStepEvent(STEPS, {
    source: z.enum(["button"]),
  }),
  // A reflect-back line was shown. on_step is the step whose answers it reflects
  "reflect_back.shown": anyStepEvent(["conditions", "needs"], {
    source: z.enum(["model", "template"]),
  }),
  "ai.explanation_shown": anyStepEvent(STEPS, {
    kind: z.enum(["match_reason"]),
  }),
} satisfies Record<string, EventDefinition>;

export type EventName = keyof typeof EVENTS;

export type EventProperties<N extends EventName> = z.infer<(typeof EVENTS)[N]["properties"]>;

export const envelopeSchema = z
  .object({
    event: z.enum(Object.keys(EVENTS) as [EventName, ...EventName[]]),
    session_id: z.string().uuid(),
    step: z.enum(STEPS),
    device_type: z.enum(DEVICE_TYPES),
    timestamp: z.string().datetime(),
    properties: z.record(z.union([z.string(), z.number(), z.boolean()])),
  })
  .strict();

export type EventEnvelope = z.infer<typeof envelopeSchema>;
