import { expect, test, type Page } from "@playwright/test";
import { events, setModel } from "./helpers";

// Seed answers directly, then open the Match page.
async function seedAndOpenMatch(page: Page, answers: Record<string, unknown>) {
  await page.goto("/start");
  await page.evaluate((a) => sessionStorage.setItem("legion.answers", JSON.stringify(a)), answers);
  await page.goto("/match");
  await expect(page.getByText("Step 7 of 10 · Match")).toBeVisible();
}

const STRONG = {
  inTexas: "yes",
  conditions: { topics: ["low_mood", "worry"], unsure: false, skipped: false },
  insurance: { path: "self_pay" },
};

test("select a time, confirm in the sticky bar, clean events and the self-pay estimate", async ({ page }) => {
  await setModel(page, "fail"); // template headline, deterministic
  await seedAndOpenMatch(page, STRONG);

  await expect(page.getByTestId("match-headline")).toHaveAttribute("data-source", "template");
  // The cost line under the headline (self pay here).
  await expect(page.getByTestId("match-cost-line")).toHaveText("$250 for your first visit, $150 for follow ups.");

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toContainText("Focuses on");
  await expect(cards.first()).toContainText("Next opening:"); // B3 default time reason
  await expect(cards.first()).toContainText("Illustrative");

  // Tapping a time selects it (no navigation) and opens the sticky confirm bar.
  await cards.first().getByRole("button", { name: /AM|PM/ }).first().click();
  await expect(page).toHaveURL(/\/match$/);
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  expect((await events(page)).filter((e) => e.event === "slot.selected")).toHaveLength(1);

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/cost$/);

  const fired = await events(page);
  const byName = (n: string) => fired.filter((e) => e.event === n).map((e) => e.properties);
  expect(byName("match.viewed")).toEqual([{ match_count: 3, no_strong_match: false }]);
  expect(byName("reflect_back.shown")).toEqual([{ source: "template", on_step: "match" }]);
  const selected = byName("provider.selected");
  expect(selected).toHaveLength(1);
  expect(selected[0].from).toBe("top_match");
  expect(selected[0].source).toBe("card");
  expect(selected[0].rank).toBe(1);

  // No clinician name is ever in an event.
  const serialized = JSON.stringify(fired.map(({ event, properties }) => ({ event, properties })));
  for (const name of ["Dana", "Whitfield", "Marco", "Reyes"]) {
    expect(serialized).not.toContain(name);
  }
});

test("the headline no longer mentions time windows", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);
  await expect(page.getByTestId("match-headline")).toContainText("Clinicians who work with low mood and ongoing worry.");
});

test("time chips filter the list and fire match.time_filter_changed", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);
  await page.getByRole("button", { name: "Mornings", exact: true }).click();
  expect((await events(page)).filter((e) => e.event === "match.time_filter_changed").map((e) => e.properties)).toEqual([
    { value: "weekday_mornings" },
  ]);
  await expect(page.getByRole("article").first()).toBeVisible();
  // The card's time reason is now the window, not "Next opening".
  await expect(page.getByRole("article").first()).toContainText("Mornings openings");
});

test("'None of these feel right' shows the no-strong-match state and fires the event", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);
  await page.getByRole("button", { name: "None of these feel right" }).click();
  await expect(page.getByText(/couldn't find a clinician who fits everything/)).toBeVisible();
  expect((await events(page)).filter((e) => e.event === "match.none_selected")).toHaveLength(1);
});

test("'See all clinicians' opens the full list and selecting fires from full_list", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);
  await page.getByRole("button", { name: "See all clinicians" }).click();
  await expect(page.getByText("All clinicians with openings, most relevant first.")).toBeVisible();
  expect((await events(page)).filter((e) => e.event === "match.full_list_opened")).toHaveLength(1);

  await page.getByRole("article").first().getByRole("button", { name: /AM|PM/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/cost$/);
  const selected = (await events(page)).filter((e) => e.event === "provider.selected");
  expect(selected[0].properties.from).toBe("full_list");
});

test("no strong match: a language with no matching clinician shows the closest options and notify", async ({ page }) => {
  await setModel(page, "fail");
  // Worry + Spanish: no Spanish-speaking clinician works with worry, so no strong match.
  await seedAndOpenMatch(page, {
    inTexas: "yes",
    conditions: { topics: ["worry"], unsure: false, skipped: false },
    needs: { language: "es" },
    insurance: { path: "self_pay" },
  });

  await expect(page.getByText(/couldn't find a clinician who fits everything/)).toBeVisible();
  expect((await events(page)).filter((e) => e.event === "match.viewed")[0].properties.no_strong_match).toBe(true);
  await expect(page.getByRole("button", { name: /Tell me when more openings/ })).toBeVisible();
});

test("clinician profile: opens from the card, reflects in the URL, Escape closes it", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);

  const card = page.getByRole("article").first();
  await card.getByRole("button", { name: /Open .* profile/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Why we matched you");
  await expect(dialog).toContainText("Availability");
  await expect(page).toHaveURL(/\?clinician=/);
  expect((await events(page)).filter((e) => e.event === "profile.opened")).toHaveLength(1);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/\?clinician=/);
});

test("clinician profile: the role explainer avoids prescribing claims", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);
  await page.getByRole("article").first().getByRole("button", { name: /Open .* profile/ }).click();
  await page.getByRole("button", { name: "What's the difference?" }).click();
  const explainer = page.getByText(/medical doctor who specializes in mental health/);
  await expect(explainer).toBeVisible();
  await expect(explainer).not.toContainText(/prescri/i);
});

test("clinician profile: picking a time there selects from the profile", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);
  await page.getByRole("article").first().getByRole("button", { name: /Open .* profile/ }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /AM|PM/ }).first().click();
  // The profile closes and the sticky confirm bar appears.
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/cost$/);

  const selected = (await events(page)).filter((e) => e.event === "provider.selected");
  expect(selected).toHaveLength(1);
  expect(selected[0].properties.source).toBe("profile");
});

test("slot taken at booking: a calm message, the event fires, and a retry works", async ({ page }) => {
  await setModel(page, "fail");
  await page.context().addCookies([{ name: "dev_slot_taken", value: "1", url: "http://localhost:3100" }]);
  await seedAndOpenMatch(page, STRONG);

  const card = page.getByRole("article").first();
  await card.getByRole("button", { name: /AM|PM/ }).first().click();
  await expect(card.getByText(/was just taken/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
  expect((await events(page)).filter((e) => e.event === "slot.unavailable_at_booking")).toHaveLength(1);

  // Picking another offered time now selects and confirms.
  await card.getByRole("button", { name: /AM|PM/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/cost$/);
});
