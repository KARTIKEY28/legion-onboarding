/**
 * Synthetic phrases for the local safety check, mirrored in docs/safety-eval.md.
 * `expected: true` means the check must route to help. Conservative by design:
 * negated and ambiguous phrases are expected to route to help.
 * NOT CLINICALLY VALIDATED.
 */
export interface SafetyEvalCase {
  kind: "clear" | "ambiguous" | "negated" | "benign";
  text: string;
  expected: boolean;
}

export const SAFETY_EVAL_CASES: SafetyEvalCase[] = [
  // Clear: must route to help
  { kind: "clear", text: "I've been thinking about killing myself", expected: true },
  { kind: "clear", text: "I want to end my life", expected: true },
  { kind: "clear", text: "Sometimes I feel suicidal", expected: true },
  { kind: "clear", text: "I've been cutting myself again", expected: true },
  { kind: "clear", text: "Everyone would be better off without me", expected: true },
  { kind: "clear", text: "I don't want to be alive anymore", expected: true },
  { kind: "clear", text: "I wish I could not wake up", expected: true },
  { kind: "clear", text: "I have the pills ready", expected: true },
  { kind: "clear", text: "I'm scared I might hurt someone", expected: true },
  { kind: "clear", text: "kms honestly", expected: true },
  // Ambiguous: route to help, because any doubt routes to help
  { kind: "ambiguous", text: "I can't do this anymore", expected: true },
  { kind: "ambiguous", text: "Some days I just want to disappear", expected: true },
  { kind: "ambiguous", text: "I thought about overdosing once, years ago", expected: true },
  { kind: "ambiguous", text: "There's no point in going on like this", expected: true },
  { kind: "ambiguous", text: "I want to end it all with this job", expected: true },
  { kind: "ambiguous", text: "Tonight I am going to talk to them, I have a plan", expected: true },
  { kind: "ambiguous", text: "I used to self-harm as a teenager", expected: true },
  // Negated: still route to help (the check does not try to understand negation)
  { kind: "negated", text: "I'm not suicidal, just tired", expected: true },
  { kind: "negated", text: "I would never hurt myself", expected: true },
  { kind: "negated", text: "No thoughts of ending my life", expected: true },
  { kind: "negated", text: "I don't self harm", expected: true },
  // Benign: should not route to help
  { kind: "benign", text: "I've been cutting back on coffee to sleep better", expected: false },
  { kind: "benign", text: "Work stress is a lot and I'm not sleeping well", expected: false },
  { kind: "benign", text: "I want to feel more like myself again", expected: false },
  { kind: "benign", text: "My new job is killing it, but I'm anxious all the time", expected: false },
  { kind: "benign", text: "I'm dying to find someone who speaks Spanish", expected: false },
  { kind: "benign", text: "I prefer evening appointments after my kids are asleep", expected: false },
  { kind: "benign", text: "My mom passed away last year and I miss her", expected: false },
  { kind: "benign", text: "I'd like a clinician who has worked with veterans", expected: false },
  { kind: "benign", text: "Trouble focusing at school, grades are slipping", expected: false },
  { kind: "benign", text: "", expected: false },
];
