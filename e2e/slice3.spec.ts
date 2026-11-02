import { expect, test, type Page } from "@playwright/test";
import { ELIGIBLE, answerAbout, choosePath, events, pickTopic, setModel, startFlow } from "./helpers";

async function toConditions(page: Page) {
  await startFlow(page);
  await answerAbout(page, ELIGIBLE);
  await expect(page.getByRole("heading", { name: "What's been on your mind?" })).toBeVisible();
}

async function finishSafetyAndNeeds(page: Page) {
  await page.getByRole("group", { name: /thoughts of ending your life/ }).getByLabel("No", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await choosePath(page, "I'll pay without insurance");
  await expect(page.getByText("Step 6 of 10 · Needs")).toBeVisible();
  await page.getByLabel("Weekday evenings").check();
  await page.getByRole("group", { name: /Language/ }).getByLabel("Spanish", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/match$/);
}

test("happy path: Conditions, Safety and Needs record clean events", async ({ page }) => {
  await setModel(page, "ok");
  await toConditions(page);
  await expect(page.getByText("Step 3 of 10 · Conditions")).toBeVisible();
  await pickTopic(page, "Trouble sleeping");
  await pickTopic(page, "Worry that's hard to shake");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 4 of 10 · Safety")).toBeVisible();
  await finishSafetyAndNeeds(page);

  const fired = await events(page);
  const byName = (name: string) => fired.filter((e) => e.event === name);
  expect(byName("conditions.submitted")[0].properties).toEqual({
    selected_count: 2,
    free_text_used: false,
    unsure: false,
    skipped: false,
  });
  expect(byName("safety.viewed")).toHaveLength(1);
  expect(byName("safety.submitted")).toHaveLength(1);
  expect(byName("safety.escalated")).toHaveLength(0);
  expect(byName("needs.submitted")[0].properties).toEqual({
    answered_availability: true,
    answered_language: true,
    answered_gender: false,
    free_text_used: false,
  });
});

test("a crisis phrase in free text opens help at once and never blocks", async ({ page }) => {
  await setModel(page, "fail");
  await toConditions(page);
  await page.getByLabel("Something else, in my own words").check();
  await page.getByLabel(/In your own words/).fill("Honestly I want to end my life");

  const panel = page.getByRole("region", { name: /don't have to wait/ });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "Call or text 988" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 4 of 10 · Safety")).toBeVisible();

  const escalated = (await events(page)).filter((e) => e.event === "safety.escalated");
  expect(escalated.map((e) => e.properties)).toEqual([{ source: "local", on_step: "conditions" }]);
});

test("Safety loads with nothing preselected on either question", async ({ page }) => {
  await toConditions(page);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByText("Step 4 of 10 · Safety")).toBeVisible();
  for (const radio of await page.getByRole("radio").all()) {
    await expect(radio).not.toBeChecked();
  }
});

test("a concerning safety answer shows help, fires escalation, and Continue still works", async ({ page }) => {
  await toConditions(page);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("group", { name: /thoughts of ending your life/ }).getByLabel("Yes", { exact: true }).check();
  await expect(page.getByRole("region", { name: /don't have to wait/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/insurance$/);
  const escalated = (await events(page)).filter((e) => e.event === "safety.escalated");
  expect(escalated.map((e) => e.properties)).toEqual([{ source: "answer", on_step: "safety" }]);
});

test("'Yes' to past hospitalization shows a help panel under that question", async ({ page }) => {
  await toConditions(page);
  await page.getByRole("button", { name: "Skip for now" }).click();
  const hospital = page.getByRole("group", { name: /hospital/ });
  await hospital.getByLabel("Yes", { exact: true }).check();
  await expect(hospital.getByRole("link", { name: "Call or text 988" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
});

test("the model can escalate free text the local check missed", async ({ page }) => {
  await setModel(page, "ok");
  await toConditions(page);
  await page.getByLabel("Something else, in my own words").check();
  await page.getByLabel(/In your own words/).fill("mock-escalate: a hard week");
  await expect(page.getByRole("region", { name: /don't have to wait/ })).toBeVisible();
  const escalated = (await events(page)).filter((e) => e.event === "safety.escalated");
  expect(escalated.map((e) => e.properties)).toEqual([{ source: "model", on_step: "conditions" }]);
});

test("model unavailable: the flow still continues to the match step", async ({ page }) => {
  await setModel(page, "fail");
  await toConditions(page);
  await pickTopic(page, "Trouble sleeping");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 4 of 10 · Safety")).toBeVisible();
  await finishSafetyAndNeeds(page);
  await expect(page).toHaveURL(/\/match$/);
});

test("no event contains free text, health answers or identifiers", async ({ page }) => {
  await setModel(page, "fail");
  const freeText = "My name is Jordan Lee, email jordan@example.com, I feel stuck";
  const note = "Please call me at 512-555-0142 after 6";
  await toConditions(page);
  await pickTopic(page, "Feeling down or low most days");
  await page.getByLabel("Something else, in my own words").check();
  await page.getByLabel(/In your own words/).fill(freeText);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("group", { name: /thoughts of ending your life/ }).getByLabel("I'd rather not say").check();
  await page.getByRole("group", { name: /hospital/ }).getByLabel("Yes", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await choosePath(page, "I'll pay without insurance");
  await page.getByLabel("Weekends").check();
  await page.getByLabel(/Anything else you want your clinician to know/).fill(note);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/match$/);

  const fired = await events(page);
  const serialized = JSON.stringify(fired.map(({ event, step, device_type, properties }) => ({ event, step, device_type, properties })));
  for (const forbidden of [
    "Jordan",
    "jordan@example.com",
    "@",
    "stuck",
    "512",
    "low_mood",
    "Feeling down",
    "rather_not_say",
    "hospital",
    "weekends",
    "Weekends",
  ]) {
    expect(serialized, `events must not contain "${forbidden}"`).not.toContain(forbidden);
  }
  for (const event of fired) {
    for (const value of Object.values(event.properties)) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
      if (typeof value === "string") expect(value).toMatch(/^[a-z_]+$/);
    }
  }
});
