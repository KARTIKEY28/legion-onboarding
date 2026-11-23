import type { Fact } from "./index";
import type { UsState } from "@/time";

/**
 * Plan names for the Insurance step. SYNTHETIC: made-up names for the prototype,
 * not real insurers, and the screen labels them as samples. Each is tagged with
 * the state(s) it is offered in, so a Utah patient sees plausible Utah payers.
 * Example Health is national (both states). Replace before launch.
 */
export const samplePayers = {
  value: [
    { id: "example_health", label: "Example Health Plan", states: ["TX", "UT"] },
    { id: "sample_insurance", label: "Sample Insurance Co.", states: ["TX"] },
    { id: "demo_care", label: "Demo Care Network", states: ["TX"] },
    { id: "placeholder_health", label: "Placeholder Health", states: ["TX"] },
    { id: "mountain_health", label: "Mountain Health", states: ["UT"] },
    // A government program, so that coverage discovery can surface a Medicaid
    // plan Legion cannot accept (the late-exclusion path). Offered in both states.
    { id: "sample_medicaid", label: "Sample Medicaid Plan", states: ["TX", "UT"] },
    // National plan that covers specialist visits but doesn't name behavioral health.
    { id: "national_choice", label: "National Choice", states: ["TX", "UT"] },
  ],
  status: "assumption",
  source: "Synthetic placeholder list for the prototype. Not real insurers.",
} as const satisfies Fact<readonly { id: string; label: string; states: readonly UsState[] }[]>;

/** The payers offered in a given state (national payers appear in both). */
export function payersForState(state: UsState) {
  return samplePayers.value.filter((p) => (p.states as readonly UsState[]).includes(state));
}
