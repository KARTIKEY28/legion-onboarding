import { expect, test, type Page } from "@playwright/test";
import { ELIGIBLE, answerAbout, choosePath, events, runDiscovery, setModel, startFlow, typeInsurance, type Answers } from "./helpers";

// The personalized "What you pay" copy. Prices and copays come from the facts/plans.
const SELF_PAY_EST = "$250 for your first visit, $150 for follow ups.";
const COPAY_EST = "Your estimated cost per visit: $30 with Example Health Plan. We'll confirm before your visit.";
const DEDUCTIBLE_EST =
  "Your plan has $500 left on your deductible, so your first visits may cost more until it's met. We'll confirm the exact amount before your visit.";

/** About you, then skip Conditions and continue past Safety, arriving on Insurance. */
async function toInsurance(page: Page, about: Answers = ELIGIBLE) {
  await startFlow(page);
  await answerAbout(page, about);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("progress-step")).toHaveText("Insurance");
}

/** Needs, then the Match stub, arriving on Cost and terms. */
async function toCost(page: Page) {
  await expect(page.getByTestId("progress-step")).toHaveText("Needs");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("progress-step")).toHaveText("Match");
  await page.getByRole("article").first().getByRole("button", { name: /AM|PM/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("progress-step")).toHaveText("Cost and terms");
}

test("discovery-first: consent is shown, never a member-ID form by default", async ({ page }) => {
  await toInsurance(page);
  await page.getByLabel("I have insurance", { exact: true }).check();
  // The default insured path is the consent prompt, not a manual form.
  await expect(page.getByRole("heading", { name: "Want us to find your coverage?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Find my coverage" })).toBeVisible();
  await expect(page.getByRole("button", { name: "I'll type it in" })).toBeVisible();
  await expect(page.getByLabel("Member ID")).toHaveCount(0);
});

