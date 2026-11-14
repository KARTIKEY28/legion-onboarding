import { expect, test } from "@playwright/test";

import { ELIGIBLE, MINOR_DOB, answerAbout, events, startFlow } from "./helpers";

test("happy path: eligible patient reaches Conditions", async ({ page }) => {
  await startFlow(page);
  await expect(page.getByText("Step 2 of 10 · About you")).toBeVisible();
  await answerAbout(page, ELIGIBLE);
  await expect(page).toHaveURL(/\/conditions$/);

  const fired = await events(page);
  expect(fired.map((e) => e.event)).toEqual([
    "onboarding.started",
    "about.viewed",
    "eligibility.checked",
    "eligibility.checked",
    "eligibility.checked",
    "about.submitted",
    "conditions.viewed",
  ]);
  expect(fired.filter((e) => e.event === "eligibility.checked").map((e) => e.properties)).toEqual([
    { criterion: "texas", result: "pass", on_step: "about" },
    { criterion: "age", result: "pass", on_step: "about" },
    { criterion: "coverage", result: "pass", on_step: "about" },
  ]);

  // Nobody is asked twice: going back shows the saved answers.
  await page.goto("/about");
  await expect(page.getByLabel("Date of birth")).toHaveValue("04/15/1990");
  await expect(page.getByRole("group", { name: /Where will you be/ }).getByLabel("Texas", { exact: true })).toBeChecked();
});

test("not sure about coverage continues and is confirmed later", async ({ page }) => {
  await startFlow(page);
  await answerAbout(page, { ...ELIGIBLE, coverage: "Not sure" });
  await expect(page).toHaveURL(/\/conditions$/);
  const coverage = (await events(page)).find((e) => e.properties.criterion === "coverage");
  expect(coverage?.properties.result).toBe("unconfirmed");
});

const exclusions = [
  { name: "not in Texas or Utah", answers: { ...ELIGIBLE, location: "Not in Texas or Utah" }, criterion: "texas", heading: /Texas and Utah/ },
  { name: "under 18", answers: { ...ELIGIBLE, dob: MINOR_DOB }, criterion: "age", heading: /adults 18 and older/ },
  { name: "Medicare or Medicaid", answers: { ...ELIGIBLE, coverage: "Yes" }, criterion: "coverage", heading: /can't accept Medicare or Medicaid/ },
] as const;

for (const exclusion of exclusions) {
  test(`exclusion: ${exclusion.name} gets a warm next step`, async ({ page }) => {
    await startFlow(page);
    await answerAbout(page, exclusion.answers);
    await expect(page).toHaveURL(/\/next-steps$/);
    await expect(page.getByRole("heading", { name: exclusion.heading })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Crisis help" })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Change your answers/ })).toBeVisible();

    const fired = await events(page);
    const checked = fired.find((e) => e.event === "eligibility.checked" && e.properties.criterion === exclusion.criterion);
    expect(checked?.properties.result).toBe("fail");
    const shown = fired.filter((e) => e.event === "exclusion.next_step_shown").map((e) => e.properties);
    expect(shown).toEqual(
      expect.arrayContaining([
        { criterion: exclusion.criterion, next_step: "guidance" },
        { criterion: exclusion.criterion, next_step: "crisis_resources" },
        { criterion: exclusion.criterion, next_step: "notify_me" },
      ]),
    );
  });
}

test("no event contains personal data", async ({ page }) => {
  const email = "synthetic.patient@example.com";
  await startFlow(page);
  await answerAbout(page, { ...ELIGIBLE, location: "Not in Texas or Utah" });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Email me" }).click();
  await expect(page.getByText(/Saved\./)).toBeVisible();

  const fired = await events(page);
  expect(fired.length).toBeGreaterThan(0);
  // Session ids and timestamps are random or dated, so check everything else.
  const serialized = JSON.stringify(fired.map(({ event, step, device_type, properties }) => ({ event, step, device_type, properties })));
  for (const forbidden of [email, "@", "1990", "04/15", "dob", "birth"]) {
    expect(serialized, `events must not contain "${forbidden}"`).not.toContain(forbidden);
  }
  for (const event of fired) {
    expect(Object.keys(event).sort()).toEqual(["device_type", "event", "properties", "session_id", "step", "timestamp"]);
    expect(event.device_type).toBe("mobile");
    expect(event.session_id).toMatch(/^[0-9a-f-]{36}$/);
    for (const value of Object.values(event.properties)) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
    }
  }
});
