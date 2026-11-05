import { describe, expect, it } from "vitest";
import { simulateBooking } from "./booking";
import { scenarioForCard, TEST_CARDS } from "./cards";
import { assertTestKeysOnly, findLiveKey, stripeConfigured } from "./stripe";

describe("stripe key guard", () => {
  it("flags a live secret or publishable key", () => {
    expect(findLiveKey({ STRIPE_SECRET_KEY: "sk_live_abc" })).toBe("STRIPE_SECRET_KEY");
    expect(findLiveKey({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_abc" })).toBe("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  });

  it("allows test keys and no keys", () => {
    expect(findLiveKey({ STRIPE_SECRET_KEY: "sk_test_abc", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc" })).toBeNull();
    expect(findLiveKey({})).toBeNull();
  });

  it("assertTestKeysOnly throws on a live key, passes otherwise", () => {
    expect(() => assertTestKeysOnly({ STRIPE_SECRET_KEY: "sk_live_x" })).toThrow(/live Stripe key/);
    expect(() => assertTestKeysOnly({ STRIPE_SECRET_KEY: "sk_test_x" })).not.toThrow();
    expect(() => assertTestKeysOnly({})).not.toThrow();
  });

  it("stripeConfigured needs both keys", () => {
    expect(stripeConfigured({ STRIPE_SECRET_KEY: "sk_test_x", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x" })).toBe(true);
    expect(stripeConfigured({ STRIPE_SECRET_KEY: "sk_test_x" })).toBe(false);
    expect(stripeConfigured({})).toBe(false);
  });
});

describe("booking simulation", () => {
  it("success places then releases the $1 hold and saves the card", () => {
    const r = simulateBooking("success", false);
    expect(r.status).toBe("succeeded");
    expect(r.steps).toEqual({ authorizationPlaced: true, authorizationReleased: true, cardSaved: true });
  });

  it("declined fails with a card_declined code and saves nothing", () => {
    const r = simulateBooking("declined", false);
    expect(r.status).toBe("failed");
    expect(r.reason).toBe("card_declined");
    expect(r.steps).toEqual({ authorizationPlaced: false, authorizationReleased: false, cardSaved: false });
  });

  it("a processing error fails with the processing_error code", () => {
    expect(simulateBooking("processing_error", false)).toMatchObject({ status: "failed", reason: "processing_error" });
  });

  it("auth required asks for a challenge, then succeeds once authenticated", () => {
    expect(simulateBooking("auth_required", false)).toMatchObject({ status: "requires_action", reason: "authentication_required" });
    expect(simulateBooking("auth_required", true).status).toBe("succeeded");
  });
});

describe("test card mapping", () => {
  it("maps each published test card to its scenario", () => {
    expect(scenarioForCard(TEST_CARDS.success)).toBe("success");
    expect(scenarioForCard(TEST_CARDS.declined)).toBe("declined");
    expect(scenarioForCard(TEST_CARDS.authRequired)).toBe("auth_required");
    expect(scenarioForCard(TEST_CARDS.processingError)).toBe("processing_error");
  });

  it("treats any other number as a generic decline", () => {
    expect(scenarioForCard("1234 5678 9012 3456")).toBe("declined");
  });
});
