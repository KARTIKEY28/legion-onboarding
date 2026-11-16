import { expect, type Page } from "@playwright/test";

export interface Answers {
  /** Masked MM/DD/YYYY string. */
  dob: string;
  coverage: "Yes" | "No" | "Not sure";
}

export const ADULT_DOB = "04/15/1990";
export const MINOR_DOB = `01/01/${new Date().getFullYear() - 16}`;
export const ELIGIBLE: Answers = { dob: ADULT_DOB, coverage: "No" };

/** A Texas ZIP (served) and an out-of-area ZIP (waitlist). */
export const TX_ZIP = "78701";
export const UT_ZIP = "84101";
export const OUT_OF_AREA_ZIP = "90210";

/** Enters a ZIP on Start and continues. Served ZIPs land on About; others on the waitlist. */
export async function enterZip(page: Page, zip: string) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/start$/);
  await page.getByLabel("What's your ZIP code?").fill(zip);
  await page.getByRole("button", { name: "Continue" }).click();
}

/** Starts the flow as a served (Texas) patient, arriving on About you. */
export async function startFlow(page: Page, zip: string = TX_ZIP) {
  await enterZip(page, zip);
  await expect(page.getByRole("heading", { name: "A little about you" })).toBeVisible();
}

export async function answerAbout(page: Page, answers: Answers) {
  await page.getByLabel("Date of birth").fill(answers.dob);
  await page
    .getByRole("group", { name: /Medicare or Medicaid/ })
    .getByLabel(answers.coverage, { exact: true })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
}

/** Selects a Conditions topic chip by its label. */
export async function pickTopic(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
}

export type Envelope = { event: string; step: string; session_id: string; device_type: string; properties: Record<string, unknown> };

export async function events(page: Page): Promise<Envelope[]> {
  return page.evaluate(() => (window as unknown as { __legionEvents?: Envelope[] }).__legionEvents ?? []);
}


/** Chooses a payment path on Insurance and continues. */
export async function choosePath(page: Page, label: "I have insurance" | "I'll pay without insurance" | "I'm not sure yet") {
  await expect(page.getByRole("heading", { name: "How would you like to pay?" })).toBeVisible();
  await page.getByLabel(label, { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
}

/** Insured via discovery: consent -> collect name -> run the lookup. Lands on confirm or manual. */
export async function runDiscovery(page: Page, first: string, last: string) {
  await page.getByLabel("I have insurance", { exact: true }).check();
  await page.getByRole("button", { name: "Find my coverage" }).click();
  await page.getByLabel("First name").fill(first);
  await page.getByLabel("Last name").fill(last);
  await page.getByRole("button", { name: "Find my coverage" }).click();
}

/** Insured via the manual fallback ("I'll type it in"). */
export async function typeInsurance(page: Page, plan: string, member?: string, group?: string) {
  await page.getByLabel("I have insurance", { exact: true }).check();
  await page.getByRole("button", { name: "I'll type it in" }).click();
  await page.getByLabel("Plan or insurer", { exact: true }).selectOption({ label: plan });
  if (member) await page.getByLabel("Member ID").fill(member);
  if (group) await page.getByLabel("Group ID (optional)").fill(group);
  await page.getByRole("button", { name: "Continue" }).click();
}

/** The test-only model stand-in reads this cookie: ok, fail, slow, or invalid (an invented price). */
export async function setModel(page: Page, mode: "ok" | "fail" | "slow" | "invalid") {
  await page.context().addCookies([{ name: "ai_mock", value: mode, url: "http://localhost:3100" }]);
}
