import { describe, expect, it } from "vitest";
import { envFileProblem, findSecrets } from "../scripts/secrets.mjs";

// Fake keys are assembled at runtime so this file never contains one.
const fake = (...parts: string[]) => parts.join("");

describe("secret check", () => {
  it("catches API keys and private keys", () => {
    expect(findSecrets(`key: ${fake("sk-", "ant-", "api03-", "a".repeat(30))}`)).toContain("Anthropic API key");
    expect(findSecrets(fake("sk", "_test_", "b".repeat(24)))).toContain("Stripe secret or restricted key");
    expect(findSecrets(fake("-----BEGIN ", "PRIVATE KEY-----"))).toContain("Private key");
    expect(findSecrets(`apiKey = "${"c".repeat(32)}"`)).toContain("Hard-coded credential");
  });

  it("ignores ordinary text and env variable names", () => {
    expect(findSecrets("ANTHROPIC_API_KEY=\nprocess.env.ANTHROPIC_API_KEY")).toEqual([]);
    expect(findSecrets("Only pk_test_ and sk_test_ keys")).toEqual([]);
  });

  it("allows only an empty .env.example", () => {
    expect(envFileProblem(".env.example", "ANTHROPIC_API_KEY=\n")).toBeNull();
    expect(envFileProblem(".env.example", "ANTHROPIC_API_KEY=abc\n")).toMatch(/must leave values empty/);
    expect(envFileProblem(".env.local", "")).toMatch(/must not be committed/);
    expect(envFileProblem("src/app/page.tsx", "")).toBeNull();
  });
});
