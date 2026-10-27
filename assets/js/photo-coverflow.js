// Album Coverflow — one centered photo, the rest tilted away in
// perspective on either side, drifting between photos on its own with no
// visible prev/next buttons (direct feedback: "don't like buttons").
// Operates directly on the real .photo-slide elements life/index.md
// already renders (real photos or gradient placeholders) rather than
// creating its own — there's nothing to clone/duplicate here, unlike the
// old photo-slider.js's seamless-loop clones, so photo-modal.js's existing
// per-click open() wiring needs no changes beyond the drag-suppression
// below.
//
// Sizing reads --card-w (personal.css) live via getComputedStyle rather
// than hardcoding pixel values, so it can never drift from the CSS and
// stays correct across the mobile/desktop breakpoint and any future resize
// — the same lesson this project already learned once for the previous
// carousel's own SLIDE/GAP constants.
(function () {
  var stage = document.getElementById("photo-slider");
  if (!stage) return;

  var cards = Array.prototype.slice.call(stage.querySelectorAll(".photo-slide"));
  var count = cards.length;
  if (count < 2) return; // nothing to drift between with 0 or 1 tile

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ACTIVE_W, ACTIVE_H, REST_W, REST_H, GAP;
  function readSizing() {
    // --card-w is set on .theme-personal (personal.css), which is <body>,
    // not <html> — a custom property only cascades down to descendants, so
    // reading it off document.documentElement (html, an ANCESTOR of body)
    // always misses and silently falls back to the mobile value, even on
    // desktop. This exact mistake already bit this project once before
    // (Slice Blade's HUD colors); read the element that actually carries
    // the class instead.
    ACTIVE_W = parseFloat(getComputedStyle(document.body).getPropertyValue("--card-w")) || 170;
    ACTIVE_H = ACTIVE_W * 1.5; // matches .photo-slide's own aspect-ratio: 2 / 3
    REST_W = ACTIVE_W * 0.72;
    REST_H = REST_W * 1.5;
    GAP = ACTIVE_W * 0.14;
  }
  readSizing();
  window.addEventListener("resize", readSizing);

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  var pos = 0; // fractional index
  var target = 0;

  function relOf(i, p) {
    // (i - p) % count first: with the auto-advance running indefinitely,
    // p can end up many cycles away from i, and a single +/- count
    // correction (enough for a difference of at most one cycle) isn't
    // enough to pull that back into range — confirmed directly: after a
    // few minutes idle, cards were landing transformed thousands of pixels
    // off-screen. The modulo brings any difference, however large, to
    // within one cycle first; the follow-up +/- count then centers it.
    var rel = (i - p) % count;
    if (rel > count / 2) rel -= count;
    if (rel < -count / 2) rel += count;
    return rel;
  }
  function xForRel(rel) {
    var ar = Math.abs(rel);
    var c1 = ACTIVE_W / 2 + GAP + REST_W / 2;
    var pitch = REST_W + GAP;
    var mag = ar <= 1 ? ar * c1 : c1 + (ar - 1) * pitch;
    return (rel < 0 ? -1 : 1) * mag;
  }
  function blend(rel) { return clamp(Math.abs(rel), 0, 1); }

  function render() {
    requestAnimationFrame(render);
    // Keeps pos/target from drifting to ever-larger numbers over a long
    // idle session (the auto-advance below never stops ticking) — relOf()
    // is already correct at any magnitude via its modulo, this is just
    // float-precision hygiene, same shift-by-a-whole-cycle technique the
    // drag-row carousel this replaced used for the same reason.
    if (Math.abs(target) > count * 50) {
      var shift = Math.round(target / count) * count;
      pos -= shift;
      target -= shift;
    }
    pos = reduceMotion ? target : pos + (target - pos) * 0.18;
    for (var i = 0; i < count; i++) {
      var rel = relOf(i, pos);
      var a = blend(rel);
      var w = ACTIVE_W + (REST_W - ACTIVE_W) * a;
      var x = xForRel(rel);
      var opacity = Math.abs(rel) > 3.5 ? 0 : 1 - Math.max(0, Math.abs(rel) - 2.5);
      var z = -Math.abs(rel) * 60;
      cards[i].style.transform =
        "translate(-50%, -50%) translateX(" + x + "px) translateZ(" + z + "px) rotateY(" + (rel < 0 ? 35 * a : -35 * a) + "deg) scale(" + (w / ACTIVE_W) + ")";
      cards[i].style.width = ACTIVE_W + "px";
      cards[i].style.height = ACTIVE_H + "px";
      cards[i].style.zIndex = String(1000 - Math.round(Math.abs(rel) * 10));
      cards[i].style.opacity = String(opacity);
    }
  }
  requestAnimationFrame(render);

  // Drifts to the next photo on its own every AUTO_INTERVAL_MS; any real
  // interaction (drag) pauses it for RESUME_DELAY_MS so it never yanks the
  // deck away from a photo someone's actively looking at. Off entirely
  // under reduced motion — matching this site's existing convention (e.g.
  // hero.js's own ambient effects) of dropping idle/ambient motion while
  // keeping direct interaction working.
  if (!reduceMotion) {
    var AUTO_INTERVAL_MS = 2800;
    var RESUME_DELAY_MS = 3500;
    var pausedUntil = 0;
    var markInteraction = function () { pausedUntil = Date.now() + RESUME_DELAY_MS; };
    setInterval(function () {
      if (Date.now() < pausedUntil) return;
      target += 1;
    }, AUTO_INTERVAL_MS);
  } else {
    var markInteraction = function () {};
  }

  // Drag to browse. A click on a .photo-slide button already opens the
  // real lightbox (photo-modal.js) regardless of a card's position in the
  // deck — deliberately not reproducing the demo's "click a side card to
  // center it first" step, since this site's existing click-to-open
  // behavior is simpler and the deck's centering is cosmetic focus, not a
  // required step before opening. The only thing this needs to prevent is
  // a drag's pointerup firing that same open() as a false click — handled
  // by stopping the click in the capture phase (runs before open()'s own
  // bubble-phase listener on the button) whenever the pointer actually
  // moved during this gesture.
  // Deliberately NOT pausing on hover/pointermove, despite that seeming
  // like a reasonable way to protect someone reading a hovered card's
  // metadata: tried it, and confirmed directly (via pausedUntil getting
  // repeatedly pushed forward with the real OS cursor left genuinely
  // stationary) that the deck's own motion under a resting cursor is
  // enough to keep re-triggering it on its own, with no further input — direct
  // report was "in desktop mode it is not rotating by itself." The
  // hover-revealed metadata (personal.css's .photo-slide-meta) is plain
  // CSS :hover and needs no JS pause to work; only a real drag pauses the
  // drift now, same as the very first version of this carousel.

  var dragging = false, startX = 0, startTarget = 0, dragged = false;
  stage.addEventListener("pointerdown", function (e) {
    dragging = true;
    dragged = false;
    startX = e.clientX;
    startTarget = target;
    markInteraction();
    stage.classList.add("is-dragging");
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 6) dragged = true;
    target = startTarget - dx / 110;
    markInteraction();
  });
  function endDrag() {
    dragging = false;
    stage.classList.remove("is-dragging");
    target = Math.round(target);
    markInteraction();
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener(
    "click",
    function (e) {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // A tap/click that lands on the stage's own background — the real
      // gaps between cards, or a tilted card's rotateY-foreshortened hit
      // area being narrower than its full-width bounding box — otherwise
      // silently does nothing, since there's no .photo-slide button under
      // it for photo-modal.js's own listener to catch. Direct feedback:
      // "not able to open it." Confirmed directly (not assumed) that a
      // real click here can land on the stage div itself, not a card.
      // Treat that case as "open whichever photo is currently centered" —
      // re-dispatching .click() on that real button re-targets the event
      // so photo-modal.js's existing per-button listener fires exactly as
      // if it had been clicked directly; e.target on that re-entrant call
      // is the button, not the stage, so this can't recurse.
      if (e.target === stage) {
        var active = cards.reduce(function (a, b) {
          return parseInt(b.style.zIndex, 10) > parseInt(a.style.zIndex, 10) ? b : a;
        });
        active.click();
      }
    },
    true
  );
})();
