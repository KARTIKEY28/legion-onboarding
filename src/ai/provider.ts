import "server-only";
import { cookies } from "next/headers";
import { createModel, type SafetyClassifier } from "./model";
import { templateCost, type CostWriter } from "./cost";
import type { ReflectionWriter } from "./reflect";

type Model = ReflectionWriter & SafetyClassifier & CostWriter;

/**
 * Test-only stand-in for the model, enabled with AI_MOCK=1 (Playwright sets it).
 * The `ai_mock` cookie picks its behavior: ok, fail, slow, or invalid (a cost summary with an invented price).
 */
function mockModel(mode: string): Model {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  return {
    async write() {
      if (mode === "fail") throw new Error("mock model unavailable");
      if (mode === "slow") await delay(4000);
      return "You shared what has been on your mind, in your own way.";
    },
    async writeCost(path) {
      if (mode === "fail") throw new Error("mock model unavailable");
      if (mode === "slow") await delay(4000);
      const t = templateCost(path);
      const pay = mode === "invalid" ? t.pay.replace("follow ups", "follow ups, or 199 dollars for a longer visit") : t.pay;
      return `PAY: ${pay}\nCHARGED: ${t.charged}\nCANCEL: ${t.cancel}`;
    },
    async mayIndicateRisk(text) {
      if (mode === "fail") throw new Error("mock model unavailable");
      return text.includes("mock-escalate");
    },
  };
}

export async function getModel(): Promise<Model | null> {
  if (process.env.AI_MOCK === "1") {
    const mode = (await cookies()).get("ai_mock")?.value ?? "ok";
    return mockModel(mode);
  }
  return createModel();
}
