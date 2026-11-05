# Deploying the prototype

The prototype deploys on **Vercel** through its Git integration. There is no deploy config in the
repo — Vercel auto-detects Next.js. It runs fine with **no environment variables** (templates, the
local safety check, and the booking mock); the variables below only turn on the model, real Stripe
test mode, or the feature flags.

The repo is **public**, so only `.env.example` (empty values) is ever committed. `npm run check:secrets`
runs before every build and in CI and fails if a key is committed.

---

## 1. Push to GitHub

The work is on the `slice-1/foundations` branch and there is no `main` yet. CI and Vercel production
both expect `main`, so rename the branch before the first push:

```bash
git branch -M main
```

Create a new **public** repository on GitHub (empty — no README/.gitignore), then:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## 2. Import into Vercel

1. In Vercel: **Add New → Project**, import the repository.
2. Keep the Next.js defaults (build `next build`, output handled automatically).
3. Add the environment variables below (Project → Settings → Environment Variables), then **Deploy**.

Every branch push then gets a preview URL; `main` deploys to production.

## 3. Environment variables

All optional. Set them for the Production (and Preview) environments as needed. Full notes in
[`.env.example`](../.env.example).

| Variable | Purpose | If unset |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Model for reflect-back, Match headline, cost summary, pre-visit summary, 2nd safety check | Templates + local safety check only |
| `ANTHROPIC_MODEL` | Override the model id | `claude-opus-5-5` |
| `STRIPE_SECRET_KEY` | Stripe **test** secret (`sk_test_…`) | Booking mock runs |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe **test** publishable (`pk_test_…`) | Booking mock runs |
| `NEXT_PUBLIC_FLAG_PREVISIT_SUMMARY` | `0` turns off the AI pre-visit summary | On (default) |
| `NEXT_PUBLIC_FLAG_SIGN_IN` | `1` shows "Already started? Sign in" | Off |
| `NEXT_PUBLIC_FLAG_INSURANCE_CARD_PHOTO` | `1` shows "Add a photo of your card" | Off |
| `NEXT_PUBLIC_SHOW_DEV_LABEL` | `1` shows the internal label + slice-7 demo panel — **never in production** | Off |

> **Never set a live Stripe key.** A key starting with `sk_live_`/`pk_live_` makes the app refuse to
> start (`src/instrumentation.ts`). Use only `sk_test_`/`pk_test_`.

## 4. Check the deployed site

- Walk Start → … → Payment. On Payment, use the test cards (also listed on the page):
  - Success `4242 4242 4242 4242`
  - Declined `4000 0000 0000 0002`
  - Needs bank confirmation `4000 0027 6000 3184`
  - Processing error `4000 0000 0000 0119`
  - Any future expiry, any 3-digit code, any ZIP. **Never a real card.**
- After booking, the slice-7 screens (`/confirmation` → `/visit/*`) are the author's design proposal,
  labeled on every screen.
- To demo the slice-7 time / insurance / forms / visit-complete controls on a preview, set
  `NEXT_PUBLIC_SHOW_DEV_LABEL=1` for the **Preview** environment only.

## 5. CI

`.github/workflows/ci.yml` runs lint, typecheck, unit tests and build on every push to `main` and
every pull request. Playwright smoke tests run locally with `npm run test:e2e`.
