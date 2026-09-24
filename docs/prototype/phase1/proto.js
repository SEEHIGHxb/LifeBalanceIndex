// LBI Phase 1: a disposable motion prototype (docs/interactive-web-plan.md §6).
//
// Two halves. A small motion core (clock, tween, spring, burst) that Phase 2's
// motion.js will be rewritten from, then four scenes. Every scene renders its
// FINAL state as markup first; motion only animates toward it, so a script
// that dies mid-way leaves a correct page (non-negotiable 8).
//
// Style writes are transform and opacity only. The two deliberate exceptions
// are SVG geometry attributes, never CSS: the ring's stroke-dashoffset and the
// radar polygon's points. check.mjs enforces the rule.

// --- clock ----------------------------------------------------------------
//
// Injected so check.mjs can drive time by hand. The page's CSP forbids inline
// script, so Playwright's addInitScript is the only way in.
const clock = globalThis.__protoClock ?? {
  now: () => performance.now(),
  frame: (cb) => requestAnimationFrame(cb)
};

const probe = { scene: null, bursts: [], done: {}, flight: null };
globalThis.__proto = probe;

let speed = 1;
let lang = "en";
const osReduce = matchMedia("(prefers-reduced-motion: reduce)");
const reduceToggle = document.getElementById("reduce");
// The in-page toggle can only ADD reduction, never undo the OS setting
// (plan decision 7).
const reduced = () => osReduce.matches || reduceToggle.checked;

// --- easing -----------------------------------------------------------------

function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 40; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

const linear = (p) => p;
const easeOut = (p) => 1 - (1 - p) ** 3;
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const easeOutBack = (p) => 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2;
// symbols.md S1: the score-stretch curve.
const easeStar = cubicBezier(0.2, 0.9, 0.25, 1);

// --- tween and spring -------------------------------------------------------

// Resolves true when finished, false when aborted. Never rejects, so an
// aborted scene leaves no unhandled promise behind.
function animate({ duration, delay = 0, ease = linear, update, signal }) {
  return new Promise((resolve) => {
    const start = clock.now();
    const rate = speed;
    const tick = () => {
      if (signal?.aborted) return resolve(false);
      const t = (clock.now() - start) * rate - delay;
      if (t >= 0) {
        const p = duration > 0 ? Math.min(1, t / duration) : 1;
        update(ease(p), p);
        if (p >= 1) return resolve(true);
      }
      clock.frame(tick);
    };
    tick();
  });
}

const wait = (ms, signal) => animate({ duration: ms, update() {}, signal });

// Aborts when either signal does. AbortSignal.any is recent; fall back to the
// narrower one on older engines.
const either = (a, b) => (AbortSignal.any ? AbortSignal.any([a, b]) : b);

// A damped spring pulling every coordinate to 0, integrated at a fixed step so
// the same release always draws the same path at any frame rate. Rest is
// judged relative to where it started, so a 0.05 scale spring and a 50 px
// spring both settle when they look settled.
const SPRING_STEP_S = 1 / 240;
function spring({ from, velocity, stiffness = 260, damping = 16, update, signal }) {
  const x = [...from];
  const v = velocity ? [...velocity] : from.map(() => 0);
  const size = Math.max(...from.map(Math.abs), 1e-3);
  return new Promise((resolve) => {
    let last = clock.now();
    let acc = 0;
    const tick = () => {
      if (signal?.aborted) return resolve(false);
      const now = clock.now();
      acc += Math.min(0.1, ((now - last) / 1000) * speed);
      last = now;
      while (acc >= SPRING_STEP_S) {
        for (let i = 0; i < x.length; i++) {
          v[i] += (-stiffness * x[i] - damping * v[i]) * SPRING_STEP_S;
          x[i] += v[i] * SPRING_STEP_S;
        }
        acc -= SPRING_STEP_S;
      }
      const still = x.every((n) => Math.abs(n) < size * 0.004)
        && v.every((n) => Math.abs(n) < size * 0.08);
      if (still) {
        update(x.map(() => 0));
        return resolve(true);
      }
      update(x);
      clock.frame(tick);
    };
    clock.frame(tick);
  });
}

// --- text -------------------------------------------------------------------

// Grapheme clusters, never code units: ที่ is three code points and one letter
// (non-negotiable 10). Same rule as graphemes() in i18n.js.
const segmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;
const graphemes = (text) => (segmenter
  ? Array.from(segmenter.segment(text), (seg) => seg.segment)
  : Array.from(text));

const esc = (str) => String(str).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);

const fmt = (str, vars = {}) => str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
const num = (n) => n.toLocaleString(lang === "th" ? "th-TH" : "en-US");

// --- strings ------------------------------------------------------------------

