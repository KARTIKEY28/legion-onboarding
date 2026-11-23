/**
 * Simulated insurance "discovery" (Sohar-shaped). A real integration looks up a
 * patient's coverage from their name and date of birth and returns the plan,
 * member ID and group ID. Here it is fully synthetic: a small directory keyed by
 * name returns Sohar-shaped results. No network, no real data. The DOB is part
 * of the lookup signature but the synthetic directory routes on the name only,
 * so any DOB works in the demo.
 *
 * Replace this module with the real Sohar discovery call before launch.
 */

export interface DiscoveredPlan {
  payerId: string;
  memberId: string;
  groupId?: string;
}

export type DiscoveryResult =
  | { kind: "one"; plan: DiscoveredPlan }
  | { kind: "multi"; plans: DiscoveredPlan[] }
  | { kind: "none" }
  | { kind: "failed" };

/** Synthetic coverage directory, keyed by lowercased "first last". */
const DIRECTORY: Record<string, DiscoveryResult> = {
  // Clean one-match with a copay (the demo persona).
  "alex rivera": { kind: "one", plan: { payerId: "example_health", memberId: "EH-4821960", groupId: "GRP-0355" } },
  // Several matches: the patient picks which is theirs.
  "jordan lee": {
    kind: "multi",
    plans: [
      { payerId: "example_health", memberId: "EH-7730188", groupId: "GRP-0355" },
      { payerId: "placeholder_health", memberId: "PH-5540271" },
    ],
  },
  // A plan whose deductible is not yet met.
  "casey nguyen": { kind: "one", plan: { payerId: "sample_insurance", memberId: "SI-9032118", groupId: "GRP-7781" } },
  // A plan that covers specialist visits but does not name behavioral health.
  "taylor brooks": { kind: "one", plan: { payerId: "national_choice", memberId: "NC-5567013" } },
  // A Medicaid plan Legion can't accept (warm exclusion + waitlist).
  "sam carter": { kind: "one", plan: { payerId: "sample_medicaid", memberId: "MCD-7781204" } },
  // A simulated lookup error: falls back to manual, then self-pay.
  "jamie fox": { kind: "failed" },
  // No coverage found: the manual fallback.
  "pat morgan": { kind: "none" },
};

function key(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.toLowerCase().replace(/\s+/g, " ");
}

/**
 * Looks up simulated coverage for a name + DOB. Unknown names return "none" so
 * the manual fallback is always reachable; the DOB is accepted but not used to
 * route in this synthetic version.
 */
export function discoverCoverage(firstName: string, lastName: string, _dob?: unknown): DiscoveryResult {
  void _dob;
  return DIRECTORY[key(firstName, lastName)] ?? { kind: "none" };
}
