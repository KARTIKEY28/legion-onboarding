# Safety eval: local free-text check

> **This is not clinically validated.** The phrases below are synthetic, written for the prototype,
> and the expected results reflect a design choice (route any doubt to help), not clinical review.
> Before any real launch, the keyword list, the phrases and the response must be reviewed by
> qualified clinicians and Legion's safety team.

## What is being tested

Every free-text field (Conditions "in my own words", Needs "anything else") runs
`localSafetyCheck()` in `src/safety/local.ts` first, in the browser, with no network.

- **Deliberately conservative.** Any doubt routes to help. The check does not try to understand
  negation, so "I'm not suicidal" routes to help on purpose. A false positive shows a gentle panel
  and costs nothing else; a false negative could cost a life.
- **Routing to help never blocks.** The crisis panel expands with 988 and 911, and Continue stays
  available.
- **A model check may run after it and can only escalate.** If the local check finds nothing, the
  model may still expand the panel. If the local check matched, the model's answer is not asked
  for and cannot hide the panel. With the model off, the local check works the same.

## Expected results

"Routes to help" means the crisis panel expands. The unit test `src/safety/safety.test.ts` runs
every phrase below (and an empty string) and fails if any result differs, or if this file is
missing a phrase from `src/safety/eval-cases.ts`.

| # | Kind | Phrase | Expected |
| --- | --- | --- | --- |
| 1 | clear | I've been thinking about killing myself | Routes to help |
| 2 | clear | I want to end my life | Routes to help |
| 3 | clear | Sometimes I feel suicidal | Routes to help |
| 4 | clear | I've been cutting myself again | Routes to help |
| 5 | clear | Everyone would be better off without me | Routes to help |
| 6 | clear | I don't want to be alive anymore | Routes to help |
| 7 | clear | I wish I could not wake up | Routes to help |
| 8 | clear | I have the pills ready | Routes to help |
| 9 | clear | I'm scared I might hurt someone | Routes to help |
| 10 | clear | kms honestly | Routes to help |
| 11 | ambiguous | I can't do this anymore | Routes to help |
| 12 | ambiguous | Some days I just want to disappear | Routes to help |
| 13 | ambiguous | I thought about overdosing once, years ago | Routes to help |
| 14 | ambiguous | There's no point in going on like this | Routes to help |
| 15 | ambiguous | I want to end it all with this job | Routes to help |
| 16 | ambiguous | Tonight I am going to talk to them, I have a plan | Routes to help |
| 17 | ambiguous | I used to self-harm as a teenager | Routes to help |
| 18 | negated | I'm not suicidal, just tired | Routes to help |
| 19 | negated | I would never hurt myself | Routes to help |
| 20 | negated | No thoughts of ending my life | Routes to help |
| 21 | negated | I don't self harm | Routes to help |
| 22 | benign | I've been cutting back on coffee to sleep better | No panel |
| 23 | benign | Work stress is a lot and I'm not sleeping well | No panel |
| 24 | benign | I want to feel more like myself again | No panel |
| 25 | benign | My new job is killing it, but I'm anxious all the time | No panel |
| 26 | benign | I'm dying to find someone who speaks Spanish | No panel |
| 27 | benign | I prefer evening appointments after my kids are asleep | No panel |
| 28 | benign | My mom passed away last year and I miss her | No panel |
| 29 | benign | I'd like a clinician who has worked with veterans | No panel |
| 30 | benign | Trouble focusing at school, grades are slipping | No panel |

## Known limits

- English only. Spanish and other languages are not covered.
- Misspellings beyond simple variants ("kms", "unalive") are not covered.
- Benign phrases that contain a pattern (for example "jump off" in "jump off the train at my stop")
  will show the panel. That is accepted under the conservative design.
- The model check is a second net, not a replacement, and is also not clinically validated.
