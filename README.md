# Legion onboarding rebuild (prototype)

A prototype of Legion's patient onboarding, from the first screen to the payment page,
built from [docs/PRD.md](docs/PRD.md). Synthetic data only. Not a real service, and it never
touches Legion's live flow. Payment (slice 6) uses Stripe test mode only.

- [CLAUDE.md](CLAUDE.md): scope, the standing rules, the visual rules and the slice plan.
- [docs/DECISIONS.md](docs/DECISIONS.md): decisions the PRD does not cover, for review.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs the same four checks on every push to `main` and every pull request.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/facts/` | Every fixed fact: eligibility rules, prices, cancellation terms, the countdown (not built), crisis resources. Unknown values are `null`. |
| `src/app/globals.css` | Design tokens: colors, type scale, radius, focus style. |
| `src/analytics/schema.ts` | The event catalog from the PRD measurement plan. Properties are enums, numbers or booleans only. |
| `src/analytics/track.ts` | `createTracker()`: validates each event and adds session id, step, device type and timestamp. |
| `src/analytics/client.ts` | Browser tracker. Events also land on `window.__legionEvents` for instrumentation checks. |
| `src/components/CrisisHelp.tsx` | Crisis help, rendered on every screen by the root layout. |

## Deploy

Deploys use Vercel's Git integration, so there is no deploy config in the repo. It runs with no
environment variables (templates + the booking mock); set keys and flags to turn on the model,
Stripe test mode, or feature flags.

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for the step-by-step: push to GitHub, import into Vercel,
the environment-variable table, and the test cards. In short:

1. `git branch -M main`, create a public GitHub repo, and push.
2. In Vercel, **Add New → Project**, import the repository, keep the Next.js defaults, add any
   environment variables, and deploy.
3. Every branch push gets a preview URL; `main` deploys to production.
