import type { UsState } from "@/time";

/**
 * Derive the patient's state from their ZIP code. ZIP determines the state,
 * which in turn determines licensing (who can see them), the time zone their
 * visit times are shown in, and the pricing geography, so it replaces a separate
 * state question (see docs/DECISIONS.md).
 *
 * Mapping is by the first three digits (the ZIP prefix / SCF):
 *   Texas  = 750-799
 *   Utah   = 840-847
 * Anything else is out of Legion's served area. This is the standard USPS
 * prefix split; a prefix can straddle a state line in a few places, so a
 * production version should verify against a real ZIP-to-state service.
 */

export type ZipState = UsState | "other";

/** The derived state for a ZIP, or null when it is not a 5-digit ZIP. */
export function stateFromZip(zip: string): ZipState | null {
  const z = zip.trim();
  if (!/^\d{5}$/.test(z)) return null;
  const prefix = Number(z.slice(0, 3));
  if (prefix >= 750 && prefix <= 799) return "TX";
  if (prefix >= 840 && prefix <= 847) return "UT";
  return "other";
}

/** True when the ZIP is a served state (Texas or Utah). */
export function zipInServedArea(zip: string): boolean {
  const state = stateFromZip(zip);
  return state === "TX" || state === "UT";
}
