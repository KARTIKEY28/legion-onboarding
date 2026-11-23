import { estimateLine, type CostEstimate } from "@/data/estimate";
import { reminderEstimate } from "@/facts";
import { freeToRescheduleLine } from "@/payment/summary";
import { formatInZone, type UsState } from "@/time";

/**
 * Content for the after-payment screens. All logistics, warm and plain, no
 * medical advice. The cancellation fee comes from the facts.
 */

export interface VisitContext {
  clinicianName: string;
  slotIso: string;
  /** The patient's state, so times render in their own time zone. */
  state: UsState;
  formsComplete: boolean;
  path: "insured" | "self_pay" | "not_sure";
  insuranceState: "checking" | "confirmed" | "more_info";
  /** Whether the patient opted in to SMS reminders (controls the text variant). */
  smsConsent: boolean;
  /** The cost estimate from the Insurance check (A1), shown in the email body. */
  estimate: CostEstimate;
  /**
   * Whether coverage was verified by the 48-hour mark, and if so whether the
   * confirmed cost matched the estimate. "estimated" (default) = not yet
   * confirmed; "confirmed" = matched; "changed" = confirmed at a different amount.
   */
  costOutcome?: "estimated" | "confirmed" | "changed";
}

/**
 * The cost-confirmation line for the 48-hour reminder, once coverage has been
 * verified. Amounts come from the reminderEstimate fact, never a literal.
 */
function costConfirmationLine(ctx: VisitContext): string | null {
  const estimated = reminderEstimate.estimated.value;
  const confirmed = reminderEstimate.confirmed.value;
  if (ctx.costOutcome === "confirmed") {
    return `Good news: your cost is confirmed at $${estimated} per visit, just as we estimated. [See the breakdown]`;
  }
  if (ctx.costOutcome === "changed") {
    return `Your confirmed cost is $${confirmed}, not the $${estimated} we estimated. Your plan applied a specialist copay. [See why]`;
  }
  return null;
}

/** The clinician's first name, without a title like "Dr." */
function clinicianFirst(name: string): string {
  return name.replace(/^(dr\.?|mr\.?|ms\.?|mrs\.?)\s+/i, "").split(" ")[0];
}

// ---- Add to calendar (.ics) ----

function icsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** A minimal valid VEVENT for the booked visit. 50-minute default duration. */
export function buildIcs(clinicianName: string, slotIso: string, durationMin = 50): string {
  const start = new Date(slotIso);
  const end = new Date(start.getTime() + durationMin * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Legion Onboarding Prototype//EN",
    "BEGIN:VEVENT",
    `UID:${icsStamp(start)}-legion-prototype@example.com`,
    `DTSTAMP:${icsStamp(new Date(slotIso))}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:Video visit with ${clinicianName}`,
    "DESCRIPTION:Your Legion video visit. Prototype with synthetic data.",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

// ---- Reminder previews ----

export interface ReminderCard {
  lead: string;
  email: { subject: string; body: string[] };
  sms: string;
}

/** A positive, direct forms nudge, only when the forms are not done. */
function formsLine(ctx: VisitContext): string | null {
  if (ctx.formsComplete) return null;
  return `Your forms take a few minutes and help ${clinicianFirst(ctx.clinicianName)} prepare. [Complete your forms]`;
}

/** Insurance is mentioned only when the patient needs to act. */
function insuranceLine(ctx: VisitContext): string | null {
  if (ctx.path === "self_pay") return null;
  if (ctx.insuranceState === "more_info") return "We need a little more information about your insurance. [Add your details]";
  return null;
}

export function reminderCards(ctx: VisitContext): ReminderCard[] {
  const when = formatInZone(ctx.slotIso, ctx.state);
  const rescheduleLink = "Reschedule or cancel: [open your visit]";
  // The 48-hour reminder swaps the estimate for a confirmed/changed cost line
  // once coverage is verified; the later reminders keep the estimate.
  const confirmedCost = costConfirmationLine(ctx);

  const card = (lead: string, leadLine: string, costLine: string, smsCostNote = ""): ReminderCard => {
    const body = [leadLine, `Your video visit is ${when}.`, costLine, formsLine(ctx), insuranceLine(ctx), rescheduleLink].filter(
      (line): line is string => Boolean(line),
    );
    // One short SMS, kept well under 160 characters.
    const sms = `Legion: your visit with ${clinicianFirst(ctx.clinicianName)} is ${lead} away, ${when}.${smsCostNote} Reschedule: [link]`;
    return { lead, email: { subject: `Your visit with ${ctx.clinicianName} is ${lead} away`, body }, sms };
  };

  const estimate = estimateLine(ctx.estimate);
  // A tiny SMS cost note for the confirmed/changed variants (keeps the text < 160).
  const smsCostNote =
    ctx.costOutcome === "confirmed"
      ? ` Cost confirmed: $${reminderEstimate.estimated.value}/visit.`
      : ctx.costOutcome === "changed"
        ? ` Cost now $${reminderEstimate.confirmed.value}/visit (was $${reminderEstimate.estimated.value}).`
        : "";

  return [
    // The 48-hour reminder leads with the free-to-reschedule cutoff.
    card("48 hours", freeToRescheduleLine(ctx.slotIso, ctx.state), confirmedCost ?? estimate, smsCostNote),
    card("24 hours", `Your visit is 24 hours away. Here's everything you need.`, estimate),
    card("1 hour", `Your visit is 1 hour away. Find a quiet, private spot and your join link.`, estimate),
  ];
}

// ---- Pre-visit emails ----

export interface EmailPreview {
  kind: "general" | "condition";
  subject: string;
  body: string[];
}

/** One general logistics email, and one condition-specific one. Illustrative, no medical advice. */
export function previsitEmails(ctx: VisitContext, conditionLabel?: string): EmailPreview[] {
  const when = formatInZone(ctx.slotIso, ctx.state);
  const general: EmailPreview = {
    kind: "general",
    subject: "Getting ready for your visit",
    body: [
      `Your video visit with ${ctx.clinicianName} is ${when}.`,
      "Find a quiet, private spot with a steady connection.",
      "Join from the link on your visit page a few minutes early so you can settle in.",
      "Have a pen handy in case you want to jot anything down.",
    ],
  };
  const emails = [general];
  if (conditionLabel) {
    emails.push({
      kind: "condition",
      subject: `A little prep for ${conditionLabel.toLowerCase()}`,
      body: [
        `Since you mentioned ${conditionLabel.toLowerCase()}, it can help to think of a couple of recent moments you'd like to talk through.`,
        "There's nothing to prepare or get right. Your clinician will guide the conversation.",
        "This note is about logistics and what to expect, not medical advice.",
      ],
    });
  }
  return emails;
}
