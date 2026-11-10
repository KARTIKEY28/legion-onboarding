import { expect, test, type Page } from "@playwright/test";
import { ELIGIBLE, answerAbout, choosePath, events, setModel, startFlow, type Answers } from "./helpers";

// The personalized "What you pay" copy (Part 4). Prices come from the facts.
// The pre-payment estimate lines (A1).
const SELF_PAY_EST = "$250 for your first visit, $150 for follow ups.";
const DEDUCTIBLE_EST =
  "Your plan has $500 left on your deductible, so your first visits may cost more until it's met. We'll confirm the exact amount before your visit.";

/** About you, then skip Conditions and continue past Safety, arriving on Insurance. */
async function toInsurance(page: Page, about: Answers = ELIGIBLE) {
  await startFlow(page);
  await answerAbout(page, about);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 5 of 10 · Insurance")).toBeVisible();
}

/** Needs, then the Match stub, arriving on Cost and terms. */
async function toCost(page: Page) {
  await expect(page.getByText("Step 6 of 10 · Needs")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 7 of 10 · Match")).toBeVisible();
  // Pick the first open time on the top match, then confirm in the sticky bar.
  await page.getByRole("article").first().getByRole("button", { name: /AM|PM/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 8 of 10 · Cost and terms")).toBeVisible();
}

async function fillInsured(page: Page) {
  await page.getByLabel("I have insurance", { exact: true }).check();
  await page.getByLabel("Plan or insurer", { exact: true }).selectOption({ label: "Sample Insurance Co." });
  await page.getByLabel("Member ID").fill("SYN-MEMBER-778899");
  await page.getByLabel("Group ID (optional)").fill("SYN-GROUP-42");
  await page.getByRole("button", { name: "Continue" }).click();
}

test("insured path: details are asked, nothing is verified, and the cost uses the insured wording", async ({ page }) => {
  await setModel(page, "ok");
  await toInsurance(page);
  await page.getByLabel("I have insurance", { exact: true }).check();
  await expect(page.getByText(/your coverage is confirmed after you book/)).toBeVisible();
  await fillInsured(page);
  await toCost(page);

  await expect(page.getByTestId("cost-pay")).toHaveText(DEDUCTIBLE_EST); // Sample Insurance Co. has a deductible left
  await expect(page.getByTestId("cost-pay")).toHaveAttribute("data-source", "personalized");
  await expect(page.getByTestId("cost-charged")).toContainText("$1 authorization");
  await expect(page.getByTestId("cost-cancel")).toContainText("48 hours");
  await expect(page.getByRole("link", { name: "Continue to create your account" })).toBeVisible();

  const fired = await events(page);
  const props = (name: string) => fired.filter((e) => e.event === name).map((e) => e.properties);
  expect(props("insurance.viewed")).toHaveLength(1);
  expect(props("insurance.submitted")).toEqual([{ path: "insured" }]);
  expect(props("cost.viewed")).toEqual([{ insurance_path: "insured" }]);
  expect(props("cost_summary.shown")).toEqual([{ source: "model" }]);
  expect(props("cost_summary.validation_failed")).toEqual([]);
});

test("insured path: a simulated eligibility check runs and reports a cost result type", async ({ page }) => {
  await setModel(page, "fail");
  await toInsurance(page);
  await page.getByLabel("I have insurance", { exact: true }).check();
  await page.getByLabel("Plan or insurer", { exact: true }).selectOption({ label: "Sample Insurance Co." });
  await page.getByLabel("Member ID").fill("SYN-MEMBER-778899");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Checking your coverage")).toBeVisible();
  await expect(page.getByText("Step 6 of 10 · Needs")).toBeVisible();

  const checked = (await events(page)).filter((e) => e.event === "eligibility.checked_cost");
  expect(checked.map((e) => e.properties)).toEqual([{ result: "deductible" }]); // Sample Insurance Co. has a deductible left
});

test("insured path: missing details get calm errors, and 'add this later' skips them", async ({ page }) => {
  await toInsurance(page);
  await page.getByLabel("I have insurance", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  const summary = page.getByRole("alert").filter({ hasText: "still need a look" });
  await expect(summary).toContainText("Please choose your plan");
  await expect(summary).toContainText("Please add your member ID");
  await page.getByLabel("I'll add my insurance details later").check();
  await expect(page.getByLabel("Member ID")).toHaveCount(0);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 6 of 10 · Needs")).toBeVisible();
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
  // Not sure (no check) shows the self-pay estimate.
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
  await expect(page.getByText("Step 6 of 10 · Needs")).toBeVisible();
});

test("a summary with an invented price is rejected and the template is shown", async ({ page }) => {
  await setModel(page, "invalid");
  await toInsurance(page);
  await choosePath(page, "I'm not sure yet");
  await toCost(page);
  // The estimate line is unaffected; the rejected model summary (charged/cancel) falls back to the template.
  await expect(page.getByTestId("cost-pay")).toHaveText(SELF_PAY_EST);
  await expect(page.getByTestId("cost-charged")).toHaveAttribute("data-source", "template");
  await expect(page.getByText(/199/)).toHaveCount(0);
  const fired = await events(page);
  expect(fired.filter((e) => e.event === "cost_summary.validation_failed").map((e) => e.properties)).toEqual([
    { reason: "number_not_allowed" },
  ]);
});

test("no event contains plan names, member or group IDs", async ({ page }) => {
  await setModel(page, "fail");
  await toInsurance(page);
  await page.getByLabel("I have insurance", { exact: true }).check();
  await page.getByLabel("Plan or insurer", { exact: true }).selectOption({ label: "Other" });
  await page.getByLabel("Plan or insurer name").fill("Synthetic Mutual of Nowhere");
  await page.getByLabel("Member ID").fill("SYN-MEMBER-778899");
  await page.getByLabel("Group ID (optional)").fill("SYN-GROUP-42");
  await page.getByRole("button", { name: "Continue" }).click();
  await toCost(page);

  const fired = await events(page);
  const serialized = JSON.stringify(fired.map(({ event, step, device_type, properties }) => ({ event, step, device_type, properties })));
  for (const forbidden of ["Synthetic Mutual", "SYN-MEMBER", "778899", "SYN-GROUP", "other", "Sample Insurance", "sample"]) {
    expect(serialized, `events must not contain "${forbidden}"`).not.toContain(forbidden);
  }
  for (const event of fired) {
    for (const value of Object.values(event.properties)) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
      if (typeof value === "string") expect(value).toMatch(/^[a-z_]+$/);
    }
  }
});
