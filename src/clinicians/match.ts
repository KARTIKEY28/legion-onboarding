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
 * Deterministic matching, in code (never by the model). Matching is split in
 * two: HARD constraints decide who can be a strong match at all, and a SOFT
 * score only orders them. A clinician who fails any hard constraint the patient
 * actually set cannot be a strong match, however good their soft score.
 *
 * Hard constraints (each skipped when the patient did not give that answer):
 *   a. at least one chosen concern is in the clinician's specialties;
 *   b. at least one open slot in the chosen time windows in the next 14 days;
 *   c. accepts the patient's plan, on the insured path with a plan chosen;
 *   d. speaks the chosen language.
 * Plus a baseline: the clinician has at least one opening in the next 14 days.
 *
 * Soft score (ordering only): concerns covered, openings in the chosen windows,
 * how soon the first matching opening is, and a gender-preference match.
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
  matchedTopicIds: TopicId[];
  windows: AvailabilityWindow[];
  language?: LanguageId;
  gender?: ClinicianGender;
  payer?: string;
}

export interface RankedMatch {
  clinician: Clinician;
  score: number;
  slots: Slot[];
  evidence: EvidenceTier;
  facts: MatchReasonFacts;
  /** True when the clinician passes every hard constraint the patient set. */
  strong: boolean;
}

export interface MatchResult {
  /** Clinicians who pass every hard constraint, best first. */
  strongMatches: RankedMatch[];
  /** Fillers shown below a divider to round the top out to three, labeled honestly. */
  alsoAvailable: RankedMatch[];
  /** Closest available options for the no-strong-match state (0 strong matches). */
  closest: RankedMatch[];
  /** True only when no clinician is a strong match. */
  noStrongMatch: boolean;
}

/** How many cards the top of the page aims to show. */
const TOP_N = 3;

const topicLabel = (id: TopicId) => conditionTopics.value.find((t) => t.id === id)?.label ?? id;
const payerLabel = (id: string) => samplePayers.value.find((p) => p.id === id)?.label ?? id;

export { AVAILABILITY_WINDOWS, LANGUAGES, CLINICIAN_GENDERS };

export function evidenceTier(c: Clinician): EvidenceTier {
  if (c.outcomes && c.outcomes.cohortSize >= MIN_OUTCOME_COHORT) {
    return { tier: 3, cohortSize: c.outcomes.cohortSize, improvedShare: c.outcomes.improvedShare, measure: c.outcomes.measure };
  }
  if (c.experience) return { tier: 2, similarPatients: c.experience.similarPatients };
  return { tier: 1 };
}

/** Card evidence never rises above experience (tier 2); outcomes stay in the profile. */
export function cardEvidence(c: Clinician): EvidenceTier {
  if (c.experience) return { tier: 2, similarPatients: c.experience.similarPatients };
  return { tier: 1 };
}

function facts(c: Clinician, input: MatchInput): MatchReasonFacts {
  const matched = input.topics.filter((t) => c.specialties.includes(t));
  // For a patient who named no topics, surface the clinician's own focus areas.
  const topicIds = matched.length ? matched : input.topics.length ? [] : c.specialties.slice(0, 2);
  return {
    matchedTopics: topicIds.map(topicLabel),
    matchedTopicIds: topicIds,
    windows: c.availability.filter((w) => !input.windows.length || input.windows.includes(w)),
    language: input.language && c.languages.includes(input.language) ? input.language : undefined,
    gender: input.gender && c.gender === input.gender ? input.gender : undefined,
    payer: input.payerId && c.acceptedPayers.includes(input.payerId) ? payerLabel(input.payerId) : undefined,
  };
}

/** The hard constraints the patient actually set. Passing all of them = a strong match. */
export function passesHardConstraints(c: Clinician, input: MatchInput, now: Date): boolean {
  // Baseline: some opening at all in the next 14 days.
  if (!openSlots(c, now).length) return false;
  // a. concern overlap, when concerns were chosen.
  if (input.topics.length && !input.topics.some((t) => c.specialties.includes(t))) return false;
  // b. an opening inside the chosen windows, when windows were chosen.
  if (input.windows.length && !openSlots(c, now, input.windows).length) return false;
  // c. accepts the plan, when insured with a plan.
  if (input.payerId && !c.acceptedPayers.includes(input.payerId)) return false;
  // d. speaks the language, when one was chosen.
  if (input.language && !c.languages.includes(input.language)) return false;
  return true;
}

