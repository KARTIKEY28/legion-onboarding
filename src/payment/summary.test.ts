import { describe, expect, it } from "vitest";
import { changeTermsLine, isWithinCancellationWindow, under48Line } from "./summary";

const NOW = new Date("2026-11-10T12:00:00.000Z");

describe("under-48-hours terms", () => {
  it("detects a visit less than 48 hours away", () => {
    expect(isWithinCancellationWindow("2026-11-11T12:00:00.000Z", NOW)).toBe(true); // 24h away
    expect(isWithinCancellationWindow("2026-11-20T12:00:00.000Z", NOW)).toBe(false); // 10 days away
  });

  it("inside the window shows the under-48-hours fee warning, never a free-to-change time", () => {
    const line = changeTermsLine("2026-11-11T12:00:00.000Z", "TX", NOW);
    expect(line).toBe(under48Line());
    expect(line).toBe("This visit is less than 48 hours away. If you cancel, a $100 fee may apply.");
    expect(line).not.toMatch(/free to change until/i);
  });

  it("outside the window shows the free-to-change cutoff", () => {
    const line = changeTermsLine("2026-11-20T12:00:00.000Z", "TX", NOW);
    expect(line).toMatch(/^Free to change until .+CT\. After that, cancelling may cost \$100\.$/);
  });
});