const STR = {
  en: {
    kicker: "LBI · Phase 1 prototype · disposable",
    title: "Star Atlas motion",
    reduce: "Reduce motion",
    reduceOs: "Reduce motion (on in your device settings)",
    "tab-tug": "Tug the ring",
    "tab-ending": "Chapter ending",
    "tab-opening": "Chapter opening",
    "tab-radar": "Ring to radar",
    replay: "Replay",
    play: "Play",
    skip: "Skip",
    tugLabel: "Tug the ring",
    tugHint: "Pull the ring out past the dotted circle, or tap it.",
    tugIdle: "Pulled 0 of 90 px",
    tugPulled: "Pulled {n} of 90 px",
    tugSnap: "Snap. Released at {n} px.",
    tugTap: "Tapped.",
    burstStatus: "Eight glints burst from the ring.",
    regionComplete: "Region complete",
    regionOf: "Region {n} of 8",
    meanwhile: "Meanwhile, in the world",
    cont: "Continue",
    quiet: "Quiet zone: no burst in The Still Water or The Commons.",
    regionPick: "Region",
    judge: "What to judge"
  },
  th: {
    kicker: "LBI · ต้นแบบระยะที่ 1 · ใช้แล้วทิ้ง",
    title: "การเคลื่อนไหวของ Star Atlas",
    reduce: "ลดการเคลื่อนไหว",
    reduceOs: "ลดการเคลื่อนไหว (เปิดจากการตั้งค่าเครื่อง)",
    "tab-tug": "ดึงวงแหวน",
    "tab-ending": "ปิดบท",
    "tab-opening": "เปิดบท",
    "tab-radar": "วงแหวนเป็นเรดาร์",
    replay: "เล่นซ้ำ",
    play: "เล่น",
    skip: "ข้าม",
    tugLabel: "ดึงวงแหวน",
    tugHint: "ดึงวงแหวนออกไปให้พ้นวงเส้นประ หรือแตะที่วงแหวน",
    tugIdle: "ดึงแล้ว 0 จาก 90 px",
    tugPulled: "ดึงแล้ว {n} จาก 90 px",
    tugSnap: "ดีด! ปล่อยที่ {n} px",
    tugTap: "แตะแล้ว",
    burstStatus: "ประกายแปดดวงแตกออกจากวงแหวน",
    regionComplete: "ดินแดนนี้ครบแล้ว",
    regionOf: "ดินแดนที่ {n} จาก 8",
    meanwhile: "ขณะเดียวกันในโลกใบนี้",
    cont: "ดำเนินการต่อ",
    quiet: "เขตเงียบ: ผืนน้ำนิ่งและลานกลางเมืองไม่มีประกายแตก",
    regionPick: "ดินแดน",
    judge: "สิ่งที่ต้องตัดสิน"
  }
};
const s = (key) => STR[lang][key] ?? STR.en[key];

// Sample content. Region names, themes, recap sentences and facts are the
// shipped strings from views/journey.js and th.js; the numbers are made up.
const REGIONS = {
  market: {
    index: 0,
    emblem: "emblems/s8-1-market.webp",
    wash: "#f2e2bb",
    quiet: false,
    name: { en: "The Market", th: "ตลาด" },
    recap: () => (lang === "th"
      ? [
        `จาก ${num(30000)} บาทที่เข้ามาในแต่ละเดือน คุณเก็บไว้ ${num(3000)} บาท`,
        `ตลอดหนึ่งปีคิดเป็นราว ${num(36000)} บาท`,
        "จากห้าข้อความเกี่ยวกับเรื่องเงิน มี 2 ข้อที่ตรงกับคุณ"
      ]
      : [
        `Of the ${num(30000)} baht that comes in each month, you set aside ${num(3000)}.`,
        `Over a year, that is about ${num(36000)} baht.`,
        "Of five statements about money, 2 described you well."
      ]),
    fact: {
      en: "Across Thailand, 63.1% of adults set aside money at some point last year. The survey deliberately never asked how much — only whether any was set aside at all.",
      th: "ทั่วประเทศไทย ผู้ใหญ่ 63.1% เก็บเงินไว้บ้างในช่วงปีที่ผ่านมา แบบสำรวจตั้งใจไม่ถามว่าเก็บเท่าไร ถามเพียงว่าได้เก็บบ้างหรือไม่"
    }
  },
  stillWater: {
    index: 2,
    emblem: "emblems/s8-3-still-water.webp",
    wash: "#dde8f8",
    quiet: true,
    name: { en: "The Still Water", th: "ผืนน้ำนิ่ง" },
    recap: () => (lang === "th"
      ? [
        "คุณตอบคำถามเกี่ยวกับไม่กี่สัปดาห์ที่ผ่านมาไปแล้ว 10 ข้อ",
        "ในห้าคำถามเรื่องความเป็นอยู่ที่ดี มี 3 ข้อที่คุณตอบว่าเป็นจริงกับคุณเกือบตลอดเวลาหรือมากกว่านั้น"
      ]
      : [
        "You answered 10 questions about the past few weeks.",
        "In 3 of the five well-being questions, you said that was true of you most of the time or more."
      ]),
    fact: {
      en: "Thailand's national mental-health score has sat between 31.4 and 33.6 out of 45 every single year from 2008 to 2015. Whatever else changed in those eight years, that did not.",
      th: "คะแนนสุขภาพจิตระดับประเทศของไทยอยู่ระหว่าง 31.4 ถึง 33.6 จาก 45 ทุกปีตั้งแต่ 2551 ถึง 2558 ไม่ว่าอะไรจะเปลี่ยนไปในแปดปีนั้น สิ่งนี้ไม่เปลี่ยน"
    }
  },
  highlands: {
    index: 1,
    emblem: "emblems/s8-2-highlands.webp",
    wash: "#d9eeea",
    name: { en: "The Highlands", th: "ที่ราบสูง" },
    theme: {
      en: "The climb your body does every day, whether or not you notice it.",
      th: "การไต่ที่ร่างกายคุณทำทุกวัน ไม่ว่าคุณจะรู้ตัวหรือไม่"
    }
  }
};

// RADAR_KEYS order (chart.js), clockwise from the top. Labels from chart.js
// ASPECT_LABELS and th.js. Scores are the fixture from tests/layout.test.mjs.
const RADAR = [
  { key: "finance", score: 55, en: "Finance", th: "การเงิน" },
  { key: "physical", score: 62, en: "Physical", th: "ร่างกาย" },
  { key: "mental", score: 71, en: "Mental", th: "จิตใจ" },
  { key: "relationships", score: 48, en: "Relationships", th: "ความสัมพันธ์" },
  { key: "personalGoals", score: 70, en: "Personal Goals", th: "เป้าหมายส่วนตัว" },
  { key: "socialContribution", score: 44, en: "Social Contribution", th: "การช่วยเหลือสังคม" },
  { key: "environment", score: 58, en: "Environment", th: "สิ่งแวดล้อม" },
  { key: "humanityFuture", score: 51, en: "Humanity's Future", th: "อนาคตมนุษยชาติ" }
];

