import { expect, test } from "@playwright/test";
import { ELIGIBLE, answerAbout, choosePath, pickTopic, setModel, startFlow } from "./helpers";

// The primary action must be reachable without scrolling on a small phone.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

test("the primary action is in the viewport at every step (390x844)", async ({ page }) => {
  await setModel(page, "fail");

  await page.goto("/start");
  await expect(page.getByRole("link", { name: "Get started" })).toBeInViewport();

  await startFlow(page);
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await answerAbout(page, ELIGIBLE);

  await expect(page.getByText("Step 3 of 10 · Conditions")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await pickTopic(page, "Trouble sleeping");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 4 of 10 · Safety")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await page.getByRole("group", { name: /thoughts of ending your life/ }).getByLabel("No", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 5 of 10 · Insurance")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await choosePath(page, "I'll pay without insurance");

  await expect(page.getByText("Step 6 of 10 · Needs")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await page.getByRole("button", { name: "Continue" }).click();

  // Match is a selection list (no single primary action): pick the first open time.
  await expect(page).toHaveURL(/\/match$/);
  await page.getByRole("article").first().getByRole("button", { name: /AM|PM/ }).first().click();

  await expect(page.getByText("Step 8 of 10 · Cost and terms")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to create your account" })).toBeInViewport();
});
