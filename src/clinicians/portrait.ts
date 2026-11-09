import { createAvatar } from "@dicebear/core";
import { personas } from "@dicebear/collection";

/**
 * Illustrated, clearly synthetic clinician portraits, generated locally and
 * deterministically from the clinician id. These are not photos of real people
 * and nothing is fetched from the web at runtime. Library: DiceBear (MIT),
 * style "personas" by Draftbit (CC0). See docs/DECISIONS.md and the footer.
 *
 * Options are locked so a clinician looks calm and professional at the moment of
 * commitment: no glasses or sunglasses (eyes limited to open/happy), no mouth
 * accessories (mouth limited to calm, closed-ish shapes), and muted backgrounds.
 * The seed is fixed per clinician (its id, or an override in PORTRAIT_SEED).
 */

/** Muted, low-saturation background tones. */
const PALETTE = ["dfe7ef", "e6e1f0", "e8eef0", "efe6e9", "efe9df"];

/**
 * Per-clinician seed overrides, used only when a clinician's default (its id)
 * renders an expression that reads as off. Reviewed visually across all 12.
 */
const PORTRAIT_SEED: Record<string, string> = {};

/** A data-URI SVG portrait for a clinician, stable across renders and machines. */
export function portraitDataUri(id: string): string {
  return createAvatar(personas, {
    seed: PORTRAIT_SEED[id] ?? id,
    backgroundColor: PALETTE,
    radius: 50,
    // Calm, professional: no glasses or sunglasses, no mouth accessories.
    eyes: ["open", "happy"],
    mouth: ["smile", "smirk", "lips"],
  }).toDataUri();
}
