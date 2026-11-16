import { expect, test, type Page } from "@playwright/test";
import { events, setModel } from "./helpers";

// Seed answers directly, then open the Match page.
async function seedAndOpenMatch(page: Page, answers: Record<string, unknown>) {
  await page.goto("/start");
  await page.evaluate((a) => sessionStorage.setItem("legion.answers", JSON.stringify(a)), answers);
  await page.goto("/match");
  await expect(page.getByTestId("progress-step")).toHaveText("Match");
}

const STRONG = {
  inTexas: "yes",
  state: "TX",
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

test("filter chips (time, language, gender) filter the list and fire match.filter_changed", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);

  await page.getByRole("button", { name: "Mornings", exact: true }).click();
  await expect(page.getByRole("article").first()).toContainText("Mornings openings"); // window, not "Next opening"

  // Language and gender are live chips too, grouped by their own controls.
  await page.getByRole("group", { name: "Filter by language" }).getByRole("button", { name: "Spanish", exact: true }).click();
  await page.getByRole("group", { name: "Filter by clinician gender" }).getByRole("button", { name: "Man", exact: true }).click();

  expect((await events(page)).filter((e) => e.event === "match.filter_changed").map((e) => e.properties)).toEqual([
    { type: "time", value: "weekday_mornings" },
    { type: "language", value: "es" },
    { type: "gender", value: "man" },
  ]);
  // Chips never empty the list: a reset is always offered if fewer than 3 remain.
  await expect(page.getByRole("article").first()).toBeVisible();
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

test("language and gender chips are soft: they never dead-end, a reset is always offered", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);

  // A restrictive combo (Spanish + Woman) narrows below three, but never empties:
  // the matching clinicians stay and a one-tap reset appears.
  await page.getByRole("group", { name: "Filter by language" }).getByRole("button", { name: "Spanish", exact: true }).click();
  await page.getByRole("group", { name: "Filter by clinician gender" }).getByRole("button", { name: "Woman", exact: true }).click();

  await expect(page.getByRole("button", { name: "Reset filters" })).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();

  // Reset brings the full set back.
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("clinician profile: opens as its own page, and browser back returns to the match list", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);

  const card = page.getByRole("article").first();
  await card.getByRole("button", { name: /Open .* profile/ }).click();

  // A full page at /clinician/[id], not a drawer.
  await expect(page).toHaveURL(/\/clinician\/[\w-]+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Why we matched you")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Availability (next 2 weeks)" })).toBeVisible();
  expect((await events(page)).filter((e) => e.event === "profile.opened")).toHaveLength(1);

  // Browser back returns to the match list, inside the flow.
  await page.goBack();
  await expect(page).toHaveURL(/\/match$/);
  await expect(page.getByRole("article").first()).toBeVisible();
});

test("profile booking panel: carried cost, then Add insurance round-trips back to the profile", async ({ page }) => {
  await setModel(page, "ok");
  await seedAndOpenMatch(page, STRONG); // self-pay, no insurance yet

  await page.getByRole("article").first().getByRole("button", { name: /Open .* profile/ }).click();
  await expect(page).toHaveURL(/\/clinician\/[\w-]+/);
  // Self-pay: booking area shows the self-pay estimate and an Add insurance action.
  await expect(page.getByText("$250 for your first visit, $150 for follow ups.")).toBeVisible();
  await page.getByRole("button", { name: "Add insurance" }).click();

  // Routes to Insurance, carrying a return to this clinician's profile.
  await expect(page).toHaveURL(/\/insurance\?returnTo=/);
  await page.getByLabel("I have insurance", { exact: true }).check();
  await page.getByRole("button", { name: "Find my coverage" }).click();
  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Last name").fill("Rivera");
  await page.getByRole("button", { name: "Find my coverage" }).click();
  await page.getByRole("button", { name: "Yes, that's my plan" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Back on the same clinician's page, now showing the copay and no Add insurance.
  await expect(page).toHaveURL(/\/clinician\/[\w-]+/);
  await expect(page.getByText("Your estimated cost per visit: $30 with Example Health Plan. We'll confirm before your visit.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add insurance" })).toHaveCount(0);
});

test("search box: an example maps phrases to filters, shown as removable chips, with a clean event", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);

  await page.getByRole("button", { name: "A Spanish-speaking clinician for depression and ADHD" }).click();

  // The parsed filters show as removable chips (language + the two conditions).
  const applied = page.getByRole("group", { name: "Applied filters" });
  await expect(applied.getByRole("button", { name: /Remove filter Spanish/ })).toBeVisible();
  await expect(applied.getByRole("button", { name: /Remove filter low mood/ })).toBeVisible();
  await expect(applied.getByRole("button", { name: /Remove filter focus and attention/ })).toBeVisible();

  // The event carries only the fixed filter tokens, never the free text.
  const used = (await events(page)).filter((e) => e.event === "match.search_used");
  expect(used).toHaveLength(1);
  expect(used[0].properties.filters_applied).toEqual(expect.arrayContaining(["es", "low_mood", "focus"]));
  const serialized = JSON.stringify(used);
  for (const forbidden of ["Spanish-speaking", "depression", "ADHD"]) expect(serialized).not.toContain(forbidden);

  // A chip is removable.
  await applied.getByRole("button", { name: /Remove filter Spanish/ }).click();
  await expect(applied.getByRole("button", { name: /Remove filter Spanish/ })).toHaveCount(0);
});

