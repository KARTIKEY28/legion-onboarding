import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { cancellation, cardTerms, selfPayPrices } from "@/facts";
import type { CostPath, CostWriter } from "./cost";
import type { ReflectInput, ReflectionWriter } from "./reflect";
import { REFLECT_TIMEOUT_MS } from "./reflect";
import type { SummaryWriter } from "./previsit";
import { SUMMARY_TIMEOUT_MS } from "./previsit";

/**
 * Server-only access to the model. The API key comes only from the
 * ANTHROPIC_API_KEY environment variable and never reaches the browser.
 * With no key, every caller falls back (template line, local safety check only).
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export interface SafetyClassifier {
  /** True if the text may signal risk. Used only to escalate, never to downgrade. */
  mayIndicateRisk(text: string): Promise<boolean>;
}

const REFLECT_SYSTEM = `You write one short, warm sentence that reflects back what a person shared while signing up for care.
Rules:
- Use only what is in their answers. Do not add details, feelings or causes they did not state.
- Never diagnose, never name a medical condition they did not name, never give advice.
- No numbers. Plain words a 12-year-old would understand. At most 25 words.
- Start with "You".
Reply with the sentence only.`;

const COST_SYSTEM = `You explain the cost and terms of a first visit in plain, warm words, using ONLY the facts given.
Rules:
- Use every fact given, exactly as given. Do not add, round, combine or change any amount, number or time period.
- Never describe a price as a maximum, limit or ceiling. Never promise what insurance will pay.
- Short sentences a 12-year-old would understand. At most two sentences per line.
Reply with exactly three lines and nothing else:
PAY: <what they pay>
CHARGED: <when they are charged>
CANCEL: <what happens if they cancel>`;

function costFacts(path: CostPath): string {
  const facts = [
    `Self pay price, first visit: $${selfPayPrices.initialVisit.value}`,
    `Self pay price, each follow-up visit: $${selfPayPrices.followUp.value}`,
    `Card on file, with a $${cardTerms.authorizationAmount.value} authorization when it is saved`,
    `The visit is charged about ${cardTerms.chargeDaysAfterVisit.value} days after it happens`,
    `Cancelling with less than ${cancellation.windowHours.value} hours' notice may have a $${cancellation.followUpFee.value} fee`,
  ];
  if (path !== "self_pay") {
    facts.push("They may use insurance. Their cost with insurance is confirmed after their coverage is verified, after booking. Say both the self pay prices and this.");
  } else {
    facts.push("They are paying without insurance.");
  }
  return facts.map((f) => `- ${f}`).join("\n");
}

const MATCH_SYSTEM = `You write one short, warm headline for a page of clinician matches, using ONLY the facts given.
Rules:
- Use only what is given. Do not add details or invent anything.
- Never diagnose or name a condition that is not in the list.
- No numbers. Plain words a 12-year-old would understand. At most 25 words.
- Start with "Clinicians".
Reply with the headline only.`;

const SUMMARY_SYSTEM = `You help a patient tell their own story to their clinician before a first mental health visit.
Write a short, warm first-person paragraph ("I ...") using ONLY the facts given.
Rules:
- Use only what is given. Do not add details, feelings, causes, dates, names or numbers they did not state.
- Never diagnose, never name a condition that is not listed, never give advice or suggest treatment.
- Plain words a 12-year-old would understand. At most 5 short sentences.
Reply with the paragraph only.`;

const SAFETY_SYSTEM = `You screen short text written by a person signing up for mental health care.
Does the text suggest any risk of suicide, self-harm, harm to others, or that the person is in danger now?
Answer with exactly one word: YES, NO, or UNSURE.`;

function systemFor(step: ReflectInput["step"]): string {
  return step === "match" ? MATCH_SYSTEM : REFLECT_SYSTEM;
}

function describe(input: ReflectInput): string {
  if (input.step === "conditions") {
    return [
      `Topics they chose: ${input.topics.join("; ") || "none"}`,
      `Not sure what it is: ${input.unsure ? "yes" : "no"}`,
      input.freeText ? `In their own words: ${input.freeText}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (input.step === "match") {
    return [
      `Topics we looked for: ${input.topics.join("; ") || "any"}`,
      `Times we looked for: ${input.windows.join("; ") || "any"}`,
      `Language: ${input.language || "no preference"}`,
      input.payer ? `Plan: ${input.payer}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `Times that suit them: ${input.availability.join("; ") || "any"}`,
    `Language: ${input.language || "no preference"}`,
    `Clinician gender: ${input.gender || "no preference"}`,
    input.note ? `Note for their clinician: ${input.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function ask(client: Anthropic, system: string, text: string, timeoutMs: number): Promise<string> {
  const response = await client.beta.messages.create(
    {
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: text }],
    },
    { timeout: timeoutMs, maxRetries: 0 },
  );
  if (response.stop_reason === "refusal") throw new Error("model declined");
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

export function createModel(): (ReflectionWriter & SafetyClassifier & CostWriter & SummaryWriter) | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return {
    write: (input) => ask(client, systemFor(input.step), describe(input), REFLECT_TIMEOUT_MS),
    writeCost: (path) => ask(client, COST_SYSTEM, costFacts(path), REFLECT_TIMEOUT_MS),
    writeSummary: (facts) => ask(client, SUMMARY_SYSTEM, facts, SUMMARY_TIMEOUT_MS),
    mayIndicateRisk: async (text) => {
      const answer = (await ask(client, SAFETY_SYSTEM, text, REFLECT_TIMEOUT_MS)).toUpperCase();
      return answer.startsWith("YES") || answer.startsWith("UNSURE");
    },
  };
}
