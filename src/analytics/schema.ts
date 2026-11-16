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
  // Fires on Start (location from ZIP), on About you, and again on Insurance when
  // "not sure" about coverage is confirmed there
  "eligibility.checked": anyStepEvent(["start", "about", "insurance"], {
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
  // Discovery-first insurance. No names, IDs or amounts, ever: result types only.
  "insurance.discovery_offered": event("insurance"),
  "insurance.discovery_consented": event("insurance"),
  "insurance.discovery_result": event("insurance", {
    result: z.enum(["one_match", "multi_match", "no_match", "failed"]),
  }),
  "insurance.plan_confirmed": event("insurance", {
    source: z.enum(["discovery", "manual"]),
  }),
  "insurance.plan_rejected": event("insurance"),
  // Which rung of the ladder the patient reached: 1 consent, 2 picker, 3 manual.
  "insurance.rung_reached": event("insurance", {
    rung: z.number().int().min(1).max(3),
  }),
  "insurance.cost_result": event("insurance", {
    result: z.enum(["copay", "deductible", "specialist", "not_covered", "failed", "self_pay"]),
  }),

  // Needs
  "needs.viewed": event("needs"),
  // Which fields were answered, never their values
  "needs.submitted": event("needs", {
    answered_language: z.boolean(),
    answered_gender: z.boolean(),
    free_text_used: z.boolean(),
  }),

  // Match
  "match.viewed": event("match", {
    match_count: count,
    no_strong_match: z.boolean(),
  }),
  "match.full_list_opened": event("match"),
  "match.none_selected": event("match"),
  // The time-of-day filter chip changed (value only).
  "match.time_filter_changed": event("match", {
    value: z.enum(["any", "weekday_mornings", "weekday_afternoons", "weekday_evenings", "weekends"]),
  }),
  // A time was tapped on a card or in the profile (selection, not yet confirmed).
  "slot.selected": event("match"),
  // Opening a clinician profile; rank and where it was opened from, never the name
  "profile.opened": event("match", {
    from: z.enum(["card", "full_list"]),
    rank: count,
  }),
  // The clinician's name is never sent; rank, tier and source only, so it can't be joined to patient data
  "provider.selected": event("match", {
    from: z.enum(["top_match", "full_list"]),
    source: z.enum(["card", "profile"]),
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
  // The simulated eligibility/cost check on Insurance. Result type only, never amounts.
  "eligibility.checked_cost": event("insurance", {
    result: z.enum(["copay", "deductible", "not_covered", "failed"]),
  }),
  "reservation.requested": event("cost"),
  "reservation.failed": event("cost", {
    reason: z.enum(["slot_taken", "technical", "unknown"]),
  }),

  // Account
  "account.viewed": event("account"),
  "account.created": event("account", {
    email_prefilled: z.boolean(),
    phone_given: z.boolean(),
    sms_consent: z.boolean(),
  }),

  // Payment
  "payment.viewed": event("payment"),
  "payment.succeeded": event("payment"),
  // The booking failed. The reason is a code only, never card data or amounts
  "payment.failed": event("payment", {
    reason: z.enum(["card_declined", "authentication_required", "processing_error"]),
  }),

  // The slot was booked by someone else by the time this patient tried to book it
  "slot.unavailable_at_booking": anyStepEvent(["match", "cost", "payment"], {}),

  // Post payment (slice 7, the author's design proposal). All step "visit";
  // never any PII, free text or health answer, only states, counts and booleans.
  "visit.booked": event("visit"),
  "confirmation.viewed": event("visit"),
  // Opening and completing the simulated reschedule sheet. No times or PII.
  "reschedule.opened": event("visit"),
  "reschedule.completed": event("visit"),
  "intake.started": event("visit"),
  "intake.completed": event("visit"),
  "id.uploaded": event("visit", { uploaded: z.boolean() }),
  "records.consent": event("visit", { granted: z.boolean() }),
  "insurance.status_viewed": event("visit", {
    state: z.enum(["checking", "confirmed", "more_info", "self_pay"]),
  }),
  "summary.shown": event("visit", { source: z.enum(["model", "template"]) }),
  "summary.edited": event("visit", { edited: z.boolean() }),
  "visit.joined": event("visit"),
  "visit.completed": event("visit"),

  // Cross-cutting
  // The crisis panel expanded. Source: a direct safety-question answer, the local
  // free-text check, or the model. Never carries the answer or the text.
  "safety.escalated": anyStepEvent(["conditions", "safety", "needs"], {
    source: z.enum(["answer", "local", "model"]),
  }),
  // Reserved for a patient-opened crisis panel (a "get help now" button); not fired yet
  "crisis.panel_opened": anyStepEvent(STEPS, {
    source: z.enum(["button"]),
  }),
  // A reflect-back line was shown. on_step is the step whose answers it reflects
  "reflect_back.shown": anyStepEvent(["conditions", "needs", "match"], {
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
