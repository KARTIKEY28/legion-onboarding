# Legion Onboarding Rebuild: PRD (current)

Author: Kartikey Jajoo. Status: v1, revised after Legion's answers on test payment, post-payment steps and slot holds.

## Summary

Legion's onboarding loses 76% of starters before the payment page, and most of that loss sits in two places, the fit check and provider selection, with a smaller third cliff at account creation. This PRD proposes a v1 rebuild, from the first screen to the payment page, that keeps what already works and replaces those two cliffs with a calmer, more personal flow.

**The bet:** make getting started feel like being heard, not being screened, and use AI to make that personal. AI reflects what the patient says, explains why each clinician fits, and puts cost and terms in the patient's own plan terms.

**Not in the current build:** everything after the payment page (insurance verification, intake, the visit), real integrations, and clinical validation. Post-payment is part of the product and will be built later, so for now it appears only as the sequence Legion described, drawn dashed.

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

## Goals, metric and scope

The true goal is a completed first visit, which today's telemetry cannot see. v1 is therefore judged on a proxy: how many starters reach and complete the payment step. No numeric targets are set here, because targets need Legion's input.

| Item | Decision |
| --- | --- |
| Primary outcome | Completed first visit (not measurable today) |
| v1 proxy metric | Share of starts that complete payment setup. Today 23.8% reach the payment page |
| Supporting metrics | Start-to-needs completion (52.5% today) with the exclusion share beside it, provider-selection rate (63.4% today), account-creation rate (79.6% today) |
| Guardrails | Every screened-out patient gets a next step, crisis resources always reachable, time to complete, rate of slots found taken at booking |
| Scope | Current build: first screen to payment page, for a prospective patient in Texas, responsive web |
| Non-goals | Post-payment build (planned for later, not this build), real insurance or identity integrations, clinical validation, a real scheduling backend |
| Constraints | Texas only, adults, no Medicare or Medicaid, virtual only, about 107 providers, no server-side slot hold (the 10 minute countdown is browser-only) |

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

Ten steps from start to payment. A reflect-back line (AI) appears between the asking steps. Crisis help is reachable from every screen and never blocks progress.

1. **Start:** set expectations on effort and time up front.
2. **About you:** Texas, age and Medicare or Medicaid coverage, asked together and gently.
3. **Conditions:** structured choices, or the patient's own words.
4. **Safety:** crisis and hospitalization questions. These stay as dedicated screens.
5. **Insurance:** plan details, or "none".
6. **Needs:** preferences that feed the match.
7. **Match (AI):** explained match, then choose a clinician.
8. **Cost and terms (AI):** plain words, fixed numbers.
9. **Account:** patient details and sign up.
10. **Payment:** card on file.

After payment (not built, drawn dashed): the sequence Legion described, below.

How the draft answers each cliff:

- **Fit check:** Texas, age and Medicare or Medicaid coverage are asked together inside "About you", so a patient who is not eligible finds out in the first steps, not after describing their conditions. No screening gate appears as its own screen. The dedicated safety and hospitalization questions stay.
- **Provider selection:** the match page explains why each clinician fits, so choosing feels like being heard rather than comparing profiles.
- **Account creation:** the cost and terms summary comes first, so the patient knows what the visit costs before being asked to sign up.

**After payment, as Legion described it.** The intake is booked in the EHR with an automatic video link. Intake forms follow, including a photo ID upload, and they do not block the visit. Reminders go out 48 hours, 24 hours and 1 hour before, and their content changes with whether payment and forms are complete. Condition-specific pre-visit emails go out, and outside records are requested through Metriport. Insurance is verified automatically and checked again within 72 hours of the visit, with manual follow up if it fails. The admin team then prepares the chart, and the patient has the video visit. There is no automated identity verification today.