// Owner-facing review prompts; English only, since they are notes, not UI.
const JUDGE = {
  tug: [
    "Does the pull feel elastic, and is 90 px the right distance on your phone?",
    "Does the ring spring home with the right amount of wobble?",
    "Tap the ring as well. The tap has to feel like the same toy."
  ],
  ending: [
    "Can you read each recap line as it lands, or are they dealt too fast?",
    "Does the fact card flipping last feel earned, or gimmicky?",
    "Switch to The Still Water. There is no burst there on purpose. Does it still feel finished?"
  ],
  opening: [
    "Switch to ไทย. Each glint must turn into a whole cluster (ที่, สู), with no floating marks.",
    "Is Lumi's typing speed comfortable to read along with?",
    "Does the caret arcing into the ring read as \"you are here\"?"
  ],
  radar: [
    "Does the ring turning into your shape feel like one object changing?",
    "Is about 1.5 s too long for the reveal? Skip is always there.",
    "Turn on Reduce motion: is the cross-fade enough?"
  ]
};

// --- geometry ---------------------------------------------------------------

// Angles are measured clockwise from the top, as in chart.js radarPoints.
const polar = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
};
const f2 = (n) => n.toFixed(2);

function arcD(cx, cy, r, from, to) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${f2(x1)} ${f2(y1)} A ${r} ${r} 0 ${large} 1 ${f2(x2)} ${f2(y2)}`;
}

// symbols.md S2 silhouette, 24-unit box.
const GLINT_PATH = "M12 0 Q13 11 24 12 Q13 13 12 24 Q11 13 0 12 Q11 11 12 0Z";
const glintSvg = () => `<svg class="glint-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${GLINT_PATH}"/></svg>`;

// S2 frames: A upright, B 22° at 0.78, C 45° at 0.5, cycling A-B-C-B at 110 ms.
const FRAMES = [{ rot: 0, scale: 1 }, { rot: 22, scale: 0.78 }, { rot: 45, scale: 0.5 }];
const FRAME_CYCLE = [0, 1, 2, 1];
const FRAME_MS = 110;
const glintFrame = (ms) => FRAMES[FRAME_CYCLE[Math.floor(ms / FRAME_MS) % FRAME_CYCLE.length]];

// symbols.md S1: long points 47, short 31, valleys 15, hole 6, 100-unit box.
function starMarkup(cx, cy, k, { halo = true } = {}) {
  const pts = [];
  const tips = [];
  for (let i = 0; i < 8; i++) {
    const tip = polar(cx, cy, (i % 2 === 0 ? 47 : 31) * k, i * 45);
    tips.push(tip);
    pts.push(tip, polar(cx, cy, 15 * k, i * 45 + 22.5));
  }
  const d = `M ${pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join(" L ")} Z`;
  const engraves = tips
    .map(([x, y]) => `<line class="star-engrave" x1="${cx}" y1="${cy}" x2="${f2(x)}" y2="${f2(y)}"/>`)
    .join("");
  const haloArc = halo ? `<path class="star-halo" d="${arcD(cx, cy, 54 * k, -62, 62)}"/>` : "";
  return `<g class="star">${haloArc}<path class="star-body" d="${d}"/>${engraves}<circle class="star-hole" cx="${cx}" cy="${cy}" r="${6 * k}"/></g>`;
}

// The journey ring (views/journey-ring.js): 8 segments with a gap, radius 38
// in a 100 box. `filled` segments are lit; the rest are track only.
const RING_R = 38;
const RING_GAP = 4;
function ringMarkup({ prefix, filled = 8, marker = null, star = false }) {
  let segs = "";
  for (let i = 0; i < 8; i++) {
    const d = arcD(50, 50, RING_R, i * 45, i * 45 + 45 - RING_GAP);
    segs += `<path class="ring-track" d="${d}"/>`
      + `<path class="ring-lit" id="${prefix}-lit-${i}" d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${i < filled ? 0 : 1}"/>`;
  }
  let mark = "";
  if (marker !== null) {
    const [mx, my] = polar(50, 50, RING_R, marker * 45);
    mark = `<circle class="ring-marker" id="${prefix}-marker" cx="${f2(mx)}" cy="${f2(my)}" r="5"/>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${star ? starMarkup(50, 50, 0.6, { halo: false }) : ""}${segs}${mark}</svg>`;
}

// --- burst ------------------------------------------------------------------

// Deterministic jitter, so check.mjs sees the same burst every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BURST_LIFE_MS = 800;
const BURST_MIN_PX = 70;
const BURST_JITTER_PX = 40;
const REDUCED_FADE_MS = 600;
let burstSeed = 1;

// symbols.md S2: 8 particles along the star angles in radar order, half of
// them glints and half small dots, all gold. 70-110 px over 800 ms, scale 1 to
// 0.3 on an ease-out, fading from half-life.
function burst(layer, signal) {
  const rand = mulberry32(burstSeed++);
  const isReduced = reduced();
  const parts = RADAR.map((_, i) => {
    const el = document.createElement("span");
    const glint = i % 2 === 0;
    el.className = `particle ${glint ? "particle-glint" : "particle-dot"}`;
    if (glint) el.innerHTML = glintSvg();
    el.style.opacity = "0";
    layer.append(el);
    return { el, glint, angle: i * 45, dist: BURST_MIN_PX + BURST_JITTER_PX * rand() };
  });
  probe.bursts.push({
    scene: probe.scene,
    reduced: isReduced,
    particles: parts.map(({ glint, angle, dist }) => ({ glint, angle, dist }))
  });
  const status = document.getElementById("sr-status");
  if (status) status.textContent = s("burstStatus");

  const place = (part, dist, scale, frame) => {
    const [x, y] = polar(0, 0, dist, part.angle);
    const rot = part.glint ? frame.rot : 0;
    const k = scale * (part.glint ? frame.scale : 1);
    part.el.style.transform = `translate(${f2(x)}px, ${f2(y)}px) rotate(${rot}deg) scale(${k.toFixed(3)})`;
  };

  const run = isReduced
    // Reduced: no travel. The particles cross-fade in place, then out.
    ? animate({
      duration: REDUCED_FADE_MS,
      signal,
      update(_, p) {
        const o = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7;
        for (const part of parts) {
          place(part, part.dist * 0.6, 0.8, FRAMES[0]);
          part.el.style.opacity = o.toFixed(3);
        }
      }
    })
    : animate({
      duration: BURST_LIFE_MS,
      signal,
      update(_, p) {
        const travel = easeOut(p);
        const scale = 1 - 0.7 * easeOut(p);
        const o = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5;
        const frame = glintFrame(p * BURST_LIFE_MS);
        for (const part of parts) {
          place(part, part.dist * travel, scale, frame);
          part.el.style.opacity = o.toFixed(3);
        }
      }
    });
  return run.then((ok) => {
    for (const part of parts) part.el.remove();
    return ok;
  });
}

