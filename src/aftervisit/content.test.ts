import { describe, expect, it } from "vitest";
import { reminderEstimate } from "@/facts";
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

  describe("48-hour cost confirmation variants", () => {
    const estimated = reminderEstimate.estimated.value;
    const confirmed = reminderEstimate.confirmed.value;

    it("'confirmed' closes the loop: the 48-hour email says the cost held", () => {
      const body = reminderCards({ ...base, costOutcome: "confirmed" })[0].email.body.join(" ");
      expect(body).toContain(`cost is confirmed at $${estimated} per visit`);
      // Only the 48-hour reminder changes; the later two keep the estimate.
      const later = reminderCards({ ...base, costOutcome: "confirmed" }).slice(1).map((c) => c.email.body.join(" "));
      for (const b of later) expect(b).not.toContain("cost is confirmed at");
    });

    it("'changed' names the new and old amount with a reason and a link", () => {
      const body = reminderCards({ ...base, costOutcome: "changed" })[0].email.body.join(" ");
      expect(body).toContain(`Your confirmed cost is $${confirmed}, not the $${estimated} we estimated.`);
      expect(body).toMatch(/\[See why\]/);
    });

    it("keeps every text message under 160 characters, including the cost variants", () => {
      for (const outcome of ["estimated", "confirmed", "changed"] as const) {
        for (const card of reminderCards({ ...base, costOutcome: outcome })) {
          expect(card.sms.length, `${outcome} / ${card.lead}`).toBeLessThan(160);
        }
      }
    });
  });
});
