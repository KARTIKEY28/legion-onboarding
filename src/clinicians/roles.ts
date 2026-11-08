import type { ClinicianRole } from "./model";

/**
 * Plain-language role names and the "what's the difference?" explainer.
 * FLAGGED FOR LEGION (docs/DECISIONS.md): this wording deliberately makes no
 * claim about prescribing rules or scope of practice, which vary. Verify before
 * launch. Everything here is illustrative sample text for the prototype.
 */
export const roleLabel: Record<ClinicianRole, string> = {
  psychiatrist: "Psychiatrist",
  pmhnp: "Psychiatric nurse practitioner",
};

export const ROLE_EXPLAINER =
  "A psychiatrist is a medical doctor who specializes in mental health. A psychiatric nurse practitioner is an advanced-practice registered nurse who specializes in mental health care. Both can be your main clinician at Legion, and you can switch if the fit isn't right.";

/** Synthetic training and licensing lines for the profile, labeled as samples. */
export function sampleCredentials(role: ClinicianRole): string[] {
  const lines =
    role === "psychiatrist"
      ? ["MD, residency-trained in psychiatry", "Board-certified in psychiatry"]
      : ["MSN, psychiatric-mental health nurse practitioner", "Board-certified (PMHNP-BC)"];
  return [...lines, "Licensed to see patients in Texas"];
}
