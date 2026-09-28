// views/night-sky.js - the night sky behind the stage pages' cards (v128).
//
// The owner, 2026-09-28: the night band under the pledges should be the
// background "everywhere that are the space between the box", and "a bit
// lively ... wink or some random falling stars". The dark table and its
// fixed specks are CSS (css/stage-page.css); this adds the life: specks that
// twinkle and, now and then, a shooting star crossing a gap between cards.
//
// It moves only while the reader does. Scrolling wakes the sky; it rests
// SKY_REST_MS after the last scroll, so nothing moves while someone reads
// (WCAG 2.2.2, the same rule the pledge sky's drift keeps). It is never
// mounted on a still page (reduced motion, or beside the care notice): the
// caller only has a scope when motion is allowed.
import { onAbort } from "./stage.js";

const TWINKLES = 28;
const SKY_REST_MS = 1600;
const METEOR_GAP_MS = 7000;
const METEOR_CHANCE = 0.35;
// A gap thinner than this gets a star running flat along the seam; a wide one
// (the pledge sky) gets the usual diagonal fall.
const SEAM_MAX_PX = 60;

// The stretches of night on screen: the seams between cards, and any child
// that is itself night (the pledge sky). In page px from the root's top.
function visibleGaps(root) {
  const top = root.getBoundingClientRect().top;
  const cards = [...root.children].filter(el => !el.matches(".sky-fx"));
  const gaps = [];
  cards.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    if (el.matches(".wall")) gaps.push({ from: r.top, to: r.bottom });
    else if (i > 0 && !cards[i - 1].matches(".wall")) gaps.push({ from: cards[i - 1].getBoundingClientRect().bottom, to: r.top });
  });
  return gaps
    .filter(g => g.to - g.from > 2 && g.from > innerHeight * 0.05 && g.to < innerHeight * 0.95)
    .map(g => ({ y: (g.from + g.to) / 2 - top, height: g.to - g.from }));
}

// A fixed scatter, so the sky is the same on every visit and in the tests.
function scatter(n) {
  let seed = 7;
  const next = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: n }, () => ({
    x: Math.round(next() * 1000) / 10,
    y: Math.round(next() * 1000) / 10,
    delay: Math.round(next() * 2400),
    big: next() > 0.75
  }));
}

export function skyMarkup() {
  const specks = scatter(TWINKLES).map(s =>
    `<i class="twinkle${s.big ? " is-big" : ""}" style="left: ${s.x}%; top: ${s.y}%; animation-delay: -${s.delay}ms;"></i>`
  ).join("");
  return `<div class="sky-fx" aria-hidden="true">${specks}<i class="meteor"></i></div>`;
}

export function mountSky(root, scope) {
  root.insertAdjacentHTML("afterbegin", skyMarkup());
  const fx = root.querySelector(".sky-fx");
  const meteor = fx.querySelector(".meteor");
  let restTimer = 0;
  let lastMeteor = 0;

  const fly = () => {
    const now = Date.now();
    if (now - lastMeteor < METEOR_GAP_MS || Math.random() > METEOR_CHANCE) return;
    // Only where there is night on screen to see it in.
    const gaps = visibleGaps(root);
    if (!gaps.length) return;
    lastMeteor = now;
    const gap = gaps[Math.floor(Math.random() * gaps.length)];
    meteor.classList.toggle("seam", gap.height < SEAM_MAX_PX);
    meteor.style.top = `${Math.round(gap.y)}px`;
    meteor.style.left = `${Math.round(30 + Math.random() * 55)}%`;
    meteor.classList.remove("fly");
    void meteor.offsetWidth;
    meteor.classList.add("fly");
  };
  const wake = () => {
    root.classList.add("sky-awake");
    clearTimeout(restTimer);
    restTimer = setTimeout(() => root.classList.remove("sky-awake"), SKY_REST_MS);
    fly();
  };
  scope.listen(meteor, "animationend", () => meteor.classList.remove("fly"));
  scope.listen(window, "scroll", wake, { passive: true });
  onAbort(scope.signal, () => {
    clearTimeout(restTimer);
    root.classList.remove("sky-awake");
    fx.remove();
  });
}