test("search box: the cultural path matches a clinician with a stated background, never by race", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);
  await page.getByRole("button", { name: "A Latina clinician who understands my culture" }).click();

  await expect(page.getByRole("group", { name: "Applied filters" }).getByRole("button", { name: /Shared cultural background/ })).toBeVisible();
  // At least one clinician remains, and their profile states a cultural background.
  await page.getByRole("article").first().getByRole("button", { name: /Open .* profile/ }).click();
  await expect(page).toHaveURL(/\/clinician\/[\w-]+/);
  await expect(page.getByRole("heading", { name: "Cultural background" })).toBeVisible();
});

test("search box: an unrecognised phrase applies nothing, shows everyone, never errors", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);
  await page.getByLabel(/Describe what you're looking for/).fill("someone kind and patient");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText(/Showing everyone\. Refine with the filters above\./)).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(3);
  const used = (await events(page)).filter((e) => e.event === "match.search_used");
  expect(used[0].properties.filters_applied).toEqual([]);
});

test("clinician profile: the role explainer avoids prescribing claims", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);
  await page.getByRole("article").first().getByRole("button", { name: /Open .* profile/ }).click();
  await expect(page).toHaveURL(/\/clinician\/[\w-]+/);
  await page.getByRole("button", { name: "What's the difference?" }).click();
  const explainer = page.getByText(/medical doctor who specializes in mental health/);
  await expect(explainer).toBeVisible();
  await expect(explainer).not.toContainText(/prescri/i);
});

test("clinician profile: picking a time there selects from the profile", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);
  await page.getByRole("article").first().getByRole("button", { name: /Open .* profile/ }).click();
  await expect(page).toHaveURL(/\/clinician\/[\w-]+/);

  // Picking a time on the profile page shows the sticky confirm bar, as on the card.
  await page.getByRole("heading", { name: "Availability (next 2 weeks)" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /AM|PM/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/cost$/);

  const selected = (await events(page)).filter((e) => e.event === "provider.selected");
  expect(selected).toHaveLength(1);
  expect(selected[0].properties.source).toBe("profile");
});

test("back to matches: filters and scroll position are preserved (the 37% cliff)", async ({ page }) => {
  await setModel(page, "fail");
  await seedAndOpenMatch(page, STRONG);

  // Apply a filter, then open the full list so the page is tall enough to scroll.
  await page.getByRole("group", { name: "Filter by language" }).getByRole("button", { name: "Spanish", exact: true }).click();
  await page.getByRole("button", { name: "See all clinicians" }).click();
  await page.evaluate(() => window.scrollTo(0, 500));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(100);

  // Open a profile, then come back.
  await page.getByRole("article").first().getByRole("button", { name: /Open .* profile/ }).click();
  await expect(page).toHaveURL(/\/clinician\/[\w-]+/);
  await page.getByRole("button", { name: "← Back to matches" }).click();
  await expect(page).toHaveURL(/\/match$/);

  // The Spanish filter is still applied and the scroll position is restored.
  await expect(page.getByRole("group", { name: "Applied filters" }).getByRole("button", { name: /Spanish/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
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
