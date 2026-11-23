import { expect, test } from "@playwright/test";
import { ELIGIBLE, answerAbout, pickTopic, setModel, startFlow } from "./helpers";

// The primary action must be reachable without scrolling on a small phone.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

test("the primary action is in the viewport at every step (390x844)", async ({ page }) => {
  await setModel(page, "fail");

  await page.goto("/start");
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();

  await startFlow(page);
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await answerAbout(page, ELIGIBLE);

  await expect(page.getByTestId("progress-step")).toHaveText("Conditions");
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await pickTopic(page, "Trouble sleeping");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByTestId("progress-step")).toHaveText("Safety");
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await page.getByRole("group", { name: /thoughts of ending your life/ }).getByLabel("No", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByTestId("progress-step")).toHaveText("Insurance");
  // Choosing a path reveals the primary action, which must then be in view.
  await page.getByLabel("I'll pay without insurance", { exact: true }).check();
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await page.getByRole("button", { name: "Continue" }).click();

  // Insurance goes straight to Match (Needs is gone). Pick a time; the sticky Continue is in view.
  await expect(page).toHaveURL(/\/match$/);
  await page.getByRole("article").first().getByRole("button", { name: /AM|PM/ }).first().click();
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByTestId("progress-step")).toHaveText("Cost and terms");
  await expect(page.getByRole("link", { name: "Continue to create your account" })).toBeInViewport();
});

const FULL_PERSONA = {
  inTexas: "yes",
  state: "TX",
  dob: { month: "03", day: "14", year: "1992" },
  conditions: { topics: ["low_mood", "worry"], unsure: false, skipped: false },
  safety: { recentThoughts: "no" },
  needs: { availability: ["weekday_mornings"] },
  insurance: { path: "insured", payerId: "sample_insurance", memberId: "SAMPLE123" },
  notifyEmail: "alex.rivera@example.com",
  patient: { firstName: "Alex", lastName: "Rivera", phone: "(555) 010-0142" },
  selectedClinician: { id: "c1", name: "Dana Whitfield" },
  selectedSlot: { iso: "2026-11-16T15:00:00.000Z", label: "Mon, Nov 16 · 9:00 AM" },
  booked: true,
  demo: { insuranceState: "confirmed", visitComplete: true },
};

const PAGES = [
  "/start",
  "/about",
  "/conditions",
  "/safety",
  "/insurance",
  "/match",
  "/cost",
  "/account",
  "/payment",
  "/confirmation",
  "/visit/before",
  "/visit/reminders",
  "/visit/email",
  "/visit/day",
  "/visit/complete",
];

test("no page scrolls horizontally at 390x844", async ({ page }) => {
  await setModel(page, "fail");
  await page.goto("/start");
  await page.evaluate((a) => sessionStorage.setItem("legion.answers", JSON.stringify(a)), FULL_PERSONA);

  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});
