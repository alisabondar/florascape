// Records the README demo by clicking through a running FloraScape.
// Run against the offline e2e server so every plan is the same starter plan:
//   bun run dev:e2e            # in one terminal (port 3100, AI and climate off)
//
// Recorded here (default): a headless browser, captured frame by frame into docs/demo.mp4.
// Needs ffmpeg on PATH.
//   node scripts/record-demo.mjs [http://localhost:3100]
//
// Presenter mode (--present): plays the same walkthrough in a visible Chrome window using the
// real mouse pointer, for screen recorders like Screen Studio whose zoom and cursor effects
// follow real clicks. Needs cliclick (brew install cliclick) and Accessibility permission for
// the terminal you run it from. Start recording the window during the countdown.
//   node scripts/record-demo.mjs --present [--countdown 5] [http://localhost:3100]
// --dry-run with --present checks the pointer positions headlessly without moving the pointer.
//
// A fresh browser profile is used, so saved albums and XP on your own browser are untouched.
// GitHub only plays a video inline when it's uploaded: drag docs/demo.mp4 into the README editor on github.com.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const PRESENT = args.includes("--present");
const DRY_RUN = args.includes("--dry-run");
const VERBOSE = args.includes("--verbose");
const countdownIndex = args.indexOf("--countdown");
const COUNTDOWN_S = countdownIndex >= 0 ? Number(args[countdownIndex + 1]) || 0 : 5;
const BASE = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--countdown") ?? "http://localhost:3100";
// Presenter window, in screen points: a 16:10 window that Screen Studio can frame.
const WINDOW = { x: 60, y: 40, width: 1440, height: 900 };
const REAL_POINTER = PRESENT && !DRY_RUN;
if (!PRESENT && spawnSync("ffmpeg", ["-version"]).status !== 0) throw new Error("ffmpeg is needed on PATH.");
if (REAL_POINTER && spawnSync("cliclick", ["-V"]).status !== 0) throw new Error("cliclick is needed: brew install cliclick");
// cliclick still exits 0 without Accessibility permission (it only prints a warning and does
// nothing), so check for that up front instead of playing a demo where no click lands.
if (REAL_POINTER) {
  const probe = spawnSync("cliclick", ["p"], { encoding: "utf8" });
  if (/Accessibility privileges not enabled/i.test(`${probe.stderr}${probe.stdout}`)) {
    const app = { Apple_Terminal: "Terminal", "iTerm.app": "iTerm", vscode: "your editor (VS Code / Cursor)", WarpTerminal: "Warp", ghostty: "Ghostty" }[process.env.TERM_PROGRAM] ?? "the app this terminal runs in";
    console.error(`The pointer can't be moved yet: ${app} needs Accessibility permission.
  System Settings → Privacy & Security → Accessibility → turn on ${app} (add it with + if it isn't listed).
  Then quit and reopen ${app}, and run this again.`);
    process.exit(1);
  }
}
// Moves or clicks the real pointer (presenter mode); a no-op in dry runs.
const cliclick = (...commands) => {
  if (DRY_RUN) return;
  const out = spawnSync("cliclick", ["-e", "350", ...commands]);
  if (out.status !== 0) throw new Error(`cliclick failed: ${out.stderr}`);
};
// Recorded output is 2240x1400; at 1.5x zoom the page lays out at ~1493x933 CSS pixels, so a
// whole planner step or the garden with its timeline fits in one frame. Presenter mode stays at
// 1x and lets the screen recorder zoom.
const [OUT_W, OUT_H, ZOOM] = PRESENT ? [WINDOW.width, WINDOW.height, 1] : [2240, 1400, 1.5];
const MIN_FRAME_MS = 16;

