import { createAvatar } from "@dicebear/core";
import { personas } from "@dicebear/collection";

/**
 * Illustrated, clearly synthetic clinician portraits, generated locally and
 * deterministically from the clinician id. These are not photos of real people
 * and nothing is fetched from the web at runtime. Library: DiceBear (MIT),
 * style "personas" by Draftbit (CC0). See docs/DECISIONS.md and the footer.
 *
 * Options are locked and curated PER CLINICIAN so each portrait looks calm and
 * professional and reads with the clinician's pronouns: no glasses or
 * accessories (eyes limited to open/happy), no mouth accessories, natural hair
 * colors only (no pink/blue), facial hair for he/him clinicians, and muted
 * backgrounds. Reviewed visually across all clinicians.
 */

/** Muted, low-saturation background tones, assigned per clinician for variety. */
const PALETTE = ["dfe7ef", "e6e1f0", "e8eef0", "efe6e9", "efe9df", "e3ece6"];

/** Natural hair colors only. */
const HAIR = {
  black: "232323",
  darkBrown: "3b2a24",
  brown: "6c4545",
  auburn: "8d4a2f",
  blonde: "c9a05a",
  gray: "9a9a9a",
} as const;

/** he/him clinicians get facial hair so the portrait reads masculine. */
const HE_HIM = new Set(["c2", "c6", "c8", "c12", "c14", "c17"]);

const HAIR_COLOR: Record<string, string> = {
  c1: HAIR.brown,
  c2: HAIR.black,
  c3: HAIR.darkBrown,
  c4: HAIR.gray,
  c5: HAIR.auburn,
  c6: HAIR.black,
  c7: HAIR.darkBrown,
  c8: HAIR.black,
  c9: HAIR.darkBrown,
  c10: HAIR.auburn,
  c11: HAIR.darkBrown,
  c12: HAIR.brown,
  c13: HAIR.gray,
  c14: HAIR.black,
  c15: HAIR.brown,
  c16: HAIR.black,
  c17: HAIR.darkBrown,
  c18: HAIR.darkBrown,
};

/** A data-URI SVG portrait for a clinician, stable across renders and machines. */
export function portraitDataUri(id: string): string {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 0;
  return createAvatar(personas, {
    seed: id,
    backgroundColor: [PALETTE[n % PALETTE.length]],
    radius: 50,
    // Calm, professional: no glasses or sunglasses, no mouth accessories.
    eyes: ["open", "happy"],
    mouth: ["smile", "smirk", "lips"],
    // Natural hair color only (fixes e.g. Marco's pink hair).
    hairColor: [HAIR_COLOR[id] ?? HAIR.darkBrown],
    // Facial hair matches he/him clinicians; others have none.
    facialHairProbability: HE_HIM.has(id) ? 100 : 0,
  }).toDataUri();
}
