import type { Fact } from "./index";

/**
 * Plan names for the Insurance select. SYNTHETIC: these are made-up names for
 * the prototype, not real insurers, and the screen labels them as samples.
 * Replace with Legion's accepted plans before launch.
 */
export const samplePayers = {
  value: [
    { id: "example_health", label: "Example Health Plan" },
    { id: "sample_insurance", label: "Sample Insurance Co." },
    { id: "demo_care", label: "Demo Care Network" },
    { id: "placeholder_health", label: "Placeholder Health" },
  ],
  status: "assumption",
  source: "Synthetic placeholder list for the prototype. Not real insurers.",
} as const satisfies Fact<readonly { id: string; label: string }[]>;
