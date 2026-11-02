import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cancellation, cardTerms, countdown, crisisResources, insuredCost, selfPayPrices } from "./index";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) && !entry.includes(".test.") ? [path] : [];
  });
}

describe("fixed facts", () => {
  it("keeps the insured cost unknown before payment rather than a guess", () => {
    expect(insuredCost.estimateBeforePayment.value).toBeNull();
    expect(insuredCost.estimateBeforePayment.status).toBe("unknown");
  });

  it("matches Legion's card and cancellation terms", () => {
    expect(cardTerms.authorizationAmount.value).toBe(1);
    expect(cardTerms.chargeDaysAfterVisit.value).toBe(5);
    expect(cancellation.windowHours.value).toBe(48);
    expect(cancellation.initialVisitFee.value).toBe(250);
    expect(cancellation.followUpFee.value).toBe(100);
  });

  it("records that the countdown holds nothing", () => {
    expect(countdown.durationMinutes.value).toBe(10);
    expect(countdown.holdsSlot.value).toBe(false);
  });

  it("matches the PRD self pay prices", () => {
    expect(selfPayPrices.initialVisit.value).toBe(250);
    expect(selfPayPrices.followUp.value).toBe(150);
  });

  it("always offers 988 and 911", () => {
    expect(crisisResources.map((r) => r.id)).toEqual(["988", "911"]);
  });

  it("has no dollar amounts written as literals outside src/facts", () => {
    const src = join(__dirname, "..");
    const offenders = sourceFiles(src)
      .filter((file) => !file.startsWith(join(src, "facts")))
      .filter((file) => /\$\s?\d/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
