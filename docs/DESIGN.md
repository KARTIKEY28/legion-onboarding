# Legion onboarding — design system

The single source of truth for the visual system. Tokens live in
`src/app/globals.css` (Tailwind v4 `@theme`); the defaults are switched off, so
only these exist and **no component hardcodes a colour**. A contrast test
(`src/design/contrast.test.ts`) fails CI on a violation.

## Colour tokens

| Token | Value | Meaning / where it is used |
| --- | --- | --- |
| `canvas` | `#FAFBFC` | Page background |
| `surface` | `#FFFFFF` | Cards, inputs, the crisis bar |
| `ink` | `#0B0B0C` | Body and heading text |
| `ink-muted` | `#5A6170` | Secondary text, helper text, micro-labels |
| `line` | `#E4E6EA` | Decorative hairline borders (not a contrast-bearing boundary) |
| `accent` | `#4663E8` | Primary buttons, links, selected borders, progress fill, the Match sticky bar, stat numbers |
| `accent-dark` | `#2B55D4` | Primary hover, the focus ring |
| `accent-soft` | `#EEF2FD` | Accent tint (quiet accent backgrounds) |
| `accent-ink` | `#FFFFFF` | Text/icons on an accent fill |
| `confirmed` | `#3E6B5A` | Booked, insurance verified, device check passed, intake confirmed — **nothing else** |
| `confirmed-tint` | `#E8F0EC` | Background for a confirmed state |
| `caution` | `#A3503F` | **Form validation only** |
| `caution-tint` | `#FBF0ED` | Background for a validation error |

The exact brand blue may change: update `--color-accent` (one line) and re-run
the contrast test. **Colour carries one meaning each; never use colour alone to
signal state** (always a word or icon too).

**Crisis bar and panels:** `surface` with a 3px `accent` left rule and `ink`
text. Never red or amber.

## Shape

- Primary and secondary buttons are **full pills** (`rounded-full`).
- Cards and option/slot buttons keep a **12–16px radius** (`radius-md` 12px,
  `radius-lg` 16px).
- Focus ring: 2px `accent-dark` outline, 2px offset (visible against `accent`).

## Type

| Role | Size / line-height / weight |
| --- | --- |
| Title | 28 / 34 / 600 (`text-2xl`) |
| Section | 20 / 28 / 600 (`text-xl`) |
| Question | 17 / 24 / 600 (`text-lg`) |
| Body | 16 / 24 (`text-base`) |
| Helper | 14 / 20 (`text-sm`) |
| Micro | 13 / 18 |

**Inputs never below 16px.** The **micro-label** (`.micro`: monospace,
uppercase, letterspaced, 12px, `ink-muted`) is used for step labels
("STEP 3 OF 10"), the "ILLUSTRATIVE" prefix on evidence lines, and quote
attributions.

## Ten UX rules

1. One primary action per screen.
2. Spacing on a 4px scale: 4, 8, 12, 16, 24, 32, 48.
3. The type scale above; inputs never below 16px.
4. Colour carries one meaning each; never colour alone to signal state.
5. Every state designed: loading, empty, error, focus, disabled, offline model.
6. Touch targets at least 44px; the primary action is reachable without
   scrolling at 390×844.
7. Contrast: body 7:1, everything else 4.5:1 minimum.
8. Motion 150–200ms, subtle, respects `prefers-reduced-motion`.
9. Illustrative or synthetic data is labelled in words, never by styling alone.
10. Demo chrome never shares the product's visual language (the demo bar is a
    dashed, neutral strip, gated on `NEXT_PUBLIC_SHOW_DEV_LABEL`).
