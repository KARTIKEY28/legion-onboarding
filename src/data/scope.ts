/**
 * A light, local check for concerns the patient describes in free text that are
 * outside Legion's published conditions (notably substance use and eating
 * concerns). It never blocks and never diagnoses: it only decides whether to
 * show an honest "we may not be the right fit for this on its own" line so the
 * patient is not silently matched as if it were an in-scope concern. The real
 * conversation still happens with the clinician.
 *
 * This is scope framing, not a safety check. The safety check in
 * src/safety/local.ts runs first and always takes precedence.
 */

const OUT_OF_SCOPE: RegExp[] = [
  // Substance use
  /\balcohol(ic|ism)?\b/i,
  /\bdrink(s|ing)?\b/i,
  /\bdrunk\b/i,
  /\bdrugs?\b/i,
  /\bsubstance/i,
  /\bsober(iety)?\b/i,
  /\brelapse/i,
  /\b(cocaine|heroin|opioids?|meth|fentanyl|weed|cannabis|marijuana|vap(e|ing)|smoking)\b/i,
  // Eating and body image
  /\beating\b/i,
  /\banorexi/i,
  /\bbulimi/i,
  /\bbing(e|ing)\b/i,
  /\bpurg(e|ing)\b/i,
  /\bbody image\b/i,
  /\bmy weight\b/i,
  /\blos(e|ing) weight\b/i,
];

/** True when free text describes a concern outside Legion's published conditions. */
export function mentionsOutOfScope(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return OUT_OF_SCOPE.some((re) => re.test(t));
}