test("discovery one-match: confirm, copay on Insurance, carried to Cost", async ({ page }) => {
  await setModel(page, "ok");
  await toInsurance(page);
  await runDiscovery(page, "Alex", "Rivera"); // -> Example Health Plan (copay $30)

  await expect(page.getByRole("heading", { name: "Is this your plan?" })).toBeVisible();
  await expect(page.getByText("Example Health Plan")).toBeVisible();
  await page.getByRole("button", { name: "Yes, that's my plan" }).click();

  // The copay is shown on the Insurance step, in network, before continuing.
  await expect(page.getByText(COPAY_EST)).toBeVisible();
  await expect(page.getByText(/All Legion clinicians are in network/)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // The copay is carried onto Cost and terms.
  await toCost(page);
  await expect(page.getByTestId("cost-pay")).toHaveText(COPAY_EST);

  const fired = await events(page);
  const types = (name: string) => fired.filter((e) => e.event === name).map((e) => e.properties);
  expect(types("insurance.discovery_offered")).toHaveLength(1);
  expect(types("insurance.discovery_consented")).toHaveLength(1);
  expect(types("insurance.discovery_result")).toEqual([{ result: "one_match" }]);
  expect(types("insurance.plan_confirmed")).toEqual([{ source: "discovery" }]);
  expect(types("insurance.cost_result")).toEqual([{ result: "copay" }]);
});

test("discovery one-match: a deductible plan shows the deductible wording", async ({ page }) => {
  await toInsurance(page);
  await runDiscovery(page, "Casey", "Nguyen"); // -> Sample Insurance Co. (deductible)
  await page.getByRole("button", { name: "Yes, that's my plan" }).click();
  await expect(page.getByText(DEDUCTIBLE_EST)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("progress-step")).toHaveText("Needs");
  const checked = (await events(page)).filter((e) => e.event === "insurance.cost_result");
  expect(checked.map((e) => e.properties)).toEqual([{ result: "deductible" }]);
});

test("manual fallback via 'I'll type it in' is first-class and produces a cost", async ({ page }) => {
  await toInsurance(page);
  await typeInsurance(page, "Sample Insurance Co.", "SYN-MEMBER-778899", "SYN-GROUP-42");
  await expect(page.getByText(DEDUCTIBLE_EST)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("progress-step")).toHaveText("Needs");
  const fired = await events(page);
  expect(fired.filter((e) => e.event === "insurance.plan_confirmed").map((e) => e.properties)).toEqual([{ source: "manual" }]);
  expect(fired.filter((e) => e.event === "insurance.rung_reached").map((e) => e.properties)).toContainEqual({ rung: 3 });
});

test("manual fallback: missing details get calm errors", async ({ page }) => {
  await toInsurance(page);
  await page.getByLabel("I have insurance", { exact: true }).check();
  await page.getByRole("button", { name: "I'll type it in" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Please choose your plan")).toBeVisible();
  await page.getByLabel("Plan or insurer", { exact: true }).selectOption({ label: "Sample Insurance Co." });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Please add your member ID. It's on the front of your card.")).toBeVisible();
});

test("no match falls through to the manual form, not a dead end", async ({ page }) => {
  await toInsurance(page);
  await runDiscovery(page, "Pat", "Morgan"); // -> no match
  await expect(page.getByRole("heading", { name: "Enter your insurance" })).toBeVisible();
  const fired = await events(page);
  expect(fired.filter((e) => e.event === "insurance.discovery_result").map((e) => e.properties)).toEqual([{ result: "no_match" }]);
});

test("self pay path: no insurance fields, straight on, self pay prices", async ({ page }) => {
  await setModel(page, "fail");
  await toInsurance(page);
  await page.getByLabel("I'll pay without insurance", { exact: true }).check();
  await expect(page.getByLabel("Member ID")).toHaveCount(0);
  await page.getByRole("button", { name: "Continue" }).click();
  await toCost(page);
  await expect(page.getByTestId("cost-pay")).toHaveText(SELF_PAY_EST);
  await expect(page.getByTestId("cost-pay")).toHaveAttribute("data-source", "personalized");
  const fired = await events(page);
  expect(fired.filter((e) => e.event === "insurance.submitted").map((e) => e.properties)).toEqual([{ path: "self_pay" }]);
  expect(fired.filter((e) => e.event === "cost_summary.shown").map((e) => e.properties)).toEqual([{ source: "template" }]);
});

test("not sure path: continues, and the cost uses the insured wording", async ({ page }) => {
  await toInsurance(page);
  await choosePath(page, "I'm not sure yet");
  await toCost(page);
  await expect(page.getByTestId("cost-pay")).toHaveText(SELF_PAY_EST);
  const submitted = (await events(page)).filter((e) => e.event === "insurance.submitted");
  expect(submitted.map((e) => e.properties)).toEqual([{ path: "not_sure" }]);
});

test("flagged Medicare path: 'not sure' on About you is asked again, and yes gets the warm exclusion screen", async ({ page }) => {
  await toInsurance(page, { ...ELIGIBLE, coverage: "Not sure" });
  const question = page.getByRole("group", { name: /Medicare, Medicaid, or a plan through either/ });
  await expect(question).toBeVisible();
  await question.getByLabel("Yes", { exact: true }).check();
  await expect(page.getByText(/Thanks for checking/)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/next-steps$/);
  await expect(page.getByRole("heading", { name: /can't accept Medicare or Medicaid/ })).toBeVisible();
  const checked = (await events(page)).filter((e) => e.event === "eligibility.checked" && e.step === "insurance");
  expect(checked.map((e) => e.properties)).toEqual([{ criterion: "coverage", result: "fail", on_step: "insurance" }]);
});

test("flagged Medicare path: 'still not sure' continues", async ({ page }) => {
  await toInsurance(page, { ...ELIGIBLE, coverage: "Not sure" });
  await page.getByRole("group", { name: /Medicare, Medicaid, or a plan through either/ }).getByLabel("I'm still not sure").check();
  await choosePath(page, "I'll pay without insurance");
  await expect(page.getByTestId("progress-step")).toHaveText("Needs");
});

test("late exclusion: discovery returns a Medicaid plan after the patient answered No", async ({ page }) => {
  // ELIGIBLE answered "No" to Medicare/Medicaid on About you.
  await toInsurance(page);
  await runDiscovery(page, "Sam", "Carter"); // -> Sample Medicaid Plan
  await expect(page.getByRole("heading", { name: "Is this your plan?" })).toBeVisible();
  await page.getByRole("button", { name: "Yes, that's my plan" }).click();

  await expect(page.getByText("Checking your coverage")).toBeVisible();
  await expect(page).toHaveURL(/\/next-steps$/);
  await expect(page.getByRole("heading", { name: /Sample Medicaid Plan looks like a Medicaid plan/ })).toBeVisible();
  await expect(page.getByText(/Earlier you said you don't have Medicare or Medicaid/)).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Crisis help" })).toBeVisible();

  const fired = await events(page);
  const serialized = JSON.stringify(fired.map(({ event, step, properties }) => ({ event, step, properties })));
  for (const forbidden of ["Sample Medicaid", "Carter", "MCD-", "7781204", "medicaid"]) {
    expect(serialized, `events must not contain "${forbidden}"`).not.toContain(forbidden);
  }
});

test("a summary with an invented price is rejected and the template is shown", async ({ page }) => {
  await setModel(page, "invalid");
  await toInsurance(page);
  await choosePath(page, "I'm not sure yet");
  await toCost(page);
  await expect(page.getByTestId("cost-pay")).toHaveText(SELF_PAY_EST);
  await expect(page.getByTestId("cost-charged")).toHaveAttribute("data-source", "template");
  await expect(page.getByText(/199/)).toHaveCount(0);
  const fired = await events(page);
  expect(fired.filter((e) => e.event === "cost_summary.validation_failed").map((e) => e.properties)).toEqual([
    { reason: "number_not_allowed" },
  ]);
});

test("no event contains names, plan names, member or group IDs", async ({ page }) => {
  await setModel(page, "fail");
  await toInsurance(page);
  // Discovery (name + one match), then onward.
  await runDiscovery(page, "Alex", "Rivera");
  await page.getByRole("button", { name: "Yes, that's my plan" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await toCost(page);

  const fired = await events(page);
  const serialized = JSON.stringify(fired.map(({ event, step, device_type, properties }) => ({ event, step, device_type, properties })));
  for (const forbidden of ["Alex", "Rivera", "Example Health", "EH-", "4821960", "GRP-"]) {
    expect(serialized, `events must not contain "${forbidden}"`).not.toContain(forbidden);
  }
  for (const event of fired) {
    for (const value of Object.values(event.properties)) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
      if (typeof value === "string") expect(value).toMatch(/^[a-z_]+$/);
    }
  }
});
