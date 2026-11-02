import { z } from "zod";
import { localSafetyCheck } from "@/safety/local";
import { removeIdentifiers } from "./redact";

/**
 * Reflect-back lines (AI feature 2): one short line in the patient's own terms,
 * built only from their answers. No invented details, no diagnosis, no advice.
 * The model only phrases; a deterministic template is always ready, and is used
 * on any error, a missing key, a slow response or an answer that fails checks.
 */

export const reflectInputSchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("conditions"),
    topics: z.array(z.string().max(80)).max(20),
    unsure: z.boolean(),
    skipped: z.boolean(),
    freeText: z.string().max(1000).optional(),
  }),
  z.object({
    step: z.literal("needs"),
    availability: z.array(z.string().max(40)).max(10),
    language: z.string().max(40).optional(),
    gender: z.string().max(40).optional(),
    note: z.string().max(1000).optional(),
  }),
]);

export type ReflectInput = z.infer<typeof reflectInputSchema>;
export type ReflectSource = "model" | "template";
export interface Reflection {
  text: string;
  source: ReflectSource;
}

/** Anything that can phrase a reflect-back line. The Anthropic model is one; tests use fakes. */
export interface ReflectionWriter {
  write(input: ReflectInput): Promise<string>;
}

export const REFLECT_TIMEOUT_MS = 2500;

function list(items: string[]): string {
  const lower = items.map((item) => item.charAt(0).toLowerCase() + item.slice(1));
  if (lower.length <= 1) return lower.join("");
  return `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}`;
}

/** The deterministic fallback. Uses only the patient's chosen labels, never their free text. */
export function templateReflection(input: ReflectInput): string {
  if (input.step === "conditions") {
    if (input.skipped) return "You chose to skip this for now, and that's okay.";
    const shared = input.freeText?.trim() ? " You also shared more in your own words." : "";
    if (input.topics.length) return `You mentioned ${list(input.topics)}.${shared}`;
    if (input.unsure) return `You're not sure yet what to call it, and that's okay.${shared}`;
    return shared ? "Thanks for putting it in your own words." : "You chose to skip this for now, and that's okay.";
  }
  const parts: string[] = [];
  if (input.language) parts.push(`who speaks ${input.language}`);
  if (input.gender) parts.push(`who is a ${input.gender.toLowerCase()}`);
  if (input.availability.length) parts.push(`available ${list(input.availability)}`);
  const note = input.note?.trim() ? " We'll keep your note in mind too." : "";
  if (!parts.length) return `You're open to any clinician.${note}`;
  return `You'd like a clinician ${parts.join(", ")}.${note}`;
}

const BANNED = /\b(diagnos\w*|disorder|syndrome|you should|you need to|try|recommend\w*|treatment|medication|cure)\b/i;

/** A model line is only used if it is one short sentence about the patient, with no numbers or advice. */
export function isAcceptableReflection(text: string): boolean {
  const line = text.trim();
  return (
    line.length > 0 &&
    line.length <= 180 &&
    !/[\n\r]/.test(line) &&
    !/\d/.test(line) &&
    /^you\b/i.test(line) &&
    !BANNED.test(line)
  );
}

/** Removes identifiers, and drops free text entirely if the local safety check flags it. */
export function prepareForModel(input: ReflectInput): ReflectInput {
  const clean = (text?: string) => {
    if (!text?.trim() || localSafetyCheck(text).concern) return undefined;
    return removeIdentifiers(text);
  };
  return input.step === "conditions" ? { ...input, freeText: clean(input.freeText) } : { ...input, note: clean(input.note) };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function reflectBack(
  input: ReflectInput,
  writer: ReflectionWriter | null,
  timeoutMs = REFLECT_TIMEOUT_MS,
): Promise<Reflection> {
  const template = { text: templateReflection(input), source: "template" as const };
  if (!writer) return template;
  try {
    const text = (await withTimeout(writer.write(prepareForModel(input)), timeoutMs)).trim();
    return isAcceptableReflection(text) ? { text, source: "model" } : template;
  } catch {
    return template;
  }
}