// --- press-spring (plan §4) ---------------------------------------------------

function pressSpring(el, signal) {
  let homing = null;
  const setScale = (k) => { el.style.transform = `scale(${k.toFixed(4)})`; };
  el.addEventListener("pointerdown", () => {
    if (reduced()) return;
    homing?.abort();
    animate({ duration: 90, ease: easeOut, signal, update: (e) => setScale(1 - 0.05 * e) });
  }, { signal });
  const release = () => {
    if (reduced()) return;
    homing?.abort();
    homing = new AbortController();
    spring({
      from: [-0.05],
      stiffness: 420,
      damping: 14,
      signal: either(signal, homing.signal),
      update: ([x]) => setScale(1 + x)
    });
  };
  el.addEventListener("pointerup", release, { signal });
  el.addEventListener("pointerleave", release, { signal });
}

// --- scene 1: tug-the-ring ----------------------------------------------------

const TUG_SNAP_PX = 90;
const TUG_TAP_PX = 8;
const TUG_REACH_PX = 60;

// Rubber band: the ring follows less and less the further it is pulled.
const rubber = (d) => TUG_REACH_PX * (1 - Math.exp(-d / TUG_REACH_PX));

function sceneTug(root, signal) {
  root.innerHTML = `
    <div class="stage stage-tug" id="tug-stage">
      <div class="burst-layer" id="tug-burst"></div>
      <div class="tug" id="tug-ring" role="button" tabindex="0" aria-label="${esc(s("tugLabel"))}">
        ${ringMarkup({ prefix: "tug", filled: 8, star: true })}
      </div>
      <div class="threshold" id="tug-threshold"></div>
    </div>
    <div class="stage-bar">
      <p class="hint">${esc(s("tugHint"))}</p>
      <p class="readout" id="tug-readout">${esc(s("tugIdle"))}</p>
    </div>`;

  const stage = root.querySelector("#tug-stage");
  const tug = root.querySelector("#tug-ring");
  const layer = root.querySelector("#tug-burst");
  const threshold = root.querySelector("#tug-threshold");
  const readout = root.querySelector("#tug-readout");

  let drag = null;
  let homing = null;
  const pos = { x: 0, y: 0 };
  probe.tugPos = pos;

  const setRing = (x, y) => {
    pos.x = x;
    pos.y = y;
    const d = Math.hypot(x, y);
    if (d < 0.01) {
      tug.style.transform = "";
      return;
    }
    // Stretch along the pull and thin across it, like a band under tension.
    const theta = Math.atan2(y, x);
    const k = d / TUG_REACH_PX;
    tug.style.transform = `translate(${f2(x)}px, ${f2(y)}px) rotate(${theta}rad) `
      + `scale(${(1 + 0.1 * k).toFixed(4)}, ${(1 - 0.05 * k).toFixed(4)}) rotate(${-theta}rad)`;
  };

  const goHome = () => {
    homing?.abort();
    homing = new AbortController();
    return spring({
      from: [pos.x, pos.y],
      signal: either(signal, homing.signal),
      update: ([x, y]) => setRing(x, y)
    }).then((ok) => { if (ok) probe.done.tugHome = true; });
  };

  const pulse = () => {
    if (reduced()) return Promise.resolve(true);
    return animate({
      duration: 260,
      signal,
      update: (_, p) => {
        const k = p < 0.35 ? 1 - 0.08 * easeOut(p / 0.35) : 0.92 + 0.08 * easeOutBack((p - 0.35) / 0.65);
        tug.style.transform = `scale(${k.toFixed(4)})`;
      }
    }).then(() => { tug.style.transform = ""; });
  };

  const tapped = () => {
    readout.textContent = s("tugTap");
    pulse();
    burst(layer, signal);
  };

  const endDrag = () => {
    threshold.style.opacity = "0";
    drag = null;
  };

  tug.addEventListener("pointerdown", (e) => {
    if (drag) return;
    homing?.abort();
    tug.setPointerCapture(e.pointerId);
    const rect = stage.getBoundingClientRect();
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, max: 0 };
    threshold.style.transform = `translate(${f2(e.clientX - rect.left)}px, ${f2(e.clientY - rect.top)}px)`;
    threshold.style.opacity = "1";
  }, { signal });

  tug.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    const d = Math.hypot(dx, dy);
    drag.max = Math.max(drag.max, d);
    readout.textContent = fmt(s("tugPulled"), { n: Math.min(TUG_SNAP_PX, Math.round(d)) });
    if (!reduced() && d > 0) {
      const k = rubber(d) / d;
      setRing(dx * k, dy * k);
    }
    if (d < TUG_SNAP_PX) return;
    // Past the line the band lets go: burst, then home.
    tug.releasePointerCapture(e.pointerId);
    endDrag();
    readout.textContent = fmt(s("tugSnap"), { n: Math.round(d) });
    probe.done.tugHome = false;
    burst(layer, signal);
    if (!reduced()) goHome();
  }, { signal });

  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const wasTap = drag.max < TUG_TAP_PX;
    endDrag();
    if (wasTap) {
      tapped();
      return;
    }
    // Let go short of the line: no burst, just home.
    readout.textContent = s("tugIdle");
    probe.done.tugHome = false;
    if (!reduced()) goHome();
  };
  tug.addEventListener("pointerup", release, { signal });
  tug.addEventListener("pointercancel", release, { signal });

  tug.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    tapped();
  }, { signal });

  probe.done.tug = true;
}