/** True when the clinician could appear at all: Texas (implicit), plan and language. */
function eligible(c: Clinician, input: MatchInput, now: Date): boolean {
  if (!openSlots(c, now).length) return false;
  if (input.payerId && !c.acceptedPayers.includes(input.payerId)) return false;
  if (input.language && !c.languages.includes(input.language)) return false;
  return true;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Soft score, for ordering only. Higher is better. */
function score(c: Clinician, input: MatchInput, now: Date): number {
  const concerns = input.topics.filter((t) => c.specialties.includes(t)).length;
  const windowSlots = input.windows.length ? openSlots(c, now, input.windows) : openSlots(c, now);
  const openings = Math.min(windowSlots.length, 12);
  const first = windowSlots[0];
  const daysAway = first ? Math.max(0, Math.round((new Date(first.iso).getTime() - now.getTime()) / DAY_MS)) : 14;
  const soonness = 14 - Math.min(daysAway, 14); // 0..14, sooner is higher
  const genderMatch = input.gender && c.gender === input.gender ? 1 : 0;
  // Concerns dominate, then number of openings, then soonness, then gender.
  return concerns * 1000 + openings * 20 + soonness + genderMatch * 0.5;
}

function byScore(a: Clinician, b: Clinician, input: MatchInput, now: Date): number {
  const ds = score(b, input, now) - score(a, input, now);
  if (ds) return ds;
  const de = (b.experience?.similarPatients ?? 0) - (a.experience?.similarPatients ?? 0);
  return de || a.id.localeCompare(b.id);
}

function ranked(c: Clinician, input: MatchInput, now: Date, strong: boolean): RankedMatch {
  // Strong matches lead with their in-window times; fillers show their soonest times.
  const slots = nextSlots(c, now, strong && input.windows.length ? input.windows : undefined, 4);
  return { clinician: c, score: score(c, input, now), slots, evidence: evidenceTier(c), facts: facts(c, input), strong };
}

export function matchClinicians(input: MatchInput, now: Date): MatchResult {
  const pool = CLINICIANS.filter((c) => eligible(c, input, now));
  const strongSet = pool
    .filter((c) => passesHardConstraints(c, input, now))
    .sort((a, b) => byScore(a, b, input, now));
  const strongIds = new Set(strongSet.map((c) => c.id));
  const rest = pool.filter((c) => !strongIds.has(c.id)).sort((a, b) => byScore(a, b, input, now));

  const strongMatches = strongSet.map((c) => ranked(c, input, now, true));
  const noStrongMatch = strongMatches.length === 0;

  // 1 or 2 strong: fill the top three with honest "also available" clinicians.
  const fillCount = Math.max(0, TOP_N - strongMatches.length);
  const alsoAvailable = noStrongMatch ? [] : rest.slice(0, fillCount).map((c) => ranked(c, input, now, false));

  // No strong match at all: the closest available clinicians, best first.
  const closest = noStrongMatch
    ? [...strongSet, ...rest].slice(0, TOP_N).map((c) => ranked(c, input, now, false))
    : [];

  return { strongMatches, alsoAvailable, closest, noStrongMatch };
}

/** The ordered cards shown at the top of the page: strong matches, then fillers, capped at three. */
export function displayMatches(result: MatchResult): RankedMatch[] {
  if (result.noStrongMatch) return result.closest.slice(0, TOP_N);
  return [...result.strongMatches, ...result.alsoAvailable].slice(0, TOP_N);
}

/** Every eligible clinician, ranked, for the "see all clinicians" list. */
export function allRanked(input: MatchInput, now: Date): RankedMatch[] {
  return CLINICIANS.filter((c) => eligible(c, input, now))
    .sort((a, b) => byScore(a, b, input, now))
    .map((c) => ranked(c, input, now, passesHardConstraints(c, input, now)));
}

/**
 * How many more clinicians each relaxable constraint would add, for the widen
 * buttons in the no-strong-match state. Only constraints the patient set and
 * that actually removed someone are returned.
 */
export function widenGains(input: MatchInput, now: Date): { any_time?: number; any_language?: number; any_gender?: number } {
  const strongCount = (i: MatchInput) => CLINICIANS.filter((c) => passesHardConstraints(c, i, now)).length;
  const base = strongCount(input);
  const gains: { any_time?: number; any_language?: number; any_gender?: number } = {};
  if (input.windows.length) {
    const g = strongCount({ ...input, windows: [] }) - base;
    if (g > 0) gains.any_time = g;
  }
  if (input.language) {
    const g = strongCount({ ...input, language: undefined }) - base;
    if (g > 0) gains.any_language = g;
  }
  if (input.gender) {
    const g = strongCount({ ...input, gender: undefined }) - base;
    if (g > 0) gains.any_gender = g;
  }
  return gains;
}

/** Builds the MatchInput from the patient's saved answers. */
export function matchInputFromAnswers(a: {
  conditions?: { topics: TopicId[] };
  needs?: { availability: AvailabilityWindow[]; language?: LanguageId; gender?: ClinicianGender };
  insurance?: { path: string; payerId?: string };
}): MatchInput {
  // Only a known plan is a hard constraint. "Other" (an unlisted plan) and
  // "add later" cannot be verified against the roster, so they filter nobody.
  const payerId = a.insurance?.path === "insured" ? a.insurance.payerId : undefined;
  const knownPayer = payerId && samplePayers.value.some((p) => p.id === payerId) ? payerId : undefined;
  return {
    topics: a.conditions?.topics ?? [],
    windows: a.needs?.availability ?? [],
    language: a.needs?.language,
    gender: a.needs?.gender,
    payerId: knownPayer,
  };
}
