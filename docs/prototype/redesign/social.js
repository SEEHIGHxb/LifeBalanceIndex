/* docs/prototype/redesign/social.js
 *
 * The third batch, part one: Side by Side (#/compare) and the share card
 * (#/share). Built from the frame through P.kit, like weekly.js.
 *
 *   side by side  your star and one other person's laid over each other, the
 *                 population average dashed behind them; comparison codes as
 *                 in the app. NOT a ranking: no order by score, no totals.
 *   share card    the radar as a die-cut sticker on a 9:16 poster. It sticks
 *                 on once as the page opens; a toggle shows the finished card.
 *
 * The comparison-code format is the app's (comparison-code.js, v2): "LQ1-"
 * then base64url of {v, n, a}. The prototype keeps pasted codes in memory only.
 */
(function () {
  "use strict";
  var P = window.LBI_PROTO;
  if (!P || !P.kit || !P.route) return;
  var K = P.kit, $ = K.$, $$ = K.$$, esc = K.esc, S = K.S, L = K.L, fmt = K.fmt;
  var CH = P.CHAPTERS, H = P.HOME_SAMPLE, AVG = P.AVERAGES, PR = P.PROFILE_SAMPLE;
  var PREFIX = "LQ1-", NAME_MAX = 20, LIMIT = 50, MORPH_MS = 480;

  /* one polite live region for the whole batch, outside the re-rendered screen */
  var live = document.createElement("p");
  live.className = "sr-only";
  live.setAttribute("aria-live", "polite");
  document.body.appendChild(live);
  var say = function (text) { live.textContent = ""; setTimeout(function () { live.textContent = text; }, 60); };

  /* =========================================================== the codes */
  var toB64 = function (str) {
    var bin = "";
    new TextEncoder().encode(str).forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  var fromB64 = function (s) {
    var bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder().decode(Uint8Array.from(bin, function (c) { return c.charCodeAt(0); }));
  };
  var myCode = function () { return PREFIX + toB64(JSON.stringify({ v: 2, n: PR.name, a: H.scores })); };
  var isScore = function (v) { return typeof v === "number" && isFinite(v) && v >= 0 && v <= 100; };
  /* the app's decodeComparisonCode: { name, aspects } or { error } */
  var decode = function (raw) {
    var s = S(), code = String(raw || "").trim(), data;
    if (code.indexOf(PREFIX) !== 0) return { error: fmt(s.errPrefix, { prefix: PREFIX }) };
    try { data = JSON.parse(fromB64(code.slice(PREFIX.length))); } catch (e) { return { error: s.errDamaged }; }
    if (!data || (data.v !== 1 && data.v !== 2)) return { error: s.errVersion };
    var name = typeof data.n === "string" ? data.n.trim().slice(0, NAME_MAX) : "";
    if (!name) return { error: s.errName };
    if (!Array.isArray(data.a) || data.a.length !== 8 || !data.a.every(isScore)) return { error: s.errScores };
    return { name: name, aspects: data.a.map(function (v) { return Math.round(v); }) };
  };

  /* ========================================================= side by side */
  /* friends keep the order they were added in; nothing here sorts by score */
  var cmp = { friends: P.FRIENDS_SAMPLE.slice(), pick: 0, nextId: 3, focus: null };

  var addFriend = function (f) {
    var lower = f.name.toLowerCase(), at = -1;
    cmp.friends.forEach(function (x, k) { if (x.name.toLowerCase() === lower) at = k; });
    if (at >= 0) {
      cmp = Object.assign({}, cmp, { pick: at, friends: cmp.friends.map(function (x, k) {
        return k === at ? Object.assign({}, x, { aspects: f.aspects }) : x;
      }) });
      return { updated: true };
    }
    if (cmp.friends.length >= LIMIT) return { error: fmt(S().errFull, { max: LIMIT }) };
    var entry = { id: "f" + cmp.nextId, name: f.name, aspects: f.aspects };
    cmp = Object.assign({}, cmp, { friends: cmp.friends.concat([entry]), pick: cmp.friends.length, nextId: cmp.nextId + 1 });
    return { updated: false };
  };

  var starPts = function (scores) {
    return K.starPoints(K.scoreRadii(scores, 46), 50, 50, 46 * K.STAR_VALLEY);
  };
  var duoSvg = function () {
    var them = cmp.friends[cmp.pick];
    var dots = CH.map(function (ch, i) {
      var a = -Math.PI / 2 + i * Math.PI / 4;
      return '<circle cx="' + (50 + 49 * Math.cos(a)).toFixed(2) + '" cy="' + (50 + 49 * Math.sin(a)).toFixed(2) +
        '" r="1.3" fill="' + ch.hue + '"/>';
    }).join("");
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<polygon class="duo__you" points="' + starPts(H.scores) + '"/>' +
      '<polygon class="duo__avg" points="' + starPts(AVG) + '"/>' +
      (them ? '<polygon class="duo__them" points="' + starPts(them.aspects) + '"/>' : "") + dots + "</svg>";
  };
  var peopleHTML = function () {
    var s = S();
    return '<div class="answers people" role="radiogroup" aria-label="' + esc(s.cPick) + '">' +
      cmp.friends.map(function (f, k) {
        var on = k === cmp.pick;
        return '<button type="button" class="pill" role="radio" data-k="' + k + '" aria-checked="' + on +
          '" tabindex="' + (on ? 0 : -1) + '">' + esc(f.name) + "</button>";
      }).join("") + "</div>" +
      '<div class="people__rm">' + cmp.friends.map(function (f) {
        return '<button type="button" class="linkbtn" data-rm="' + f.id + '">' + esc(fmt(s.cRemove, { name: f.name })) + "</button>";
      }).join("") + "</div>";
  };
  var legendHTML = function () {
    var s = S(), them = cmp.friends[cmp.pick];
    return '<ul class="legend"><li><i class="lg-you"></i>' + esc(fmt(s.cYou, { name: PR.name })) + "</li>" +
      '<li><i class="lg-them"></i><span id="lgThem">' + esc(them.name) + "</span></li>" +
      '<li><i class="lg-avg"></i>' + esc(s.cAvg) + "</li></ul>";
  };
  var duoHTML = function () {
    var s = S(), none = !cmp.friends.length;
    return '<section class="panel duo"><div class="wrap split"><div><h2 class="label">' + esc(s.cOver) + "</h2>" +
      '<p class="duo__p">' + esc(none ? s.cIntro : s.cOverP) + "</p></div><div>" +
      (none ? '<p class="duo__none">' + esc(s.cNone) + "</p>"
        : peopleHTML() + '<div class="duo__fig" id="duoFig">' + duoSvg() + "</div>" + legendHTML()) +
      "</div></div></section>";
  };

  var codesHTML = function () {
    var s = S();
    return '<section class="panel statement textsec codes"><div class="wrap split"><h2 class="label">' + esc(s.cCodes) + "</h2><div>" +
      "<p>" + esc(s.cCodesP) + "</p>" +
      '<div class="field"><label class="field__label" for="myCode">' + esc(s.cMine) + '</label><div class="coderow">' +
      '<input class="field__input code" id="myCode" readonly value="' + esc(myCode()) + '">' +
      '<button type="button" class="pill" id="copyCode">' + esc(s.cCopy) + "</button></div></div>" +
      '<form class="field" id="addCode" novalidate><label class="field__label" for="friendCode">' + esc(s.cAddLabel) + "</label>" +
      '<div class="coderow"><input class="field__input code" id="friendCode" placeholder="LQ1-..." autocomplete="off" spellcheck="false">' +
      '<button type="submit" class="pill">' + esc(s.cAdd) + "</button></div>" +
      '<div class="field__err" id="codeErr" role="alert"></div></form></div></div></section>';
  };

  /* one card per aspect: the average, then you, then everyone as added */
  var aspectCard = function (ch, i) {
    var s = S(), avg = AVG[i];
    var rows = [{ name: fmt(s.cYou, { name: PR.name }), v: H.scores[i], you: true }]
      .concat(cmp.friends.map(function (f) { return { name: f.name, v: f.aspects[i] }; }));
    return '<div class="brand"' + (ch.quiet ? " data-quiet" : "") + '><article class="card duocard">' +
      '<h3 class="card__title"><a href="#/aspect/' + ch.art + '">' + esc(L(ch.region)) + "</a></h3>" +
      '<dl class="duocard__rows"><div class="duocard__row duocard__row--avg"><dt>' + esc(s.cAvg) + "</dt><dd><b>" + avg + "</b></dd></div>" +
      rows.map(function (r) {
        var above = r.v >= avg;
        return '<div class="duocard__row' + (r.you ? " is-you" : "") + '"><dt>' + esc(r.name) + "</dt><dd><b>" + r.v + "</b>" +
          '<span class="sbs" aria-hidden="true">' + (above ? "▲" : "▽") + '</span><span class="sr-only">' +
          esc(above ? s.cAbove : s.cBelow) + "</span></dd></div>";
      }).join("") + "</dl></article></div>";
  };
  /* The one thing a peer tells you that the population cannot: which aspects
     they have cleared that you have not. Never a count, never a total. */
  var learnHTML = function () {
    var s = S();
    var lines = cmp.friends.map(function (f) {
      var gaps = CH.filter(function (ch, i) { return f.aspects[i] >= AVG[i] && !(H.scores[i] >= AVG[i]); });
      return gaps.length ? fmt(s.cClears, { name: f.name, aspects: gaps.map(function (ch) { return L(ch.label); }).join(", ") }) : "";
    }).filter(Boolean);
    if (!lines.length) return "";
    return '<section class="panel statement textsec"><div class="wrap split"><h2 class="label">' + esc(s.cLearn) + "</h2><div>" +
      lines.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") + "</div></div></section>";
  };

  var compareHTML = function () {
    var s = S();
    return '<div class="seedtrack"><div class="seedpin" aria-hidden="true"><p class="seed headline"></p></div>' +
      K.heroHTML(K.radarStarSvg(H.scores), s.cWord, fmt(s.cInc, { n: cmp.friends.length }), s.cWord, s.heroTap) +
      K.missionHTML(s.cLabel, s.cHead) + "</div>" +
      codesHTML() + duoHTML() +
      '<section class="projects"><div class="projects__stick" aria-hidden="true">' +
      K.bigStarSvg(K.scoreRadii(H.scores, 1700), 1700 * K.STAR_VALLEY * 1.5) + "</div>" +
      '<div class="inner"><h2 class="label">' + esc(s.cAspects) + '</h2><div class="cardblock">' +
      CH.map(aspectCard).join("") + "</div></div></section>" +
      learnHTML() + K.footerHTML();
  };

  /* the other star slides from its old shape to the new one; the same
     480ms whoever is picked */
  var morphTo = function (root, from, to) {
    var poly = $(".duo__them", root);
    if (!poly) return;
    K.tween(MORPH_MS, K.easeInOut, function (p) {
      poly.setAttribute("points", starPts(from.map(function (v, i) { return v + (to[i] - v) * p; })));
    });
  };
  var pick = function (root, k) {
    if (k === cmp.pick || !cmp.friends[k]) return;
    var from = cmp.friends[cmp.pick].aspects;
    cmp = Object.assign({}, cmp, { pick: k });
    $$(".people .pill", root).forEach(function (b, j) {
      b.setAttribute("aria-checked", String(j === k));
      b.tabIndex = j === k ? 0 : -1;
    });
    $("#lgThem", root).textContent = cmp.friends[k].name;
    morphTo(root, from, cmp.friends[k].aspects);
  };
  /* adding or removing changes every card, so the screen is drawn again and
     focus is put back where the reader was */
  var redraw = function (focusSel) {
    cmp = Object.assign({}, cmp, { focus: focusSel });
    K.render();
  };

  var wireCodes = function (root) {
    var copy = $("#copyCode", root), input = $("#friendCode", root), err = $("#codeErr", root), g = K.gen();
    copy.addEventListener("click", function () {
      var field = $("#myCode", root);
      field.select();
      var done = function () {
        $(".pill__in", copy).textContent = S().cCopied;
        setTimeout(function () { if (g === K.gen()) $(".pill__in", copy).textContent = S().cCopy; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(field.value).then(done, function () { document.execCommand("copy"); done(); });
      } else { document.execCommand("copy"); done(); }
    });
    $("#addCode", root).addEventListener("submit", function (e) {
      e.preventDefault();
      var got = decode(input.value), res = got.error ? got : addFriend(got);
      if (res.error) {
        err.textContent = res.error;
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", "codeErr");
        input.focus();
        return;
      }
      say(fmt(res.updated ? S().cUpdated : S().cAdded, { name: got.name }));
      redraw('.people .pill[aria-checked="true"]');
    });
  };
  var wirePeople = function (root) {
    var group = $(".people", root);
    if (!group) return;
    group.addEventListener("click", function (e) {
      var b = e.target.closest(".pill");
      if (b) pick(root, +b.getAttribute("data-k"));
    });
    group.addEventListener("keydown", function (e) {
      var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      var n = cmp.friends.length, k = (cmp.pick + step + n) % n;
      pick(root, k);
      $$(".people .pill", root)[k].focus();
    });
    $(".people__rm", root).addEventListener("click", function (e) {
      var b = e.target.closest("[data-rm]");
      if (!b) return;
      var id = b.getAttribute("data-rm"), gone = cmp.friends.filter(function (f) { return f.id === id; })[0];
      var rest = cmp.friends.filter(function (f) { return f.id !== id; });
      cmp = Object.assign({}, cmp, { friends: rest, pick: Math.min(cmp.pick, Math.max(0, rest.length - 1)) });
      say(fmt(S().cRemoved, { name: gone.name }));
      redraw(rest.length ? '.people .pill[aria-checked="true"]' : "#friendCode");
    });
  };
  var mountCompare = function (root) {
    wireCodes(root);
    wirePeople(root);
    if (cmp.focus) {
      var el = $(cmp.focus, root);
      cmp = Object.assign({}, cmp, { focus: null });
      if (el) el.focus();
    }
    return null;
  };

  /* ========================================================== share card */
  var share = { theme: "paper", detail: "shape", running: null };
  var POSTER = { w: 1080, h: 1920, cx: 540, cy: 800, r: 330 };
  var INK = { paper: "#1b1b1b", navy: "#ffffff" }, BG = { paper: "#f4efe4", navy: "#16213e" };
  var WORD = 'font-family="Anton, Impact, sans-serif"', TEXT = 'font-family="Inter, Sarabun, sans-serif"';

  var posterStar = function () {
    var r = POSTER.r, cx = POSTER.cx, cy = POSTER.cy;
    var radii = K.scoreRadii(H.scores, r);
    var spokes = radii.map(function (t, i) {
      var a = -Math.PI / 2 + i * Math.PI / 4;
      return "M" + cx + " " + cy + "L" + (cx + t * Math.cos(a)).toFixed(1) + " " + (cy + t * Math.sin(a)).toFixed(1);
    }).join("");
    return '<polygon points="' + K.starPoints(radii, cx, cy, r * K.STAR_VALLEY) + '" fill="#F0D8A8" stroke="#A88752" stroke-width="12" stroke-linejoin="round"/>' +
      '<path d="' + spokes + '" stroke="#A88752" stroke-width="5" stroke-opacity=".5" stroke-linecap="round"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="36" fill="#FBF8F1" stroke="#6F7D64" stroke-width="12"/>';
  };
  /* names (and scores) as a legend under the sticker, two columns of four */
  var posterLegend = function (ink) {
    if (share.detail === "shape") return "";
    var full = share.detail === "full";
    return CH.map(function (ch, i) {
      var x = i < 4 ? 150 : 580, y = 1280 + (i % 4) * 78;
      return '<circle cx="' + x + '" cy="' + (y - 12) + '" r="13" fill="' + ch.hue + '"/>' +
        '<text x="' + (x + 32) + '" y="' + y + '" ' + TEXT + ' font-size="34" font-weight="700" fill="' + ink + '">' + esc(L(ch.region)) + "</text>" +
        (full ? '<text x="' + (x + 390) + '" y="' + (y + 2) + '" ' + WORD + ' font-size="44" text-anchor="end" fill="' + ink + '">' + H.scores[i] + "</text>" : "");
    }).join("") + (full ? '<text x="540" y="1650" ' + WORD + ' font-size="56" text-anchor="middle" fill="' + ink + '">' +
      esc(fmt(S().sIndex, { n: H.index })) + "</text>" : "");
  };
  var posterSvg = function () {
    var s = S(), ink = INK[share.theme];
    return '<svg viewBox="0 0 ' + POSTER.w + " " + POSTER.h + '" role="img" aria-label="' + esc(s.sPreview) + '">' +
      '<defs><filter id="posterCut" x="-20%" y="-20%" width="140%" height="140%">' +
      '<feMorphology in="SourceAlpha" operator="dilate" radius="18" result="grow"/><feFlood flood-color="#fff"/>' +
      '<feComposite in2="grow" operator="in" result="border"/>' +
      '<feDropShadow in="border" dx="0" dy="14" stdDeviation="14" flood-opacity=".25" result="lift"/>' +
      '<feMerge><feMergeNode in="lift"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      '<rect width="' + POSTER.w + '" height="' + POSTER.h + '" fill="' + BG[share.theme] + '"/>' +
      '<text x="540" y="210" ' + WORD + ' font-size="118" text-anchor="middle" fill="' + ink + '">LIFE BALANCE</text>' +
      '<text x="540" y="300" ' + WORD + ' font-size="72" text-anchor="middle" fill="' + ink + '">INDEX</text>' +
      '<g class="poster__sticker" style="transform-origin:540px 800px;transform:rotate(-4deg)">' +
      '<g filter="url(#posterCut)">' + posterStar() + "</g></g>" +
      '<g class="poster__legend">' + posterLegend(ink) + "</g>" +
      '<text x="540" y="1800" ' + WORD + ' font-size="64" text-anchor="middle" fill="' + ink + '">' + esc(s.sStar) + "</text></svg>";
  };

  var toggleGroup = function (id, label, group, opts) {
    return '<div class="share__opt" role="group" aria-labelledby="' + id + '"><span class="share__optlabel" id="' + id + '">' +
      esc(label) + '</span><span class="answers share__set">' + opts.map(function (o) {
        return '<button type="button" class="pill" data-group="' + group + '" data-value="' + o[0] + '" aria-pressed="' +
          (share[group] === o[0]) + '">' + esc(o[1]) + "</button>";
      }).join("") + "</span></div>";
  };
  var shareHTML = function () {
    var s = S();
    var soon = '<span class="sr-only"> (' + esc(s.soon) + ")</span>";
    return '<section class="panel sharepage"><div class="wrap split"><div class="share__side">' +
      '<h1 class="label">' + esc(s.sLabel) + "</h1>" +
      toggleGroup("optTheme", s.sStyle, "theme", [["paper", s.sLight], ["navy", s.sDark]]) +
      toggleGroup("optDetail", s.sShow, "detail", [["shape", s.sShape], ["names", s.sNames], ["full", s.sAll]]) +
      '<p class="share__note">' + esc(s.sNote) + "</p>" +
      '<div class="share__actions"><button type="button" class="pill" aria-disabled="true" data-soon>' + esc(s.sShare) + soon + "</button>" +
      '<button type="button" class="pill" aria-disabled="true" data-soon>' + esc(s.sSave) + soon + "</button></div></div>" +
      '<div class="share__stage"><div class="poster" id="poster">' + posterSvg() + "</div></div></div></section>" +
      K.footerHTML();
  };

  /* The card assembles once as the page opens: the sticker drops in turned
     and springs flat to its tilt, then the names arrive. Any toggle stops the
     assembly and shows the finished card. */
  var assemble = function (root) {
    var poster = $("#poster", root), g = K.gen(), token = {};
    share = Object.assign({}, share, { running: token });
    var sticker = $(".poster__sticker", poster), legend = $(".poster__legend", poster);
    var o = { s: 1.35, vs: 0, r: -34, vr: 0 };
    sticker.style.transform = "rotate(-34deg) scale(1.35)";
    legend.style.opacity = "0";
    K.loop(function (dt) {
      if (share.running !== token) return false;
      var m1 = K.springStep(o, "s", 1, { k: 420, c: 16 }, dt), m2 = K.springStep(o, "r", -4, { k: 420, c: 16 }, dt);
      sticker.style.transform = "rotate(" + o.r.toFixed(2) + "deg) scale(" + o.s.toFixed(4) + ")";
      return m1 || m2;
    })();
    K.wait(520).then(function () {
      if (g !== K.gen() || share.running !== token) return;
      K.tween(420, K.linear, function (p) { if (share.running === token) legend.style.opacity = p.toFixed(3); });
    });
  };
  var mountShare = function (root) {
    if (!K.reduced) assemble(root);
    $(".share__side", root).addEventListener("click", function (e) {
      var b = e.target.closest("[data-group]");
      if (!b) return;
      var group = b.getAttribute("data-group"), value = b.getAttribute("data-value");
      if (share[group] === value) return;
      var next = { running: null };
      next[group] = value;
      share = Object.assign({}, share, next);
      $$('[data-group="' + group + '"]', root).forEach(function (o) {
        o.setAttribute("aria-pressed", String(o.getAttribute("data-value") === value));
      });
      $("#poster", root).innerHTML = posterSvg();
    });
    return null;
  };

  /* ============================================================ routes */
  P.route("compare", { match: /^compare$/, html: compareHTML, mount: mountCompare, title: function () { return S().cWord; } });
  P.route("share", { match: /^share$/, html: shareHTML, mount: mountShare, title: function () { return S().sTitle; } });
})();