let browser;
let page;
if (PRESENT && !DRY_RUN) {
  // A real Chrome-style app window (no address bar or "controlled by automation" banner).
  const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "flora-present-")), {
    headless: false,
    viewport: null,
    colorScheme: "light",
    ignoreDefaultArgs: ["--enable-automation"],
    args: [`--app=${BASE}/`, `--window-position=${WINDOW.x},${WINDOW.y}`, `--window-size=${WINDOW.width},${WINDOW.height}`],
  });
  browser = context;
  page = context.pages()[0] ?? (await context.newPage());
} else {
  browser = await chromium.launch();
  // Headless screencast ignores deviceScaleFactor, so render at CSS zoom in a 2x-sized window.
  page = await browser.newPage({ viewport: { width: OUT_W, height: OUT_H }, colorScheme: "light" });
}
await page.context().addInitScript((z) => document.addEventListener("DOMContentLoaded", () => {
  if (z !== 1) document.documentElement.style.zoom = String(z);
  // The app scrolls smoothly; the recorder eases its own scrolls, so jump each frame instead.
  document.documentElement.style.scrollBehavior = "auto";
  // Hide the Next.js dev overlay (issue badge, route indicator) from the recording.
  const style = document.createElement("style");
  style.textContent = `nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }
    ${z !== 1
      // Under CSS zoom Radix menus open far from their trigger; hide them, the picked value still
      // shows. At 1x (presenter mode) they open in place and stay visible.
      ? "[data-radix-popper-content-wrapper] { opacity: 0 !important; }"
      : ""}`;
  document.head.append(style);
}), ZOOM);
// Warm up every route first, so page compiles and chunk downloads don't stutter the recording.
for (const path of ["/planner/result", "/planner", "/"]) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState("networkidle");
}
await page.waitForSelector(".diorama-tick");
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

const raw = [];
let cdp = null;
if (PRESENT) {
  // The screen recorder captures; give it a moment to start.
  for (let left = COUNTDOWN_S; left > 0; left -= 1) {
    console.log(`Starting in ${left}… (start recording the FloraScape window now)`);
    await page.waitForTimeout(1000);
  }
  // macOS hands the first click on an inactive window to "activate it", not to the page, which
  // swallowed the opening slider drag. Bring the window forward and click empty background first.
  await page.bringToFront();
  // The empty gap between the hero cover and the example garden: in the main area, on nothing.
  const blank = await page.evaluate(() => {
    const cover = document.querySelector(".home-cover").getBoundingClientRect();
    const sample = document.querySelector(".home-sample").getBoundingClientRect();
    return {
      x: Math.round(window.screenX + (window.outerWidth - window.innerWidth) / 2 + (cover.right + sample.left) / 2),
      y: Math.round(window.screenY + (window.outerHeight - window.innerHeight) + (cover.top + cover.bottom) / 2),
    };
  });
  cliclick(`m:${blank.x},${blank.y}`, "c:.");
  await page.waitForTimeout(600);
  console.log("Playing the demo. Don't touch the mouse until it finishes.");
} else {
  cdp = await page.context().newCDPSession(page);
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    raw.push({ data, t: metadata.timestamp * 1000 });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "png", maxWidth: OUT_W, maxHeight: OUT_H });
}

