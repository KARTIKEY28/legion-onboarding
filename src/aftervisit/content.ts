import { cancellationLine } from "@/payment/summary";
import { formatCentral } from "@/time";

/**
 * Content for the after-payment screens. All logistics, warm and plain, no
 * medical advice. The cancellation fee comes from the facts via cancellationLine.
 */

export interface VisitContext {
  clinicianName: string;
  slotIso: string;
  formsComplete: boolean;
  path: "insured" | "self_pay" | "not_sure";
  insuranceState: "checking" | "confirmed" | "more_info";
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

function formsLine(formsComplete: boolean): string {
  return formsComplete
    ? "Your intake forms are done — thank you."
    : "You haven't filled your intake forms yet. They're optional and your visit happens either way.";
}

function insuranceLine(ctx: VisitContext): string {
  if (ctx.path === "self_pay") return "You're paying without insurance.";
  switch (ctx.insuranceState) {
    case "confirmed":
      return "Your insurance is confirmed.";
    case "more_info":
      return "We need a little more insurance information — our team will follow up.";
    default:
      return "We're still checking your insurance.";
  }
}

export function reminderCards(ctx: VisitContext): ReminderCard[] {
  const when = formatCentral(ctx.slotIso);
  const reschedule = "Need a different time? Reschedule from your account.";
  const fee = cancellationLine();
  const base = (lead: string): ReminderCard => ({
    lead,
    email: {
      subject: `Your visit with ${ctx.clinicianName} is ${lead} away`,
      body: [`Your video visit is ${when}.`, formsLine(ctx.formsComplete), insuranceLine(ctx), reschedule, fee],
    },
    sms: `Legion: your visit with ${ctx.clinicianName} is ${lead} away (${when}). ${reschedule} ${fee}`,
  });
  return [base("48 hours"), base("24 hours"), base("1 hour")];
}

// ---- Pre-visit emails ----

export interface EmailPreview {
  kind: "general" | "condition";
  subject: string;
  body: string[];
}

/** One general logistics email, and one condition-specific one. Illustrative, no medical advice. */
export function previsitEmails(ctx: VisitContext, conditionLabel?: string): EmailPreview[] {
  const when = formatCentral(ctx.slotIso);
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
        "There's nothing to prepare or get right — your clinician will guide the conversation.",
        "This note is about logistics and what to expect, not medical advice.",
      ],
    });
  }
  return emails;
}