// --- scene 2: chapter ending --------------------------------------------------

let endingRegion = "market";

const CARD_STAGGER_MS = 170;
const CARD_MS = 460;
const CARDS_AT_MS = 300;
const FLIP_MS = 620;

function endingMarkup(r) {
  return `
    <div class="stage-bar">
      <div class="seg" role="group" aria-label="${esc(s("regionPick"))}" id="region-group">
        <button type="button" data-region="market" aria-pressed="${endingRegion === "market"}">${esc(REGIONS.market.name[lang])}</button>
        <button type="button" data-region="stillWater" aria-pressed="${endingRegion === "stillWater"}">${esc(REGIONS.stillWater.name[lang])}</button>
      </div>
      <button type="button" class="btn" id="replay">${esc(s("replay"))}</button>
    </div>
    <article class="stage stage-ending" id="ending-card">
      <div class="ending-head">
        <div class="emblem-wrap">
          <div class="burst-layer" id="end-burst"></div>
          <div class="emblem" id="end-emblem"><img src="${r.emblem}" alt="" width="112" height="112"></div>
        </div>
        <div class="head-text">
          <p class="eyebrow">${esc(s("regionComplete"))}</p>
          <h2 class="region-name">${esc(r.name[lang])}</h2>
          <div class="count-row">
            <span class="mini-ring">${ringMarkup({ prefix: "end", filled: r.index + 1 })}</span>
            <span id="end-count">${r.index + 1} / 8</span>
          </div>
        </div>
      </div>
      ${r.quiet ? `<p class="quiet-note">${esc(s("quiet"))}</p>` : ""}
      <ul class="recap" id="end-recap">
        ${r.recap().map((line) => `<li class="card">${esc(line)}</li>`).join("")}
      </ul>
      <div class="flip" id="end-fact">
        <div class="flip-inner" id="end-fact-inner">
          <div class="face face-front">
            <p class="fact-label">${esc(s("meanwhile"))}</p>
            <p class="fact-text">${esc(r.fact[lang])}</p>
          </div>
          <div class="face face-back" aria-hidden="true"></div>
        </div>
      </div>
      <button type="button" class="btn btn-primary spring" id="end-continue">${esc(s("cont"))}</button>
    </article>`;
}

async function sceneEnding(root, signal) {
  const r = REGIONS[endingRegion];
  root.innerHTML = endingMarkup(r);
  root.querySelector("#ending-card").style.setProperty("--wash", r.wash);
  for (const btn of root.querySelectorAll("[data-region]")) {
    btn.addEventListener("click", () => {
      endingRegion = btn.dataset.region;
      show();
    }, { signal });
  }
  root.querySelector("#replay").addEventListener("click", () => show(), { signal });
  pressSpring(root.querySelector("#end-continue"), signal);

  const seg = root.querySelector(`#end-lit-${r.index}`);
  const count = root.querySelector("#end-count");
  const emblem = root.querySelector("#end-emblem");
  const cards = [...root.querySelectorAll("#end-recap .card")];
  const fact = root.querySelector("#end-fact");
  const factInner = root.querySelector("#end-fact-inner");
  const layer = root.querySelector("#end-burst");
  const dealtEls = [...cards, fact];

  // Park everything at its start pose in the same task as the render, so the
  // final-state markup never flashes.
  seg.setAttribute("stroke-dashoffset", "1");
  count.textContent = `${r.index} / 8`;
  emblem.style.opacity = "0";
  for (const el of dealtEls) el.style.opacity = "0";

  if (reduced()) {
    // Reduced: the end state, reached by one short cross-fade. No dealing,
    // no flip, no travel.
    seg.setAttribute("stroke-dashoffset", "0");
    count.textContent = `${r.index + 1} / 8`;
    if (!r.quiet) burst(layer, signal);
    const ok = await animate({
      duration: 240,
      signal,
      update: (e) => {
        for (const el of [emblem, ...dealtEls]) el.style.opacity = e.toFixed(3);
      }
    });
    if (ok) probe.done.ending = true;
    return;
  }

  emblem.style.transform = "scale(0.86)";
  for (const el of dealtEls) el.style.transform = "translate(0, 22px) rotate(-2.5deg)";
  factInner.style.transform = "rotateY(180deg)";

  // 1. The region's arc fills to the brim.
  const filled = await animate({
    duration: 600,
    ease: easeInOut,
    signal,
    update: (e) => seg.setAttribute("stroke-dashoffset", (1 - e).toFixed(4))
  });
  if (!filled) return;
  count.textContent = `${r.index + 1} / 8`;

  // 2. The emblem arrives; outside a quiet zone, one burst behind it.
  const emblemIn = animate({
    duration: 520,
    signal,
    update: (_, p) => {
      emblem.style.opacity = Math.min(1, p / 0.4).toFixed(3);
      emblem.style.transform = `scale(${(0.86 + 0.14 * easeOutBack(p)).toFixed(4)})`;
    }
  });
  if (!r.quiet) wait(60, signal).then((ok) => ok && burst(layer, signal));

  // 3. Recap lines dealt one by one; the fact card is dealt last, face down.
  const dealt = dealtEls.map((el, i) => animate({
    duration: CARD_MS,
    delay: CARDS_AT_MS + i * CARD_STAGGER_MS,
    signal,
    update: (_, p) => {
      const e = easeOutBack(p);
      el.style.opacity = Math.min(1, p / 0.4).toFixed(3);
      el.style.transform = `translate(0, ${f2(22 * (1 - e))}px) rotate(${(-2.5 * (1 - e)).toFixed(3)}deg)`;
    }
  }));
  await emblemIn;
  if (!(await Promise.all(dealt)).every(Boolean)) return;

  // 4. ...and turns over.
  const flipped = await animate({
    duration: FLIP_MS,
    delay: 180,
    ease: easeInOut,
    signal,
    update: (e) => { factInner.style.transform = `rotateY(${f2(180 * (1 - e))}deg)`; }
  });
  if (!flipped) return;
  factInner.style.transform = "";
  for (const el of [emblem, ...dealtEls]) el.style.transform = "";
  probe.done.ending = true;
}

