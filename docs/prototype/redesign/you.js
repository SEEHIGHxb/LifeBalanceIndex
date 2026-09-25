/* docs/prototype/redesign/you.js
 *
 * The third batch, part two: Your year (#/year), Profile (#/profile),
 * Methodology (#/method), and Lumi's tip behind the header's star button.
 *
 *   your year    the year number in Anton as the hero, the closing date
 *                typed, the points, then movement and filed years as news
 *   profile      text only, no motion: the facts as rows
 *   methodology  text only, no motion: what each score is built from and who
 *                it is compared with
 *   lumi         a small panel; the tip for your lowest aspect types itself
 *                (a quiet region's tip arrives whole)
 */
(function () {
  "use strict";
  var P = window.LBI_PROTO;
  if (!P || !P.kit || !P.route) return;
  var K = P.kit, $ = K.$, esc = K.esc, S = K.S, L = K.L, fmt = K.fmt, A = K.ASSETS;
  var CH = P.CHAPTERS, H = P.HOME_SAMPLE, PR = P.PROFILE_SAMPLE, Y = P.YEAR_SAMPLE;
  var STAR = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#g-star"/></svg>';
  var MINUS = "−";
  var signed = function (d) { return d > 0 ? "+" + d : d < 0 ? MINUS + Math.abs(d) : "0"; };
  var num = function (n) { return n.toLocaleString("en-US"); };

  /* ------------------------------------------------ shared text blocks */
  var pageHead = function (word, paras) {
    return '<section class="panel pagehead"><div class="wrap"><h1 class="pagehead__word">' + esc(word) + "</h1>" +
      paras.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div></section>";
  };
  var textSec = function (label, inner, cls) {
    return '<section class="panel statement textsec' + (cls ? " " + cls : "") + '"><div class="wrap split"><h2 class="label">' +
      esc(label) + "</h2><div>" + inner + "</div></div></section>";
  };
  var newsSec = function (label, note, rows) {
    return '<section class="news"><div class="wrap split"><div class="news__side"><h2 class="label">' + esc(label) + "</h2>" +
      (note ? '<p class="news__note">' + esc(note) + "</p>" : "") + '</div><div class="newslist">' + rows + "</div></div></section>";
  };

  /* ============================================================ your year */
  var moveRows = function () {
    return Y.movement.map(function (m) {
      var ch = CH[m[0]];
      return '<div class="newsrow"><span class="newsrow__meta"><span class="newsrow__delta">' + signed(m[1]) + "</span>" +
        '<span class="newsrow__cat">' + esc(L(ch.label).toUpperCase()) + "</span></span>" +
        '<span class="newsrow__thumb" style="--wash:' + ch.wash + '">' + K.motifSvg(ch) + "</span>" +
        '<span class="newsrow__title">' + esc(L(ch.region)) + "</span></div>";
    }).join("");
  };
  var filedRows = function () {
    var s = S();
    return Y.filed.map(function (y) {
      var pct = Math.round(y.xp / y.possible * 100);
      return '<div class="newsrow"><span class="newsrow__meta"><span class="newsrow__date">' + esc(s.yClosed) + " " + y.closed + "</span>" +
        '<span class="newsrow__cat">' + esc(fmt(s.yTitle, { level: y.level }).toUpperCase()) + "</span></span>" +
        '<span class="newsrow__thumb">' + STAR + "</span>" +
        '<span class="newsrow__title">' + esc(fmt(s.yFiledRow, { xp: y.xp, possible: y.possible })) +
        '<span class="meter" aria-hidden="true"><i style="width:' + pct + '%;background:var(--gilt-line)"></i></span></span></div>';
    }).join("");
  };
  var yearHTML = function () {
    var s = S(), pct = Math.round(Y.xp / Y.possible * 100);
    var head = [fmt(s.yCloses, { date: L(Y.closes), days: Y.days }), fmt(s.yWeeks, { weeks: Y.weeks })];
    var points = '<p class="ypoints"><b>' + Y.xp + "</b> / " + Y.possible + "</p>" +
      '<div class="meter ymeter" role="progressbar" aria-label="' + esc(s.yPointsAria) + '" aria-valuenow="' + pct +
      '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
      "<p>" + esc(fmt(s.yPointsP, { xp: Y.xp, possible: Y.possible })) + "</p><p>" + esc(s.yLevelP) + "</p>";
    return '<div class="seedtrack"><div class="seedpin" aria-hidden="true"><p class="seed headline"></p></div>' +
      K.heroHTML(STAR, s.yWord, String(Y.level), fmt(s.yTitle, { level: Y.level }), s.heroTap, { cls: "yhero" }) +
      K.missionHTML(s.yLabel, head) + "</div>" +
      textSec(s.yPoints, points) +
      newsSec(s.yMove, fmt(s.yMoveP, { date: L(Y.anchor) }), moveRows()) +
      newsSec(s.yFiled, "", filedRows()) +
      K.careersHTML(s.yTurn, [L(PR.birthday), s.yChange], s.yChangeCta, "#/profile") +
      K.footerHTML();
  };

  /* ============================================================== profile */
  var facts = function (rows) {
    return '<dl class="factlist">' + rows.map(function (r) {
      return '<div class="fact"><dt>' + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>";
    }).join("") + "</dl>";
  };
  var profileHTML = function () {
    var s = S(), soon = '<span class="sr-only"> (' + esc(s.soon) + ")</span>";
    var pill = function (t) { return '<button type="button" class="pill" aria-disabled="true" data-soon>' + esc(t) + soon + "</button>"; };
    return pageHead(s.pWord, [s.pBlurb, s.pEditNote]) +
      textSec(s.pIdentity, facts([[s.pName, PR.name], [s.pAge, String(PR.age)], [s.pGender, L(PR.gender)],
        [s.pBirthday, L(PR.birthday)]])) +
      textSec(s.pContext, facts([[s.pRegion, L(PR.region)], [s.pEmployment, L(PR.employment)],
        [s.pRelationship, L(PR.relationship)]]) + '<p class="factnote">' + esc(s.pGuide) + "</p>") +
      textSec(s.pBody, facts([[s.pIncome, num(PR.income)], [s.pHeight, String(PR.height)], [s.pWeight, String(PR.weight)]])) +
      textSec(s.pMotion, facts([[s.pReduce, s.pOff]]) + '<p class="factnote">' + esc(s.pReduceP) + "</p>") +
      textSec(s.pData, '<p class="factnote">' + esc(s.pDataP) + '</p><div class="actions">' +
        pill(s.pExport) + pill(s.pImport) + pill(s.pReset) + "</div>") +
      K.footerHTML();
  };

  /* ========================================================== methodology */
  var mlist = function (label, rows) {
    return '<section class="panel mlist"><div class="wrap split"><h2 class="label">' + esc(label) + "</h2><div>" +
      rows.join("") + "</div></div></section>";
  };
  var methodHTML = function () {
    var s = S();
    var eight = CH.map(function (ch, i) {
      return '<div class="mrow"><h3 class="card__title">' + esc(L(ch.region)) +
        '<span class="tag" style="color:' + ch.hue + '">' + esc(L(ch.label).toUpperCase()) + "</span></h3>" +
        "<p>" + esc(L(P.FORMULAS[i])) + "</p></div>";
    });
    var compared = CH.map(function (ch, i) {
      var c = P.COMPARED[i];
      return '<div class="mrow' + (c.claim.indexOf("none") === 0 ? " is-unranked" : "") + '"><h3 class="card__title">' +
        esc(L(ch.label)) + '</h3><p lang="en">' + esc(c.sample) + "</p>" +
        '<p class="mrow__meta">' + esc(L(P.WHERE[c.where])) + " · <b>" + esc(L(P.CLAIM[c.claim])) + "</b></p></div>";
    });
    return pageHead(s.xWord, [s.xIntro, s.xCare]) +
      '<section class="panel creed"><div class="wrap split"><h2 class="label">' + esc(s.xNot) + "</h2>" +
      '<p class="creed__p">' + esc(s.xWorth) + "</p></div></section>" +
      mlist(s.xEight, eight) + mlist(s.xCompared, compared) +
      textSec(s.xGrades, "<p>" + esc(s.xNo100) + "</p>") +
      K.footerHTML();
  };

  /* ================================================================= lumi */
  /* the app's getLumiTip: the tip for the lowest aspect (first on a tie) */
  var lowest = function () {
    var m = 0;
    H.scores.forEach(function (v, i) { if (v < H.scores[m]) m = i; });
    return m;
  };
  var lumiBtn = $("#lumiBtn"), panel = null, lumiOpen = false;
  var lumiHTML = function (ch, tip) {
    var s = S();
    return '<img class="lumi__img" src="' + A + 'lumi.png" alt="" width="256" height="256">' +
      '<div class="lumi__body"><h2 class="label" id="lumiTitle">' + esc(s.lumiLabel) + "</h2>" +
      '<p class="lumi__tip"><span class="sr-only">' + esc(tip) + '</span><span class="lumi__typed" aria-hidden="true"></span></p>' +
      '<div class="lumi__row"><a class="pill" href="#/aspect/' + ch.art + '">' +
      esc(fmt(s.aOpen, { region: L(ch.region) }).toUpperCase()) + "</a>" +
      '<button type="button" class="linkbtn" data-close>' + esc(s.lumiClose) + "</button></div></div>";
  };
  /* the panel settles in with a small spring, then the tip types itself */
  var arrive = function (tip, still) {
    var typed = K.buildTyped($(".lumi__typed", panel), [tip], !still);
    if (still) { typed.show(typed.count); return; }
    var o = { y: -18, vy: 0, s: 0.94, vs: 0 };
    K.loop(function (dt) {
      var m1 = K.springStep(o, "y", 0, { k: 380, c: 24 }, dt), m2 = K.springStep(o, "s", 1, { k: 380, c: 24 }, dt);
      panel.style.transform = (m1 || m2) ? "translateY(" + o.y.toFixed(2) + "px) scale(" + o.s.toFixed(4) + ")" : "";
      return lumiOpen && (m1 || m2);
    })();
    K.typeOut(typed, 32).then(function () { if (typed.caret) typed.caret.remove(); });
  };
  var openLumi = function () {
    var i = lowest(), ch = CH[i], tip = L(P.FOCUS[i]);
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = "lumi";
      panel.className = "lumi";
      panel.tabIndex = -1;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-labelledby", "lumiTitle");
      document.body.appendChild(panel);
      panel.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeLumi(true); });
    }
    panel.innerHTML = lumiHTML(ch, tip);
    K.wrapPills(panel);
    panel.hidden = false;
    lumiOpen = true;
    lumiBtn.setAttribute("aria-expanded", "true");
    panel.focus();
    arrive(tip, K.reduced || !!ch.quiet);
  };
  var closeLumi = function (restore) {
    if (!lumiOpen) return;
    lumiOpen = false;
    panel.hidden = true;
    panel.style.transform = "";
    lumiBtn.setAttribute("aria-expanded", "false");
    if (restore) lumiBtn.focus();
  };
  if (lumiBtn) {
    lumiBtn.removeAttribute("aria-disabled");
    lumiBtn.setAttribute("aria-expanded", "false");
    lumiBtn.setAttribute("aria-controls", "lumi");
    lumiBtn.setAttribute("aria-haspopup", "dialog");
    lumiBtn.addEventListener("click", function () { if (lumiOpen) closeLumi(true); else openLumi(); });
    addEventListener("keydown", function (e) { if (e.key === "Escape" && lumiOpen) closeLumi(true); });
    document.addEventListener("pointerdown", function (e) {
      if (lumiOpen && !panel.contains(e.target) && !lumiBtn.contains(e.target)) closeLumi(false);
    });
    /* a new screen, a new language or the menu all close it */
    addEventListener("hashchange", function () { closeLumi(false); });
    ["#langBtn", "#burger"].forEach(function (sel) {
      var b = $(sel);
      if (b) b.addEventListener("click", function () { closeLumi(false); });
    });
  }

  /* ============================================================ routes */
  P.route("year", { match: /^year$/, html: yearHTML, mount: null, title: function () { return fmt(S().yTitle, { level: Y.level }); } });
  P.route("profile", { match: /^profile$/, html: profileHTML, mount: null, title: function () { return S().mProfile; } });
  P.route("method", { match: /^method$/, html: methodHTML, mount: null, title: function () { return S().mMethod; } });
})();
