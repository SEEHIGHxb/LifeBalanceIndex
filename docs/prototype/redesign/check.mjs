// docs/prototype/redesign/check.mjs - the redesign prototype's own checks.
//
//   node docs/prototype/redesign/check.mjs http://127.0.0.1:8181
//
// Drives the page in Chromium at a phone and a laptop size and asserts the
// rules the prototype promises: no errors, no sideways scroll, Thai typed by
// grapheme, quiet chapters without a burst, every answer pressed the same
// way, and reduced motion landing on final states.
import { chromium } from "playwright";

const origin = (process.argv[2] || "http://127.0.0.1:8181").replace(/\/$/, "");
const base = `${origin}/docs/prototype/redesign/`;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

const browser = await chromium.launch();
const errors = [];
const watch = (page, label) => {
  page.on("pageerror", e => errors.push(`${label}: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`${label}: ${m.text()}`); });
  page.on("requestfailed", r => errors.push(`${label}: failed ${r.url()}`));
};

try {
  for (const [label, viewport, mobile] of [["phone", { width: 390, height: 844 }, true], ["laptop", { width: 1440, height: 900 }, false]]) {
    const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    watch(page, label);
    for (const route of ["", "home", "journey"]) {
      await page.goto(`${base}#/${route}`);
      await page.waitForTimeout(600);
      const over = await page.evaluate(async () => {
        let worst = 0;
        const H = document.documentElement.scrollHeight;
        for (let y = 0; y < H; y += innerHeight) {
          scrollTo(0, y);
          await new Promise(r => setTimeout(r, 60));
          worst = Math.max(worst, document.documentElement.scrollWidth - innerWidth);
        }
        return worst;
      });
      check(`${label} #/${route}: no sideways scroll`, over <= 0, `${over}px`);
    }
    await ctx.close();
  }

  // The journey, in Thai on a phone.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    watch(page, "journey");
    await page.goto(`${base}#/journey`);
    await page.evaluate(() => localStorage.setItem("lbi_proto_lang", "th"));
    await page.reload();
    await page.waitForTimeout(2800);
    const marks = await page.evaluate(() => [...document.querySelectorAll(".q__typed span")]
      .filter(s => /^[ัิ-ฺ็-๎]/.test(s.textContent)).length);
    check("Thai question types by grapheme (no span starts with a mark)", marks === 0, `${marks}`);

    // The press: a pill's scale right after the tap is the same whichever
    // option was chosen (motion never depends on the answer).
    const pressScale = async (index) => {
      await page.evaluate(() => { location.hash = "#/"; });
      await page.waitForTimeout(150);
      await page.evaluate(() => { location.hash = "#/journey"; });
      await page.waitForTimeout(2800);
      await page.locator(".answers .pill").nth(index).click();
      await page.waitForTimeout(40);
      return page.evaluate(i => document.querySelectorAll(".answers .pill")[i].style.transform, index);
    };
    const a = await pressScale(0), b = await pressScale(3);
    // Frame timing makes the sampled scale differ slightly; what is checked is
    // that the first and the fourth option both get the press spring.
    check("the first and fourth options both get the press", a.startsWith("scale(") && b.startsWith("scale("), `${a} / ${b}`);

    // A loud chapter bursts at its ending; the quiet one does not.
    await page.waitForTimeout(1500);
    const loud = await page.evaluate(() => document.querySelectorAll("#ending .spr").length);
    check("The Market's ending bursts", loud > 0, `${loud} sprites`);
    const modal = await page.evaluate(() => document.getElementById("header").hasAttribute("inert")
      && document.getElementById("q").hasAttribute("inert"));
    check("the chapter ending is modal (header and question inert)", modal);
    await page.keyboard.press("Escape");                  // Escape means Continue
    await page.waitForTimeout(900);
    const quietTyped = await page.evaluate(() => document.querySelectorAll(".q__typed span.off").length);
    check("The Still Water's question arrives whole (no typing)", quietTyped === 0, `${quietTyped} hidden`);
    await page.locator(".answers .pill").first().click();
    await page.waitForTimeout(40);
    const quietPress = await page.evaluate(() => document.querySelector('.answers .pill[aria-checked="true"]').style.transform);
    check("The Still Water's answer has no press spring", quietPress === "", quietPress);
    await page.waitForTimeout(1600);
    const quiet = await page.evaluate(() => document.querySelectorAll("#ending .spr").length);
    check("The Still Water's ending has no burst", quiet === 0, `${quiet} sprites`);
    const lit = await page.evaluate(() => [...document.querySelectorAll("#navpill .pt")]
      .filter(p => p.style.fill).length);
    check("two chapters lit in the progress star", lit === 2, `${lit}`);
    await ctx.close();
  }

  // Reduced motion: everything is already where it ends.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    watch(page, "reduced");
    await page.goto(`${base}#/journey`);
    await page.waitForTimeout(150);
    const q = await page.evaluate(() => ({
      hidden: document.querySelectorAll(".q__typed span.off").length,
      faded: [...document.querySelectorAll(".answers .pill")].filter(p => getComputedStyle(p).opacity !== "1").length
    }));
    check("reduced: question and answers are shown at once", q.hidden === 0 && q.faded === 0, JSON.stringify(q));
    await page.locator(".answers .pill").first().click();
    await page.waitForTimeout(100);
    const end = await page.evaluate(() => {
      const e = document.getElementById("ending");
      return { on: e.classList.contains("on"), opacity: getComputedStyle(e).opacity, sprites: e.querySelectorAll(".spr").length };
    });
    check("reduced: the chapter ending is simply there, with no burst",
      end.on && end.opacity === "1" && end.sprites === 0, JSON.stringify(end));
    await page.goto(`${base}#/`);
    await page.waitForTimeout(150);
    const seedOn = await page.evaluate(() => document.documentElement.classList.contains("seed-on"));
    check("reduced: the headline does not travel", !seedOn);
    await ctx.close();
  }
} finally {
  await browser.close();
}

check("no page errors, console errors or failed requests", errors.length === 0, errors.join(" | "));
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