// --- scene 3: chapter opening ---------------------------------------------------

const LETTER_STAGGER_MS = 55;
const GLINT_IN_MS = 140;
const LETTER_FLIP_AT_MS = 300;
const LETTER_IN_MS = 160;
const TYPE_MS = 34;
const FLIGHT_MS = 720;

function openingMarkup(r, title, theme) {
  const titleSpans = graphemes(title).map((g) => (g.trim() === ""
    ? `<span class="g g-space">${g}</span>`
    : `<span class="g"><span class="g-letter">${esc(g)}</span><span class="g-glint">${glintSvg()}</span></span>`)).join("");
  return `
    <div class="stage-bar">
      <p class="hint">${esc(fmt(s("regionOf"), { n: r.index + 1 }))}</p>
      <button type="button" class="btn" id="replay">${esc(s("replay"))}</button>
    </div>
    <article class="stage stage-opening" id="opening-card">
      <div class="opening-top">
        <div class="opening-emblem"><img src="${r.emblem}" alt="" width="96" height="96"></div>
        <span class="mini-ring" id="open-ring">${ringMarkup({ prefix: "open", filled: r.index, marker: r.index })}</span>
      </div>
      <p class="eyebrow">${esc(fmt(s("regionOf"), { n: r.index + 1 }))}</p>
      <h2 class="region-name glint-title" id="open-title" aria-label="${esc(title)}"><span aria-hidden="true">${titleSpans}</span></h2>
      <div class="lumi-line">
        <span class="lumi-medallion" aria-hidden="true"><svg viewBox="0 0 100 100">${starMarkup(50, 50, 0.95, { halo: false })}</svg></span>
        <p class="bubble" id="open-bubble"><span class="sr-only">${esc(theme)}</span><span aria-hidden="true" id="open-typed">${esc(theme)}</span><span class="caret" id="open-caret" aria-hidden="true">${glintSvg()}</span></p>
      </div>
    </article>`;
}

// Each grapheme is a glint first, then flips into its letter.
function spellTitle(spans, signal) {
  const titleMs = (spans.length - 1) * LETTER_STAGGER_MS + LETTER_FLIP_AT_MS + LETTER_IN_MS;
  return animate({
    duration: titleMs,
    signal,
    update: (_, p) => {
      const now = p * titleMs;
      spans.forEach((sp, i) => {
        const t = now - i * LETTER_STAGGER_MS;
        if (t < 0) return;
        const letter = sp.firstElementChild;
        const glint = sp.lastElementChild;
        if (t < LETTER_FLIP_AT_MS) {
          const frame = glintFrame(t);
          const grow = easeOut(Math.min(1, t / GLINT_IN_MS));
          glint.style.opacity = grow.toFixed(3);
          glint.style.transform = `rotate(${frame.rot}deg) scale(${(grow * frame.scale).toFixed(3)})`;
          return;
        }
        const e = easeOut(Math.min(1, (t - LETTER_FLIP_AT_MS) / LETTER_IN_MS));
        glint.style.opacity = (1 - e).toFixed(3);
        glint.style.transform = `rotate(45deg) scale(${(0.5 * (1 - e)).toFixed(3)})`;
        letter.style.opacity = e.toFixed(3);
        letter.style.transform = `translate(0, ${(0.18 * (1 - e)).toFixed(3)}em) scale(${(0.85 + 0.15 * e).toFixed(3)})`;
      });
    }
  });
}

// Lumi's line types by grapheme, the glint caret riding at its end.
function typeLine(typed, caret, letters, signal) {
  const typeMs = letters.length * TYPE_MS;
  let shown = 0;
  return animate({
    duration: typeMs,
    delay: 150,
    signal,
    update: (_, p) => {
      const n = Math.min(letters.length, Math.floor(p * letters.length + 1e-9));
      if (n !== shown) {
        shown = n;
        typed.textContent = letters.slice(0, n).join("");
      }
      const frame = glintFrame(p * typeMs);
      caret.style.transform = `rotate(${frame.rot}deg) scale(${frame.scale})`;
    }
  });
}

// The caret lifts off and arcs into the ring marker along a quadratic curve.
async function flyCaret(caret, marker, signal) {
  const from = caret.getBoundingClientRect();
  const to = marker.getBoundingClientRect();
  const p0 = [from.left + from.width / 2, from.top + from.height / 2];
  const p2 = [to.left + to.width / 2, to.top + to.height / 2];
  const lift = Math.max(80, Math.hypot(p2[0] - p0[0], p2[1] - p0[1]) * 0.35);
  const p1 = [(p0[0] + p2[0]) / 2, Math.min(p0[1], p2[1]) - lift];
  const flyer = document.createElement("span");
  flyer.className = "flyer";
  flyer.innerHTML = glintSvg();
  document.body.append(flyer);
  caret.style.opacity = "0";
  let at = p0;
  const flown = await animate({
    duration: FLIGHT_MS,
    ease: easeInOut,
    signal,
    update: (e, p) => {
      const u = 1 - e;
      at = [
        u * u * p0[0] + 2 * u * e * p1[0] + e * e * p2[0],
        u * u * p0[1] + 2 * u * e * p1[1] + e * e * p2[1]
      ];
      const frame = glintFrame(p * FLIGHT_MS);
      flyer.style.transform = `translate(${f2(at[0])}px, ${f2(at[1])}px) rotate(${frame.rot}deg) scale(${(frame.scale * (1 - 0.3 * e)).toFixed(3)})`;
    }
  });
  flyer.remove();
  if (flown) probe.flight = { end: at, target: p2 };
  return flown;
}

