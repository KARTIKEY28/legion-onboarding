import type { TopicId } from "@/facts";
import type { AvailabilityWindow, ClinicianGender, LanguageId } from "@/clinicians/model";

/**
 * Natural-language phrases for every option the patient can choose. The raw
 * option labels read well as questions ("Feeling down or low most days") but
 * badly inside a sentence ("Clinicians who work with feeling down or low most
 * days"). The Match headline, the card reasons and the profile are all built
 * from these phrases, never from the raw labels.
 *
 * Phrasing only. Every fact (who treats what, when they are open) still comes
 * from the clinician record; this file just names things in plain language.
 */

/** A concern, as the object of "works with ___": "low mood", "ongoing worry". */
export const concernPhrase: Record<TopicId, string> = {
  low_mood: "low mood",
  worry: "ongoing worry",
  panic: "panic attacks",
  mood_swings: "mood swings",
  focus: "focus and attention",
  sleep: "sleep",
  past_events: "the effects of past events",
  unwanted_thoughts: "hard-to-control thoughts or habits",
};

/** The time-of-day word used in "___ openings": "weekday morning", "weekend". */
export const windowWord: Record<AvailabilityWindow, string> = {
  weekday_mornings: "weekday morning",
  weekday_afternoons: "weekday afternoon",
  weekday_evenings: "weekday evening",
  weekends: "weekend",
};

export const languagePhrase: Record<LanguageId, string> = {
  en: "English",
  es: "Spanish",
};

export const genderPhrase: Record<ClinicianGender, string> = {
  woman: "a woman",
  man: "a man",
  nonbinary: "a nonbinary clinician",
};

/** Joins a list in plain English: "a", "a and b", "a, b and c". */
export function joinPhrases(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export interface HeadlineParts {
  /** Concern phrases from concernPhrase. */
  concerns: string[];
  /** Time-of-day words from windowWord. */
  windows: string[];
  /** A language phrase, if the patient chose one. */
  language?: string;
  /** A plan name, if the patient is insured with a plan. */
  payer?: string;
}

/**
 * The deterministic Match headline, built from phrases. Example:
 * "Clinicians who work with low mood and have weekday morning openings."
 * Plan and language are added only when the patient gave them.
 */
export function buildMatchHeadline(parts: HeadlineParts): string {
  const clauses: string[] = [];
  if (parts.concerns.length) clauses.push(`work with ${joinPhrases(parts.concerns)}`);
  if (parts.windows.length) clauses.push(`have ${joinPhrases(parts.windows)} openings`);
  if (parts.language) clauses.push(`speak ${parts.language}`);
  if (parts.payer) clauses.push(`take ${parts.payer}`);
  if (!clauses.length) return "Clinicians who could be a good fit for you.";
  const body = joinPhrases(clauses);
  // Avoid a double period when the last clause already ends in one (e.g. a plan name "… Co.").
  return `Clinicians who ${body}${body.endsWith(".") ? "" : "."}`;
}
