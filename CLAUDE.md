# Legion onboarding rebuild (prototype)

A prototype of Legion's patient onboarding, from the first screen to the payment page,
for a prospective adult patient in Texas, on responsive web, designed mobile first.

**Read [docs/PRD.md](docs/PRD.md) before doing anything.** It is the source of truth for scope,
principles, the AI rules and the event schema, and it replaces any earlier PRD or spec.
When this file and the PRD disagree, the PRD wins and this file gets updated.

Decisions the PRD does not cover go in [docs/DECISIONS.md](docs/DECISIONS.md), one entry each,
for review.

## Scope

- Build from the first screen to the payment page only: Start, About you, Conditions, Safety,
  Insurance, Needs, Match, Cost and terms, Account, Payment.
- Post-payment is slice 7: screens designed by the author, using the sequence in the PRD as
  reference, and labeled "Design proposal, not Legion's current experience" on every screen.
  Do not build it until slice 7 starts.
- Not in scope: real insurance, identity or scheduling integrations, clinical validation.

## Standing rules

1. **Never touch Legion's live flow.** The prototype is fully self-contained: no calls to
   Legion's systems, no links that submit into them. Saving a card or insurance on Legion's live
   payment page books a real appointment and can trigger a cancellation fee.
2. **Payment uses Stripe test mode only**, with the standard test card 4242 4242 4242 4242.
   Only `pk_test_` and `sk_test_` keys, kept in environment variables, never committed.
3. **AI only phrases and explains.** Every number, eligibility rule and clinical fact comes from
   a fixed source in `src/facts/` and is never generated. A fact with value `null` is unknown:
   say it is being confirmed, never fill a guess. Never write a price or rule as a literal in a
   component (a test checks for dollar amounts). AI does not screen, diagnose or decide.
4. **Safety.** A local keyword and pattern check runs first and always routes to help. The model
   can only escalate (the crisis panel expands and the next step stays available), never
   downgrade. Crisis help is reachable from every screen (`CrisisHelp` in the root layout) and
   never blocks progress.
5. **Data.** Synthetic personas only. Remove identifiers (names, emails, phone numbers, dates of
   birth) before any model call. Keep free text out of analytics events. Never call stripped
   text "anonymized": it is still health information.
6. **No countdown.** Do not build the 10 minute countdown. Nothing holds the slot on the server,
   so check availability at booking (when the patient confirms a time, and again when payment
   is submitted) and show the next available times if the slot is gone.
7. **Events follow the PRD measurement plan.** The catalog is `src/analytics/schema.ts`; `track()`
   rejects anything not in it. One clean start and complete event per step, no stray events,
   and no event fired from a route that does not own it. Properties are enums, numbers or
   booleans only, and a test enforces it. Add an event to the PRD and the catalog together.
8. **Evidence tiers.** A match reason shows only the highest tier the data supports: declared
   fit, then experience, then outcomes. Tiers 2 and 3 use illustrative data, labeled
   "illustrative" wherever shown. A fabricated statistic presented as real is never acceptable.
9. **No dead ends.** Every patient who cannot proceed, for eligibility or availability, gets a
   real next step. Nothing is asked twice (a notify-me email is pre-filled at account creation).

## Visual rules

**The full visual system — tokens, colour meanings, shape, type and the ten UX rules —
is [docs/DESIGN.md](docs/DESIGN.md). Read it before any styling change.** In short:

- **One primary action per screen.** Everything else is secondary or a text link.
- **Colors come from tokens** in `src/app/globals.css`, with one accent (Legion blue). Tailwind's
  default palette is switched off, so only token colors exist: `canvas`, `surface`, `ink`,
  `ink-muted`, `line`, `accent`, `accent-dark`, `accent-soft`, `accent-ink`, `confirmed`,
  `confirmed-tint`, `caution`, `caution-tint`. Each colour carries one meaning (accent = primary/
  links/selected/progress; confirmed = booked/verified/passed/confirmed; caution = form validation).
- **Fixed type scale:** `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`. The defaults
  are switched off, so nothing else exists.
- **Fixed spacing scale** (multiples of 4px): `1, 2, 3, 4, 6, 8, 12, 16`, e.g. `p-4`, `gap-6`.
  No arbitrary values like `p-[13px]`.
- **Every state is designed:** loading, empty, error and focus. Focus is a visible accent outline.
- **Warm plain language.** Short sentences, no jargon, no gotcha wording, no retail styling, no
  celebration after sensitive questions.
- **Mobile first.** Design at 375px wide, then widen. Content column is `max-w-xl`.

## Working here

- Stack: Next.js (App Router), TypeScript, Tailwind CSS v4, zod, Vitest, Playwright.
- Commands: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test` (unit),
  `npm run test:e2e` (Playwright smoke tests, phone viewport), `npm run build`.
- Each step is a real route (`/start`, `/about`, ...), listed in `src/journey.ts`, so back and
  refresh work. `/` redirects to `/start`, keeping query strings.
- Answers live in the session store (`src/session/store.ts`, sessionStorage). Prefill every
  question from it. It is never sent anywhere; events carry only results and counts.
- Analytics: `src/analytics/`. `getTracker()` sends to adapters behind the `AnalyticsAdapter`
  interface (in-memory and console today; PostHog later). Use `trackOnce` / `useTrackOnce` so
  each step's events fire once per session.
- Eligibility rules: `src/eligibility/`, pure functions with unit tests.
- AI: `src/ai/`. The model is called only from server routes (`/api/reflect-back`,
  `/api/safety-check`) through `getModel()`; the key is `ANTHROPIC_API_KEY` only. Every AI
  feature has a deterministic fallback, used on any error, a missing key, refusal, or a response
  slower than 2.5 seconds, and never blocks navigation. Identifiers are removed first
  (`removeIdentifiers`). Free text the local safety check flags is never sent to the model.
- Safety: `src/safety/local.ts` runs first on every free-text field via `useSafetyCheck` /
  `SafeFreeText`. The phrase eval is `docs/safety-eval.md` and runs as a unit test; add a phrase
  to both when changing the patterns.
- Tests use a model stand-in: `AI_MOCK=1` plus an `ai_mock` cookie (ok, fail, slow).
- Secrets: `npm run check:secrets` runs before every build and in CI and fails on anything that
  looks like a key. Only `.env.example` (empty values) may be committed. The repo is public.
- Insurance (slice 4) slots in at `AFTER_SAFETY` in `src/journey.ts`.
- The dev-only slice label shows only with `NEXT_PUBLIC_SHOW_DEV_LABEL=1`. Never show it to patients.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build on every push and PR.
- Deploys: Vercel Git integration. Each branch push gets a preview URL; `main` is production.
- Build in the PRD's slices, one at a time, each finished and deployed before the next. At the
  end of each slice, report what shipped and what the next slice is, then wait.
  1. Foundations and event schema
  2. Start and About you
  3. Conditions and needs
  4. Insurance and the cost summary
  5. Match
  6. Account and payment (Stripe test mode)
  7. After payment (design proposal, labeled as the author's, not Legion's)
  8. Polish
