import { conditionTopics } from "@/facts";
import type { EvidenceTier, MatchReasonFacts } from "@/clinicians/match";
import type { Clinician } from "@/clinicians/model";

/**
 * Reason and evidence lines for a match card. The strings are built only from
 * the clinician's record and the patient's answers (never free generation).
 * `validateReasons` is the guard for when model phrasing is enabled: every
 * number must be in the clinician's record and every condition named must be a
 * specialty of that clinician, or the line is rejected in favour of the template.
 */

/** The share written as "about N in 10". */
function inTen(share: number): number {
  return Math.round(share * 10);
}

/** Up to three short reason lines, most relevant first. All are record facts. */
export function reasonsTemplate(facts: MatchReasonFacts): string[] {
  const reasons: string[] = [];
  if (facts.matchedTopics.length) reasons.push(`Works with ${list(facts.matchedTopics)}`);
  if (facts.windows.length) reasons.push(`Has ${list(facts.windows).toLowerCase()} openings`);
  if (facts.language) reasons.push(`Speaks ${facts.language}`);
  if (facts.gender) reasons.push(`Is a ${facts.gender.toLowerCase()}`);
  if (facts.payer) reasons.push(`Takes ${facts.payer}`);
  return reasons.slice(0, 3);
}

/** The single evidence line for the highest tier the data supports. */
export function evidenceLine(evidence: EvidenceTier): string | null {
  switch (evidence.tier) {
    case 1:
      return "Lists this as a focus area";
    case 2:
      return `Has seen ${evidence.similarPatients} patients with concerns like yours (illustrative)`;
    case 3:
      return `About ${inTen(evidence.improvedShare)} in 10 similar patients ${evidence.measure} — illustrative, based on ${evidence.cohortSize} patients`;
  }
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * True if every number in the lines is one the clinician's record supports, and
 * every condition-topic named is one of the clinician's specialties.
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
    if (text.includes(topic.label) && !clinician.specialties.includes(topic.id)) return false;
  }
  return true;
}
