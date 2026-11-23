import type { TopicId } from "@/facts";
import type { AvailabilityWindow, ClinicianGender, LanguageId } from "@/clinicians/model";

/**
 * DEMO-SCOPED, deterministic phrase parsing. This is NOT a real NLU system and
 * calls no model or service: it maps recognised phrases to the SAME filters the
 * Match chips use (conditions, language, gender, time of day), plus a "cultural"
 * flag. Anything it doesn't recognise is ignored and kept as free text.
 *
 * Cultural or background phrasing maps to a clinician's self-described cultural
 * background and the languages they offer, NEVER to filtering people by race.
 */

export interface ParsedSearch {
  topics: TopicId[];
  language?: LanguageId;
  gender?: ClinicianGender;
  time?: AvailabilityWindow;
  /** The patient asked for a clinician who shares/understands their culture. */
  cultural: boolean;
}

const TOPIC_RULES: [RegExp, TopicId][] = [
  [/depress|feeling down|low mood|\bsad\b|hopeless/, "low_mood"],
  [/anxiet|anxious|\bworry\b|worried|nervous|on edge/, "worry"],
  [/panic/, "panic"],
  [/bipolar|mood swing|\bmania\b|manic/, "mood_swings"],
  [/\badhd\b|\badd\b|focus|attention|concentrat|distract/, "focus"],
  [/insomnia|sleep|sleeping|can'?t sleep|rest/, "sleep"],
  [/ptsd|trauma|traumatic|flashback|something that happened/, "past_events"],
  [/\bocd\b|obsess|compuls|intrusive|unwanted thought/, "unwanted_thoughts"],
];

const LANGUAGE_RULES: [RegExp, LanguageId][] = [
  [/spanish|espa[nñ]ol|bilingual|habla/, "es"],
  [/english/, "en"],
];

// Word-boundaried so "woman" never triggers "man", and "female" never "male".
const GENDER_RULES: [RegExp, ClinicianGender][] = [
  [/nonbinary|non-binary|enby|they\s*\/\s*them/, "nonbinary"],
  [/\bwoman\b|\bwomen\b|\bfemale\b/, "woman"],
  [/\bman\b|\bmale\b/, "man"],
];

const TIME_RULES: [RegExp, AvailabilityWindow][] = [
  [/morning/, "weekday_mornings"],
  [/afternoon/, "weekday_afternoons"],
  [/evening|after work|\bnight\b/, "weekday_evenings"],
  [/weekend|saturday|sunday/, "weekends"],
];

const CULTURAL_RULE = /latin[oax]|hispanic|understands?\s+(my|our)\s+culture|\bmy culture\b|cultural background|same culture|culturally/;

/** Maps free text to the existing filters. Deterministic, no model, no network. */
export function parseSearch(text: string): ParsedSearch {
  const t = text.toLowerCase();
  const topics: TopicId[] = [];
  for (const [re, id] of TOPIC_RULES) if (re.test(t) && !topics.includes(id)) topics.push(id);

  const language = LANGUAGE_RULES.find(([re]) => re.test(t))?.[1];
  const gender = GENDER_RULES.find(([re]) => re.test(t))?.[1];
  const time = TIME_RULES.find(([re]) => re.test(t))?.[1];
  const cultural = CULTURAL_RULE.test(t);

  return { topics, language, gender, time, cultural };
}

/** True when parsing found nothing to filter on (so we show everyone). */
export function hasAnyFilter(p: ParsedSearch): boolean {
  return p.topics.length > 0 || Boolean(p.language) || Boolean(p.gender) || Boolean(p.time) || p.cultural;
}