const wait = (ms) => page.waitForTimeout(ms);
// Eased scroll to `top` (px, 'end', or a selector to bring near the top), measured inside the page.
const smoothScroll = async (top, { speed = 900, min = 900, max = 2600, offset = 90 } = {}) => {
  await page.evaluate(([top, speed, min, max, offset]) => new Promise((done) => {
    const el = document.scrollingElement;
    const zoom = Number(document.documentElement.style.zoom) || 1;
    const target = typeof top === "string" && top !== "end" ? document.querySelector(top) : null;
    const to = top === "end" ? el.scrollHeight - el.clientHeight
      // Under CSS zoom, rects are already in zoomed pixels, like scrollTop.
      : target ? Math.max(0, el.scrollTop + target.getBoundingClientRect().top - offset * zoom)
      : top;
    const from = el.scrollTop;
    const dur = Math.min(max, Math.max(min, (Math.abs(to - from) / (speed * zoom)) * 1000));
    const start = performance.now();
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.scrollTop = from + (to - from) * ease(p);
      if (p < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  }), [top, speed, min, max, offset]);
};
// Radix menus position themselves in page pixels, which the 2x CSS zoom throws off-screen,
// so pick the option with the keyboard instead of a click.
// Scrolls, then corrects once more after late layout changes (scenes measure themselves after mount).
const scrollTo = async (selector, options) => {
  await smoothScroll(selector, options);
  await wait(250);
  await smoothScroll(selector, { ...options, min: 250, max: 500 });
};
// ---------- the real pointer (presenter mode) ----------
// Brings an element comfortably into view with an eased scroll if it's near or past an edge.
const ensureInView = async (locator) => {
  const { top, bottom, innerHeight } = await locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, innerHeight: window.innerHeight };
  });
  if (top >= 90 && bottom <= innerHeight - 40) return;
  await page.evaluate((delta) => new Promise((done) => {
    const el = document.scrollingElement;
    const from = el.scrollTop;
    const start = performance.now();
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    const step = (now) => {
      const p = Math.min(1, (now - start) / 700);
      el.scrollTop = from + delta * ease(p);
      if (p < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  }), top - innerHeight / 3);
  await wait(200);
};
// Screen position (points) of an element's center: window origin + browser chrome + page offset.
const screenPoint = (locator) => locator.evaluate((el) => {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.round(window.screenX + (window.outerWidth - window.innerWidth) / 2 + rect.left + rect.width / 2),
    y: Math.round(window.screenY + (window.outerHeight - window.innerHeight) + rect.top + rect.height / 2),
  };
});
const pointerPath = [];
const realClick = async (locator) => {
  await ensureInView(locator);
  const { x, y } = await screenPoint(locator);
  pointerPath.push(`${x},${y}`);
  if (VERBOSE) console.log(`click ${x},${y}  ${await locator.evaluate((el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40))}`);
  cliclick(`m:${x},${y}`);
  await wait(140);
  if (REAL_POINTER) {
    const at = spawnSync("cliclick", ["p"], { encoding: "utf8" }).stdout.trim();
    const [px, py] = at.split(",").map(Number);
    if (Math.abs(px - x) > 3 || Math.abs(py - y) > 3) {
      throw new Error(`The pointer is at ${at}, not ${x},${y}: macOS is blocking cliclick. Check Accessibility permission for this terminal app.`);
    }
  }
  cliclick("c:.");
  // In a dry run nothing really clicks, so let Playwright click instead.
  if (DRY_RUN) await locator.click();
};

// Clicks through the DOM: Playwright's own click scrolls its target to mid-screen first,
// which would pull the garden out of frame. Presenter mode uses the real pointer instead.
const tap = (locator) => (PRESENT ? realClick(locator) : locator.evaluate((el) => el.click()));
const press = async (locator, { dom = false } = {}) => {
  if (PRESENT) return realClick(locator);
  await (dom ? tap(locator) : locator.click());
};
// Types into a field: a real click to focus it in presenter mode, then the keys.
const type = async (locator, text, delay) => {
  if (PRESENT) {
    await realClick(locator);
    await page.keyboard.type(text, { delay });
  } else {
    await locator.pressSequentially(text, { delay });
  }
};
const clearField = async (locator) => {
  if (PRESENT) {
    await realClick(locator);
    await page.keyboard.press("Meta+A");
    await page.keyboard.press("Backspace");
  } else {
    await locator.fill("");
  }
};
const choose = async (trigger, option, index = 0) => {
  if (PRESENT) {
    // At 1x the menu opens in place, so pick it the way a person would.
    await realClick(page.getByRole("combobox", { name: trigger }).nth(index));
    await wait(450);
    await realClick(page.getByRole("option", { name: option, exact: true }));
    await wait(450);
    return;
  }
  // Radix menus position themselves in page pixels, which the 1.5x CSS zoom throws off-screen,
  // so pick the option with the keyboard instead of a click.
  await page.getByRole("combobox", { name: trigger }).nth(index).click();
  await wait(450);
  await page.getByRole("option", { name: option, exact: true }).evaluate((el) => el.focus());
  await page.keyboard.press("Enter");
  await wait(450);
};
const month = (name) => tap(page.locator(".diorama-tick", { hasText: new RegExp(`^${name}$`) }).first());
// Drags the month slider from one end to the other, so the season visibly plays out.
const scrub = async (fromFraction, toFraction, ms) => {
  const slider = page.locator(".diorama-scrub input[type=range]").first();
  if (PRESENT) {
    // Drag the real pointer along the slider.
    await ensureInView(slider);
    const geo = await slider.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        left: window.screenX + (window.outerWidth - window.innerWidth) / 2 + rect.left + 8,
        width: rect.width - 16,
        y: Math.round(window.screenY + (window.outerHeight - window.innerHeight) + rect.top + rect.height / 2),
      };
    });
    const at = (f) => `${Math.round(geo.left + geo.width * f)},${geo.y}`;
    pointerPath.push(`${at(fromFraction)} → ${at(toFraction)}`);
    if (VERBOSE) console.log(`drag ${at(fromFraction)} → ${at(toFraction)}  month slider`);
    cliclick(`m:${at(fromFraction)}`);
    await wait(120);
    cliclick(`dd:${at(fromFraction)}`);
    await wait(120);
    const steps = Math.round(ms / 60);
    for (let i = 1; i <= steps; i += 1) {
      spawnSync("cliclick", ["dm:" + at(fromFraction + ((toFraction - fromFraction) * i) / steps)]);
      await wait(60);
    }
    cliclick(`du:${at(toFraction)}`);
    if (DRY_RUN) await slider.evaluate((el, value) => { el.value = String(value); el.dispatchEvent(new Event("input", { bubbles: true })); }, 6);
    return;
  }
  const box = await slider.boundingBox();
  const y = box.y + box.height / 2;
  const x = (f) => box.x + 8 + (box.width - 16) * f;
  await page.mouse.move(x(fromFraction), y);
  await page.mouse.down();
  const steps = Math.round(ms / 40);
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(x(fromFraction + ((toFraction - fromFraction) * i) / steps), y);
    await wait(40);
  }
  await page.mouse.up();
};

