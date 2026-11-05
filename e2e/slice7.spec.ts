import { expect, test, type Page } from "@playwright/test";
import { events, setModel } from "./helpers";

const SEED = {
  inTexas: "yes",
  dob: { month: "04", day: "15", year: "1990" },
  conditions: { topics: ["low_mood", "worry"], unsure: false, skipped: false },
  safety: { recentThoughts: "no" },
  needs: { availability: ["weekday_afternoons"] },
  insurance: { path: "insured" },
  selectedClinician: { id: "c1", name: "Dr. Dana Whitfield" },
  selectedSlot: { iso: "2026-11-10T20:00:00.000Z", label: "Tue, Nov 10 · 2:00 PM" },
  booked: true,
  demo: { insuranceState: "confirmed", formsComplete: false, visitComplete: false },
};

async function open(page: Page, path: string, seed: Record<string, unknown> = SEED) {
  await page.goto("/start");
  await page.evaluate((a) => sessionStorage.setItem("legion.answers", JSON.stringify(a)), seed);
  await page.goto(path);
}

test("every after-payment screen carries the design-proposal label", async ({ page }) => {
  for (const path of ["/confirmation", "/visit/before", "/visit/reminders", "/visit/email", "/visit/day", "/visit/complete"]) {
    await open(page, path);
    await expect(page.getByTestId("proposal-label")).toContainText("Design proposal, not Legion's current experience");
  }
});

test("confirmation: Central Time, add to calendar, what happens next, fires confirmation.viewed", async ({ page }) => {
  await open(page, "/confirmation");
  await expect(page.getByTestId("confirmation-when")).toContainText("2:00 PM CT");
  await expect(page.getByRole("button", { name: "Add to calendar" })).toBeVisible();
  await expect(page.getByText("What happens next")).toBeVisible();
  expect((await events(page)).filter((e) => e.event === "confirmation.viewed")).toHaveLength(1);
});

test("before: intake prefilled and confirmed, ID, records consent, insurance status, AI summary", async ({ page }) => {
  await setModel(page, "ok"); // model summary
  await open(page, "/visit/before");

  // Intake is prefilled from onboarding (never re-typed) and confirmable.
  const intake = page.getByRole("region", { name: "Intake forms" });
  await expect(intake).toContainText("Feeling down");
  await expect(intake).toContainText("Weekday afternoons");
  await intake.getByRole("button", { name: "Confirm my details" }).click();
  await expect(intake).toContainText("confirmed");

  // AI summary drafted from answers.
  await expect(page.getByTestId("summary-text")).toBeVisible();
  await page.getByTestId("summary-text").fill("I'd like to talk things through.");

  // Insurance status reflects the demo state.
  await expect(page.getByTestId("insurance-state")).toHaveAttribute("data-state", "confirmed");

  // Photo ID and records consent.
  await page.getByRole("button", { name: "Use the synthetic sample" }).click();
  await page.getByRole("button", { name: "Allow record requests" }).click();

  const fired = await events(page);
  const byName = (n: string) => fired.filter((e) => e.event === n).map((e) => e.properties);
  expect(byName("intake.started")).toHaveLength(1);
  expect(byName("intake.completed")).toHaveLength(1);
  expect(byName("id.uploaded")).toEqual([{ uploaded: true }]);
  expect(byName("records.consent")).toEqual([{ granted: true }]);
  expect(byName("insurance.status_viewed")).toEqual([{ state: "confirmed" }]);
  expect(byName("summary.shown")).toHaveLength(1);
  expect(byName("summary.edited")).toEqual([{ edited: true }]);
});

test("before: with the model down, the summary falls back to a template", async ({ page }) => {
  await setModel(page, "fail");
  await open(page, "/visit/before");
  await expect(page.getByTestId("summary-text")).toHaveAttribute("data-source", "template");
  expect((await events(page)).filter((e) => e.event === "summary.shown").map((e) => e.properties)).toEqual([
    { source: "template" },
  ]);
});

test("reminders: three leads, each with an email and a text variant, carrying the cancellation fee", async ({ page }) => {
  await open(page, "/visit/reminders");
  for (const lead of ["48 hours before", "24 hours before", "1 hour before"]) {
    await expect(page.getByRole("heading", { name: lead })).toBeVisible();
  }
  const first = page.getByRole("region", { name: "48 hours reminder" });
  await expect(first.getByRole("article", { name: "Email reminder" })).toBeVisible();
  await expect(first.getByRole("article", { name: "Text reminder" })).toBeVisible();
  await expect(first).toContainText("$100");
});

test("pre-visit email: a general and a condition-specific example, labeled illustrative", async ({ page }) => {
  await open(page, "/visit/email");
  await expect(page.getByRole("region", { name: "general email" })).toContainText("illustrative");
  const tailored = page.getByRole("region", { name: "condition email" });
  await expect(tailored).toContainText("illustrative");
  await expect(tailored).toContainText("feeling down");
});

test("day of visit: joining fires visit.joined", async ({ page }) => {
  await open(page, "/visit/day");
  await page.getByRole("button", { name: "Join video visit" }).click();
  expect((await events(page)).filter((e) => e.event === "visit.joined")).toHaveLength(1);
});

test("visit complete: the completed state fires visit.completed", async ({ page }) => {
  await open(page, "/visit/complete", { ...SEED, demo: { ...SEED.demo, visitComplete: true } });
  await expect(page.getByRole("heading", { name: "Your visit is complete" })).toBeVisible();
  expect((await events(page)).filter((e) => e.event === "visit.completed")).toHaveLength(1);
});

test("no after-payment event carries PII, free text or a health answer", async ({ page }) => {
  await setModel(page, "ok");
  await open(page, "/visit/before");
  await page.getByRole("button", { name: "Confirm my details" }).click();
  await page.getByRole("button", { name: "Use the synthetic sample" }).click();
  await page.getByRole("button", { name: "Allow record requests" }).click();
  await page.getByTestId("summary-text").fill("secret note about low mood");

  const fired = await events(page);
  const serialized = JSON.stringify(fired.map(({ event, step, properties }) => ({ event, step, properties })));
  for (const forbidden of ["Dana", "Whitfield", "low_mood", "low mood", "secret", "1990", "weekday"]) {
    expect(serialized, `events must not contain "${forbidden}"`).not.toContain(forbidden);
  }
  for (const event of fired) {
    for (const value of Object.values(event.properties)) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
      if (typeof value === "string") expect(value).toMatch(/^[a-z_]+$/);
    }
  }
});
