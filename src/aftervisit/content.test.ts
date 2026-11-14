import { describe, expect, it } from "vitest";
import { reminderCards, type VisitContext } from "./content";

const base: VisitContext = {
  clinicianName: "Dr. Dana Whitfield",
  slotIso: "2026-11-10T20:00:00.000Z",
  state: "TX",
  formsComplete: false,
  path: "insured",
  insuranceState: "checking",
  smsConsent: true,
  estimate: { result: "self_pay" },
};

const joined = (ctx: VisitContext) => reminderCards(ctx).map((c) => c.email.body.join(" "));

describe("reminder cards", () => {
  it("leads the 48-hour reminder with the free-to-reschedule cutoff and the fee", () => {
    const first = reminderCards(base)[0];
    expect(first.email.body[0]).toMatch(/^Free to reschedule until .+CT\. After that, cancelling may cost \$100\.$/);
  });

  it("every text message is under 160 characters", () => {
    for (const card of reminderCards(base)) {
      expect(card.sms.length, card.lead).toBeLessThan(160);
    }
  });

  it("uses the clinician's first name (no title) in the forms nudge, positively", () => {
    const body = joined(base).join(" ");
    expect(body).toContain("help Dana prepare");
    expect(body).not.toMatch(/you haven't/i);
  });

  it("shows the forms nudge only when forms are not done", () => {
    expect(joined(base).join(" ")).toContain("Complete your forms");
    expect(joined({ ...base, formsComplete: true }).join(" ")).not.toContain("Complete your forms");
  });

  it("mentions insurance only when the patient needs to act (never 'still checking')", () => {
    expect(joined(base).join(" ")).not.toMatch(/insurance/i); // checking -> silent
    expect(joined({ ...base, insuranceState: "confirmed" }).join(" ")).not.toMatch(/insurance/i);
    expect(joined({ ...base, insuranceState: "more_info" }).join(" ")).toContain(
      "We need a little more information about your insurance.",
    );
    expect(joined(base).join(" ")).not.toMatch(/still checking/i);
  });

  it("every reminder carries a reschedule link", () => {
    for (const body of joined(base)) {
      expect(body).toContain("Reschedule or cancel");
    }
  });
});