async function sceneOpening(root, signal) {
  const r = REGIONS.highlands;
  const title = r.name[lang];
  const theme = r.theme[lang];
  root.innerHTML = openingMarkup(r, title, theme);
  root.querySelector("#opening-card").style.setProperty("--wash", r.wash);
  root.querySelector("#replay").addEventListener("click", () => show(), { signal });

  const spans = [...root.querySelectorAll("#open-title .g:not(.g-space)")];
  const typed = root.querySelector("#open-typed");
  const caret = root.querySelector("#open-caret");
  const marker = root.querySelector("#open-marker");

  if (reduced()) {
    // Reduced: the end state. Title whole, line whole, the caret already home.
    caret.style.opacity = "0";
    probe.done.opening = true;
    return;
  }

  for (const sp of spans) {
    sp.firstElementChild.style.opacity = "0";
    sp.lastElementChild.style.opacity = "0";
  }
  typed.textContent = "";
  caret.style.opacity = "0";

  if (!(await spellTitle(spans, signal))) return;
  for (const sp of spans) {
    sp.firstElementChild.style.transform = "";
    sp.lastElementChild.style.opacity = "0";
  }

  caret.style.opacity = "1";
  if (!(await typeLine(typed, caret, graphemes(theme), signal))) return;
  typed.textContent = theme;

  if (!(await wait(260, signal))) return;
  if (!(await flyCaret(caret, marker, signal))) return;

  // The marker takes the light: one pulse.
  await animate({
    duration: 360,
    signal,
    update: (_, p) => {
      marker.style.transform = `scale(${(1 + 0.8 * Math.sin(p * Math.PI)).toFixed(3)})`;
    }
  });
  marker.style.transform = "";
  probe.done.opening = true;
}

// --- scene 4: ring to radar ---------------------------------------------------

const RADAR_C = [180, 165];
const RADAR_R = 100;
// The ring starts at 0.725 of the plot radius and blooms to full size (plan §4).
const RING_START = 0.725;
const VERTEX_MS = 900;
const VERTEX_STAGGER_MS = 45;
const MORPH_AT_MS = 300;
const HANDOVER_MS = 350;

function radarLabel(item, i) {
  const [x, y] = polar(RADAR_C[0], RADAR_C[1], RADAR_R + 16, i * 45);
  const anchor = Math.abs(x - RADAR_C[0]) < 1 ? "middle" : x > RADAR_C[0] ? "start" : "end";
  const text = item[lang];
  // Two lines for the long English names, so the labels stay in the box.
  const words = lang === "en" && text.length > 12 ? text.split(" ") : [text];
  const lines = words.length > 1 ? [words.slice(0, -1).join(" "), words.at(-1)] : words;
  const above = y < RADAR_C[1] - 1;
  const below = y > RADAR_C[1] + 1;
  const dy = above ? -(lines.length * 12) : below ? 8 : -(lines.length - 1) * 6;
  const tspans = lines.map((line, j) => `<tspan x="${f2(x)}" dy="${j === 0 ? dy : 12}">${esc(line)}</tspan>`).join("");
  return `<text class="radar-label" text-anchor="${anchor}" x="${f2(x)}" y="${f2(y)}">${tspans}<tspan class="radar-value" x="${f2(x)}" dy="12">${item.score}</tspan></text>`;
}

function radarMarkup(target) {
  const [cx, cy] = RADAR_C;
  const grid = [0.25, 0.5, 0.75, 1].map((k) => {
    const pts = RADAR.map((_, i) => polar(cx, cy, RADAR_R * k, i * 45).map(f2).join(",")).join(" ");
    return `<polygon class="radar-grid" points="${pts}"/>`;
  }).join("");
  const spokes = RADAR.map((_, i) => {
    const [x, y] = polar(cx, cy, RADAR_R, i * 45);
    return `<line class="radar-spoke" x1="${cx}" y1="${cy}" x2="${f2(x)}" y2="${f2(y)}"/>`;
  }).join("");
  const ringR = RADAR_R * RING_START;
  const arcs = RADAR.map((_, i) => `<path class="ring-lit" d="${arcD(cx, cy, ringR, i * 45, i * 45 + 45 - RING_GAP)}"/>`).join("");
  const aria = RADAR.map((item) => `${item[lang]} ${item.score}`).join(", ");
  return `
    <div class="stage-bar">
      <button type="button" class="btn btn-primary spring" id="radar-play">${esc(s("play"))}</button>
      <button type="button" class="btn" id="radar-skip">${esc(s("skip"))}</button>
    </div>
    <div class="stage stage-radar" id="radar-stage">
      <div class="burst-layer" id="radar-burst"></div>
      <svg class="radar-svg" viewBox="0 0 360 330" role="img" aria-label="${esc(aria)}">
        <g class="radar-bloom" id="radar-bloom">${grid}${spokes}</g>
        <g id="radar-ring" opacity="1">${arcs}</g>
        <polygon class="radar-shape" id="radar-shape" points="${pointsOf(target)}"/>
        <g id="radar-vertices">${target.map(([x, y]) => `<circle class="radar-vertex" cx="${f2(x)}" cy="${f2(y)}" r="3.2"/>`).join("")}</g>
        <g id="radar-labels">${RADAR.map(radarLabel).join("")}</g>
      </svg>
    </div>`;
}