// ---------- Front page: the example garden through the season ----------
await wait(1600);
await scrub(0, 1, 2600);
await wait(500);
await month("Jul");
await wait(900);
for (const bed of [1, 2, 3]) {
  await tap(page.locator(".garden-tablist [role=tab]").nth(bed));
  await wait(900);
}
await smoothScroll("#features", { speed: 700 });
await wait(1600);
await smoothScroll("end", { speed: 800 });
await wait(1200);
await press(page.locator(".home-cta .btn"));

// ---------- Planner: three steps ----------
await page.getByText("Step 1 of 3").waitFor();
await wait(900);
await type(page.getByLabel("ZIP Code *"), "80205", 130);
await wait(300);
await choose("Garden Type *", "Raised beds");
await press(page.getByRole("button", { name: "Next: Your space" }));
await page.getByText("Step 2 of 3").waitFor();
await wait(800);
await type(page.getByLabel("Width (feet) *").first(), "8", 160);
await type(page.getByLabel("Length (feet) *").first(), "4", 160);
await choose("Sun exposure *", "Full sun (6+ hours)");
await wait(500);
// Bring the bed cards and the preview into view, then duplicate the bed.
await scrollTo(".garden-unit-list", { speed: 500, offset: 80 });
await wait(700);
await press(page.getByRole("button", { name: /^Duplicate raised bed 1$/ }));
await wait(1500);
// Make the copy 4 x 4 and partly shaded; the preview redraws as it changes.
const secondWidth = page.getByLabel("Width (feet) *").nth(1);
await clearField(secondWidth);
await wait(400);
await type(secondWidth, "4", 200);
await wait(1300);
// A partly shaded second bed gets spring greens, which finish early (for the follow-up step).
await choose("Sun exposure *", "Partial shade (3–6 hours)", 1);
await wait(1600);
await press(page.getByRole("button", { name: "Next: What to grow" }));
await page.getByText("Step 3 of 3").waitFor();
await smoothScroll(0, { min: 600, max: 900 });
await wait(900);
await press(page.getByRole("checkbox", { name: "Vegetables" }));
await wait(500);
await press(page.getByRole("checkbox", { name: "Herbs" }));
await wait(900);
await press(page.getByRole("button", { name: "Generate My Garden" }));

