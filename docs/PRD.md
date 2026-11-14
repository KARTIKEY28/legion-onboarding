# Legion Onboarding Rebuild: PRD (current)

Author: Kartikey Jajoo. Status: v1, revised after Legion's answers on test payment, post-payment steps and slot holds, and after the multi-state, insurance-discovery and resume work.

The visual system (tokens, colour meanings, shape, type and the ten UX rules) is [docs/DESIGN.md](DESIGN.md).

## Summary

Legion's onboarding loses 76% of starters before the payment page, and most of that loss sits in two places, the fit check and provider selection, with a smaller third cliff at account creation. This PRD proposes a rebuild of the whole journey, from the first screen through the first completed visit, that keeps what already works and replaces those two cliffs with a calmer, more personal flow.

**The bet:** make getting started feel like being heard, not being screened, and use AI to make that personal. AI reflects what the patient says once (as the Match page headline, not between steps), explains why each clinician fits, and puts cost and terms in the patient's own plan terms.

**In scope now:** the whole journey, including the post-payment patient experience (booking confirmed through the day of the visit), designed by me and labelled "Design proposal, not Legion's current experience" on every post-payment screen. **Not built:** real integrations (insurance, identity, records, e-prescribing are all simulated), a real scheduling backend, and clinical validation.

## Problem and evidence

PostHog onboarding funnel, 30 days to Aug 29, 2026, ordered session reach. 1,403 of 5,898 sessions reach payment (23.8%).

| Step | Sessions | Note |
| --- | --- | --- |
| Start | 5,898 | |
| Fit check | 5,490 | |
| Conditions | 3,578 | 1,912 lost at the fit check (first cliff). Logged under Conditions, but it happens on the fit check page |
| Insurance | 3,338 | |
| Needs | 3,095 | |
| Match page | 3,013 | |
| Provider selected | 1,909 | 1,104 lost at provider choice (second cliff) |
| Reservation created | 1,764 | |
| Patient details | 1,763 | |
| Account created | 1,403 | 360 lost at account creation (third, smaller cliff) |
| Payment page | 1,403 | |

Three steps explain most of the loss: the fit check, provider selection, and account creation. The first two are where the experience asks the most of a patient who has not yet been shown any value.

**What the data cannot show:**

- Why people leave. The funnel shows where, and the cause at each cliff is a hypothesis.
- Whether the fit check losses are people who are ineligible or people who hesitate, because there is no fit submit event.
- Why 145 sessions picked a provider but never created a reservation.
- Whether the 10 minute countdown changes behavior, since Legion confirmed it runs only in the browser and holds nothing.
- Anything after the payment page, so the first completed visit cannot yet be measured.

**Data vintage.** This analysis is the PostHog funnel for the 30 days to Aug 29, 2026. Since then Legion has shipped an onboarding redesign, and its live flow already reflects three recommendations here: a **location question first** (Texas / Utah / neither), a **waitlist** for patients outside both states, and **sourced outcome stats on the first screen**. That is corroboration, not a reason to drop them: this rebuild keeps all three and goes further on the two cliffs (match and account) their redesign does not directly address.

## Goals, metric and scope

**North star:** the share of starters who complete a first visit within 30 days, reported with the **weekly count** beside it (the rate shows health, the count shows volume and catches a rate that improves only because fewer people start). The assignment defines onboarding as ending at the completed first visit, not at booking. That outcome is **not measurable with today's instrumentation** — there is no payment-success, visit-booked or visit-completed event — so until those events exist, **reaching the payment step is the v1 proxy**. The rebuild adds the missing events, so the real outcome becomes measurable as soon as it runs. No numeric targets are set here, because targets need Legion's input.