const pointsOf = (pts) => pts.map((pt) => pt.map(f2).join(",")).join(" ");
const clamp01 = (n) => Math.max(0, Math.min(1, n));

function sceneRadar(root, signal) {
  const [cx, cy] = RADAR_C;
  const target = RADAR.map((item, i) => polar(cx, cy, (RADAR_R * item.score) / 100, i * 45));
  const start = RADAR.map((_, i) => polar(cx, cy, RADAR_R * RING_START, i * 45));
  root.innerHTML = radarMarkup(target);

  const bloom = root.querySelector("#radar-bloom");
  const ring = root.querySelector("#radar-ring");
  const shape = root.querySelector("#radar-shape");
  const vertices = [...root.querySelectorAll("#radar-vertices circle")];
  const labels = root.querySelector("#radar-labels");
  const layer = root.querySelector("#radar-burst");
  pressSpring(root.querySelector("#radar-play"), signal);

  let run = null;
  const setPoints = (pts) => {
    shape.setAttribute("points", pointsOf(pts));
    pts.forEach(([x, y], i) => {
      vertices[i].setAttribute("cx", f2(x));
      vertices[i].setAttribute("cy", f2(y));
    });
    probe.radarPoints = pts;
  };
  const setOpacity = (els, o) => { for (const el of els) el.style.opacity = o.toFixed(3); };
  const endState = () => {
    setPoints(target);
    ring.style.opacity = "0";
    setOpacity([bloom, shape, labels, ...vertices], 1);
    bloom.style.transform = "";
  };

  const play = async () => {
    run?.abort();
    run = new AbortController();
    const sig = either(signal, run.signal);
    probe.done.radar = false;

    if (reduced()) {
      // Reduced: the ring cross-fades into the finished radar. Nothing travels.
      setPoints(target);
      bloom.style.transform = "";
      const ok = await animate({
        duration: 300,
        signal: sig,
        update: (e) => {
          ring.style.opacity = (1 - e).toFixed(3);
          setOpacity([bloom, shape, labels, ...vertices], e);
        }
      });
      if (ok) probe.done.radar = true;
      return;
    }

    setPoints(start);
    ring.style.opacity = "1";
    setOpacity([bloom, shape, labels, ...vertices], 0);
    bloom.style.transform = `scale(${RING_START})`;

    const total = MORPH_AT_MS + (RADAR.length - 1) * VERTEX_STAGGER_MS + VERTEX_MS;
    const ok = await animate({
      duration: total,
      signal: sig,
      update: (_, p) => {
        const now = p * total;
        // The ring hands over to the octagon it is standing on...
        const hand = easeOut(clamp01(now / HANDOVER_MS));
        ring.style.opacity = (1 - hand).toFixed(3);
        setOpacity([shape, ...vertices], hand);
        // ...then each region grows to its score, in radar order.
        setPoints(start.map(([sx, sy], i) => {
          const e = easeStar(clamp01((now - MORPH_AT_MS - i * VERTEX_STAGGER_MS) / VERTEX_MS));
          return [sx + (target[i][0] - sx) * e, sy + (target[i][1] - sy) * e];
        }));
        const b = easeStar(clamp01((now - MORPH_AT_MS) / VERTEX_MS));
        bloom.style.opacity = b.toFixed(3);
        bloom.style.transform = `scale(${(RING_START + (1 - RING_START) * b).toFixed(4)})`;
        labels.style.opacity = clamp01((now - 900) / 400).toFixed(3);
      }
    });
    if (!ok) return;
    endState();
    burst(layer, sig);
    probe.done.radar = true;
  };

  root.querySelector("#radar-play").addEventListener("click", () => play(), { signal });
  root.querySelector("#radar-skip").addEventListener("click", () => {
    run?.abort();
    endState();
    probe.done.radar = true;
  }, { signal });

  play();
}

// --- shell ------------------------------------------------------------------

const SCENES = { tug: sceneTug, ending: sceneEnding, opening: sceneOpening, radar: sceneRadar };
const sceneEl = document.getElementById("scene");
let sceneCtl = null;

function applyStatic() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = s(el.dataset.i18n);
  }
  if (osReduce.matches) {
    reduceToggle.checked = true;
    reduceToggle.disabled = true;
    reduceToggle.nextElementSibling.textContent = s("reduceOs");
  } else {
    reduceToggle.disabled = false;
  }
  for (const b of document.querySelectorAll("[data-lang]")) {
    b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
  }
}

function show() {
  sceneCtl?.abort();
  sceneCtl = new AbortController();
  for (const el of document.querySelectorAll(".flyer")) el.remove();
  const hash = location.hash.slice(1);
  const name = Object.hasOwn(SCENES, hash) ? hash : "tug";
  probe.scene = name;
  probe.done = {};
  probe.flight = null;
  for (const a of document.querySelectorAll("#tabs a")) {
    if (a.dataset.scene === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  document.getElementById("judge").innerHTML = `
    <h2>${esc(s("judge"))}</h2>
    <ul>${JUDGE[name].map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
    <p class="sr-only" id="sr-status" role="status"></p>`;
  SCENES[name](sceneEl, sceneCtl.signal);
}

for (const b of document.querySelectorAll("[data-lang]")) {
  b.addEventListener("click", () => {
    lang = b.dataset.lang;
    applyStatic();
    show();
  });
}
for (const b of document.querySelectorAll("[data-speed]")) {
  b.addEventListener("click", () => {
    speed = Number(b.dataset.speed);
    for (const o of document.querySelectorAll("[data-speed]")) {
      o.setAttribute("aria-pressed", String(o === b));
    }
    show();
  });
}
reduceToggle.addEventListener("change", () => show());
osReduce.addEventListener("change", () => { applyStatic(); show(); });
addEventListener("hashchange", () => show());

applyStatic();
show();