// ---------- Result: the season view, follow-up crops, cards ----------
// Hold on the loading page, then let the result settle at the top before moving.
await page.waitForURL(/\/planner\/result/);
await page.locator(".diorama-tick").first().waitFor();
await page.evaluate(() => document.fonts.ready);
await wait(1800);
await scrollTo(".garden-tabs", { speed: 450, offset: 84 });
await wait(900);
// Play from the first month for a few months, then pause.
await press(page.locator(".diorama-tick").first(), { dom: true });
await wait(700);
await press(page.getByRole("button", { name: "Play the season" }), { dom: true });
await wait(6200);
if (await page.getByRole("button", { name: "Pause the season" }).count()) {
  await press(page.getByRole("button", { name: "Pause the season" }), { dom: true });
}
await wait(900);
// A finished patch: find a bed and month with follow-up choices, pick one, watch it grow.
const chip = page.locator(".diorama-chip").first();
let found = false;
const tabs = page.locator(".garden-tablist [role=tab]");
const bedCount = Math.max(1, await tabs.count());
for (let bed = 0; bed < bedCount && !found; bed += 1) {
  if (await tabs.count()) {
    await press(tabs.nth(bed), { dom: true });
    await wait(700);
  }
  for (const name of ["Jul", "Jun", "Aug"]) {
    await month(name);
    await wait(500);
    if (await chip.count()) {
      found = true;
      break;
    }
  }
}
if (found) {
  await wait(800);
  // Show the finished patch's options under the garden, then pick the first crop.
  await scrollTo(".diorama-after", { speed: 450, offset: 420 });
  await wait(1600);
  await press(chip, { dom: true });
  await wait(1600);
  // Back to the garden and step forward: the new crop grows in that patch.
  await scrollTo(".garden-tabs", { speed: 450, offset: 84 });
  await wait(700);
  const ticks = page.locator(".diorama-tick");
  const at = await ticks.evaluateAll((all) => all.findIndex((tick) => tick.getAttribute("aria-pressed") === "true"));
  for (let step = 1; step <= 3 && at + step < (await ticks.count()); step += 1) {
    await press(ticks.nth(at + step), { dom: true });
    await wait(1400);
  }
  await wait(800);
}
// The flat layout: plants at real spacing with dimension marks, then the editing controls below.
await press(page.getByRole("button", { name: "Layout" }), { dom: true });
await wait(1800);
await smoothScroll(".garden-sketch-editor", { speed: 350, offset: 300 });
await wait(1000);
await press(page.locator(".garden-sketch-editor-heading"), { dom: true });
await wait(1800);
// The rest of the album, section by section.
for (const section of [".album-cards-section", ".album-lower", ".notes-tabs", ".garden-chat-section"]) {
  if (!(await page.locator(section).count())) continue;
  await smoothScroll(section, { speed: 380, offset: 70, max: 4000 });
  await wait(1800);
  if (section === ".notes-tabs") {
    const noteTabs = page.locator(".notes-tablist [role=tab]");
    for (let index = 1; index < (await noteTabs.count()); index += 1) {
      await press(noteTabs.nth(index), { dom: true });
      await wait(1500);
    }
  }
}
await smoothScroll("end", { speed: 380, max: 3000 });
await wait(1600);

if (PRESENT) {
  await wait(1200);
  console.log(DRY_RUN
    ? `Dry run done: ${pointerPath.length} pointer moves, e.g. ${pointerPath.slice(0, 4).join(" | ")}`
    : "Demo finished. Stop the recording.");
  await browser.close();
  process.exit(0);
}
await cdp.send("Page.stopScreencast");
const end = raw.at(-1).t + 1200;
await browser.close();

// Keep at most one frame per MIN_FRAME_MS; each frame lasts until the next kept one.
const kept = [];
for (const f of raw) if (!kept.length || f.t - kept.at(-1).t >= MIN_FRAME_MS) kept.push(f);
const duration = (i) => Math.max(MIN_FRAME_MS, (kept[i + 1]?.t ?? end) - kept[i].t) / 1000;

// ffmpeg's concat demuxer plays each PNG for its real duration, resampled to a steady 60 fps.
const dir = mkdtempSync(join(tmpdir(), "flora-demo-"));
const list = kept.map((f, i) => {
  writeFileSync(join(dir, `${i}.png`), Buffer.from(f.data, "base64"));
  return `file '${i}.png'\nduration ${duration(i).toFixed(4)}`;
});
writeFileSync(join(dir, "list.txt"), `${list.join("\n")}\nfile '${kept.length - 1}.png'\n`);
mkdirSync("docs", { recursive: true });
const out = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"),
  "-vf", "fps=60,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-tune", "stillimage", "-movflags", "+faststart", "docs/demo.mp4"], { stdio: "inherit" });
rmSync(dir, { recursive: true, force: true });
if (out.status !== 0) throw new Error("ffmpeg failed");
console.log(`docs/demo.mp4: ${kept.length} frames (${raw.length} captured), ${((end - kept[0].t) / 1000).toFixed(1)}s, ${OUT_W}x${OUT_H}, ${(statSync("docs/demo.mp4").size / 1e6).toFixed(1)} MB`);
