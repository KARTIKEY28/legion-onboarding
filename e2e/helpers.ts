import { expect, type Page } from "@playwright/test";

export interface Answers {
  /** The location-picker label: a served state, or the "other" option. */
  location: "Texas" | "Utah" | "Not in Texas or Utah";
  /** Masked MM/DD/YYYY string. */
  dob: string;
  coverage: "Yes" | "No" | "Not sure";
}

export const ADULT_DOB = "04/15/1990";
export const MINOR_DOB = `01/01/${new Date().getFullYear() - 16}`;
export const ELIGIBLE: Answers = { location: "Texas", dob: ADULT_DOB, coverage: "No" };

export async function startFlow(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/start$/);
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { name: "A little about you" })).toBeVisible();
}

export async function answerAbout(page: Page, answers: Answers) {
  await page.getByRole("group", { name: /Where will you be/ }).getByLabel(answers.location, { exact: true }).check();
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

/** The test-only model stand-in reads this cookie: ok, fail, slow, or invalid (an invented price). */
export async function setModel(page: Page, mode: "ok" | "fail" | "slow" | "invalid") {
  await page.context().addCookies([{ name: "ai_mock", value: mode, url: "http://localhost:3100" }]);
}
