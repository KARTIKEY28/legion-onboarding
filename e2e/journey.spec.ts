import { expect, test } from "@playwright/test";
import { ELIGIBLE, answerAbout, choosePath, events, pickTopic, setModel, startFlow } from "./helpers";

/**
 * The whole funnel, Start to Visit complete, on a phone. Also the end-to-end
 * timing run: its own duration is the Start-to-outcome time.
 */
test("Start to Visit complete: the full funnel reaches the primary outcome", async ({ page }) => {
  await setModel(page, "ok");

  // Onboarding
  await startFlow(page);
  await answerAbout(page, ELIGIBLE);
  await expect(page.getByText("Step 3 of 10 · Conditions")).toBeVisible();
  await pickTopic(page, "Trouble sleeping");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 4 of 10 · Safety")).toBeVisible();
  await page.getByRole("group", { name: /thoughts of ending your life/ }).getByLabel("No", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await choosePath(page, "I'll pay without insurance");
  await expect(page.getByText("Step 6 of 10 · Needs")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Match → Cost → Account
  await expect(page).toHaveURL(/\/match$/);
  await page.getByRole("article").first().getByRole("button", { name: /AM|PM/ }).first().click();
  await expect(page.getByText("Step 8 of 10 · Cost and terms")).toBeVisible();
  await page.getByRole("link", { name: "Continue to create your account" }).click();

  await expect(page.getByText("Step 9 of 10 · Account")).toBeVisible();
  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Last name").fill("Rivera");
  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Phone").fill("5550100142");
  await page.getByRole("button", { name: "Continue to payment" }).click();

  // Payment
  await expect(page.getByText("Step 10 of 10 · Payment")).toBeVisible();
  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByLabel("Expiry (MM/YY)").fill("12/30");
  await page.getByLabel("Security code").fill("123");
  await page.getByLabel("ZIP").fill("75001");
  await page.getByRole("button", { name: "Book my visit" }).click();

  // After payment: walk the proposal screens to the end.
  await expect(page).toHaveURL(/\/confirmation$/);
  await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();
  await page.getByRole("link", { name: "Get ready for your visit" }).click();
  await expect(page.getByRole("heading", { name: "Before your visit" })).toBeVisible();
  await page.getByRole("link", { name: "I'm ready for my visit" }).click();
  await expect(page).toHaveURL(/\/visit\/day$/);
  await page.getByRole("button", { name: "Join video visit" }).click();

  // The funnel up to the visit fired (captured before the reload below clears
  // the in-session event log).
  const names = (await events(page)).map((e) => e.event);
  for (const expected of [
    "onboarding.started",
    "provider.selected",
    "payment.succeeded",
    "visit.booked",
    "confirmation.viewed",
    "intake.started",
    "visit.joined",
  ]) {
    expect(names, `missing ${expected}`).toContain(expected);
  }

  // The dev control completes the visit (seeded directly, as the panel would).
  await page.evaluate(() => {
    const a = JSON.parse(sessionStorage.getItem("legion.answers") || "{}");
    a.demo = { ...(a.demo ?? {}), visitComplete: true };
    sessionStorage.setItem("legion.answers", JSON.stringify(a));
  });
  await page.goto("/visit/complete");
  await expect(page.getByRole("heading", { name: "Your visit is complete" })).toBeVisible();
  expect((await events(page)).filter((e) => e.event === "visit.completed")).toHaveLength(1);
});
