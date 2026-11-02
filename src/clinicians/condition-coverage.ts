import { conditionTopics, type TopicId } from "@/facts";
import { CLINICIANS } from "./data";

/**
 * Maps each Conditions option to the clinicians whose specialties cover it,
 * derived from the synthetic roster. Options with no clinician are NOT removed:
 * they are listed in `UNCOVERED_TOPICS` and flagged in docs/DECISIONS.md.
 * This mapping (and the whole roster) must be checked against what Legion's
 * clinicians actually treat.
 */
export const COVERAGE: Record<TopicId, string[]> = Object.fromEntries(
  conditionTopics.value.map((topic) => [
    topic.id,
    CLINICIANS.filter((c) => c.specialties.includes(topic.id)).map((c) => c.id),
  ]),
) as Record<TopicId, string[]>;

/** Topic ids that no synthetic clinician covers. Empty today; kept honest by a test. */
export const UNCOVERED_TOPICS: TopicId[] = conditionTopics.value
  .map((t) => t.id)
  .filter((id) => COVERAGE[id].length === 0);

export function clinicianCountFor(topic: TopicId): number {
  return COVERAGE[topic].length;
}
