import { conditionTopics } from "@/facts";
import type { EvidenceTier, MatchReasonFacts } from "@/clinicians/match";
import type { Clinician } from "@/clinicians/model";
import { concernPhrase, genderPhrase, joinPhrases, languagePhrase, windowWord } from "@/data/phrases";

/**
 * Reason and evidence lines for a match card. Every string is built from the
 * clinician's record and the patient's answers, phrased through src/data/phrases
 * (never pasted raw option labels, never freely generated). `validateReasons`
 * is the guard for when model phrasing is enabled: every number must be in the
 * clinician's record and every concern named must be a specialty of that
 * clinician, or the line is rejected in favour of the template.
 */

/** The share written as "about N in 10". */
function inTen(share: number): number {
  return Math.round(share * 10);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Up to three reason lines, each linking the patient's answers to the
 * clinician's facts, in order: concern, time, then plan or language.
 */
export function reasonsTemplate(facts: MatchReasonFacts): string[] {
  const reasons: string[] = [];
  if (facts.matchedTopicIds.length) {
    reasons.push(`Focuses on ${joinPhrases(facts.matchedTopicIds.map((id) => concernPhrase[id]))}`);
  }
  if (facts.windows.length) {
    reasons.push(`${capitalize(joinPhrases(facts.windows.map((w) => windowWord[w])))} openings`);
  }
  if (facts.payer) {
    reasons.push(`Takes ${facts.payer}`);
  } else if (facts.language) {
    reasons.push(`Speaks ${languagePhrase[facts.language]}`);
  }
  return reasons.slice(0, 3);
}

/** The primary matched concern phrase, used in the card evidence line. */
function primaryConcern(facts: MatchReasonFacts): string {
  const id = facts.matchedTopicIds[0];
  return id ? concernPhrase[id] : "concerns like yours";
}

/**
 * The single evidence line for a CARD. Expects cardEvidence(), which is capped
 * at experience (tier 2); the "illustrative" label comes first. Outcomes
 * (tier 3) never appear on a card.
 */
export function cardEvidenceLine(evidence: EvidenceTier, facts: MatchReasonFacts): string | null {
  if (evidence.tier === 2) {
    return `Illustrative: has worked with about ${evidence.similarPatients} patients with ${primaryConcern(facts)}`;
  }
  return "Lists this as a focus area";
}

/**
 * The outcomes line for the PROFILE only (tier 3). "Illustrative data" first,
 * with the cohort size. Shown only for clinicians whose cohort is large enough,
 * which evidenceTier already enforces.
 */
export function profileOutcomeLine(evidence: EvidenceTier): string | null {
  if (evidence.tier !== 3) return null;
  return `Illustrative data: about ${inTen(evidence.improvedShare)} in 10 of ${evidence.cohortSize} similar patients ${evidence.measure}.`;
}

/** The plain experience line for the profile (tier 2 and up). */
export function profileExperienceLine(c: Clinician): string | null {
  if (!c.experience) return null;
  return `Illustrative: has worked with about ${c.experience.similarPatients} patients with concerns like these.`;
}

/**
 * The card reasons, expanded to one full sentence each, for the profile. Each
 * ties one of the patient's own answers to this clinician. Pass the clinician's
 * first name to make the sentences read about them, not a generic "they".
 */
export function profileReasons(facts: MatchReasonFacts, name?: string): string[] {
  const who = name ?? "They";
  const out: string[] = [];
  if (facts.matchedTopicIds.length) {
    out.push(
      `${who} focuses on ${joinPhrases(facts.matchedTopicIds.map((id) => concernPhrase[id]))}, which you told us about.`,
    );
  }
  if (facts.windows.length) {
    out.push(`${who} has ${joinPhrases(facts.windows.map((w) => windowWord[w]))} openings, matching when you're free.`);
  }
  if (facts.payer) out.push(`${who} takes ${facts.payer}, the plan you gave us.`);
  if (facts.language) out.push(`${who} speaks ${languagePhrase[facts.language]}, the language you asked for.`);
  if (facts.gender) out.push(`${who} is ${genderPhrase[facts.gender]}, which you preferred.`);
  return out;
}

/**
 * True if every number in the lines is one the clinician's record supports, and
 * every concern named maps to one of the clinician's specialties.
 */
export function validateReasons(lines: string[], clinician: Clinician): boolean {
  const text = lines.join(" ");

  const allowed = new Set<number>([10]);
  if (clinician.experience) allowed.add(clinician.experience.similarPatients);
  if (clinician.outcomes) {
    allowed.add(clinician.outcomes.cohortSize);
    allowed.add(inTen(clinician.outcomes.improvedShare));
    for (const n of clinician.outcomes.measure.match(/\d+/g) ?? []) allowed.add(Number(n));
  }
  for (const n of text.match(/\d+/g) ?? []) {
    if (!allowed.has(Number(n))) return false;
  }

  for (const topic of conditionTopics.value) {
    if (text.includes(concernPhrase[topic.id]) && !clinician.specialties.includes(topic.id)) return false;
  }
  return true;
}

export { concernPhrase, genderPhrase, languagePhrase, windowWord };
