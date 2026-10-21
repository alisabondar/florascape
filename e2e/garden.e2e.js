import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function choose(page, triggerName, optionName) {
  await page.getByRole("combobox", { name: triggerName }).click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

/** Walks the three planner steps for one 8 × 4 ft sunny raised bed of vegetables. */
async function planGarden(page) {
  await page.goto("/planner");
  await expect(page.getByText("Step 1 of 3")).toBeVisible();

  await page.getByLabel("ZIP Code *").fill("80205");
  await choose(page, "Garden Type *", "Raised beds");
  await page.getByRole("button", { name: "Next: Your space" }).click();

  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  await page.getByLabel("Width (feet) *").first().fill("8");
  await page.getByLabel("Length (feet) *").first().fill("4");
  await choose(page, "Sun exposure *", "Full sun (6+ hours)");
  await expect(page.getByRole("img", { name: /Preview: .*8 by 4 feet/ })).toBeVisible();
  await page.getByRole("button", { name: "Next: What to grow" }).click();

  await expect(page.getByText("Step 3 of 3")).toBeVisible();
  await page.getByRole("checkbox", { name: "Vegetables" }).click();
  await page.getByRole("button", { name: "Generate My Garden" }).click();

  await expect(page).toHaveURL(/\/planner\/result/);
  await expect(page.getByText("Starter plan", { exact: true })).toBeVisible();
}

const groupNames = (page) => page.locator(".plant-group-adjustment").evaluateAll((rows) =>
  rows.map((row) => row.querySelector(".ui-select-trigger, strong")?.textContent.trim()),
);

test("the three planner steps produce a starter plan", async ({ page }) => {
  await planGarden(page);
  await expect(page.getByRole("heading", { name: "Your garden sketch" })).toBeVisible();
  await expect(page.locator(".patch-hit").first()).toBeVisible();
  expect((await groupNames(page)).length).toBeGreaterThanOrEqual(3);
});

test("Shuffle Plants changes the plants", async ({ page }) => {
  await planGarden(page);
  const before = await groupNames(page);
  await page.getByRole("button", { name: "Shuffle Plants" }).click();
  await expect.poll(() => groupNames(page)).not.toEqual(before);
});

test("the chat answers a spacing question from the plan", async ({ page }) => {
  await planGarden(page);
  await page.getByLabel("Ask a question about your garden").fill("How far apart should I plant the tomatoes?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  const reply = page.locator(".garden-chat-message.assistant").last();
  await expect(reply).toContainText("From your plan");
  await expect(reply).toContainText(/Space Tomato about \d+ inches apart\./);
});

test("Add to calendar downloads an .ics file", async ({ page }) => {
  await planGarden(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("florascape-planting-calendar.ics");
  const contents = await readFile(await download.path(), "utf8");
  expect(contents.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
  expect(contents).toContain("BEGIN:VEVENT");
});