| Item | Decision |
| --- | --- |
| Primary outcome (north star) | Share of starters who complete a first visit within 30 days, with the weekly count beside it |
| v1 proxy metric | Share of starts that reach/complete the payment step. Today 23.8% reach the payment page |
| Supporting metrics | Start-to-needs completion (52.5% today) with the exclusion share beside it, provider-selection rate (63.4% today), account-creation rate (79.6% today) |
| Guardrails | Every screened-out patient gets a next step, crisis resources always reachable, time to complete, rate of slots found taken at booking |
| Scope | The whole journey, first screen through the first completed visit (post-payment screens labelled as the author's design proposal), for prospective adult patients in Texas or Utah, responsive web. The prototype walks a Texas persona |
| Non-goals | Real insurance / identity / records / e-prescribing integrations (all simulated), a real scheduling backend, clinical validation, AI triage or severity scoring |
| Constraints | Texas and Utah, adults, no Medicare or Medicaid, virtual only, about 107 providers, no server-side slot hold (the browser-only countdown is dropped). **Multi-state means** per-state clinician licensing (a clinician only matches in states they are licensed in), per-state time zones (Central for TX, Mountain for UT), and state-specific payers; the prototype models all three |

## Design principles

Seven principles guide every screen.

| # | Principle | In practice | Rules out |
| --- | --- | --- | --- |
| 1 | Safety is a constraint, not a funnel step | Crisis help always reachable and never penalized. Anyone who cannot proceed, for eligibility or availability, gets a real next step | Dead ends, celebratory tone after sensitive questions |
| 2 | Every ask earns its place | Ask only what the next step needs, say why, never ask twice | Duplicate questions, questions with no visible use |
| 3 | Show value before commitment | Cost, a clinician and real availability appear before account, card or hold | Locking a slot before the patient knows the terms |
| 4 | Be honest about effort, time and money | One progress indicator, true time estimate, charges and cancellation terms shown before they matter | Urgency timers used as pressure, hidden fees |
| 5 | Warm and forgiving | Plain language, an escape on every question, a default when unsure, a calm look | Jargon, gotcha wording, retail styling |
| 6 | AI removes work or adds explanation, never a gate | AI reflects answers, explains why a clinician fits and phrases real numbers. It does not silently screen, diagnose or decide | AI as an invisible eligibility filter |
| 7 | Measure the journey to the visit | One clean event per decision, success defined as a completed first visit | Page reached as a proxy for success |

## Proposed journey (draft, not yet agreed)

Ten steps from start to payment, then the post-payment screens. The reflect-back line (AI) appears **once, as the Match page headline**, not between steps. Crisis help is reachable from every screen and never blocks progress.

1. **Start:** set expectations on effort and time up front, with the price framing and sourced context.
2. **About you:** location (Texas / Utah / neither), age and Medicare or Medicaid coverage, asked together and gently.
3. **Conditions:** structured choices, or the patient's own words.
4. **Safety:** crisis and hospitalization questions. These stay as dedicated screens.
5. **Insurance:** a discovery-first ladder (find coverage from name + date of birth, confirm the plan, then estimate), or self pay.
6. **Needs:** care preferences (language, clinician gender) that feed the match. **It no longer asks when the patient can meet — time of day is a filter on the Match page.**
7. **Match (AI):** the reflect-back headline, an explained match with a time-of-day filter, then select a time and confirm inline.
8. **Cost and terms (AI):** plain words, fixed numbers.
9. **Account:** patient details and sign up.
10. **Payment:** card on file.

After payment (not built, drawn dashed): the sequence Legion described, below.

How the draft answers each cliff:

- **Fit check:** Texas, age and Medicare or Medicaid coverage are asked together inside "About you", so a patient who is not eligible finds out in the first steps, not after describing their conditions. No screening gate appears as its own screen. The dedicated safety and hospitalization questions stay.
- **Provider selection:** the match page explains why each clinician fits, so choosing feels like being heard rather than comparing profiles.
- **Account creation:** the cost and terms summary comes first, so the patient knows what the visit costs before being asked to sign up.

**After payment, as Legion described it.** The intake is booked in the EHR with an automatic video link. Intake forms follow, including a photo ID upload, and they do not block the visit. Reminders go out 48 hours, 24 hours and 1 hour before, and their content changes with whether payment and forms are complete. Condition-specific pre-visit emails go out, and outside records are requested through Metriport. Insurance is verified automatically and checked again within 72 hours of the visit, with manual follow up if it fails. The admin team then prepares the chart, and the patient has the video visit. There is no automated identity verification today.

**Hold and account.** Legion confirmed that the 10 minute countdown on the payment page runs only in the browser. Nothing on the server holds the slot, and other patients can still book it, so a patient can reach payment and find the slot gone. The journey therefore treats the reservation as a selection, not a hold, and checks availability at the moment of booking. **The countdown is dropped, not an open decision:** a timer that protects nothing is pressure, which Principle 4 rules out, so it is gone. Account creation stays lightweight, with no email verification before payment. In the post-payment build, a verification email goes out right after payment succeeds, and if the email already has an account the patient is offered a sign-in link instead of a duplicate account.

**No strong match.** When no clinician fits well with real availability, the match screen shows the best available options with an honest label, widens the filters, and offers a human help option and a notify-me path. Notify-me asks for an email only and states what it will be used for. If the patient later creates an account, that email is pre-filled, so nobody is asked twice.

## AI in the experience

AI in v1 serves one purpose: making care feel personal at the moments a patient is deciding or hesitating. It phrases and explains, but every fact (numbers, eligibility, clinical content) comes from a fixed source, never from free-form generation.

| # | Feature | What the patient sees | Facts come from | Safeguard | Build priority |
| --- | --- | --- | --- | --- | --- |
| 1 | Personalized, explained match | Different top clinicians per patient, each with two or three reasons | Clinician profiles, plus labeled illustrative history | Evidence tiers below, never claim more than the data supports | Headline |
| 2 | Reflect-back reassurance | The Match page headline, in the patient's own terms, shown once | The patient's actual answers | Constrained to what they said, no invented details | Yes |
| 3 | Personal cost and terms summary | Plan-specific cost and cancellation terms in plain words | Fixed plan and price values | AI phrases the numbers and never creates them | Short |
| 4 | Safety-aware free text | Crisis language in free text leads to gentle, immediate help | The text the patient writes | A local keyword and pattern check runs first and always routes to help, so safety never depends on a model call. The model can only escalate: the crisis panel expands and the next step stays available. Nothing blocks or shames. Not clinically validated | Brief |
| 5 | Plain language to topics | A patient's own words map to topic choices | The patient's words | Topics only, never a diagnosis | Mention |

**Evidence tiers for the match.** Each recommendation shows only the highest tier the data supports:

1. **Declared fit:** the clinician's stated specialties overlap with what the patient said. Always available.
2. **Experience:** the clinician has seen a stated number of patients with similar conditions. Needs patient-count data.
3. **Outcomes:** results for similar patients under one defined measure, with a minimum cohort size. Only if the data is strong enough.

For the prototype, tiers 2 and 3 use clearly labeled illustrative data. A fabricated statistic presented as real is not acceptable.

**Free text and data.** Identifiers (names, emails, phone numbers, dates of birth) are removed before any model call, and free text is kept out of analytics events. The remaining text is still health information, so it is not called anonymized, and the prototype uses synthetic personas only. A production version needs a business associate agreement with the model vendor.

**Cost wording.** Without insurance, the visit is $250 for intake and $150 for follow up. With insurance, the patient's cost is confirmed after verification, which today happens after payment. The summary states the card terms and cancellation fees, and never describes the self pay price as a ceiling.

**Now built (post-payment and resume):** the pre-visit summary ("Your story, ready for your clinician"), drafted from the patient's own answers so they tell their story once, and a resume flow that offers to continue or start fresh after a break. Funnel analytics with AI is a product-side use and is deliberately left out of this UX scope.

## Integration architecture

Legion named the data sources available for the rebuild. The job of onboarding is to **ask the patient less** by letting these sources do the work, while keeping every clinical judgement human.

| Source | What it does | What it removes for the patient | Step | Cliff it targets | Status |
| --- | --- | --- | --- | --- | --- |
| Sohar discovery | Finds coverage from name + date of birth | Typing a payer, member ID and group ID | Insurance | Fit check / drop-off before value | Live at Legion |
| Sohar eligibility | Real-time benefits (copay, deductible, carve-outs) | Not knowing the cost until after paying | Insurance / Cost | Account (cost clarity before sign-up) | Live at Legion |
| Verified | One-click signup with demographic autofill + discovery + eligibility | The whole account form | Account | Account (20% cliff) | Available, not live |
| Persona | Identity verification | A manual ID step | After booking | — (adds friction; see below) | Available, not live |
| Metriport | HIE-connected longitudinal records | Repeating medical history | After booking, consented | — (post-visit value) | Live at Legion |
| DoseSpot | E-prescribing | Clinician routes the script directly | After the visit | — (post-visit) | Live at Legion |
| Surescripts / DrFirst | Medication-history (fill records) | Listing medications from memory | Before the visit, consented | — (prep quality) | Proposed by me |

**What I built.** Sohar-style **discovery and eligibility**, as a simulated ladder on the Insurance step. It came first because it sits on the two most expensive moments: it removes the typing that makes insurance a wall, and it turns "your cost is confirmed after you pay" into an estimate *before* the account step — the clarity the account cliff is starved of. The mock responses are shaped like Sohar's documented discovery and eligibility payloads, so the real swap is a wiring change, not a redesign.

**What I would build next.** **Verified one-click signup at the Account step**, targeting the 20% account cliff directly: one tap brings demographics, discovery and eligibility together, collapsing the form. I chose **not** to build a second simulated vendor, because one integration demonstrated well beats two half-built — a convincing discovery ladder shows the pattern (propose, confirm, estimate) better than two shallow mocks.

**What I deliberately did not do.**
- **Metriport record pull before someone is a patient** — there is no consent basis and no clinical need before the visit, and behavioral-health records are poorly covered in HIE networks anyway, so it would add legal risk for little value.
- **Identity verification (Persona) before booking** — friction ahead of value, placed exactly at the step that already loses 37%. It matters more once **controlled substances** are involved (ADHD is Legion's lead condition, so this will come up), so it belongs after booking, before the first prescription. I flag the regulatory detail (EPCS / state rules on verifying identity before prescribing a controlled substance) as something to **confirm**, not a claim I'm asserting.
- **AI triage or severity scoring** — it cannot be validated in a prototype, and a wrong score in psychiatry causes real harm. Safety stays a conservative local check that only ever *escalates* to help.

## What runs itself, what the patient confirms, what stays human

| Tier | Meaning | Examples |
| --- | --- | --- |
| **Autonomous** (no patient action) | Rules and APIs run it; the patient does nothing | Eligibility re-check before the visit, record retrieval once consented, EHR booking and video link, reminder timing and variant selection, payment capture after the visit, prescription routing |
| **Assisted** (system proposes, patient confirms or edits) | The system does the work and shows its result for a one-tap confirm or edit | Coverage discovery result, demographic autofill, free-text → topics, the reflect-back line, match explanations, cost wording, the pre-visit summary, prefilled intake |
| **Human only** | Never automated | Diagnosis, prescribing, crisis response, insurance appeals when verification fails, chart review before the visit, deciding a patient is not clinically appropriate |

Two rules hold this together:

1. **Most of the autonomous tier is rules and APIs, not AI.** AI-native means asking the patient *less*, not putting a model in every path. Booking, re-checks, reminders and routing are deterministic; a model only phrases and explains in the assisted tier.
2. **Nothing moves from assisted to autonomous silently.** Every retrieved or model-phrased value carries a **visible source** ("found from your name and date of birth", "drafted from your answers"), and a confirm or edit is always one tap away.

## Measurement plan

The goal is to measure the whole journey to the first completed visit, with one clean event per real step. The current telemetry mixes canonical events with stray cross-route events (about 0.54% of starts), which do not change the funnel math but should not be carried into the rebuild.

**Funnel in the rebuild.** Every step fires one start event and one complete event, each with a session id, step name and device type:

| Step | Event pair | Why it matters |
| --- | --- | --- |
| Start | onboarding.started | Denominator for everything |
| About you and eligibility | about.viewed, about.submitted, eligibility.checked | Replaces the old fit check screen. eligibility.checked carries a criterion (texas, age, coverage) and a result, and is counted by session, so the largest cliff can be split into leave versus fail |
| Conditions | conditions.viewed, conditions.submitted | Number selected, whether free text was used, "not sure" and skipped. Never the topics or the text |
| Safety | safety.viewed, safety.submitted, safety.escalated | The dedicated crisis and hospitalization screen. safety.escalated fires when the crisis panel expands from an answer or free text, with the source (local check or model) and the step. Never the answers |
| Insurance | insurance.viewed, insurance.submitted | The path only: insured, self_pay or not_sure. Never plan names, IDs or free text. eligibility.checked fires again here (step insurance) when "not sure" about Medicare or Medicaid is confirmed |
| Needs | needs.viewed, needs.submitted | Which preferences were answered, never their values |
| Match | match.viewed, provider.selected | match.viewed carries the match count and whether the no-strong-match state was shown. provider.selected carries from (top_match or full_list), rank and evidence tier, never the clinician's name |
| Cost and terms | cost.viewed, cost_summary.shown, cost_summary.validation_failed | cost.viewed carries the insurance path. cost_summary.shown carries the source (model or template). validation_failed carries why a model summary was rejected (a number not in the fixed set, a missing fact, ceiling wording, or format) |
| Account | account.viewed, account.created | Third cliff |
| Payment | payment.viewed, payment.succeeded | Today we only see the page view |
| Visit | visit.booked, visit.completed | Needed to measure the actual outcome |
| Match fallback | match.none_selected, match.full_list_opened | Stand-ins for clinician fit until visits can be measured |
| Hold | reservation.requested, reservation.failed, slot.unavailable_at_booking, countdown.expired (only if the countdown is kept) | Failure carries a reason. slot.unavailable_at_booking and expiry carry the step the patient was on |
| Exclusion | exclusion.next_step_shown | Makes the guardrail "every excluded patient gets a next step" measurable |
| Crisis help | safety.escalated, crisis.panel_opened (reserved for a patient-opened help button) | safety.escalated makes the guardrail "crisis routing reached" measurable |
| AI shown | reflect_back.shown, cost_summary.shown, ai.explanation_shown | reflect_back.shown and cost_summary.shown carry the source (model or template). ai.explanation_shown carries the kind (match reason). A drop or continue can be tied to what was shown |

**Events missing today, now added by the rebuild:** an eligibility result per criterion, payment success, visit booked and visit completed. Without them the primary outcome (first completed visit) could only be proxied by reaching payment; the rebuild fires `payment.succeeded`, `visit.booked` and `visit.completed`, so the north star becomes measurable the moment it runs.

**Existing signal we can build on.** Legion's current match page already emits `portal.reschedule_preferences.saved`. Patients are *already* expressing scheduling preferences on the match page, which supports moving the "when can you meet?" question out of Needs and onto Match as a time-of-day filter — the preference lives where the times are shown, not a step earlier.

**Insurance-discovery events (Part 3):** `insurance.discovery_offered`, `insurance.discovery_consented`, `insurance.discovery_result` (one_match / multi_match / no_match / failed), `insurance.plan_confirmed`, `insurance.plan_rejected`, `insurance.rung_reached` (1–4), `insurance.cost_result` (copay / deductible / carve_out / excluded / not_covered / failed). **Resume events:** `resume.offered`, `resume.continued`, `resume.started_fresh`. None carry a name, date of birth, plan name or amount tied to identity.

**What to track alongside:**

- Where people leave, with the last step viewed and the time spent on it
- Whether a reflect-back line, a match explanation or a cost summary was shown before a drop or a continue
- reservation.requested and reservation.failed with a reason, and slot.unavailable_at_booking, so we can see how often the slot is gone by payment. If the countdown is kept, countdown.expired with the step the patient was on
- Device type and entry source, so the 29% of sessions with UTM parameters can be segmented

Report the exclusion share (patients who correctly exit as ineligible) beside start-to-needs completion. Asking about coverage inside About you moves correct exclusions into the first steps, which would otherwise make conversion look worse while the experience improves. Count eligibility.checked by session and criterion, and fire exclusion.next_step_shown whenever an excluded patient is shown a next step, so the guardrail can be measured.

**Experiments (for a live product, described here but not run in the prototype):**

| Test | Change | Primary read |
| --- | --- | --- |
| Fit check | Folded into natural questions versus a dedicated screen | Start-to-needs completion, with the exclusion share reported beside it |
| Match | Personalized explained match versus a plain list | Provider selected rate |
| Account | Cost and terms summary shown before the account step versus today's order | Account created rate |

**Sample size.** At 80% power, 5% significance and a 3 point absolute change, each arm needs about 4,330 sessions for start-to-needs completion (about 1.5 months at current volume), 3,970 for provider selection (about 2.6 months) and 2,670 for account creation (about 3.0 months). That is why these are described as hypotheses, and why the prototype claims no lifts.

Guardrails stay constant across tests: crisis routing reached, match rejection (match.none_selected and match.full_list_opened, as stand-ins for clinician fit until visits can be measured), the rate of slots found taken at booking, and complaints. A test that lifts payment but hurts any guardrail does not ship.

## Assumptions and open questions

| Question | Working assumption | Why it matters | Who can answer |
| --- | --- | --- | --- |
| How long is the slot hold, and when does the timer start? (answered by Legion) | The countdown is 10 minutes and runs only in the browser. Nothing on the server holds the slot, and other patients can still book it, so the **countdown is dropped** (not an open decision) and availability is checked at booking | A countdown that protects nothing is false urgency, which Principle 4 rules out | Legion team |
| What happens after payment? | Answered by Legion: see the post-payment sequence above | Onboarding ends at the first completed visit, so this is the back half of the journey | Legion team |
| Can we get a test card? | Answered by Legion: there is no test-mode link, so stop at their payment page. Saving a card or insurance there books a real appointment, and the 48 hour cancellation policy can trigger a $100 fee. The prototype uses Stripe's standard test card (4242 4242 4242 4242) | Lets us verify the payment page and the first steps after it | Legion team |
| Why did 145 sessions pick a provider but create no reservation? | Slot unavailable or a technical error. Unknown | A hidden leak right before the account cliff | Legion team, event logs |
| What is the split between mobile and desktop? | Mostly mobile, so the prototype is designed mobile first | Changes layout and the cost of each extra question | Analytics |
| What happens on the "None" insurance path? | Self pay at the cash price ($250 intake, $150 follow up) | Affects how the cost summary is phrased | Legion team |
| Is there clinician and outcome data we can use? | Not available. The prototype uses declared fit, plus clearly labeled illustrative data | Decides whether evidence tiers 2 and 3 can ever be real | Legion team |
| Why do people leave at the fit check? | Eligibility mismatch (not Texas, under 18, Medicare or Medicaid) plus hesitation. Unknown mix | The largest cliff, and the fix depends on the mix | Needs an eligibility event and an exit survey |
| When is the reservation created, and what does it protect? | Answered by Legion: a reservation is created at provider selection, but it does not block other patients. The prototype checks availability at booking | Principle 3 puts terms before commitment, and availability must be checked at booking | Legion team |
| Can we show an insured cost before payment? | **Resolved (was "can verification run before payment?").** Sohar already supports real-time eligibility and is in Legion's stack, so we are not *moving* verification — we add an **early estimate** before payment and keep the existing **confirmation inside 72 hours**, because a first check is not reliable enough to be final and a carve-out can change the real number. Every estimate carries its confirm-before-your-visit promise in the same sentence | Insured patients currently see no cost before paying; an estimate with an honest confirmation is the win | Legion team |
| Does Legion's Sohar contract cover discovery volume? | **Open.** Eligibility is live; insurance *discovery* (finding coverage from name + date of birth) adds per-lookup volume. Discovery-first is the biggest friction win, but its cost depends on contract terms | Decides whether rung 1 (discovery) can be the default for everyone or only a subset | Legion team, Sohar contract |

**Not assumed:** that any change here will lift conversion. The data shows where people leave, not why. Every journey change is a hypothesis to test.

## Risks and safeguards

| Risk | What could go wrong | Safeguard |
| --- | --- | --- |
| Safety | A patient in crisis is slowed down, or the AI misreads crisis language | Crisis resources are reachable from every screen and never block progress. Free text screening is conservative: any doubt routes to help. Not clinically validated, and shown as a prototype only |
| Misleading claims | A match explanation implies outcomes the data does not support | Evidence tiers show only what the data supports. Prototype statistics are labeled illustrative. No diagnosis, ever |
| AI invents facts | Prices, eligibility or terms are phrased wrongly | AI only phrases values that come from fixed sources. Numbers are never generated |
| Slot capacity | Personalized matching sends many patients to the same few clinicians | Show a small set of strong matches with real availability, and treat load balancing as an open question |
| Sensitive data | Health answers and free text are stored or sent where they should not be | Collect the minimum, keep free text out of analytics events, remove identifiers before any model call, treat the remaining text as health information, and use synthetic personas only in the prototype |
| Fewer questions, worse fit | Folding the fit check into natural questions lets an ineligible patient through | Keep dedicated safety and hospitalization screens. Check eligibility the moment the answer arrives |
| Scope creep | The prototype over-reaches (e.g. real integrations, clinical logic) | Integrations are simulated with Sohar-shaped mocks; the post-payment screens are labelled the author's design proposal; no diagnosis, prescribing or triage is attempted |
| Misattributed gains | A lift is credited to AI when the layout changed | Test one change at a time and keep the guardrails fixed |
| No strong match | With about 107 providers in Texas, some patients have no strong match with real availability | A no-strong-match state with honest labels, wider filters, a human help option and notify-me. Track match.none_selected and match.full_list_opened |
| Slot taken before booking | Nothing holds the slot, so another patient can book it before this one pays | Check availability at booking, show the next available times if the slot is gone, and do not use a countdown as pressure. Track reservation.failed with a reason |
| Live booking | Saving a card or insurance on Legion's live payment page books a real appointment, and the 48 hour cancellation policy can trigger a $100 fee | Stop before saving anything on the live page. The prototype uses Stripe's standard test card and never touches the live flow. This goes in CLAUDE.md |

## Build plan

**Build in Claude Code, in thin vertical slices.** Each slice is deployable on its own, so there is always a working prototype.

1. **Foundations:** repository, CLAUDE.md (principles, scope, the facts-from-fixed-sources rule), deploy pipeline, and the event schema from the measurement plan.
2. **Start and About you:** the first screens, with eligibility handled gently and crisis help always reachable.
3. **Conditions and needs:** structured choices plus optional free text, with reflect-back lines and the safety-aware text check.
4. **Insurance:** including the "None" path and the plain-language cost summary.
5. **Match:** the personalized, explained match with evidence tiers on illustrative data.
6. **Account and payment:** the payment page using Stripe's standard test card (4242 4242 4242 4242), and the countdown only if the open decision keeps it.
7. **After payment:** screens for the post-payment patient experience, designed by the author and labeled "Design proposal, not Legion's current experience". Legion asked to see this as the author's own design.
8. **Polish:** warm visual language, mobile first, accessibility, and instrumentation checks.

**Scope change (Oct 27, 2026).** Legion asked to see the post-payment patient experience, designed by the author and labeled as the author's. It moves from "shown as Legion's sequence, not built" to its own slice 7, and Polish becomes slice 8. Everything else in this PRD about post-payment (the sequence Legion described) remains the reference for that design.

**AI history.** The complete, unedited history of every AI interaction is exported and submitted as is. The only redactions are credentials, secrets and unrelated personal information, each labeled where it occurs.

**Deliverables:** deployed prototype, repository with an open pull request, and the AI history.
