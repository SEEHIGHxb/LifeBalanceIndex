/* docs/prototype/redesign/proto.js
 *
 * The approved recreation's motion (hm-recreation-v7), carrying LBI's content.
 * Three screens behind a hash router: #/ the Landing, #/journey three real
 * questions, #/home a sample Home. Ported from v7 with its constants intact:
 * the hero follow-and-burst, the travelling typed headline, the pinned shape
 * that grows behind the cards, the slab entry, the photo-band wipes, the
 * sticker wall, the magnetic pills and the per-character menu.
 *
 * What changed from v7 is WHAT moves: the heart is the gilt star, the ducks
 * are the eight aspect motifs, the brands are the eight regions.
 *
 * Rules kept from the app (docs/interactive-web-plan.md):
 *   - Quiet zones: The Still Water and The Commons never burst, type, spring
 *     or slide. Their content simply arrives.
 *   - Motion never depends on an answer: every option moves the same way.
 *   - Reduced motion shows every screen in its final state.
 *   - Thai types by grapheme, so a vowel or tone mark is never split off.
 */
(function () {
  "use strict";
  var P = window.LBI_PROTO;
  if (!P) return;

  var reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
  var mobileMq = matchMedia("(max-width:900px)");
  var html = document.documentElement;
  if (!reduced) html.classList.add("js");

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var clamp01 = function (t) { return Math.max(0, Math.min(1, t)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ASSETS = "../../../assets/";
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ------------------------------------------------------------ language */
  var LANG_KEY = "lbi_proto_lang";
  var lang = "en";
  try { if (localStorage.getItem(LANG_KEY) === "th") lang = "th"; } catch (e) { /* private mode */ }
  var S = function () { return P.STRINGS[lang]; };
  var L = function (field) { return field[lang]; };
  var fmt = function (s, vars) {
    return s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  };
  var graphemes = function (s) {
    if (window.Intl && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter(lang, { granularity: "grapheme" }).segment(s),
        function (x) { return x.segment; });
    }
    return Array.from(s);
  };

  /* --------------------------------------------------------- scale model */
  var DESKTOP_REF = 2545, MOBILE_REF = 820, MOBILE_MAX = 900;
  var pxNow = 1;
  var setPx = function () {
    var cw = html.clientWidth || innerWidth;
    pxNow = cw / (cw <= MOBILE_MAX ? MOBILE_REF : DESKTOP_REF);
    html.style.setProperty("--px", pxNow + "px");
    html.style.setProperty("--cw", cw + "px");
    var blur = document.querySelector("#round feGaussianBlur");
    if (blur) blur.setAttribute("stdDeviation", (4.5 * pxNow).toFixed(2));
  };
  var PX = function () { return pxNow; };
  setPx();

  /* Every mount belongs to one generation. A route change or a language
     switch starts a new one, and every loop of the old one stops itself. */
  var gen = 0;
  var loop = function (step) {
    var running = false, last = 0, g = gen;
    var tick = function (now) {
      if (g !== gen) { running = false; return; }
      var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
      running = step(dt);
      if (running) requestAnimationFrame(tick);
    };
    return function () {
      if (running || g !== gen) return;
      running = true; last = performance.now();
      requestAnimationFrame(tick);
    };
  };
  var springStep = function (o, key, rest, sp, dt) {
    var n = Math.ceil(dt / (1 / 240)), h = dt / n, vk = "v" + key;
    for (var i = 0; i < n; i++) {
      o[vk] += (-sp.k * (o[key] - rest) - sp.c * o[vk]) * h;
      o[key] += o[vk] * h;
    }
    return Math.abs(o[key] - rest) > 0.002 || Math.abs(o[vk]) > 0.02;
  };
  /* a timed tween; under reduced motion it lands on the end at once */
  var tween = function (ms, ease, update) {
    return new Promise(function (resolve) {
      if (reduced || ms <= 0) { update(1); resolve(); return; }
      var g = gen, t0 = performance.now();
      var tick = function (now) {
        if (g !== gen) { resolve(); return; }
        var p = clamp01((now - t0) / ms);
        update(ease(p));
        if (p < 1) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
  };
  var easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var linear = function (t) { return t; };
  var wait = function (ms) {
    return new Promise(function (r) { setTimeout(r, reduced ? 0 : ms); });
  };

  /* ------------------------------------------------------ star geometry */
  var ANG = function (i) { return -Math.PI / 2 + i * Math.PI / 4; };
  var pt = function (cx, cy, r, a) { return (cx + r * Math.cos(a)).toFixed(2) + " " + (cy + r * Math.sin(a)).toFixed(2); };
  /* eight tips at radii[i], valleys between them at `valley` */
  var starPoints = function (radii, cx, cy, valley) {
    var out = [];
    for (var i = 0; i < 8; i++) {
      out.push(pt(cx, cy, radii[i], ANG(i)));
      out.push(pt(cx, cy, valley, ANG(i) + Math.PI / 8));
    }
    return out.join(" ");
  };
  var STAR_VALLEY = 13 / 46;                 /* story-card.js's valley */
  var scoreRadii = function (scores, r) {
    return scores.map(function (s) { return r * Math.max(STAR_VALLEY * 1.35, s / 100); });
  };
  /* the reader's own star: the radar shape, drawn in the gilt star's inks */
  var radarStarSvg = function (scores, style) {
    var tips = scoreRadii(scores, 47);
    var spokes = tips.map(function (r, i) { return "M50 50L" + pt(50, 50, r, ANG(i)); }).join("");
    return '<svg viewBox="0 0 100 100" aria-hidden="true"' + (style ? ' style="' + style + '"' : "") + ">" +
      '<polygon points="' + starPoints(tips, 50, 50, 47 * STAR_VALLEY) + '" fill="#F0D8A8" stroke="#A88752" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<path d="' + spokes + '" stroke="#A88752" stroke-width="1.6" stroke-opacity=".5" stroke-linecap="round"/>' +
      '<circle cx="50" cy="50" r="6" fill="#FBF8F1" stroke="#6F7D64" stroke-width="2.4"/></svg>';
  };
  /* one kite per chapter: centre, valley, tip, valley */
  var petalsSvg = function (lit, cls) {
    var out = "";
    for (var i = 0; i < 8; i++) {
      var d = "M50 50L" + pt(50, 50, 15, ANG(i) - Math.PI / 8) + "L" + pt(50, 50, 47, ANG(i)) +
        "L" + pt(50, 50, 15, ANG(i) + Math.PI / 8) + "Z";
      out += '<path class="pt" d="' + d + '"' + (lit[i] ? ' style="fill:' + P.CHAPTERS[i].hue + '"' : "") + "/>";
    }
    return '<svg class="' + (cls || "") + '" viewBox="0 0 100 100" aria-hidden="true">' + out + "</svg>";
  };
  /* the huge pinned shape behind the cards (v7's heart layer) */
  var bigStarSvg = function (radii, valley) {
    return '<svg class="projects__star" viewBox="0 0 2545 2800" overflow="visible">' +
      '<polygon points="' + starPoints(radii, 1272, 1500, valley) + '"/></svg>';
  };
  var motifSvg = function (ch, style) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (style ? ' style="' + style + '"' : "") +
      '><path d="' + ch.motif + '" stroke="' + ch.hue + '"/></svg>';
  };

  /* ------------------------------------------------------------ sprites */
  var makeSprite = function (i, chapter) {
    var s = document.createElement("span");
    var ch = chapter != null ? P.CHAPTERS[chapter] : P.CHAPTERS[i % 8];
    var star = i % 3 === 2;
    s.className = "spr" + (star ? "" : " spr--motif");
    s.innerHTML = star ? '<svg viewBox="0 0 100 100"><use href="#g-star"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="' + ch.motif + '" stroke="' + ch.hue + '"/></svg>';
    return s;
  };

  /* ================================================================ hero */
  /* V5/V6_REVIEW constants, unchanged: the three parts follow the pointer
     offset from (1272.5, 644); leaving the field snaps the tether, the
     motifs burst from the star and the parts spring home. On a phone there
     is no pointer to follow, so tapping the star does the same. */
  var HERO = {
    cx: 1272.5, cy: 644, field: { x0: 395, x1: 2150, y0: 120, y1: 1250 },
    grab: { x: 1280, y: 600, r: 550 }, tau: 0.055, maxRot: 12, maxScale: 1.2, markTurn: 0.6,
    turnPivot: { x: 1272, y: 735 }, scalePivot: { x: 1272, y: 462 },
    spring: { k: 480, c: 17 }, kick: -8, cooldownMs: 800
  };
  var BURST = { n: 16, r0: 120, r1: 720, tauR: 0.27, mMin: 0.65, mMax: 1.3,
    shrinkAt: 0.13, shrinkOver: 0.64, shrinkPow: 1.3, minScale: 0.27,
    fadeIn: 0.1, fadeAt: 0.5, fadeOver: 0.6, life: 0.8 };

  /* a burst from the centre of `from` into `layer`; shared with the journey */
  var fireBurst = function (layer, from, chapter) {
    if (reduced || !layer || !from) return;
    var lb = layer.getBoundingClientRect(), fb = from.getBoundingClientRect();
    var ox = fb.left + fb.width / 2 - lb.left, oy = fb.top + fb.height / 2 - lb.top;
    var live = [];
    for (var i = 0; i < BURST.n; i++) {
      var th = (i / BURST.n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      var el = makeSprite(i, chapter);
      el.style.opacity = "0";
      layer.appendChild(el);
      live.push({ el: el, t: 0, c: Math.cos(th), s: Math.sin(th), m: lerp(BURST.mMin, BURST.mMax, Math.random()) });
    }
    loop(function (dt) {
      var px = PX();
      for (var j = live.length - 1; j >= 0; j--) {
        var b = live[j];
        b.t += dt;
        var r = (BURST.r0 + BURST.r1 * (1 - Math.exp(-b.t / BURST.tauR))) * b.m * px;
        var u = clamp01((b.t - BURST.shrinkAt) / BURST.shrinkOver);
        var sc = 1 - (1 - BURST.minScale) * (1 - Math.pow(1 - u, BURST.shrinkPow));
        var op = Math.min(1, b.t / BURST.fadeIn) * (1 - clamp01((b.t - BURST.fadeAt) / BURST.fadeOver));
        b.el.style.transform = "translate(" + (ox + r * b.c).toFixed(1) + "px," + (oy + r * b.s).toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
        b.el.style.opacity = op.toFixed(3);
        if (b.t >= BURST.life) { b.el.remove(); live.splice(j, 1); }
      }
      return live.length > 0;
    })();
  };

  var mountHero = function (root) {
    var stage = $(".heroStage", root);
    if (!stage) return null;
    var burstEl = $(".burst", stage), markEl = $(".mark", stage);
    var parts = [
      { id: "mark", el: $("[data-part=mark]", stage), keys: ["x", "y"], rest: { x: 0, y: 0 } },
      { id: "word", el: $("[data-part=word]", stage), keys: ["x", "y"], rest: { x: 0, y: 0 } },
      { id: "inc", el: $("[data-part=inc]", stage), keys: ["x", "y"], rest: { x: 0, y: 0 } },
      { id: "group", el: $(".lockup", stage), keys: ["r", "s"], rest: { r: 0, s: 1 } }
    ].filter(function (p) { return p.el; });
    parts.forEach(function (p) {
      p.keys.forEach(function (k) { p[k] = p.rest[k]; p["v" + k] = 0; });
      p.t = Object.assign({}, p.rest);
    });
    var byId = {};
    parts.forEach(function (p) { byId[p.id] = p; });
    var hero = { mode: "follow", engaged: false, coolUntil: 0 };

    var targets = function (dx, dy) {
      var prod = dx * dy, ap = Math.abs(prod);
      return {
        mark: { x: 0.20 * dx, y: 0.21 * dy }, word: { x: 0.20 * dx, y: 0.20 * dy }, inc: { x: 0.12 * dx, y: 0.12 * dy },
        group: { r: clamp(4.8e-5 * prod, -HERO.maxRot, HERO.maxRot), s: Math.min(HERO.maxScale, 1 + 5e-7 * ap) }
      };
    };
    var paint = function () {
      var px = PX(), r = byId.group ? byId.group.r : 0;
      parts.forEach(function (p) {
        if (p.id === "group") {
          var tp = HERO.turnPivot, sp = HERO.scalePivot;
          var T = function (x, y) { return "translate(" + (x * px).toFixed(2) + "px," + (y * px).toFixed(2) + "px) "; };
          p.el.style.transform = T(tp.x, tp.y) + "rotate(" + p.r.toFixed(3) + "deg) " +
            T(sp.x - tp.x, sp.y - tp.y) + "scale(" + p.s.toFixed(4) + ") " + T(-sp.x, -sp.y);
          return;
        }
        p.el.style.transform = "translate(" + (p.x * px).toFixed(2) + "px," + (p.y * px).toFixed(2) + "px)" +
          (p.id === "mark" ? " rotate(" + (HERO.markTurn * r).toFixed(3) + "deg)" : "");
      });
    };
    var run = loop(function (dt) {
      var moving = false, a = 1 - Math.exp(-dt / HERO.tau);
      parts.forEach(function (p) {
        p.keys.forEach(function (k) {
          if (hero.mode === "spring") { if (springStep(p, k, p.rest[k], HERO.spring, dt)) moving = true; return; }
          var d = p.t[k] - p[k];
          p[k] += d * a; p["v" + k] = 0;
          if (Math.abs(d) > 0.01) moving = true;
        });
      });
      if (!moving && hero.mode === "spring") {
        parts.forEach(function (p) { p.keys.forEach(function (k) { p[k] = p.rest[k]; p["v" + k] = 0; }); });
      }
      paint();
      return moving;
    });
    var springHome = function () {
      hero.engaged = false;
      if (hero.mode !== "spring") {
        parts.forEach(function (p) { p.keys.forEach(function (k) { p["v" + k] = HERO.kick * (p[k] - p.rest[k]); }); });
      }
      hero.mode = "spring";
      run();
    };
    var pointer = function (clientX, clientY, fromScroll) {
      if (reduced || mobileMq.matches || !parts.length) return;
      var b = stage.getBoundingClientRect(), px = PX();
      var x = (clientX - b.left) / px, y = (clientY - b.top) / px;
      stage.classList.toggle("grab", Math.hypot(x - HERO.grab.x, y - HERO.grab.y) < HERO.grab.r);
      if (performance.now() < hero.coolUntil) return;
      var f = HERO.field;
      if (!(x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1)) {
        if (!hero.engaged) return;
        if (!fromScroll) { fireBurst(burstEl, markEl); hero.coolUntil = performance.now() + HERO.cooldownMs; }
        springHome();
        return;
      }
      hero.engaged = true; hero.mode = "follow";
      var t = targets(x - HERO.cx, y - HERO.cy);
      parts.forEach(function (p) { p.t = t[p.id]; });
      run();
    };
    /* the tap: a burst and a knock that springs back */
    var hit = $(".markHit", stage);
    if (hit) hit.addEventListener("click", function () {
      if (reduced) return;
      fireBurst(burstEl, markEl);
      if (byId.group) { byId.group.vr = 90; byId.group.vs = 1.4; }
      if (byId.mark) byId.mark.vy = -600;
      hero.mode = "spring"; run();
    });
    return { pointer: pointer, leave: function () { if (hero.engaged) springHome(); } };
  };

  /* ================================================== typed headlines */
  /* Builds one span per grapheme so a line can be shown n characters at a
     time. `caret` appends the gilt star after the last shown character. */
  var buildTyped = function (el, lines, caret) {
    el.textContent = "";
    var chars = [], breaks = [];
    lines.forEach(function (line, li) {
      if (li) { var br = document.createElement("br"); el.appendChild(br); breaks.push({ br: br, at: chars.length }); }
      graphemes(line).forEach(function (g) {
        var s = document.createElement("span");
        s.textContent = g; el.appendChild(s); chars.push(s);
      });
    });
    var caretEl = null;
    if (caret) {
      caretEl = document.createElement("span");
      caretEl.className = "caret";
      caretEl.innerHTML = '<svg viewBox="0 0 100 100"><use href="#g-star"/></svg>';
      el.appendChild(caretEl);
    }
    var shown = -1;
    return {
      count: chars.length, firstLine: lines.length ? graphemes(lines[0]).length : 0, caret: caretEl,
      show: function (n) {
        if (n === shown) return;
        shown = n;
        chars.forEach(function (c, i) { c.classList.toggle("off", i >= n); });
        breaks.forEach(function (b) { b.br.classList.toggle("off", n <= b.at); });
      }
    };
  };
  /* type over time; resolves when every character is in */
  var typeOut = function (typed, msPerChar) {
    typed.show(0);
    return tween(typed.count * msPerChar, linear, function (p) {
      typed.show(Math.round(p * typed.count));
    });
  };

  /* The mission headline. Desktop: v7's travelling seed, pinned and typed by
     scroll. Phone: it types itself once when it comes into view. */
  var mountMission = function (root) {
    var head = $(".mission__head", root), seed = $(".seed", root);
    if (!head) return null;
    var lines = JSON.parse(head.getAttribute("data-lines"));
    var flystar = $(".flystar", head);
    var flown = false;
    var setFlown = function (on) {
      if (!flystar || on === flown) return;
      flown = on;
      flystar.classList.remove("go");
      if (on && !reduced) { void flystar.offsetWidth; flystar.classList.add("go"); }
    };

    if (mobileMq.matches || reduced || !seed) {
      html.classList.remove("seed-on", "seed-done");
      if (reduced) return null;
      /* readers get the whole line at once; the typing is for the eye */
      var holder = document.createElement("span");
      holder.setAttribute("aria-hidden", "true");
      var typed = buildTyped(holder, lines, true);
      typed.show(0);
      var sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = lines.join(" ");
      head.textContent = "";
      head.appendChild(sr); head.appendChild(holder);
      if (flystar) head.appendChild(flystar);
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        typeOut(typed, 55).then(function () {
          if (typed.caret) typed.caret.remove();
          setFlown(true);
        });
      }, { threshold: 0.6 });
      io.observe(head);
      return null;
    }

    /* Recorded (V4_REVIEW #1-2): moves 1:1 with the page to scroll 530,
       then pins with line 1's glyph bottom at view 668 while growing
       0.5 -> 1 (full at 1060); x eases in from 2279; types by 1700. */
    var SEED = { glyphLeft: 2279, pinAt: 530, fullAt: 1060, anchor: 668, glyphBottom: 58, s0: .5, xEase: 1.6 };
    var typedSeed = buildTyped(seed, lines, true);
    var N = typedSeed.count;
    var TYPING = [[530, Math.min(3, N)], [1228, typedSeed.firstLine], [1700, N]];
    var typedAt = function (s) {
      if (s <= TYPING[0][0]) return TYPING[0][1];
      for (var i = 1; i < TYPING.length; i++) {
        var a = TYPING[i - 1], b = TYPING[i];
        if (s <= b[0]) return lerp(a[1], b[1], (s - a[0]) / (b[0] - a[0]));
      }
      return N;
    };
    var frame = function () {
      html.classList.add("seed-on");
      var px = PX(), y = scrollY;
      var hb = head.getBoundingClientRect();
      var restTop = hb.top + y, restLeft = hb.left;
      var sPin = SEED.pinAt * px, pinnedTop = (SEED.anchor - SEED.glyphBottom) * px;
      var sEnd = Math.max(sPin + 1, restTop - pinnedTop);
      var done = y >= sEnd;
      html.classList.toggle("seed-done", done);
      setFlown(done);
      typedSeed.show(Math.min(N, Math.round(typedAt(y / px))));
      var g = clamp01((y - sPin) / ((SEED.fullAt - SEED.pinAt) * px));
      var sc = lerp(SEED.s0, 1, g);
      var vy = (SEED.anchor - SEED.glyphBottom * sc) * px;
      if (y < sPin) vy += sPin - y;
      var k = clamp01((y - sPin) / (sEnd - sPin));
      var x = restLeft + (SEED.glyphLeft * px - restLeft) * Math.pow(1 - k, SEED.xEase);
      seed.style.transform = "translate(" + x.toFixed(1) + "px," + vy.toFixed(1) + "px) scale(" + sc.toFixed(4) + ")";
    };
    return { frame: frame };
  };

  /* ============================================ projects: the pinned star */
  var mountProjects = function (root) {
    var sec = $(".projects", root), star = $(".projects__star", root);
    if (!sec) return null;
    var HEART = { from: -910, to: 255, s0: .725 };   /* V5_REVIEW obs. 3 */
    var ENTRY = { slabFrom: 18, slabSpan: 525, slabPow: 3.5, slabX: 158, alpha: 0.2 };
    /* quiet regions arrive where they are */
    var entry = $$(".brand:not([data-quiet]) .card", root).map(function (el) {
      return { el: el, x: 0, tx: 0 };
    });
    var runEntry = loop(function (dt) {
      var a = 1 - Math.pow(1 - ENTRY.alpha, dt * 60), px = PX(), moving = false;
      entry.forEach(function (o) {
        var d = o.tx - o.x;
        if (Math.abs(d) < 0.05) o.x = o.tx; else { o.x += d * a; moving = true; }
        o.el.style.transform = o.x ? "translateX(" + (o.x * px).toFixed(1) + "px)" : "";
      });
      return moving;
    });
    var frame = function () {
      if (reduced) return;
      var px = PX();
      if (star) {
        var into = -sec.getBoundingClientRect().top;
        var k = clamp01((into - HEART.from * px) / ((HEART.to - HEART.from) * px));
        var s = 1 - (1 - HEART.s0) * (1 - k) * (1 - k);
        star.style.transform = k >= 1 ? "" : "scale(" + s.toFixed(4) + ")";
      }
      var vhD = innerHeight / px;
      entry.forEach(function (o) {
        var top = (o.el.getBoundingClientRect().top) / px;
        var u = clamp01((vhD - ENTRY.slabFrom - top) / ENTRY.slabSpan);
        o.tx = ENTRY.slabX * Math.pow(1 - u, ENTRY.slabPow);
      });
      runEntry();
    };
    return { frame: frame };
  };

  /* ============================================== photo band: the wipes */
  var mountBand = function (root) {
    var band = $(".photoband", root);
    if (!band) return null;
    var WIPES = [{ from: 167, to: -320 }, { from: -327, to: -565 }];   /* V5_REVIEW #16 */
    var layers = $$("i", band).slice(1);
    var cur = layers.map(function () { return 1; }), target = cur.slice();
    var paint = function () {
      layers.forEach(function (l, i) { l.style.clipPath = "inset(" + (cur[i] * 100).toFixed(2) + "% 0 0 0)"; });
    };
    var run = loop(function (dt) {
      var a = 1 - Math.pow(1 - 0.25, dt * 60), moving = false;
      cur = cur.map(function (c, i) {
        var d = target[i] - c;
        if (Math.abs(d) < 0.001) return target[i];
        moving = true; return c + d * a;
      });
      paint();
      return moving;
    });
    return {
      frame: function () {
        var px = PX(), vt = band.getBoundingClientRect().top;
        target = WIPES.map(function (w) { return 1 - clamp01((w.from * px - vt) / ((w.from - w.to) * px)); });
        if (reduced) { cur = target.slice(); paint(); return; }
        run();
      }
    };
  };

  /* ================================================= the wall of goals */
  var stickerSvg = function (ch, i) {
    var inner = i % 4 === 3
      ? '<g transform="translate(35 35) scale(1.6)"><use href="#g-star"/></g>'
      : '<circle cx="115" cy="115" r="92" fill="' + ch.hue + '"/>' +
        '<path d="' + ch.motif + '" transform="translate(55 55) scale(5)" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    return '<svg viewBox="0 0 230 230" aria-hidden="true"><g filter="url(#diecut)">' + inner + "</g></svg>";
  };
  var mountWall = function (root) {
    var wall = $(".wall", root);
    if (!wall) return null;
    var cols = [];
    var goalChapters = [4, 1, 6, 0, 5, 7];        /* sample goals; never a quiet region */
    for (var c = 0; c < 6; c++) {
      var col = document.createElement("div");
      col.className = "wall__col";
      var cells = "";
      for (var pass = 0; pass < 2; pass++) {
        for (var k = 0; k < 4; k++) {
          var ch = P.CHAPTERS[goalChapters[(c + k) % 6]];
          cells += "<i>" + stickerSvg(ch, c + k) + "</i>";
        }
      }
      col.innerHTML = cells;
      wall.appendChild(col);
      cols.push({ el: col, dir: (c % 2 ? 1 : -1), y: (c % 2 ? -1 : 0) });
    }
    if (reduced) return null;
    var on = false;
    var run = loop(function (dt) {
      var px = PX();
      cols.forEach(function (o) {
        var half = o.el.scrollHeight / 2 || 1;
        if (o.y === -1) o.y = -half;
        o.y += o.dir * 90 * px * dt;
        if (o.y <= -half) o.y += half;
        if (o.y >= 0) o.y -= half;
        o.el.style.transform = "translateY(" + o.y.toFixed(1) + "px)";
      });
      return on;
    });
    new IntersectionObserver(function (en) { on = en[0].isIntersecting; if (on) run(); }, { threshold: 0 }).observe(wall);
    return null;
  };

  /* ===================================================== magnetic pills */
  /* V5_REVIEW obs. 4 / V6_REVIEW #8, unchanged. Answer pills are left out:
     a choice should not lean toward the pointer. */
  var MAG = { pullX: 0.30, pullY: 0.23, maxX: 0.2, maxY: 0.35, maxTilt: 7.2, tiltPow: 2.4,
    scale: 1.095, tau: 0.06, tauS: 0.03, inner: 0.15, spring: { k: 490, c: 12 } };
  var MKEYS = ["x", "y", "r", "s", "ix"], MREST = { x: 0, y: 0, r: 0, s: 1, ix: 0 };
  var wrapPills = function (root) {
    $$(".pill", root).forEach(function (p) {
      if ($(".pill__in", p)) return;
      var inner = document.createElement("span");
      inner.className = "pill__in";
      while (p.firstChild) inner.appendChild(p.firstChild);
      p.appendChild(inner);
    });
  };
  var magActive = [], magHover = null, magRunning = false, magLast = 0;
  var magState = function (el) {
    if (el.__mag) return el.__mag;
    var o = { el: el, inner: el.querySelector(".pill__in"), hover: false, t: Object.assign({}, MREST) };
    MKEYS.forEach(function (k) { o[k] = MREST[k]; o["v" + k] = 0; });
    el.__mag = o;
    return o;
  };
  var paintMag = function (o) {
    o.el.style.transform = (o.x || o.y || o.r || o.s !== 1)
      ? "translate(" + o.x.toFixed(2) + "px," + o.y.toFixed(2) + "px) rotate(" + o.r.toFixed(3) + "deg) scale(" + o.s.toFixed(4) + ")" : "";
    if (o.inner) o.inner.style.transform = o.ix ? "translateX(" + o.ix.toFixed(2) + "px)" : "";
  };
  var magTick = function (now) {
    var dt = Math.min(0.05, Math.max(0.001, (now - magLast) / 1000)); magLast = now;
    var a = 1 - Math.exp(-dt / MAG.tau), as = 1 - Math.exp(-dt / MAG.tauS);
    magActive = magActive.filter(function (o) {
      if (!o.el.isConnected) return false;
      var moving = false;
      MKEYS.forEach(function (k) {
        if (!o.hover) { if (springStep(o, k, MREST[k], MAG.spring, dt)) moving = true; return; }
        o[k] += (o.t[k] - o[k]) * (k === "s" ? as : a);
        o["v" + k] = 0;
        if (Math.abs(o.t[k] - o[k]) > 0.002) moving = true;
      });
      if (!moving && !o.hover) MKEYS.forEach(function (k) { o[k] = MREST[k]; o["v" + k] = 0; });
      paintMag(o);
      return moving || o.hover;
    });
    magRunning = magActive.length > 0;
    if (magRunning) requestAnimationFrame(magTick);
  };
  var wake = function (o) {
    if (magActive.indexOf(o) < 0) magActive.push(o);
    if (!magRunning) { magRunning = true; magLast = performance.now(); requestAnimationFrame(magTick); }
  };
  var magLeave = function () {
    if (!magHover) return;
    magHover.hover = false; wake(magHover); magHover = null;
  };
  if (!reduced) {
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var el = e.target.closest ? e.target.closest(".pill") : null;
      if (el && el.closest(".answers")) el = null;
      if (!el || (magHover && magHover.el !== el)) magLeave();
      if (!el) return;
      if (!magHover) {
        var o0 = magState(el), b = el.getBoundingClientRect();
        o0.cx = b.left + b.width / 2 - o0.x; o0.cy = b.top + b.height / 2 - o0.y;
        o0.w = el.offsetWidth; o0.h = el.offsetHeight; o0.hover = true; magHover = o0;
      }
      var o = magHover, dx = e.clientX - o.cx, dy = e.clientY - o.cy;
      o.t = {
        x: clamp(MAG.pullX * dx, -MAG.maxX * o.w, MAG.maxX * o.w),
        y: clamp(MAG.pullY * dy, -MAG.maxY * o.h, MAG.maxY * o.h),
        r: MAG.maxTilt * Math.sign(dx) * Math.pow(Math.min(1, Math.abs(dx) / (o.w / 2)), MAG.tiltPow),
        s: MAG.scale, ix: MAG.inner * dx
      };
      wake(o);
    }, { passive: true });
    html.addEventListener("pointerleave", magLeave);
  }

  /* ============================================================= screens */
  var footerHTML = function () {
    var s = S();
    return '<footer class="footer"><div class="wrap footer__row">' +
      '<div class="footer__mark"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#g-star"/></svg><span>LIFE BALANCE<br>INDEX</span></div>' +
      '<nav aria-label="Footer"><a href="#/home">' + esc(s.navHome) + '</a><a href="#/journey">' + esc(s.navJourney) + "</a>" +
      '<a href="#/" aria-disabled="true" data-soon>' + esc(s.footMethod) + '</a><a href="#/" aria-disabled="true" data-soon>' + esc(s.footPrivacy) + "</a></nav>" +
      '<div class="footer__meta"><span>' + esc(s.footLocal) + "</span><span>© Life Balance Index</span></div>" +
      "</div></footer>";
  };
  var heroHTML = function (markSvg, word, inc, srTitle, tapLabel) {
    return '<section class="hero"><div class="heroStage">' +
      '<h1 class="sr-only">' + esc(srTitle) + "</h1>" +
      '<div class="burst" aria-hidden="true"></div>' +
      '<div class="lockup">' +
      '<div class="part pMark" data-part="mark" aria-hidden="true"><div class="mark">' + markSvg + "</div></div>" +
      '<div class="part" data-part="word" aria-hidden="true"><div class="word">' + esc(word) + "</div></div>" +
      '<div class="part" data-part="inc" aria-hidden="true"><div class="inc">' + esc(inc) + "</div></div>" +
      "</div>" +
      '<button class="markHit" type="button" aria-label="' + esc(tapLabel) + '"></button>' +
      "</div></section>";
  };
  var missionHTML = function (label, lines) {
    return '<section class="panel mission"><div class="wrap split">' +
      '<h2 class="label">' + esc(label) + "</h2>" +
      "<p class=\"mission__head headline\" data-lines='" + esc(JSON.stringify(lines)) + "'>" +
      lines.map(esc).join("<br>") +
      '<span class="flystar" aria-hidden="true"><svg viewBox="0 0 100 100"><use href="#g-star"/></svg></span></p>' +
      "</div></section>";
  };
  var careersHTML = function (label, lines, cta, href) {
    return '<section class="careers"><div class="wrap split"><h2 class="label">' + esc(label) + "</h2>" +
      '<div class="careers__row"><p class="careers__head">' + lines.map(esc).join("<br>") + "</p>" +
      '<a class="pill" href="' + href + '">' + esc(cta) + "</a></div></div></section>";
  };
  var bandHTML = function (idx) {
    return '<section class="photoband" aria-hidden="true">' + idx.map(function (i) {
      var ch = P.CHAPTERS[i];
      return '<i style="background-image:url(' + ASSETS + "regions/" + ch.art + '.jpg)"><b>' + esc(L(ch.region)) + "</b></i>";
    }).join("") + "</section>";
  };
  var brandHTML = function (ch, right) {
    return '<div class="brand"' + (ch.quiet ? " data-quiet" : "") + ">" +
      '<article class="card brand__visual" style="overflow:hidden">' +
      '<div class="brand__logo" style="background:' + ch.wash + '"><img src="' + ASSETS + "emblems/" + ch.art + '.webp" alt="" width="224" height="224" loading="lazy" decoding="async"></div>' +
      right + "</article>" +
      '<article class="card info"><h3 class="card__title">' + esc(L(ch.region)) + "</h3>" +
      '<p class="card__desc">' + esc(L(ch.theme)) + "</p>" +
      '<div class="info__links"><span class="tag" style="color:' + ch.hue + '">' + esc(L(ch.label).toUpperCase()) + "</span></div>" +
      "</article></div>";
  };
  var photoOrMotif = function (ch) {
    if (ch.photo) return '<div class="brand__photo" style="background-image:url(' + ASSETS + "regions/" + ch.art + '.jpg)"></div>';
    return '<div class="brand__photo" style="--wash:' + ch.wash + ';display:grid;place-items:center">' +
      motifSvg(ch, "width:40%;height:auto;aspect-ratio:1;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round") +
      "</div>";
  };

  var landingHTML = function () {
    var s = S();
    var uniform = [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500];
    return '<div class="seedtrack"><div class="seedpin" aria-hidden="true"><p class="seed headline"></p></div>' +
      heroHTML('<svg viewBox="0 0 100 100"><use href="#g-star"/></svg>', s.heroWord, s.heroInc, "Life Balance Index", s.heroTap) +
      missionHTML(s.lWhy, s.lWhyHead) + "</div>" +
      '<section class="panel statement"><div class="wrap split"><h2 class="label">' + esc(s.lHow) + "</h2><div>" +
      s.lHowP.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div></div></section>" +
      '<section class="projects" id="aspects"><div class="projects__stick" aria-hidden="true">' + bigStarSvg(uniform, 760) + "</div>" +
      '<div class="inner"><h2 class="label">' + esc(s.lAspects) + '</h2><div class="cardblock">' +
      P.CHAPTERS.map(function (ch) { return brandHTML(ch, photoOrMotif(ch)); }).join("") +
      '<div class="allprojects"><a class="pill pill--xl" href="#/journey">' + esc(s.lBeginCta) + "</a></div>" +
      "</div></div></section>" +
      bandHTML([0, 1, 7]) +
      careersHTML(s.lBegin, s.lBeginHead, s.lBeginCta, "#/journey") +
      footerHTML();
  };

  var homeHTML = function () {
    var s = S(), H = P.HOME_SAMPLE;
    var strong = L(P.CHAPTERS[H.strongest].region), weak = L(P.CHAPTERS[H.lowest].region);
    var head = s.hWeekHead.map(function (l) { return fmt(l, { strong: strong, weak: weak }); });
    var rows = H.feed.map(function (f) {
      var ch = f.chapter >= 0 ? P.CHAPTERS[f.chapter] : null;
      var thumb = ch ? '<span class="newsrow__thumb" style="--wash:' + ch.wash + '">' + motifSvg(ch) + "</span>"
        : '<span class="newsrow__thumb">' + radarStarSvg(H.scores, "width:62%;height:62%") + "</span>";
      var sub = ch ? L(ch.region) + (f.delta ? " " + f.delta : "") : s.allRegions;
      return '<div class="newsrow"><span class="newsrow__meta"><span class="newsrow__date">' + f.date + "</span>" +
        '<span class="newsrow__cat">' + esc(s.kind[f.kind]) + "</span></span>" + thumb +
        '<span class="newsrow__title">' + esc(L(f.title)) + "<small>" + esc(sub) + "</small></span></div>";
    }).join("");
    return '<div class="seedtrack"><div class="seedpin" aria-hidden="true"><p class="seed headline"></p></div>' +
      heroHTML(radarStarSvg(H.scores), s.hWord, fmt(s.hInc, { n: H.index }), s.hWord + " — " + fmt(s.hIndexSr, { n: H.index }), s.heroTap) +
      missionHTML(s.hWeek, head) + "</div>" +
      '<section class="projects" id="aspects"><div class="projects__stick" aria-hidden="true">' +
      bigStarSvg(scoreRadii(H.scores, 1700), 1700 * STAR_VALLEY * 1.5) + "</div>" +
      '<div class="inner"><h2 class="label">' + esc(s.hAspects) + '</h2><div class="cardblock">' +
      P.CHAPTERS.map(function (ch, i) {
        var sc = H.scores[i];
        var right = '<div class="brand__photo brand__score" style="background:#fff">' +
          "<b>" + sc + "</b><small>" + esc(s.hScoreOf) + "</small>" +
          '<span class="meter" aria-hidden="true"><i style="width:' + sc + "%;background:" + ch.hue + '"></i></span></div>';
        return brandHTML(ch, right);
      }).join("") + "</div></div></section>" +
      bandHTML([1, 0, 7]) +
      '<section class="news"><div class="wrap split"><div class="news__side"><h2 class="label">' + esc(s.hRecent) + "</h2>" +
      '<a class="pill" href="#/home" aria-disabled="true" data-soon>' + esc(s.hAll) + "</a></div>" +
      '<div class="newslist">' + rows + "</div></div></section>" +
      '<section class="wall" aria-hidden="true"></section>' +
      careersHTML(s.hCheck, s.hCheckHead, s.hCheckCta, "#/journey") +
      footerHTML();
  };

  /* ============================================================= journey */
  var journey = { i: 0, answers: [], busy: false };
  var answeredChapters = function () {
    var lit = [false, false, false, false, false, false, false, false];
    journey.answers.forEach(function (a, qi) { if (a != null) lit[P.QUESTIONS[qi].chapter] = true; });
    return lit;
  };
  var paintProgress = function () {
    var box = $("#navpill .progress");
    if (!box) return;
    box.innerHTML = petalsSvg(answeredChapters()) +
      "<span>" + fmt(S().qOf, { i: Math.min(journey.i + 1, P.QUESTIONS.length), n: P.QUESTIONS.length }) + "</span>";
  };

  var journeyHTML = function () {
    return '<section class="q" id="q"></section>' +
      '<div class="ending" id="ending" role="dialog" aria-modal="true" aria-labelledby="endingTitle"></div>';
  };

  var renderQuestion = function (root, animate) {
    var s = S(), q = P.QUESTIONS[journey.i], ch = P.CHAPTERS[q.chapter];
    var quiet = !!ch.quiet, still = quiet || reduced || !animate;
    var sec = $("#q", root);
    sec.style.setProperty("--wash", ch.wash);
    var picked = journey.answers[journey.i];
    sec.innerHTML = '<div class="wrap split"' + (quiet ? " data-quiet" : "") + ">" +
      '<div class="q__side"><h2 class="label">(' + esc(L(ch.region).toUpperCase()) + ")</h2>" +
      '<img src="' + ASSETS + "emblems/" + ch.art + '.webp" alt="" width="224" height="224"></div>' +
      '<div class="q__main"><p class="q__stem">' + esc(L(q.stem)) + "</p>" +
      '<h1 class="q__text" id="qText" tabindex="-1"><span class="sr-only">' + esc(L(q.text)) + '</span><span class="q__typed" aria-hidden="true"></span></h1>' +
      '<div class="answers" role="radiogroup" aria-labelledby="qText">' +
      q.options.map(function (o, oi) {
        return '<button type="button" class="pill" role="radio" data-i="' + oi + '" aria-checked="' + (picked === oi) + '">' + esc(L(o)) + "</button>";
      }).join("") + "</div>" +
      (quiet ? '<p class="quietnote">' + esc(s.qQuiet) + "</p>" : "") +
      '<button type="button" class="q__back"' + (journey.i === 0 ? " hidden" : "") + ">" + esc(s.qBack) + "</button>" +
      "</div></div>";
    wrapPills(sec);
    paintProgress();

    var typed = buildTyped($(".q__typed", sec), [L(q.text)], !still);
    var pills = $$(".answers .pill", sec);
    pills.forEach(function (b) { b.addEventListener("click", function () { pick(root, +b.getAttribute("data-i")); }); });
    $(".q__back", sec).addEventListener("click", function () {
      if (journey.busy) return;
      journey.i = Math.max(0, journey.i - 1);
      renderQuestion(root, true);
    });

    if (still) { typed.show(typed.count); return; }

    /* the emblem settles, the question types, then the answers spring in */
    var img = $(".q__side img", sec);
    var em = { s: 0.86, vs: 0 };
    img.style.transform = "scale(.86)";
    loop(function (dt) {
      var m = springStep(em, "s", 1, { k: 300, c: 20 }, dt);
      img.style.transform = m ? "scale(" + em.s.toFixed(4) + ")" : "";
      return m;
    })();
    pills.forEach(function (b) { b.style.opacity = "0"; b.style.transform = "translateY(40px) scale(.92)"; });
    var g = gen;
    typeOut(typed, 32).then(function () {
      if (g !== gen) return;
      if (typed.caret) typed.caret.remove();
      pills.forEach(function (b, i) {
        var o = { y: 40, vy: 0, s: .92, vs: 0, a: 0 };
        setTimeout(function () {
          loop(function (dt) {
            o.a = Math.min(1, o.a + dt / 0.2);
            var m1 = springStep(o, "y", 0, { k: 320, c: 22 }, dt);
            var m2 = springStep(o, "s", 1, { k: 320, c: 22 }, dt);
            b.style.opacity = o.a >= 1 ? "" : o.a.toFixed(3);
            b.style.transform = (m1 || m2) ? "translateY(" + o.y.toFixed(2) + "px) scale(" + o.s.toFixed(4) + ")" : "";
            return m1 || m2 || o.a < 1;
          })();
        }, i * 70);
      });
    });
  };

  var pick = function (root, oi) {
    if (journey.busy) return;
    journey.busy = true;
    var q = P.QUESTIONS[journey.i], ch = P.CHAPTERS[q.chapter];
    var group = $("#q .answers", root);
    journey.answers[journey.i] = oi;
    $$(".pill", group).forEach(function (b) {
      b.setAttribute("aria-checked", String(+b.getAttribute("data-i") === oi));
      b.style.opacity = ""; b.style.transform = "";
    });
    group.classList.add("settled");
    paintProgress();
    /* the same press for every option */
    var chosen = $('.pill[data-i="' + oi + '"]', group);
    if (!ch.quiet && !reduced && chosen) {
      var o = { s: 0.94, vs: 0 };
      loop(function (dt) {
        var m = springStep(o, "s", 1, { k: 490, c: 12 }, dt);
        chosen.style.transform = m ? "scale(" + o.s.toFixed(4) + ")" : "";
        return m;
      })();
    }
    var g = gen;
    wait(650).then(function () { if (g === gen) showEnding(root, ch); });
  };

  /* while a chapter ending is up, nothing behind it can take focus */
  var setBehindInert = function (root, on) {
    [$("#q", root), $("#header")].forEach(function (el) {
      if (!el) return;
      if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert");
    });
  };
  var endingOpen = function () { var e = $("#ending"); return !!(e && e.classList.contains("on")); };

  var showEnding = function (root, ch) {
    var s = S(), end = $("#ending", root);
    end.style.setProperty("--wash", ch.wash);
    end.style.backgroundImage = ch.photo ? "url(" + ASSETS + "regions/" + ch.art + ".jpg)" : "";
    end.style.color = ch.photo ? "#fff" : "#111";
    end.classList.toggle("nophoto", !ch.photo);
    end.innerHTML = '<div class="burst" aria-hidden="true"></div><div class="ending__in">' +
      '<img src="' + ASSETS + "emblems/" + ch.art + '.webp" alt="" width="224" height="224">' +
      '<h2 id="endingTitle">' + esc(L(ch.region)) + "</h2><p>" + esc(L(ch.theme)) + "</p>" +
      '<button type="button" class="pill pill--xl">' + esc(s.endContinue) + "</button></div>";
    wrapPills(end);
    end.classList.add("on");
    setBehindInert(root, true);
    var btn = $(".ending__in .pill", end);
    btn.addEventListener("click", function () { leaveEnding(root, ch); }, { once: true });
    var arrive, g0 = gen;
    if (ch.quiet || reduced) {
      end.style.clipPath = "none";
      end.style.opacity = "0";
      arrive = tween(300, linear, function (p) { end.style.opacity = String(p); });
    } else {
      end.style.opacity = "";
      arrive = tween(700, easeInOut, function (p) {
        end.style.clipPath = "inset(" + ((1 - p) * 100).toFixed(2) + "% 0 0 0)";
      }).then(function () {
        if (g0 === gen) fireBurst($(".burst", end), $(".ending__in img", end), P.CHAPTERS.indexOf(ch));
      });
    }
    var g = gen;
    arrive.then(function () { if (g === gen) btn.focus(); });
  };

  var leaveEnding = function (root, ch) {
    var end = $("#ending", root), g = gen;
    journey.i += 1;
    var last = journey.i >= P.QUESTIONS.length;
    if (last) renderDone(root); else renderQuestion(root, false);
    var leave = (ch.quiet || reduced)
      ? tween(300, linear, function (p) { end.style.opacity = String(1 - p); })
      : tween(600, easeInOut, function (p) { end.style.clipPath = "inset(0 0 " + (p * 100).toFixed(2) + "% 0)"; });
    leave.then(function () {
      if (g !== gen) return;
      end.classList.remove("on");
      end.style.clipPath = ""; end.style.opacity = "";
      setBehindInert(root, false);
      journey.busy = false;
      if (last) { var cta = $(".done .pill", root); if (cta) cta.focus(); return; }
      renderQuestion(root, true);
      $("#qText", root).focus({ preventScroll: true });
    });
  };

  var renderDone = function (root) {
    var s = S(), sec = $("#q", root);
    sec.style.setProperty("--wash", "#f6f6f6");
    sec.innerHTML = '<div class="done">' + petalsSvg(answeredChapters(), "star") +
      "<h2>" + esc(s.doneHead) + "</h2><p>" + esc(s.doneBody) + "</p>" +
      '<a class="pill" href="#/home">' + esc(s.doneCta) + "</a></div>";
    wrapPills(sec);
    paintProgress();
  };

  /* ================================================================ menu */
  var menu = $("#menu"), burgerBtn = $("#burger"), navpill = $("#navpill"), pageEl = $("#page");
  var lastFocus = null, menuLines = [], revealTimers = [];
  var MENU_REVEAL = { delayMs: 480, spanMs: 560 };   /* V6_REVIEW #7 */
  var isOpen = function () { return document.body.classList.contains("menu-open"); };
  var revealChar = function (sp) {
    sp.classList.remove("hid");
    var st = sp.querySelector("svg");
    if (st) st.remove();
  };
  var showAllChars = function () {
    revealTimers.forEach(clearTimeout); revealTimers = [];
    menuLines.forEach(function (line) { line.__chars.forEach(revealChar); });
  };
  /* each line starts as one small star per character; from 480ms they turn
     into letters left to right, all lines finishing together at 1040ms */
  var startReveal = function () {
    showAllChars();
    if (reduced) return;
    menuLines.forEach(function (line) {
      var n = line.__chars.length;
      line.__chars.forEach(function (sp, j) {
        if (!sp.textContent.trim()) return;
        sp.classList.add("hid");
        sp.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 100 100"><use href="#g-star"/></svg>');
        revealTimers.push(setTimeout(revealChar, MENU_REVEAL.delayMs + MENU_REVEAL.spanMs * j / n, sp));
      });
    });
  };
  var openMenu = function () {
    lastFocus = document.activeElement;
    document.body.classList.add("menu-open");
    menu.setAttribute("aria-hidden", "false");
    burgerBtn.setAttribute("aria-expanded", "true");
    burgerBtn.setAttribute("aria-label", S().menuClose);
    pageEl.setAttribute("inert", ""); navpill.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    var first = $("a[href]", menu); if (first) first.focus();
    startReveal();
  };
  var closeMenu = function (restoreFocus) {
    if (!isOpen()) return;
    document.body.classList.remove("menu-open");
    menu.setAttribute("aria-hidden", "true");
    burgerBtn.setAttribute("aria-expanded", "false");
    burgerBtn.setAttribute("aria-label", S().menuOpen);
    pageEl.removeAttribute("inert"); navpill.removeAttribute("inert");
    document.body.style.overflow = "";
    showAllChars();
    if (restoreFocus !== false && lastFocus && lastFocus.focus) lastFocus.focus();
  };
  var renderMenu = function () {
    var s = S();
    var link = function (href, text, soon) {
      return '<li><a href="' + href + '"' + (soon ? ' aria-disabled="true" data-soon' : "") + ">" + esc(text) + "</a></li>";
    };
    menu.innerHTML = '<div class="menu__cols">' +
      '<div><div class="menu__group"><a class="menu__top" href="#/home">' + esc(s.mHome) + '</a><ul class="menu__sub">' +
      link("#/home", s.mReview, true) + link("#/home", s.mGoals, true) + link("#/home", s.mCompare, true) + "</ul></div>" +
      '<div class="menu__group"><a class="menu__top" href="#/">' + esc(s.mStart) + '</a><ul class="menu__sub">' +
      link("#/journey", s.mJourney) + "</ul></div></div>" +
      '<div><div class="menu__group"><a class="menu__top" href="#/home">' + esc(s.mAspects) + '</a><ul class="menu__sub">' +
      P.CHAPTERS.map(function (ch) { return link("#/home", L(ch.region).toUpperCase()); }).join("") + "</ul></div></div>" +
      '<div><div class="menu__group"><a class="menu__top" href="#/home" aria-disabled="true" data-soon>' + esc(s.mYou) + '</a><ul class="menu__sub">' +
      link("#/home", s.mProfile, true) + link("#/home", s.mMethod, true) + link("#/home", s.mYear, true) + "</ul></div>" +
      '<div class="menu__group"><a class="menu__top" href="#/home" aria-disabled="true" data-soon>' + esc(s.mPrivacy) + "</a></div></div>" +
      "</div>";
    menuLines = $$(".menu__top, .menu__sub a", menu);
    menuLines.forEach(function (line) {
      var text = line.textContent;
      line.setAttribute("aria-label", text + (line.hasAttribute("data-soon") ? " (" + s.soon + ")" : ""));
      line.textContent = "";
      line.__chars = graphemes(text).map(function (g) {
        var sp = document.createElement("span");
        sp.className = "ch"; sp.textContent = g; sp.setAttribute("aria-hidden", "true");
        line.appendChild(sp);
        return sp;
      });
    });
    $$("a[href^='#']", menu).forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (a.hasAttribute("data-soon")) { e.preventDefault(); return; }
        /* same route: no hashchange will fire, so close here */
        if (a.getAttribute("href") === location.hash || (a.getAttribute("href") === "#/" && !location.hash)) closeMenu();
      });
    });
  };
  burgerBtn.addEventListener("click", function () { if (isOpen()) closeMenu(); else openMenu(); });
  addEventListener("keydown", function (e) {
    if (e.key === "Escape" && endingOpen()) {
      var go = $("#ending .pill");
      if (go) { e.preventDefault(); go.click(); }
      return;
    }
    if (!isOpen()) return;
    if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
    if (e.key !== "Tab") return;
    var f = $$("#menu a[href], #header button, #header a[href]").filter(function (el) { return !el.closest("[inert]"); });
    if (!f.length) return;
    var first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });

  /* ============================================== header: contrast probe */
  var header = $("#header");
  var hdrItems = [burgerBtn, $("#headerLogo")];
  var lum = function (rgb) {
    var m = rgb && rgb.match(/[\d.]+/g);
    if (!m || (m.length > 3 && parseFloat(m[3]) < 0.5)) return null;
    var f = m.slice(0, 3).map(function (v) { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  /* what is behind a header item: a photo counts as dark, the pinned star
     by its fill, anything else by the first opaque background up the tree */
  var behind = function (x, y) {
    header.classList.add("probing");
    var el = document.elementFromPoint(x, y);
    header.classList.remove("probing");
    while (el) {
      if (el.tagName === "I" && el.closest(".photoband")) return 0;
      if (el.tagName === "polygon" && el.closest(".projects__star")) return lum(getComputedStyle(el).fill) || 0;
      var v = lum(getComputedStyle(el).backgroundColor);
      if (v !== null) return v;
      el = el.parentElement;
    }
    return 1;
  };
  var headerFrame = function () {
    hdrItems.forEach(function (it) {
      var b = it.getBoundingClientRect();
      if (!b.width) return;
      it.classList.toggle("on-dark", behind(b.left + b.width / 2, b.top + b.height / 2) < 0.28);
    });
  };

  /* ============================================================== router */
  var ROUTES = { "": "landing", "journey": "journey", "home": "home" };
  var routeName = function () {
    var h = location.hash.replace(/^#\/?/, "");
    return Object.prototype.hasOwnProperty.call(ROUTES, h) ? ROUTES[h] : "landing";
  };
  var mounts = [], heroMount = null;
  var renderChrome = function (name) {
    var s = S();
    html.lang = lang;
    document.body.classList.toggle("on-journey", name === "journey");
    burgerBtn.setAttribute("aria-label", isOpen() ? s.menuClose : s.menuOpen);
    var langBtn = $("#langBtn");
    langBtn.textContent = s.langCode;
    langBtn.setAttribute("aria-label", s.langSwitch);
    $("#lumiBtn").setAttribute("aria-label", s.lumi);
    $("#protoFlag").textContent = s.flag;
    var nav = function (href, text, key) {
      return '<a href="' + href + '"' + (key === name ? ' aria-current="page"' : "") + ">" + esc(text) + "</a>";
    };
    navpill.innerHTML = nav("#/", s.navStart, "landing") + nav("#/journey", s.navJourney, "journey") +
      nav("#/home", s.navHome, "home") + '<span class="progress"></span>';
    renderMenu();
  };

  var queued = false, lastPointer = null;
  var frame = function () {
    queued = false;
    mounts.forEach(function (m) { if (m.frame) m.frame(); });
    headerFrame();
    if (heroMount && lastPointer) heroMount.pointer(lastPointer.x, lastPointer.y, true);
  };
  var render = function () {
    gen += 1;
    var name = routeName();
    var screen = $("#screen");
    html.classList.remove("seed-on", "seed-done");
    $("#header").removeAttribute("inert");
    renderChrome(name);
    if (name === "journey") {
      screen.innerHTML = journeyHTML();
      if (journey.i >= P.QUESTIONS.length) renderDone(screen); else renderQuestion(screen, true);
    } else {
      screen.innerHTML = name === "home" ? homeHTML() : landingHTML();
    }
    wrapPills(screen);
    $$("[data-soon]", screen).forEach(function (a) {
      a.setAttribute("title", S().soon);
      a.addEventListener("click", function (e) { e.preventDefault(); });
    });
    heroMount = mountHero(screen);
    mounts = [mountMission(screen), mountProjects(screen), mountBand(screen), mountWall(screen)].filter(Boolean);
    document.title = { landing: "Life Balance Index", journey: "The Journey · LBI", home: "Home · LBI" }[name];
    frame();
  };
  var onScroll = function () {
    document.body.classList.toggle("scrolled", scrollY > 40);
    magLeave();
    if (queued) return;
    queued = true;
    requestAnimationFrame(frame);
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", function () { setPx(); onScroll(); });
  addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    lastPointer = { x: e.clientX, y: e.clientY };
    if (heroMount) heroMount.pointer(e.clientX, e.clientY, false);
  }, { passive: true });
  html.addEventListener("pointerleave", function () {
    lastPointer = null;
    if (heroMount) heroMount.leave();
  });
  addEventListener("hashchange", function () {
    closeMenu(false);
    if (routeName() === "journey" && journey.i >= P.QUESTIONS.length) { journey.i = 0; journey.answers = []; }
    journey.busy = false;
    render();
    scrollTo(0, 0);
    $("#screen").focus({ preventScroll: true });
  });
  $("#langBtn").addEventListener("click", function () {
    lang = lang === "en" ? "th" : "en";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* private mode */ }
    journey.busy = false;
    render();
  });

  render();
  onScroll();
})();
