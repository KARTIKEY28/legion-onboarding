import { describe, expect, it } from "vitest";
import { entrySource } from "./entry";

const at = (query = "") => new URL(`https://legion.example/start${query}`);

describe("entry source", () => {
  it("is direct with no referrer and no UTM", () => {
    expect(entrySource(at(), "")).toEqual({ entry_source: "direct", has_utm: false });
  });

  it("is paid for paid UTM mediums", () => {
    expect(entrySource(at("?utm_source=x&utm_medium=cpc"), "")).toEqual({ entry_source: "paid", has_utm: true });
  });

  it("is organic from a search engine and referral from other sites", () => {
    expect(entrySource(at(), "https://www.google.com/").entry_source).toBe("organic");
    expect(entrySource(at(), "https://blog.example.org/post").entry_source).toBe("referral");
  });

  it("is other for UTM traffic that is not paid and has no referrer", () => {
    expect(entrySource(at("?utm_source=newsletter&utm_medium=email"), "")).toEqual({
      entry_source: "other",
      has_utm: true,
    });
  });

  it("ignores same-site referrers", () => {
    expect(entrySource(at(), "https://legion.example/about").entry_source).toBe("direct");
  });
});
