// views/asterism-mark.js - the Landing's mark (v187, the owner chose "A ·
// Join the dots" over the gilt star, which read too close to humanmade.co.jp).
//
// Eight small stars, one per region in its hue, scattered round a centre and
// joined by a gold thread into an asterism: the shortest tree through them,
// so it reads as a constellation and not a polygon. Each visit draws a new
// one, and a tap on the mark draws another. The markup is the finished
// picture; the pop-in and the thread drawing itself are CSS
// (css/stage-page.css), so reduced motion simply shows it whole.

import { CHAPTERS } from "./journey.js";

// The picture's geometry, in its own viewBox units (-120..120).
const VIEW = 120;
const RING = { min: 52, max: 104 };
const JITTER_RAD = 0.32;
const STAR = { r: 19, inner: 0.32, halo: 26 };

// Where the eight stars sit: one per eighth of the circle, nudged a little in
// angle and placed anywhere in the ring. `rand` returns [0, 1).
export function asterismPoints(rand = Math.random) {
  return CHAPTERS.map((_, i) => {
    const a = (Math.PI * 2 * i) / CHAPTERS.length - Math.PI / 2 + (rand() * 2 - 1) * JITTER_RAD;
    const r = RING.min + rand() * (RING.max - RING.min);
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
}

// The shortest tree joining the points (Prim's), as [from, to] index pairs in
// the order they join, which is also the order the thread draws them.
export function treeEdges(points) {
  const joined = [0];
  const edges = [];
  while (joined.length < points.length) {
    let best = null;
    for (const a of joined) {
      points.forEach((p, b) => {
        if (joined.includes(b)) return;
        const d = Math.hypot(p[0] - points[a][0], p[1] - points[a][1]);
        if (!best || d < best.d) best = { a, b, d };
      });
    }
    joined.push(best.b);
    edges.push([best.a, best.b]);
  }
  return edges;
}

// A four-pointed star of radius r, centred on the origin.
function starPath(r, inner) {
  const d = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    d.push(`${i ? "L" : "M"}${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`);
  }
  return `${d.join("")}Z`;
}

const f = (n) => n.toFixed(1);

// The SVG. `pathLength="1"` on each thread lets the CSS draw it with a dash of
// 1 whatever its real length; `--i` staggers the stars and `--e` the threads.
export function asterismMarkup(points = asterismPoints()) {
  const star = starPath(STAR.r, STAR.inner);
  const threads = treeEdges(points).map(([a, b], e) =>
    `<line class="asterism-thread" pathLength="1" style="--e: ${e};" x1="${f(points[a][0])}" y1="${f(points[a][1])}" x2="${f(points[b][0])}" y2="${f(points[b][1])}"/>`);
  const stars = points.map(([x, y], i) =>
    `<g transform="translate(${f(x)} ${f(y)})"><g class="asterism-star" style="--i: ${i}; --hue: ${CHAPTERS[i].hue};"><circle r="${STAR.halo}"/><path d="${star}"/></g></g>`);
  return `<svg class="asterism" viewBox="${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}">${threads.join("")}${stars.join("")}<circle class="asterism-core" r="3"/></svg>`;
}
