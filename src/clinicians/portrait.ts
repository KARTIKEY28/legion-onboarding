import { createAvatar } from "@dicebear/core";
import { personas } from "@dicebear/collection";

/**
 * Illustrated, clearly synthetic clinician portraits, generated locally and
 * deterministically from the clinician id. These are not photos of real people
 * and nothing is fetched from the web at runtime. Library: DiceBear (MIT),
 * style "personas" by Draftbit (CC0). See docs/DECISIONS.md and the footer.
 */
const PALETTE = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"];

/** A data-URI SVG portrait for a clinician, stable across renders and machines. */
export function portraitDataUri(seed: string): string {
  return createAvatar(personas, {
    seed,
    backgroundColor: PALETTE,
    radius: 50,
  }).toDataUri();
}
