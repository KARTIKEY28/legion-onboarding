import { expect, test, type Page } from "@playwright/test";
import { events } from "./helpers";

const BOOKED = {
  inTexas: "yes",
  state: "TX",
  dob: { month: "04", day: "15", year: "1990" },
  conditions: { topics: ["low_mood"], unsure: false, skipped: false },
  needs: { availability: ["weekday_afternoons"] },
  insurance: { path: "self_pay" },
  selectedClinician: { id: "c1", name: "Dr. Dana Whitfield" },
  selectedSlot: { iso: "2026-11-10T20:00:00.000Z", label: "Tue, Nov 10 · 2:00 PM" },
};

const CARDS = {
  success: "4242 4242 4242 4242",
  declined: "4000 0000 0000 0002",
  authRequired: "4000 0027 6000 3184",
};

async function seedPayment(page: Page, answers: Record<string, unknown> = BOOKED) {
  await page.goto("/start");
  await page.evaluate((a) => sessionStorage.setItem("legion.answers", JSON.stringify(a)), answers);
  await page.goto("/payment");
  await expect(page.getByTestId("progress-step")).toHaveText("Payment");
}

async function fillCard(page: Page, number: string) {
  await page.getByLabel("Card number").fill(number);
  await page.getByLabel("Expiry (MM/YY)").fill("12/30");
  await page.getByLabel("Security code").fill("123");
  await page.getByLabel("ZIP").fill("75001");
}

test("the booking summary shows the clinician, Central Time and the cancellation fee", async ({ page }) => {
  await seedPayment(page);
  const summary = page.getByRole("region", { name: "Booking summary" });
  await expect(summary).toContainText("Dr. Dana Whitfield");
  // 20:00 UTC is 2:00 PM Central.
  await expect(page.getByTestId("booking-when")).toContainText("2:00 PM CT");
  await expect(summary).toContainText("48 hours");
  await expect(summary).toContainText("$100");
});

test("success: 4242 books the visit, fires payment.succeeded and visit.booked, no PII", async ({ page }) => {
  await seedPayment(page);
  await fillCard(page, CARDS.success);
  await page.getByRole("button", { name: "Book my visit" }).click();
  await expect(page).toHaveURL(/\/confirmation$/);

  const fired = await events(page);
  const names = fired.map((e) => e.event);
  expect(names).toContain("payment.succeeded");
  expect(names).toContain("visit.booked");

  const serialized = JSON.stringify(fired.map(({ event, step, properties }) => ({ event, step, properties })));
  for (const forbidden of ["4242", "75001", "Dana", "Whitfield"]) {
    expect(serialized, `events must not contain "${forbidden}"`).not.toContain(forbidden);
  }
  for (const event of fired) {
    for (const value of Object.values(event.properties)) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
    }
  }
});

test("declined card: a calm message, details kept, payment.failed with the reason code", async ({ page }) => {
  await seedPayment(page);
  await fillCard(page, CARDS.declined);
  await page.getByRole("button", { name: "Book my visit" }).click();
  await expect(page.getByText("Your card was declined")).toBeVisible();
  await expect(page).not.toHaveURL(/\/confirmation$/);
  // Entered details are kept.
  await expect(page.getByLabel("Card number")).toHaveValue(/4000/);
  expect((await events(page)).filter((e) => e.event === "payment.failed").map((e) => e.properties)).toEqual([
    { reason: "card_declined" },
  ]);
});

test("authentication required: a challenge appears, confirming it books the visit", async ({ page }) => {
  await seedPayment(page);
  await fillCard(page, CARDS.authRequired);
  await page.getByRole("button", { name: "Book my visit" }).click();
  await expect(page.getByText("Your bank needs to confirm it's you")).toBeVisible();
  await expect(page).not.toHaveURL(/\/confirmation$/);
  await page.getByRole("button", { name: "Confirm with your bank" }).click();
  await expect(page).toHaveURL(/\/confirmation$/);
  expect((await events(page)).filter((e) => e.event === "payment.succeeded")).toHaveLength(1);
});

test("slot taken at booking: a calm state with next times, then a retry books", async ({ page }) => {
  await page.context().addCookies([{ name: "dev_slot_taken", value: "1", url: "http://localhost:3100" }]);
  await seedPayment(page);
  await fillCard(page, CARDS.success);
  await page.getByRole("button", { name: "Book my visit" }).click();

  await expect(page.getByText("That time was just taken")).toBeVisible();
  await expect(page).not.toHaveURL(/\/confirmation$/);
  expect((await events(page)).filter((e) => e.event === "slot.unavailable_at_booking")).toHaveLength(1);

  // Pick one of the clinician's next openings, then book.
  await page.getByRole("region", { name: "That time was just taken" }).getByRole("button").first().click();
  await fillCard(page, CARDS.success);
  await page.getByRole("button", { name: "Book my visit" }).click();
  await expect(page).toHaveURL(/\/confirmation$/);
});
