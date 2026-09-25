/* docs/prototype/redesign/weekly.js
 *
 * The weekly loop, the second batch of the redesign: an aspect page for each
 * region (#/aspect/<art>), the Weekly Review (#/review) and Goals (#/goals).
 * Built from the same frame as the first batch, through P.kit from proto.js:
 *
 *   aspect page   the region's own hero (its emblem follows and bursts its
 *                 motifs), the typed standing, the pinned star behind the
 *                 component cards, the region photo, the trend as a news list
 *   review        one region per screen; the next region's photo wipes over
 *                 as the divider; submitting bursts every reviewed region
 *   goals         pledges as die-cut stickers that stick on; the catalog as
 *                 cards sliding over the pinned star
 *
 * The rules still hold: The Still Water and The Commons stay still, motion
 * never depends on what was entered, reduced motion lands on final states.
 */
(function () {
  "use strict";
  var P = window.LBI_PROTO;
  if (!P || !P.kit || !P.route) return;
  var K = P.kit, $ = K.$, $$ = K.$$, esc = K.esc, S = K.S, L = K.L, fmt = K.fmt, A = K.ASSETS;
  var CH = P.CHAPTERS, H = P.HOME_SAMPLE;

  var MINUS = "−";
  var signed = function (d) { return d > 0 ? "+" + d : d < 0 ? MINUS + Math.abs(d) : "0"; };
  var STAR = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#g-star"/></svg>';
  var emblem = function (ch) {
    return '<img src="' + A + "emblems/" + ch.art + '.webp" alt="" width="224" height="224" decoding="async">';
  };
  var meter = function (v, hue) {
    return '<span class="meter" aria-hidden="true"><i style="width:' + v + "%;background:" + hue + '"></i></span>';
  };
  var newsRow = function (date, kind, thumb, title, sub) {
    return '<div class="newsrow"><span class="newsrow__meta"><span class="newsrow__date">' + date + "</span>" +
      '<span class="newsrow__cat">' + esc(kind) + "</span></span>" + thumb +
      '<span class="newsrow__title">' + esc(title) + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span></div>";
  };
  var chapterByArt = function (art) {
    for (var i = 0; i < CH.length; i++) if (CH[i].art === art) return i;
    return -1;
  };

  /* elements rise into place one after another (the journey's answer spring) */
  var springIn = function (els) {
    var g = K.gen();
    els.forEach(function (el, i) {
      var o = { y: 40, vy: 0, a: 0 };
      el.style.opacity = "0";
      el.style.transform = "translateY(40px)";
      setTimeout(function () {
        if (g !== K.gen()) return;
        K.loop(function (dt) {
          o.a = Math.min(1, o.a + dt / 0.2);
          var m = K.springStep(o, "y", 0, { k: 320, c: 22 }, dt);
          el.style.opacity = o.a >= 1 ? "" : o.a.toFixed(3);
          el.style.transform = m ? "translateY(" + o.y.toFixed(2) + "px)" : "";
          return m || o.a < 1;
        })();
      }, i * 70);
    });
  };

  /* ========================================================= aspect page */
  var TREND = [0, -2, -2, 1];                         /* invented weekly offsets */
  var TREND_DATES = ["2026.09.21", "2026.09.14", "2026.09.07", "2026.08.31"];

  var compHTML = function (ch, comp) {
    return '<div class="brand"' + (ch.quiet ? " data-quiet" : "") + '><article class="card comp">' +
      '<h3 class="card__title">' + esc(L(comp[0])) + "</h3>" +
      '<div class="comp__score"><b>' + comp[1] + "</b><small>" + esc(S().hScoreOf) + "</small>" +
      meter(comp[1], ch.hue) + "</div></article></div>";
  };
  var trendHTML = function (i) {
    var s = S(), ch = CH[i];
    var series = TREND.map(function (d) { return H.scores[i] + d; });
    var rows = series.map(function (v, k) {
      var prev = series[k + 1];
      var sub = prev == null ? "" : prev === v ? s.aTrendSame : fmt(s.aTrendDelta, { d: signed(v - prev) });
      var thumb = '<span class="newsrow__thumb" style="--wash:' + ch.wash + '">' + K.motifSvg(ch) + "</span>";
      return newsRow(TREND_DATES[k], s.aKind, thumb, fmt(s.aTrendRow, { n: v }), sub);
    }).join("");
    return '<section class="news"><div class="wrap split"><div class="news__side"><h2 class="label">' +
      esc(s.aTrend) + '</h2></div><div class="newslist">' + rows + "</div></div></section>";
  };
  var aspectHTML = function (m) {
    var i = chapterByArt(m[1]);
    var s = S(), ch = CH[i], smp = P.ASPECT_SAMPLE[i], score = H.scores[i], quiet = !!ch.quiet;
    var head = [fmt(s.aHead, { n: score }), smp.pct != null ? fmt(s.aAhead, { p: smp.pct }) : s.aUnranked];
    /* The Still Water and The Commons are re-assessed, not weekly-reviewed */
    var cta = quiet ? [s.aReassessCta, "#/journey"] : [s.aReviewCta, "#/review"];
    return '<div class="seedtrack"><div class="seedpin" aria-hidden="true"><p class="seed headline"></p></div>' +
      K.heroHTML(emblem(ch), L(ch.region).toUpperCase(), String(score), L(ch.region) + " — " + head[0], s.heroTap,
        { chapter: i, quiet: quiet, cls: "rhero", style: "background:" + ch.wash }) +
      K.missionHTML(s.aStanding, head, quiet) + "</div>" +
      '<section class="panel statement"><div class="wrap split"><h2 class="label">' + esc(s.aCovers) + "</h2><div>" +
      "<p>" + esc(L(ch.blurb)) + "</p><p>" + esc(L(ch.theme)) + "</p>" +
      (quiet ? '<p class="quietnote">' + esc(s.aQuiet) + "</p>" : "") + "</div></div></section>" +
      '<section class="projects"><div class="projects__stick" aria-hidden="true">' +
      K.bigStarSvg(K.scoreRadii(H.scores, 1700), 1700 * K.STAR_VALLEY * 1.5) + "</div>" +
      '<div class="inner"><h2 class="label">' + esc(s.aParts) + '</h2><div class="cardblock">' +
      smp.comps.map(function (c) { return compHTML(ch, c); }).join("") + "</div></div></section>" +
      (ch.photo ? K.bandHTML([i]) : "") +
      trendHTML(i) +
      K.careersHTML(s.aFocus, [L(P.FOCUS[i])], cta[0], cta[1]) +
      K.footerHTML();
  };

  /* ======================================================= weekly review */
  var freshValues = function () {
    var v = {};
    P.REVIEW.forEach(function (st) { st.fields.forEach(function (f) { v[f.id] = f.value; }); });
    return v;
  };
  var review = { step: 0, values: freshValues(), busy: false, done: false, changed: 0 };

  var reviewHTML = function () {
    review.busy = false;          /* a route change or language switch ends any wipe */
    return '<section class="q" id="q"></section><div class="wipe" aria-hidden="true"></div>' +
      '<div class="ending" id="ending" role="dialog" aria-modal="true" aria-labelledby="endingTitle"></div>';
  };

  var fieldHTML = function (f) {
    var id = "rv-" + f.id, note = f.note ? id + "-note" : "";
    return '<div class="field"><label class="field__label" for="' + id + '">' + esc(L(f.label)) + "</label>" +
      '<input class="field__input" id="' + id + '" name="' + f.id + '" type="number" inputmode="decimal" min="0" max="' +
      f.max + '" step="' + f.step + '" value="' + review.values[f.id] + '"' +
      (note ? ' aria-describedby="' + note + '"' : "") + ">" +
      (note ? '<small class="field__note" id="' + note + '">' + esc(L(f.note)) + "</small>" : "") +
      '<small class="field__err" id="' + id + '-err" hidden></small></div>';
  };

  var renderStep = function (root, animate) {
    var s = S(), n = P.REVIEW.length, st = P.REVIEW[review.step], ch = CH[st.chapter];
    var last = review.step === n - 1, sec = $("#q", root);
    var head = fmt(s.rHead, { region: L(ch.region) });
    var still = !animate || K.reduced || !!ch.quiet;
    sec.style.setProperty("--wash", ch.wash);
    sec.innerHTML = '<div class="wrap split">' +
      '<div class="q__side"><h2 class="label">(' + esc(L(ch.region).toUpperCase()) + ")</h2>" + emblem(ch) + "</div>" +
      '<form class="q__main" novalidate><p class="q__stem">' + esc(fmt(s.rStep, { i: review.step + 1, n: n })) + "</p>" +
      '<h1 class="q__text" id="qText" tabindex="-1"><span class="sr-only">' + esc(head) +
      '</span><span class="q__typed" aria-hidden="true"></span></h1>' +
      '<p class="rv__err" id="rvErr" role="alert"></p>' +
      '<div class="fields">' + st.fields.map(fieldHTML).join("") + "</div>" +
      '<div class="rv__nav"><button type="submit" class="pill">' + esc(last ? s.rSubmit : s.rNext) + "</button>" +
      '<button type="button" class="q__back"' + (review.step === 0 ? " hidden" : "") + ">" + esc(s.rBack) + "</button></div>" +
      "</form></div>";
    K.wrapPills(sec);
    var form = $("form", sec);
    form.addEventListener("submit", function (e) { e.preventDefault(); next(root, form); });
    $(".q__back", sec).addEventListener("click", function () {
      if (review.busy) return;
      review.values = Object.assign({}, review.values, readForm(form).values);
      review.step -= 1;
      renderStep(root, false);
      $("#qText", root).focus();
    });

    var typed = K.buildTyped($(".q__typed", sec), [head], !still);
    if (still) { typed.show(typed.count); return; }
    var items = $$(".field, .rv__nav", sec);
    items.forEach(function (el) { el.style.opacity = "0"; });
    var g = K.gen();
    K.typeOut(typed, 32).then(function () {
      if (g !== K.gen()) return;
      if (typed.caret) typed.caret.remove();
      springIn(items);
    });
  };

  /* the numbers on this screen that are usable, and the fields that are not */
  var readForm = function (form) {
    var values = {}, bad = [];
    P.REVIEW[review.step].fields.forEach(function (f) {
      var raw = String(form.elements[f.id].value).trim(), v = Number(raw);
      if (raw === "" || !isFinite(v) || v < 0 || v > f.max) bad.push(f);
      else values[f.id] = v;
    });
    return { values: values, bad: bad };
  };
  var showErrors = function (form, bad) {
    var s = S();
    P.REVIEW[review.step].fields.forEach(function (f) {
      var input = form.elements[f.id], err = $("#rv-" + f.id + "-err", form), isBad = bad.indexOf(f) >= 0;
      if (isBad) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
      err.hidden = !isBad;
      err.textContent = isBad ? fmt(s.rRange, { max: f.max.toLocaleString("en-US") }) : "";
      var desc = [f.note ? "rv-" + f.id + "-note" : "", isBad ? err.id : ""].filter(Boolean).join(" ");
      if (desc) input.setAttribute("aria-describedby", desc); else input.removeAttribute("aria-describedby");
    });
    $("#rvErr", form).textContent = bad.length ? s.rFix : "";
    if (bad.length) form.elements[bad[0].id].focus();
  };
  var next = function (root, form) {
    if (review.busy) return;
    var r = readForm(form);
    showErrors(form, r.bad);
    if (r.bad.length) return;
    review.values = Object.assign({}, review.values, r.values);
    if (review.step === P.REVIEW.length - 1) finishReview(root);
    else wipeTo(root, review.step + 1);
  };

  /* the next region's photograph wipes up over the form, then away */
  var wipeTo = function (root, step) {
    var ch = CH[P.REVIEW[step].chapter], w = $(".wipe", root), g = K.gen();
    var land = function () {
      review.step = step;
      scrollTo(0, 0);
      renderStep(root, true);
      $("#qText", root).focus({ preventScroll: true });
    };
    if (K.reduced || ch.quiet) { land(); return; }
    review.busy = true;
    w.style.backgroundImage = ch.photo ? "url(" + A + "regions/" + ch.art + ".jpg)" : "";
    w.style.backgroundColor = ch.wash;
    w.innerHTML = "<b" + (ch.photo ? "" : ' class="ink"') + ">" + esc(L(ch.region)) + "</b>";
    w.classList.add("on");
    K.tween(560, K.easeInOut, function (p) { w.style.clipPath = "inset(" + ((1 - p) * 100).toFixed(2) + "% 0 0 0)"; })
      .then(function () { return K.wait(260); })
      .then(function () {
        if (g !== K.gen()) return null;
        land();
        return K.tween(520, K.easeInOut, function (p) { w.style.clipPath = "inset(0 0 " + (p * 100).toFixed(2) + "% 0)"; });
      })
      .then(function () {
        if (g !== K.gen()) return;
        w.classList.remove("on");
        w.style.clipPath = "";
        review.busy = false;
      });
  };

  var countChanged = function () {
    var n = 0;
    P.REVIEW.forEach(function (st) { st.fields.forEach(function (f) { if (review.values[f.id] !== f.value) n += 1; }); });
    return n;
  };
  var changedLine = function () {
    var s = S();
    if (!review.changed) return s.rSteady;
    return review.changed === 1 ? s.rChangedOne : fmt(s.rChanged, { n: review.changed });
  };

  /* Submitted. Every reviewed region bursts, whatever the numbers were, so
     the motion never rewards or scolds an answer. */
  var finishReview = function (root) {
    var s = S(), end = $("#ending", root), g = K.gen();
    review.busy = true;
    review.changed = countChanged();
    end.style.setProperty("--wash", "#1b1b1b");
    end.style.backgroundImage = "";
    end.style.color = "#fff";
    end.classList.add("nophoto", "dark");
    end.innerHTML = '<div class="burst" aria-hidden="true"></div><div class="ending__in">' +
      '<span class="ending__star">' + STAR + "</span>" +
      '<h2 id="endingTitle">' + esc(s.rDone) + "</h2><p>" + esc(changedLine()) + "</p>" +
      '<button type="button" class="pill pill--xl">' + esc(s.endContinue) + "</button></div>";
    K.wrapPills(end);
    end.classList.add("on");
    K.setBehindInert(root, true);
    var btn = $(".ending__in .pill", end);
    btn.addEventListener("click", function () { leaveReview(root); }, { once: true });
    var arrive;
    if (K.reduced) {
      end.style.clipPath = "none";
      arrive = K.tween(0, K.linear, function () { end.style.opacity = "1"; });
    } else {
      end.style.opacity = "";
      arrive = K.tween(700, K.easeInOut, function (p) {
        end.style.clipPath = "inset(" + ((1 - p) * 100).toFixed(2) + "% 0 0 0)";
      }).then(function () {
        if (g !== K.gen()) return;
        P.REVIEW.forEach(function (st, k) {
          setTimeout(function () {
            if (g === K.gen()) K.fireBurst($(".burst", end), $(".ending__star", end), st.chapter);
          }, k * 140);
        });
      });
    }
    arrive.then(function () { if (g === K.gen()) btn.focus(); });
  };

  var leaveReview = function (root) {
    var end = $("#ending", root), g = K.gen();
    review.done = true;
    renderReviewDone(root);
    var leave = K.reduced
      ? K.tween(0, K.linear, function () { end.style.opacity = "0"; })
      : K.tween(600, K.easeInOut, function (p) { end.style.clipPath = "inset(0 0 " + (p * 100).toFixed(2) + "% 0)"; });
    leave.then(function () {
      if (g !== K.gen()) return;
      end.classList.remove("on", "dark");
      end.style.clipPath = "";
      end.style.opacity = "";
      K.setBehindInert(root, false);
      review.busy = false;
      $("#rvDoneHead", root).focus();
    });
  };

  /* after submitting, the review stays done for the week (as in the app);
     reloading the page starts the prototype over */
  var renderReviewDone = function (root) {
    var s = S(), sec = $("#q", root);
    sec.style.setProperty("--wash", "#f6f6f6");
    var rows = ["2026.09.28"].concat(P.PAST_REVIEWS).map(function (d, k) {
      return newsRow(d, s.kind.review, '<span class="newsrow__thumb">' + STAR + "</span>", s.rPastRow, k === 0 ? changedLine() : "");
    }).join("");
    sec.innerHTML = '<div class="wrap split"><div class="news__side"><h2 class="label">' + esc(s.rPast) + "</h2>" +
      '<a class="pill" href="#/home">' + esc(s.rSeeHome) + "</a></div>" +
      '<div><h1 class="rvdone__head" id="rvDoneHead" tabindex="-1">' + esc(s.rDone) + "</h1>" +
      '<div class="newslist">' + rows + "</div></div></div>";
    K.wrapPills(sec);
  };

  var mountReview = function (root) {
    if (review.done) renderReviewDone(root); else renderStep(root, true);
    return null;
  };

  /* =============================================================== goals */
  var goals = { mine: P.SAMPLE_PLEDGES.slice(), confirm: null };
  var pledgeById = function (id) { return P.PLEDGES.filter(function (p) { return p.id === id; })[0]; };
  var hasPledge = function (id) { return goals.mine.some(function (g) { return g.id === id; }); };
  /* the app's clampPledgeTarget: inside the template's bounds, on its step */
  var clampTarget = function (pl, raw) {
    var n = Number(raw);
    if (!isFinite(n) || String(raw).trim() === "") n = pl.def;
    n = Math.min(pl.max, Math.max(pl.min, n));
    return Number((Math.round(n / pl.step) * pl.step).toFixed(2));
  };

  var mineHTML = function () {
    var s = S();
    if (!goals.mine.length) return '<p class="card__desc">' + esc(s.gNone) + "</p>";
    return goals.mine.map(function (g) {
      var pl = pledgeById(g.id), ch = CH[pl.chapter], title = L(pl.title);
      var act = goals.confirm === g.id
        ? '<div class="pledge__ask" role="group" aria-label="' + esc(s.gConfirm) + '"><p>' + esc(s.gConfirm) + "</p>" +
          '<button type="button" class="linkbtn" data-yes>' + esc(s.gYes) + "</button>" +
          '<button type="button" class="linkbtn" data-no>' + esc(s.gNo) + "</button></div>"
        : '<button type="button" class="linkbtn" data-remove aria-label="' + esc(s.gRemove + " — " + title) + '">' +
          esc(s.gRemove) + "</button>";
      return '<article class="pledge" data-id="' + g.id + '">' +
        '<span class="pledge__sticker" aria-hidden="true">' + K.stickerSvg(ch, 0) + "</span>" +
        '<div class="pledge__body"><h3 class="card__title">' + esc(title) + "</h3>" +
        '<p class="card__desc">' + esc(fmt(L(pl.desc), { target: g.target })) + "</p>" +
        (g.streak ? '<p class="pledge__streak">' + esc(fmt(s.gStreak, { n: g.streak })) + "</p>" : "") +
        act + "</div></article>";
    }).join("");
  };
  var catHTML = function (pl) {
    var s = S(), ch = CH[pl.chapter], taken = hasPledge(pl.id), id = "cat-" + pl.id;
    return '<div class="brand"><article class="card cat" data-id="' + pl.id + '">' +
      '<span class="cat__sticker" aria-hidden="true">' + K.stickerSvg(ch, 0) + "</span>" +
      '<div class="cat__text"><h3 class="card__title">' + esc(L(pl.title)) + "</h3>" +
      '<p class="card__desc">' + esc(fmt(L(pl.desc), { target: pl.def })) + "</p></div>" +
      '<div class="cat__form"><div class="field"><label class="field__label" for="' + id + '">' + esc(s.gTarget) + "</label>" +
      '<input class="field__input" id="' + id + '" type="number" inputmode="decimal" min="' + pl.min + '" max="' + pl.max +
      '" step="' + pl.step + '" value="' + pl.def + '"' + (taken ? " disabled" : "") + "></div>" +
      '<button type="button" class="pill" data-add' + (taken ? " disabled" : "") + ">" + esc(taken ? s.gAdded : s.gAddCta) + "</button>" +
      "</div></article></div>";
  };
  var goalsHTML = function () {
    var s = S(), uniform = [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500];
    return K.heroHTML(STAR, s.gWord, fmt(s.gInc, { n: goals.mine.length }), s.gWord, s.heroTap, { cls: "ghero" }) +
      '<section class="panel pledges"><div class="wrap split"><h2 class="label" id="gMineLabel" tabindex="-1">' + esc(s.gMine) + "</h2>" +
      '<div><div class="pledgelist" id="gMine">' + mineHTML() + "</div>" +
      '<p class="sr-only" id="gLive" aria-live="polite"></p></div></div></section>' +
      '<section class="projects"><div class="projects__stick" aria-hidden="true">' + K.bigStarSvg(uniform, 760) + "</div>" +
      '<div class="inner"><h2 class="label">' + esc(s.gAdd) + '</h2><div class="cardblock" id="gCat">' +
      P.PLEDGES.map(catHTML).join("") + "</div></div></section>" +
      K.careersHTML(s.gGraded, s.gGradedHead, s.aReviewCta, "#/review") +
      K.footerHTML();
  };

  /* A sticker sticks on: it drops in large and turned, and springs flat to
     its own small tilt. The tilt comes from its place in the list. */
  var tiltOf = function (k) { return ((k * 37) % 13) - 6; };
  var stick = function (el, k, animate, delay) {
    var r = tiltOf(k);
    if (!animate || K.reduced) { el.style.opacity = ""; el.style.transform = "rotate(" + r + "deg)"; return; }
    var o = { s: 1.35, vs: 0, r: r - 30, vr: 0, a: 0 }, g = K.gen();
    el.style.opacity = "0";
    setTimeout(function () {
      if (g !== K.gen()) return;
      K.loop(function (dt) {
        o.a = Math.min(1, o.a + dt / 0.15);
        var m1 = K.springStep(o, "s", 1, { k: 420, c: 16 }, dt);
        var m2 = K.springStep(o, "r", r, { k: 420, c: 16 }, dt);
        el.style.opacity = o.a >= 1 ? "" : o.a.toFixed(3);
        el.style.transform = "rotate(" + o.r.toFixed(2) + "deg) scale(" + o.s.toFixed(4) + ")";
        return m1 || m2 || o.a < 1;
      })();
    }, delay || 0);
  };

  var mountGoals = function (root) {
    var mine = $("#gMine", root), cat = $("#gCat", root), live = $("#gLive", root);
    /* redraw the list; only `fresh` (a just-added pledge) sticks on again */
    var paintMine = function (fresh) {
      mine.innerHTML = mineHTML();
      $$(".pledge", mine).forEach(function (p, k) {
        stick($(".pledge__sticker", p), k, p.getAttribute("data-id") === fresh);
      });
      $(".inc", root).textContent = fmt(S().gInc, { n: goals.mine.length });
    };
    var setCard = function (id, taken) {
      var card = $('.cat[data-id="' + id + '"]', cat);
      if (!card) return;
      var btn = $("[data-add]", card);
      btn.disabled = taken;
      $(".pill__in", btn).textContent = taken ? S().gAdded : S().gAddCta;
      $("input", card).disabled = taken;
    };

    /* the first time the list comes into view, every sticker sticks on */
    var stickers = $$(".pledge__sticker", mine);
    if (K.reduced) stickers.forEach(function (el, k) { stick(el, k, false); });
    else {
      stickers.forEach(function (el) { el.style.opacity = "0"; });
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        stickers.forEach(function (el, k) { stick(el, k, true, k * 90); });
      }, { threshold: 0.3 });
      io.observe(mine);
    }

    cat.addEventListener("input", function (e) {
      var card = e.target.closest(".cat");
      if (!card) return;
      var pl = pledgeById(card.getAttribute("data-id"));
      $(".card__desc", card).textContent = fmt(L(pl.desc), { target: clampTarget(pl, e.target.value) });
    });
    cat.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-add]");
      if (!btn || btn.disabled) return;
      var card = btn.closest(".cat"), pl = pledgeById(card.getAttribute("data-id"));
      if (hasPledge(pl.id)) return;
      var target = clampTarget(pl, $("input", card).value);
      goals = { mine: goals.mine.concat([{ id: pl.id, target: target, streak: 0 }]), confirm: null };
      setCard(pl.id, true);
      paintMine(pl.id);
      live.textContent = L(pl.title) + " — " + S().gAdded;
    });
    mine.addEventListener("click", function (e) {
      var art = e.target.closest(".pledge");
      if (!art) return;
      var id = art.getAttribute("data-id");
      if (e.target.closest("[data-remove]")) {
        goals = { mine: goals.mine, confirm: id };
        paintMine(null);
        $('.pledge[data-id="' + id + '"] [data-no]', mine).focus();
      } else if (e.target.closest("[data-no]")) {
        goals = { mine: goals.mine, confirm: null };
        paintMine(null);
        $('.pledge[data-id="' + id + '"] [data-remove]', mine).focus();
      } else if (e.target.closest("[data-yes]")) {
        goals = { mine: goals.mine.filter(function (g) { return g.id !== id; }), confirm: null };
        paintMine(null);
        setCard(id, false);
        live.textContent = L(pledgeById(id).title) + " — " + S().gRemove;
        $("#gMineLabel", root).focus();
      }
    });
    return null;
  };

  /* ============================================================ routes */
  P.route("aspect", {
    match: new RegExp("^aspect/(" + CH.map(function (c) { return c.art; }).join("|") + ")$"),
    html: aspectHTML,
    mount: null,
    title: function (m) { return L(CH[chapterByArt(m[1])].region); }
  });
  P.route("review", { match: /^review$/, html: reviewHTML, mount: mountReview, title: function () { return S().rTitle; } });
  P.route("goals", { match: /^goals$/, html: goalsHTML, mount: mountGoals, title: function () { return S().mGoals; } });
})();
