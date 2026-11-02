import { conditionTopics, type TopicId } from "@/facts";
import { samplePayers } from "@/facts";
import { CLINICIANS } from "./data";
import {
  CLINICIAN_GENDERS,
  LANGUAGES,
  MIN_OUTCOME_COHORT,
  type AvailabilityWindow,
  type Clinician,
  type ClinicianGender,
  type LanguageId,
} from "./model";
import { AVAILABILITY_WINDOWS } from "./model";
import { nextSlots, openSlots, type Slot } from "./schedule";

/**
 * Deterministic matching, in code (never by the model). Scores clinicians on
 * condition overlap, availability, language, gender and plan, and returns the
 * top 3. A clinician with no open slot in the patient's chosen windows cannot
 * be a strong match. If fewer than 3 clinicians are strong matches, the caller
 * shows the no-strong-match state with the closest available options instead.
 */

export interface MatchInput {
  topics: TopicId[];
  windows: AvailabilityWindow[];
  language?: LanguageId;
  gender?: ClinicianGender;
  payerId?: string;
}

export type EvidenceTier =
  | { tier: 1 }
  | { tier: 2; similarPatients: number }
  | { tier: 3; cohortSize: number; improvedShare: number; measure: string };

/** Structured, record-only facts a reason line may use. No free generation. */
export interface MatchReasonFacts {
  matchedTopics: string[];
  windows: string[];
  language?: string;
  gender?: string;
  payer?: string;
}

export interface RankedMatch {
  clinician: Clinician;
  score: number;
  slots: Slot[];
  evidence: EvidenceTier;
  facts: MatchReasonFacts;
}

export interface MatchResult {
  matches: RankedMatch[];
  /** True when at least 3 clinicians passed the strong-match bar. */
  strong: boolean;
}

const MIN_STRONG_MATCHES = 3;

const topicLabel = (id: TopicId) => conditionTopics.value.find((t) => t.id === id)?.label ?? id;
const windowLabel = (id: AvailabilityWindow) => AVAILABILITY_WINDOWS.find((w) => w.id === id)?.label ?? id;
const languageLabel = (id: LanguageId) => LANGUAGES.find((l) => l.id === id)?.label ?? id;
const genderLabel = (id: ClinicianGender) => CLINICIAN_GENDERS.find((g) => g.id === id)?.label ?? id;
const payerLabel = (id: string) => samplePayers.value.find((p) => p.id === id)?.label ?? id;

export function evidenceTier(c: Clinician): EvidenceTier {
  if (c.outcomes && c.outcomes.cohortSize >= MIN_OUTCOME_COHORT) {
    return { tier: 3, cohortSize: c.outcomes.cohortSize, improvedShare: c.outcomes.improvedShare, measure: c.outcomes.measure };
  }
  if (c.experience) return { tier: 2, similarPatients: c.experience.similarPatients };
  return { tier: 1 };
}

function facts(c: Clinician, input: MatchInput): MatchReasonFacts {
  const matched = input.topics.filter((t) => c.specialties.includes(t));
  // For a patient who named no topics, surface the clinician's own focus areas.
  const topicIds = matched.length ? matched : input.topics.length ? [] : c.specialties.slice(0, 2);
  return {
    matchedTopics: topicIds.map(topicLabel),
    windows: c.availability.filter((w) => !input.windows.length || input.windows.includes(w)).map(windowLabel),
    language: input.language && c.languages.includes(input.language) ? languageLabel(input.language) : undefined,
    gender: input.gender && c.gender === input.gender ? genderLabel(input.gender) : undefined,
    payer: input.payerId && c.acceptedPayers.includes(input.payerId) ? payerLabel(input.payerId) : undefined,
  };
}

function score(c: Clinician, input: MatchInput): number {
  const overlap = input.topics.filter((t) => c.specialties.includes(t)).length;
  const lang = input.language && c.languages.includes(input.language) ? 2 : 0;
  const gender = input.gender && c.gender === input.gender ? 1 : 0;
  const plan = input.payerId && c.acceptedPayers.includes(input.payerId) ? 1 : 0;
  return overlap * 3 + lang + gender + plan;
}

/** Sort by score, then illustrative experience, then id, for a stable order. */
function byRank(a: Clinician, b: Clinician, input: MatchInput): number {
  const ds = score(b, input) - score(a, input);
  if (ds) return ds;
  const de = (b.experience?.similarPatients ?? 0) - (a.experience?.similarPatients ?? 0);
  return de || a.id.localeCompare(b.id);
}

function ranked(c: Clinician, input: MatchInput, now: Date, anyWindow: boolean): RankedMatch {
  return {
    clinician: c,
    score: score(c, input),
    slots: nextSlots(c, now, anyWindow ? undefined : input.windows, 3),
    evidence: evidenceTier(c),
    facts: facts(c, input),
  };
}

export function matchClinicians(input: MatchInput, now: Date): MatchResult {
  const hasTopics = input.topics.length > 0;
  // Strong matches: an open slot in the chosen windows, and (if topics were given) at least one overlap.
  const strong = CLINICIANS.filter((c) => {
    if (!openSlots(c, now, input.windows).length) return false;
    return !hasTopics || input.topics.some((t) => c.specialties.includes(t));
  }).sort((a, b) => byRank(a, b, input));

  if (strong.length >= MIN_STRONG_MATCHES) {
    return { matches: strong.slice(0, 3).map((c) => ranked(c, input, now, false)), strong: true };
  }

  // Closest available: anyone with an opening at all, best first.
  const closest = CLINICIANS.filter((c) => openSlots(c, now).length > 0).sort((a, b) => byRank(a, b, input));
  return { matches: closest.slice(0, 3).map((c) => ranked(c, input, now, true)), strong: false };
}

/** Every clinician with an opening, ranked, for the "see all clinicians" list. */
export function allRanked(input: MatchInput, now: Date): RankedMatch[] {
  return CLINICIANS.filter((c) => openSlots(c, now).length > 0)
    .sort((a, b) => byRank(a, b, input))
    .map((c) => ranked(c, input, now, true));
}

/** Builds the MatchInput from the patient's saved answers. */
export function matchInputFromAnswers(a: {
  conditions?: { topics: TopicId[] };
  needs?: { availability: AvailabilityWindow[]; language?: LanguageId; gender?: ClinicianGender };
  insurance?: { path: string; payerId?: string };
}): MatchInput {
  return {
    topics: a.conditions?.topics ?? [],
    windows: a.needs?.availability ?? [],
    language: a.needs?.language,
    gender: a.needs?.gender,
    payerId: a.insurance?.path === "insured" ? a.insurance.payerId : undefined,
  };
}
