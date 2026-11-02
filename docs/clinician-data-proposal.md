# Proposal: synthetic clinician data for slice 5 (Match)

**Status: for your review. Nothing here is built yet.** Every clinician below is made up. On screen
each one will be labeled as a sample, and every experience or outcome figure as illustrative.

## Schema

Extends the draft `Clinician` type in `src/clinicians/model.ts`. New fields are marked **new**.

| Field | Type | Shown to the patient | Used by the match |
| --- | --- | --- | --- |
| `id` | string | No | Yes |
| `name` | string | Yes | No |
| `pronouns` | string, optional | Yes | No |
| `credential` | string, e.g. "Psychiatric nurse practitioner" | Yes | No |
| `photoUrl` | string, optional (initials avatar if missing) | Yes | No |
| `gender` | woman, man, nonbinary | No (only matched on) | Yes, if the patient chose a preference |
| `languages` | `LanguageId[]` (en, es) | Yes | Yes |
| `specialties` | `TopicId[]` from the Conditions list | Yes, as plain topic labels | Yes: **evidence tier 1, declared fit** |
| `availability` | `AvailabilityWindow[]` | Yes | Yes |
| `openings` **new** | `{ inDays: number; time: "HH:MM" }[]` or `{ next: "sat" | "sun"; time }`, relative to today so the demo never goes stale | Yes, as real-looking times | Yes: only clinicians with an opening count as a strong match |
| `bio` | one or two first-person sentences | Yes, labeled as written by the clinician | No |
| `experience` | `{ similarPatients: number; illustrative: true }`, optional | Yes, labeled "Illustrative" | **Evidence tier 2** |
| `outcomes` | `{ measure: string; cohortSize: number; improvedShare: number; illustrative: true }`, optional | Only if `cohortSize >= 30`, labeled "Illustrative" | **Evidence tier 3** |

Rules I propose for slice 5:

- A reason shows only the highest tier its data supports, and never claims more.
- Tier 3 needs a cohort of at least 30 and one plain measure: "said they felt better after 12 weeks (self-reported)".
- No diagnosis words anywhere: specialties use the plain topic labels from Conditions.
- `improvedShare` is stored as a fraction and shown as "about 7 in 10", never as a precise percentage.

## The 12 sample clinicians

Topic ids: `low_mood`, `worry`, `mood_swings`, `focus`, `sleep`, `stress`, `past_events`,
`relationships`, `grief`, `substances`, `eating`, `unwanted_thoughts`.
Availability: Mo = weekday mornings, Af = weekday afternoons, Ev = weekday evenings, We = weekends.

| # | Name | Credential | Gender | Lang | Specialties | Avail. | Openings | Tier 2 (similar patients) | Tier 3 (cohort, felt better) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Dana Whitfield (she/her) | Psychiatric nurse practitioner | woman | en | low_mood, worry, sleep | Mo, Af | +2d 09:00, +3d 14:00 | 180 | 64, 0.71 |
| 2 | Marco Reyes (he/him) | Psychiatrist | man | en, es | low_mood, mood_swings, unwanted_thoughts | Af, Ev | +4d 17:30 | 240 | 88, 0.68 |
| 3 | Priya Raman (she/her) | Psychiatrist | woman | en | focus, worry, stress | Mo | +1d 08:30, +6d 10:00 | 150 | none |
| 4 | Sam Okafor (they/them) | Psychiatric nurse practitioner | nonbinary | en | past_events, worry, relationships | Ev, We | +2d 19:00, next Sat 11:00 | 95 | none |
| 5 | Lucía Herrera (she/her) | Psychiatric nurse practitioner | woman | en, es | low_mood, grief, stress | Af, Ev | +3d 16:00 | 120 | 41, 0.73 |
| 6 | James Thornton (he/him) | Psychiatrist | man | en | substances, mood_swings, sleep | Mo, Af | +7d 09:30 | 300 | 112, 0.62 |
| 7 | Grace Liu (she/her) | Psychiatric nurse practitioner | woman | en | eating, worry, unwanted_thoughts | Af | none in the next 14 days | 60 | none |
| 8 | Andrés Molina (he/him) | Psychiatric nurse practitioner | man | en, es | focus, stress, sleep | Ev, We | +1d 18:00, next Sun 10:00 | 75 | none |
| 9 | Keisha Brooks (she/her) | Psychiatrist | woman | en | past_events, low_mood, relationships | Mo, Ev | +5d 07:30 | 210 | 53, 0.70 |
| 10 | Riley Novak (they/them) | Psychiatric nurse practitioner | nonbinary | en | mood_swings, focus, eating | Af, We | +3d 13:00 | 40 | none |
| 11 | Elena Vasquez (she/her) | Psychiatrist | woman | en, es | grief, relationships, worry | Mo, Af | +9d 11:00 | 160 | 22, 0.77 (cohort too small: tier 3 not shown) |
| 12 | Tom Becker (he/him) | Psychiatric nurse practitioner | man | en | substances, stress, low_mood | Ev | +2d 20:00 | 110 | none |

Sample bios (one per clinician, first person, plain): e.g. #1 "I help people find steadier
days, especially when sleep and worry feed each other." I'll write all twelve in the same voice
once you approve the table.

## What this set covers

- **Every topic** has at least two clinicians.
- **Spanish:** 4 clinicians (#2, #5, #8, #11).
- **Gender:** 6 women, 4 men, 2 nonbinary.
- **Times:** weekday mornings 5, afternoons 7, evenings 6, weekends 3.
- **Evidence tiers:** all 12 have tier 1; 12 have tier 2; 5 qualify for tier 3, and #11 shows the
  "cohort too small" rule in action.
- **Edge cases for testing:**
  - #7 has no openings, so it can never be a strong match.
  - Spanish + eating + weekends matches nobody, which shows the no-strong-match screen.
  - #3 is mornings only, for someone who picks only evenings.

## Questions for you

1. **Credentials:** I used "Psychiatrist" and "Psychiatric nurse practitioner". Does Legion also
   have therapists or other clinician types, and how should they be named?
2. **Names:** realistic made-up names (above) or obviously fake ones like "Sample Clinician A"?
   Realistic reads better; obviously fake can't be mistaken for real people.
3. **Photos:** initials avatars only (my recommendation), or generated illustrations?
4. **Tier 3 measure:** is "said they felt better after 12 weeks (self-reported)" acceptable as
   the one illustrative measure?
5. **Gender:** shown on the card, or only used for matching (my proposal)?
6. **How many matches to show:** I propose 3 strong matches, plus "See all options".
