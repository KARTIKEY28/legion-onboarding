import { describe, expect, it } from "vitest";
import { z } from "zod";
import { EVENTS, type EventName } from "./schema";
import { InvalidEventError, createTracker, memoryAdapter } from "./track";

const SESSION = "6f1c2c1e-6c1a-4c55-9a43-2f6f3c0b8d11";

function setup(onInvalid: "throw" | "drop" = "throw") {
  const adapter = memoryAdapter();
  const track = createTracker({
    sessionId: SESSION,
    deviceType: "mobile",
    adapter,
    now: () => new Date("2026-10-25T12:00:00.000Z"),
    onInvalid,
  });
  return { adapter, track };
}

describe("event catalog", () => {
  it("includes every event the PRD measurement plan names", () => {
    const required: EventName[] = [
      "onboarding.started",
      "about.viewed",
      "about.submitted",
      "eligibility.checked",
      "exclusion.next_step_shown",
      "conditions.submitted",
      "safety.viewed",
      "safety.submitted",
      "safety.escalated",
      "reflect_back.shown",
      "insurance.submitted",
      "needs.submitted",
      "match.viewed",
      "provider.selected",
      "match.none_selected",
      "match.full_list_opened",
      "cost.viewed",
      "cost_summary.shown",
      "cost_summary.validation_failed",
      "insurance.viewed",
      "reservation.requested",
      "reservation.failed",
      "slot.unavailable_at_booking",
      "account.created",
      "payment.viewed",
      "payment.succeeded",
      "visit.booked",
      "visit.completed",
    ];
    expect(Object.keys(EVENTS)).toEqual(expect.arrayContaining(required));
  });

  it("only allows enums, numbers and booleans, so free text can never be sent", () => {
    for (const [name, definition] of Object.entries(EVENTS)) {
      for (const [key, field] of Object.entries(definition.properties.shape)) {
        const allowed =
          field instanceof z.ZodEnum || field instanceof z.ZodNumber || field instanceof z.ZodBoolean;
        expect(allowed, `${name}.${key} must be an enum, number or boolean`).toBe(true);
      }
    }
  });
});

describe("event catalog scope", () => {
  it("has no countdown events, since the countdown is not built", () => {
    expect(Object.keys(EVENTS).filter((name) => /countdown|hold/.test(name))).toEqual([]);
  });
});

describe("tracker", () => {
  it("adds session id, step, device type and timestamp", () => {
    const { adapter, track } = setup();
    track("conditions.submitted", { selected_count: 2, free_text_used: true, unsure: false, skipped: false });
    expect(adapter.events).toEqual([
      {
        event: "conditions.submitted",
        session_id: SESSION,
        step: "conditions",
        device_type: "mobile",
        timestamp: "2026-10-25T12:00:00.000Z",
        properties: { selected_count: 2, free_text_used: true, unsure: false, skipped: false },
      },
    ]);
  });

  it("allows events with no properties to be called without them", () => {
    const { adapter, track } = setup();
    track("about.viewed");
    expect(adapter.events[0]).toMatchObject({ event: "about.viewed", step: "about", properties: {} });
  });

  it("takes the step from on_step for events that can fire anywhere", () => {
    const { adapter, track } = setup();
    track("safety.escalated", { source: "local", on_step: "conditions" });
    track("slot.unavailable_at_booking", { on_step: "payment" });
    expect(adapter.events.map((e) => e.step)).toEqual(["conditions", "payment"]);
  });

  it("rejects properties outside the schema, such as free text", () => {
    const { adapter, track } = setup();
    expect(() =>
      // @ts-expect-error free text is not a property of this event
      track("conditions.submitted", { selected_count: 1, free_text_used: true, unsure: false, skipped: false, text: "I feel low" }),
    ).toThrow(InvalidEventError);
    expect(adapter.events).toHaveLength(0);
  });

  it("rejects values outside an enum", () => {
    const { track } = setup();
    // @ts-expect-error "maybe" is not an eligibility result
    expect(() => track("eligibility.checked", { criterion: "age", result: "maybe", on_step: "about" })).toThrow(
      InvalidEventError,
    );
  });

  it("drops invalid events instead of throwing in production mode", () => {
    const { adapter, track } = setup("drop");
    const original = console.warn;
    console.warn = () => {};
    // @ts-expect-error missing required property
    const result = track("insurance.submitted", {});
    console.warn = original;
    expect(result).toBeNull();
    expect(adapter.events).toHaveLength(0);
  });
});
