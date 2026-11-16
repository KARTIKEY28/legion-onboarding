import { describe, expect, it } from "vitest";
import { CLINICIANS } from "./data";
import { PROFILE_CONTENT, firstVisitLines, profileContent } from "./profiles";

describe("clinician profile content", () => {
  it("has deep content for every clinician", () => {
    for (const c of CLINICIANS) {
      const p = profileContent(c.id);
      expect(PROFILE_CONTENT[c.id], `${c.id} has profile content`).toBeDefined();
      expect(p.aboutMe.length, `${c.id} aboutMe`).toBeGreaterThan(120);
      expect(p.approach.length, `${c.id} approach`).toBeGreaterThan(40);
      expect(p.treatmentApproaches.length, `${c.id} treatment approaches`).toBeGreaterThanOrEqual(1);
      expect(p.yearsExperience, `${c.id} years`).toBeGreaterThan(0);
    }
  });

  it("gives every clinician a distinct About me (no interchangeable bios)", () => {
    const bios = CLINICIANS.map((c) => profileContent(c.id).aboutMe);
    expect(new Set(bios).size).toBe(bios.length);
  });

  it("avoids hollow filler phrasing", () => {
    const banned = [/health begins with the mind/i, /passionate about helping/i, /holistic approach to wellness/i];
    for (const c of CLINICIANS) {
      const text = `${profileContent(c.id).aboutMe} ${profileContent(c.id).approach}`;
      for (const re of banned) expect(re.test(text), `${c.id} avoids filler`).toBe(false);
    }
  });

  it("writes a first-visit section of 3 to 4 concrete lines", () => {
    for (const c of CLINICIANS) {
      const lines = firstVisitLines(c);
      expect(lines.length, `${c.id} first-visit lines`).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(4);
      expect(lines.join(" ")).toContain(c.name.split(" ")[0]);
    }
  });

  it("leaves no unfilled 'Dr.' title placeholder in any first-visit copy", () => {
    for (const c of CLINICIANS) {
      // A bare "Dr." with no surname is an unfilled placeholder; the copy uses
      // the clinician's first name instead.
      expect(/\bDr\.(?!\s*[A-Z])/.test(firstVisitLines(c).join(" ")), `${c.id} first-visit copy`).toBe(false);
    }
  });
});
