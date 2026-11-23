import { describe, expect, it } from "vitest";
import { stateFromZip, zipInServedArea } from "./zip";

describe("state from ZIP", () => {
  it("maps Texas ZIPs to TX", () => {
    for (const z of ["75001", "77002", "78701", "79901"]) expect(stateFromZip(z), z).toBe("TX");
  });
  it("maps Utah ZIPs to UT", () => {
    for (const z of ["84101", "84604", "84770"]) expect(stateFromZip(z), z).toBe("UT");
  });
  it("maps anywhere else to other", () => {
    for (const z of ["10001", "90210", "60601", "33101", "20500"]) expect(stateFromZip(z), z).toBe("other");
  });
  it("returns null for a non-5-digit ZIP", () => {
    for (const z of ["", "1234", "abcde", "123456", "78 70"]) expect(stateFromZip(z), z).toBeNull();
  });
  it("treats only Texas and Utah as served", () => {
    expect(zipInServedArea("78701")).toBe(true);
    expect(zipInServedArea("84101")).toBe(true);
    expect(zipInServedArea("90210")).toBe(false);
    expect(zipInServedArea("abc")).toBe(false);
  });
});
