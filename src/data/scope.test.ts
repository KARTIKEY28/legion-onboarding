import { describe, expect, it } from "vitest";
import { mentionsOutOfScope } from "./scope";

describe("out-of-scope free-text detection", () => {
  it("flags substance-use descriptions", () => {
    for (const t of [
      "I think I'm drinking too much",
      "trying to stay sober after a relapse",
      "my drug use is getting worse",
      "I want to cut back on alcohol",
    ]) {
      expect(mentionsOutOfScope(t), t).toBe(true);
    }
  });

  it("flags eating and body-image descriptions", () => {
    for (const t of ["I have an eating disorder", "I've been binge eating", "I hate my body image", "always worried about my weight"]) {
      expect(mentionsOutOfScope(t), t).toBe(true);
    }
  });

  it("does not flag in-scope concerns", () => {
    for (const t of [
      "I feel down and anxious most days",
      "panic attacks out of nowhere",
      "I can't focus or sleep",
      "something that happened still affects me",
      "",
    ]) {
      expect(mentionsOutOfScope(t), t).toBe(false);
    }
  });
});
