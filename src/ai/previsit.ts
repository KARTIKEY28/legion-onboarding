import { z } from "zod";

/**
 * "Your story, ready for your clinician" (AI feature). A short pre-visit summary
 * drafted from the patient's onboarding answers: the condition topics and
 * preferences they picked, plus anything they wrote in their own words AFTER it
 * is redacted (identifiers removed) and cleared by the local safety check. That
 * is what makes the on-screen promise ("we use it to draft your visit summary")
 * true while keeping identifiers out of the model (principle 5). The model only
 * phrases, never diagnoses or advises. A deterministic template is always ready
 * and is used on any error, a missing key, a slow answer or a failed check.
 */

export const previsitInputSchema = z.object({
  topics: z.array(z.string().max(80)).max(20),
  availability: z.array(z.string().max(40)).max(10),
  language: z.string().max(40).optional(),
  genderPref: z.string().max(40).optional(),
  /** The patient's own words, already redacted and safety-checked by the caller. */
  note: z.string().max(1000).optional(),
  path: z.enum(["insured", "self_pay", "not_sure"]),
});

export type PrevisitInput = z.infer<typeof previsitInputSchema>;
export type SummarySource = "model" | "template";
export interface PrevisitSummary {
  text: string;
  source: SummarySource;
}

/** Anything that can phrase the summary. The Anthropic model is one; tests use fakes. */
export interface SummaryWriter {
  writeSummary(facts: string): Promise<string>;
}

export const SUMMARY_TIMEOUT_MS = 2500;

function list(items: string[]): string {
  const lower = items.map((item) => item.charAt(0).toLowerCase() + item.slice(1));
  if (lower.length <= 1) return lower.join("");
  return `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}`;
}

/** The deterministic fallback, in the patient's voice, from their picked labels only. */
export function templateSummary(input: PrevisitInput): string {
  const parts: string[] = [];
  if (input.topics.length) {
    parts.push(`What's been on my mind: ${list(input.topics)}.`);
  } else {
    parts.push("I'm still figuring out what's been on my mind, and I'd like help working it out.");
  }
  if (input.availability.length) parts.push(`Times that work for me: ${list(input.availability)}.`);
  if (input.language) parts.push(`I'd prefer to talk in ${input.language}.`);
  if (input.genderPref) parts.push(`I'd feel most comfortable with a ${input.genderPref} clinician.`);
  if (input.note?.trim()) parts.push(`In my own words: ${input.note.trim()}`);
  parts.push(input.path === "self_pay" ? "I'm paying without insurance." : "I'm planning to use my insurance.");
  return parts.join(" ");
}

/** Facts block for the model: labels only, never free text. */
export function summaryFacts(input: PrevisitInput): string {
  return [
    `Topics they picked: ${input.topics.join("; ") || "none yet"}`,
    `Times that suit them: ${input.availability.join("; ") || "any"}`,
    `Preferred language: ${input.language || "no preference"}`,
    `Preferred clinician gender: ${input.genderPref || "no preference"}`,
    `In their own words (already redacted): ${input.note?.trim() || "nothing added"}`,
    `Payment: ${input.path === "self_pay" ? "without insurance" : "using insurance"}`,
  ].join("\n");
}

const RISKY = /\b(diagnos|prescrib|medication|you should|take \d|dosage|mg\b)/i;

/** Accepts the model's draft only if it is a short, plain, advice-free paragraph. */
export function isAcceptableSummary(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 10 || trimmed.length > 700) return false;
  if (RISKY.test(trimmed)) return false;
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e) => (clearTimeout(timer), reject(e)),
    );
  });
}

export async function composeSummary(
  input: PrevisitInput,
  writer: SummaryWriter | null,
  timeoutMs = SUMMARY_TIMEOUT_MS,
): Promise<PrevisitSummary> {
  const fallback: PrevisitSummary = { text: templateSummary(input), source: "template" };
  if (!writer) return fallback;
  try {
    const text = await withTimeout(writer.writeSummary(summaryFacts(input)), timeoutMs);
    return isAcceptableSummary(text) ? { text: text.trim(), source: "model" } : fallback;
  } catch {
    return fallback;
  }
}
