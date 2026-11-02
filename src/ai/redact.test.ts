import { describe, expect, it } from "vitest";
import { removeIdentifiers } from "./redact";

describe("removeIdentifiers", () => {
  it("removes emails, phone numbers and dates", () => {
    expect(removeIdentifiers("Email me at pat.doe+x@example.com or 512-555-0142")).toBe(
      "Email me at [email] or [phone]",
    );
    expect(removeIdentifiers("Born 04/15/1990, seen on March 3, 2024")).toBe("Born [date], seen on [date]");
  });

  it("removes stated names, addresses, links and long numbers", () => {
    expect(removeIdentifiers("Hi, my name is Jordan Lee")).toBe("Hi, my name is [name]");
    expect(removeIdentifiers("I'm Sam and I live at 12 Oak Street")).toBe("I'm [name] and I live at [address]");
    expect(removeIdentifiers("see www.example.com, member 123456789")).toBe("see [link] member [number]");
  });

  it("leaves ordinary health text alone", () => {
    const text = "I've been anxious for 2 years and sleep about 5 hours";
    expect(removeIdentifiers(text)).toBe(text);
  });
});
