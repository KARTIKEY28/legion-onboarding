/**
 * The local safety check. It runs first on every free-text field, in the
 * browser, with no network. It is deliberately conservative: any doubt routes
 * to help, so negated or ambiguous phrases ("I'm not suicidal") also match.
 * A model check may run after it, and may only escalate, never downgrade.
 *
 * NOT CLINICALLY VALIDATED. See docs/safety-eval.md.
 */

export type LocalSafetyResult = { concern: false } | { concern: true; categories: SafetyCategory[] };

export type SafetyCategory = "self_harm" | "suicide" | "harm_to_others" | "hopelessness" | "immediate_danger";

const PATTERNS: Record<SafetyCategory, RegExp[]> = {
  suicide: [
    /\bsuicid/,
    /\bkill(ing)? my ?self\b/,
    /\bkms\b/,
    /\bend(ing)? (my|it) (life|all)\b/,
    /\bend it all\b/,
    /\btake my (own )?life\b/,
    /\bunalive\b/,
    /\b(want|wanted|wanting|wish) (to|i (was|were)|i could) (die|be dead|not wake up|not exist|disappear)\b/,
    /\bbetter off (dead|without me)\b/,
    /\b(don'?t|do not) want to (be here|be alive|live|wake up)\b/,
    /\bno (reason|point) (to|in) (live|living|going on)\b/,
    /\bhang(ing)? my ?self\b/,
    /\bjump(ing)? off\b/,
    /\boverdos/,
  ],
  self_harm: [
    /\bself[- ]?harm/,
    /\b(hurt|hurting|harm|harming|cut|cutting|burn|burning) my ?self\b/,
    /\bcutting\b(?! (back|down|out|in|off|corners|it close|ties|costs|the))/,
  ],
  harm_to_others: [
    /\b(kill|hurt|harm|attack|shoot|stab) (him|her|them|someone|somebody|people|my (wife|husband|partner|boss|kid|kids|child|mom|dad|mother|father))\b/,
  ],
  hopelessness: [/\bcan'?t (go on|do this anymore|keep going)\b/, /\bgive up on (life|everything)\b/, /\bnothing (to live for|matters anymore)\b/],
  immediate_danger: [/\b(right now|tonight|today) i (will|am going to|plan to)\b/, /\bhave (a|the) (plan|gun|pills|rope)\b/, /\bgoodbye (forever|everyone)\b/],
};

/** Lowercases, straightens quotes and collapses whitespace so patterns match consistently. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function localSafetyCheck(text: string): LocalSafetyResult {
  const normalized = normalize(text);
  if (!normalized) return { concern: false };
  const categories = (Object.keys(PATTERNS) as SafetyCategory[]).filter((category) =>
    PATTERNS[category].some((pattern) => pattern.test(normalized)),
  );
  return categories.length ? { concern: true, categories } : { concern: false };
}
