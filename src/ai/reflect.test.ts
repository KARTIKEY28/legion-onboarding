import { describe, expect, it, vi } from "vitest";
import {
  isAcceptableReflection,
  prepareForModel,
  reflectBack,
  templateReflection,
  type ReflectInput,
  type ReflectionWriter,
} from "./reflect";

const conditions: ReflectInput = {
  step: "conditions",
  topics: ["Trouble sleeping", "Worry that's hard to shake"],
  unsure: false,
  skipped: false,
  freeText: "My name is Jordan Lee and work is a lot",
};

const writer = (write: ReflectionWriter["write"]): ReflectionWriter => ({ write });

describe("reflect-back fallback", () => {
  it("uses the model line when it passes the checks", async () => {
    const result = await reflectBack(conditions, writer(async () => "You mentioned sleep and worry feel heavy lately."));
    expect(result).toEqual({ text: "You mentioned sleep and worry feel heavy lately.", source: "model" });
  });

  it("falls back to the template when the model fails", async () => {
    const result = await reflectBack(conditions, writer(async () => Promise.reject(new Error("down"))));
    expect(result).toEqual({ text: templateReflection(conditions), source: "template" });
  });

  it("falls back to the template when the model is slower than the timeout", async () => {
    vi.useFakeTimers();
    const slow = writer(() => new Promise((resolve) => setTimeout(() => resolve("You said a lot."), 10_000)));
    const pending = reflectBack(conditions, slow, 2500);
    await vi.advanceTimersByTimeAsync(2500);
    expect(await pending).toEqual({ text: templateReflection(conditions), source: "template" });
    vi.useRealTimers();
  });

  it("falls back to the template with no model (missing key)", async () => {
    expect(await reflectBack(conditions, null)).toEqual({ text: templateReflection(conditions), source: "template" });
  });

  it("falls back when the model's line breaks a rule", async () => {
    for (const bad of [
      "It sounds like you may have an anxiety disorder.",
      "You should try sleeping 8 hours.",
      "You mentioned sleep.\nAnd more.",
      "",
    ]) {
      expect((await reflectBack(conditions, writer(async () => bad))).source).toBe("template");
    }
  });
});

describe("templates", () => {
  it("reflects chosen topics in the patient's words, without echoing free text", () => {
    const line = templateReflection(conditions);
    expect(line).toBe(
      "You mentioned trouble sleeping and worry that's hard to shake. You also shared more in your own words.",
    );
    expect(line).not.toContain("Jordan");
  });

  it("covers skipped, unsure and needs", () => {
    expect(templateReflection({ step: "conditions", topics: [], unsure: false, skipped: true })).toMatch(/skip/);
    expect(templateReflection({ step: "conditions", topics: [], unsure: true, skipped: false })).toMatch(/not sure/);
    expect(
      templateReflection({ step: "needs", availability: ["weekday evenings", "weekends"], language: "Spanish" }),
    ).toBe("You'd like a clinician who speaks Spanish, available weekday evenings and weekends.");
    expect(templateReflection({ step: "needs", availability: [] })).toBe("You're open to any clinician.");
  });

  it("accepts only short lines about the patient", () => {
    expect(isAcceptableReflection("You mentioned trouble sleeping.")).toBe(true);
    expect(isAcceptableReflection("Sleep matters.")).toBe(false);
    expect(isAcceptableReflection("You have 3 concerns.")).toBe(false);
  });
});

describe("what the model sees", () => {
  it("removes identifiers from free text", () => {
    const prepared = prepareForModel(conditions);
    expect(prepared.step === "conditions" && prepared.freeText).toBe("My name is [name] and work is a lot");
  });

  it("never sends free text the local safety check flagged", () => {
    const prepared = prepareForModel({ ...conditions, freeText: "I want to end my life" });
    expect(prepared.step === "conditions" && prepared.freeText).toBeUndefined();
  });
});
