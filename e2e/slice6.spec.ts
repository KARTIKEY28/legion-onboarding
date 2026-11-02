import { expect, test, type Page } from "@playwright/test";
import { events, setModel } from "./helpers";

// Seed answers directly, then open a later step without walking the whole flow.
async function seed(page: Page, answers: Record<string, unknown>) {
  await page.goto("/start");
  await page.evaluate((a) => sessionStorage.setItem("legion.answers", JSON.stringify(a)), answers);
}

const PICKED = {
  inTexas: "yes",
  dob: { month: "04", day: "15", year: "1990" },
  conditions: { topics: ["low_mood"], unsure: false, skipped: false },
  needs: { availability: ["weekday_afternoons"] },
  insurance: { path: "self_pay" },
  selectedClinician: { id: "c1", name: "Dr. Dana Whitfield" },
  selectedSlot: { iso: "2026-11-10T14:00:00.000Z", label: "Tue, Nov 10 · 2:00 PM" },
  notifyEmail: "patient@example.com",
};

test("cost: the chosen clinician and time lead, Change links back to Match, Continue requests the reservation", async ({ page }) => {
  await setModel(page, "fail"); // template summary, deterministic
  await seed(page, PICKED);
  await page.goto("/cost");

  await expect(page.getByText("Step 8 of 10 · Cost and terms")).toBeVisible();
  const visit = page.getByRole("region", { name: "Your chosen visit" });
  await expect(visit).toContainText("Dr. Dana Whitfield");
  await expect(visit).toContainText("Tue, Nov 10 · 2:00 PM");
  await visit.getByRole("link", { name: "Change" }).click();
  await expect(page).toHaveURL(/\/match$/);

  await page.goBack();
  await expect(page.getByText("Step 8 of 10 · Cost and terms")).toBeVisible();
  // The old reviewer line is gone.
  await expect(page.getByText(/comes from a fixed price list/)).toHaveCount(0);

  await page.getByRole("link", { name: "Continue to create your account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  expect((await events(page)).filter((e) => e.event === "reservation.requested")).toHaveLength(1);
});

test("account: email is prefilled, DOB is read-only with Edit, no password, creating routes to payment", async ({ page }) => {
  await seed(page, PICKED);
  await page.goto("/account");

  await expect(page.getByText("Step 9 of 10 · Account")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("patient@example.com");
  await expect(page.getByTestId("account-dob")).toHaveText("04/15/1990");
  await expect(page.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/about");
  await expect(page.getByText(/email you a link to sign in after you book/)).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveCount(0);

  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Last name").fill("Rivera");
  await page.getByLabel("Phone").fill("555-0100");
  await page.getByRole("button", { name: "Continue to payment" }).click();

  await expect(page).toHaveURL(/\/payment$/);
  await expect(page.getByText(/Nothing has been booked or charged/)).toBeVisible();

  const fired = await events(page);
  expect(fired.filter((e) => e.event === "account.viewed")).toHaveLength(1);
  expect(fired.filter((e) => e.event === "account.created").map((e) => e.properties)).toEqual([{ email_prefilled: true }]);
});

test("account: missing details get calm errors", async ({ page }) => {
  await seed(page, { ...PICKED, notifyEmail: undefined });
  await page.goto("/account");
  await expect(page.getByLabel("Email")).toHaveValue("");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page).not.toHaveURL(/\/payment$/);
  await expect(page.getByText("Please add your first name.")).toBeVisible();
  await expect(page.getByText("Please add your email.")).toBeVisible();
  expect((await events(page)).filter((e) => e.event === "account.created")).toHaveLength(0);
});

test("account: an already-registered email offers a sign-in link and creates no account", async ({ page }) => {
  await seed(page, PICKED);
  await page.goto("/account");
  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Last name").fill("Rivera");
  await page.getByLabel("Email").fill("returning@example.com");
  await page.getByLabel("Phone").fill("555-0100");
  await page.getByRole("button", { name: "Continue to payment" }).click();

  await expect(page).not.toHaveURL(/\/payment$/);
  await expect(page.getByText(/already have an account/)).toBeVisible();
  await page.getByRole("button", { name: "Send me a sign-in link" }).click();
  await expect(page.getByText(/sent a sign-in link/)).toBeVisible();
  expect((await events(page)).filter((e) => e.event === "account.created")).toHaveLength(0);
});

test("no event carries a name, email, phone or date of birth", async ({ page }) => {
  await seed(page, PICKED);
  await page.goto("/account");
  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Last name").fill("Rivera");
  await page.getByLabel("Phone").fill("555-0100");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page).toHaveURL(/\/payment$/);

  const fired = await events(page);
  const serialized = JSON.stringify(fired.map(({ event, step, device_type, properties }) => ({ event, step, device_type, properties })));
  for (const forbidden of ["Alex", "Rivera", "patient@example.com", "555-0100", "1990", "04/15"]) {
    expect(serialized, `events must not contain "${forbidden}"`).not.toContain(forbidden);
  }
  for (const event of fired) {
    for (const value of Object.values(event.properties)) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
      if (typeof value === "string") expect(value).toMatch(/^[a-z_]+$/);
    }
  }
});