**Hold and account.** Legion confirmed that the 10 minute countdown on the payment page runs only in the browser. Nothing on the server holds the slot, and other patients can still book it, so a patient can reach payment and find the slot gone. The draft journey therefore treats the reservation as a selection, not a hold, and checks availability at the moment of booking. Whether to keep the countdown at all is an open decision, because a timer that protects nothing is pressure, which Principle 4 rules out. Account creation stays lightweight, with no email verification before payment. In the post-payment build, a verification email goes out right after payment succeeds, and if the email already has an account the patient is offered a sign-in link instead of a duplicate account.

**No strong match.** When no clinician fits well with real availability, the match screen shows the best available options with an honest label, widens the filters, and offers a human help option and a notify-me path. Notify-me asks for an email only and states what it will be used for. If the patient later creates an account, that email is pre-filled, so nobody is asked twice.

## AI in the experience

AI in v1 serves one purpose: making care feel personal at the moments a patient is deciding or hesitating. It phrases and explains, but every fact (numbers, eligibility, clinical content) comes from a fixed source, never from free-form generation.

| # | Feature | What the patient sees | Facts come from | Safeguard | Build priority |
| --- | --- | --- | --- | --- | --- |
| 1 | Personalized, explained match | Different top clinicians per patient, each with two or three reasons | Clinician profiles, plus labeled illustrative history | Evidence tiers below, never claim more than the data supports | Headline |
| 2 | Reflect-back reassurance | A short line in the patient's own terms between steps | The patient's actual answers | Constrained to what they said, no invented details | Yes |
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

**Vision only, not built:** a pre-visit summary so the patient tells their story once (past the payment page), and a gentle resume nudge for people who leave. Funnel analytics with AI is a product-side use and is deliberately left out of this UX scope.

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

**Events missing today:** an eligibility result per criterion, payment success, visit booked and visit completed. Without them the primary outcome (first completed visit) cannot be measured, only the proxy (reaching payment).

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
| How long is the slot hold, and when does the timer start? (answered by Legion) | The countdown is 10 minutes and runs only in the browser. Nothing on the server holds the slot, and other patients can still book it | A countdown that protects nothing is false urgency, which Principle 4 rules out | Legion team |
| What happens after payment? | Answered by Legion: see the post-payment sequence above | Onboarding ends at the first completed visit, so this is the back half of the journey | Legion team |
| Can we get a test card? | Answered by Legion: there is no test-mode link, so stop at their payment page. Saving a card or insurance there books a real appointment, and the 48 hour cancellation policy can trigger a $100 fee. The prototype uses Stripe's standard test card (4242 4242 4242 4242) | Lets us verify the payment page and the first steps after it | Legion team |
| Why did 145 sessions pick a provider but create no reservation? | Slot unavailable or a technical error. Unknown | A hidden leak right before the account cliff | Legion team, event logs |
| What is the split between mobile and desktop? | Mostly mobile, so the prototype is designed mobile first | Changes layout and the cost of each extra question | Analytics |
| What happens on the "None" insurance path? | Self pay at the cash price ($250 intake, $150 follow up) | Affects how the cost summary is phrased | Legion team |
| Is there clinician and outcome data we can use? | Not available. The prototype uses declared fit, plus clearly labeled illustrative data | Decides whether evidence tiers 2 and 3 can ever be real | Legion team |
| Why do people leave at the fit check? | Eligibility mismatch (not Texas, under 18, Medicare or Medicaid) plus hesitation. Unknown mix | The largest cliff, and the fix depends on the mix | Needs an eligibility event and an exit survey |
| When is the reservation created, and what does it protect? | Answered by Legion: a reservation is created at provider selection, but it does not block other patients. The prototype checks availability at booking | Principle 3 puts terms before commitment, and availability must be checked at booking | Legion team |
| What does an insured patient pay? | The copay estimate arrives after payment, so before payment the summary gives the self pay price and says the insured cost is confirmed after verification | Avoids promising a price the insurance check may change | Legion team |

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
| Scope creep | The prototype tries to cover post payment | Stop at the payment page for now. Post payment is planned for a later build and appears only as the sequence Legion described, drawn dashed |
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
