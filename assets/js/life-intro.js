// Load sequence for /life/, per direct request: blank screen, then the
// Black Hole grows in from a dot, then content appears one piece at a
// time — nav, then the heading, then the subhead, then everything else —
// instead of it all arriving together.
//
// The grow doesn't start on a fixed timer. black-hole-lite.js's first real
// frame (bake + shade + composite) can take anywhere from a few hundred ms
// to several seconds depending on the GPU, and a fixed hold was racing that:
// the CSS scale transition would finish well before the canvas had actual
// pixels, so the black hole just popped in at full size once it was finally
// ready instead of visibly growing. This now waits for black-hole-lite.js's
// own "blackhole:ready" event (fired after its first submitted frame) before
// starting the scale transition, so growth is always shown against a canvas
// that already has something real to reveal.
//
// All the hiding/scaling CSS is scoped under body.js-intro (added
// synchronously in personal.html, before this deferred script even runs)
// specifically so a no-JS visitor never sees a permanently black screen or
// a stuck tiny dot — this file only ever adds classes to elements that
// start effectively inert without that class present at all.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var veil = document.querySelector(".life-intro-veil");
  var hero = document.querySelector(".life-hero");
  var canvas = document.querySelector(".life-hero-canvas");
  var header = document.querySelector(".site-header");
  var h1 = document.querySelector(".life-hero-inner h1");
  var p = document.querySelector(".life-hero-inner p");
  var rest = Array.prototype.slice.call(document.querySelectorAll(".section-nav, .life-section"));
  if (!veil || !hero || !header) return;

  var MIN_HOLD_MS = 200; // guaranteed blank-screen beat even if the canvas signals ready almost instantly
  var READY_FALLBACK_MS = 4000; // starts anyway if black-hole-lite.js never signals (no WebGPU, failed init) so visitors never stay stuck on the veil
  var GROW_MS = 1100; // must match .life-hero's own transition duration in personal.css
  var STAGGER_MS = 200; // gap between each piece of content appearing

  function runSequence(steps) {
    var i = 0;
    function next() {
      if (i >= steps.length) return;
      var step = steps[i++];
      setTimeout(function () {
        step[1]();
        next();
      }, step[0]);
    }
    next();
  }

  var started = false;
  function beginGrow() {
    if (started) return;
    started = true;
    runSequence([
      [0, function () {
        veil.classList.add("is-hidden");
        hero.classList.add("is-grown");
      }],
      [GROW_MS, function () {
        header.classList.add("is-visible");
      }],
      [STAGGER_MS, function () {
        if (h1) h1.classList.add("is-visible");
      }],
      [STAGGER_MS, function () {
        if (p) p.classList.add("is-visible");
      }],
      [STAGGER_MS, function () {
        rest.forEach(function (el) { el.classList.add("is-visible"); });
      }]
    ]);
  }

  var minHoldDone = false;
  var canvasReady = !canvas;
  function maybeBegin() {
    if (minHoldDone && canvasReady) beginGrow();
  }

  setTimeout(function () {
    minHoldDone = true;
    maybeBegin();
  }, MIN_HOLD_MS);

  if (canvas) {
    canvas.addEventListener("blackhole:ready", function () {
      canvasReady = true;
      maybeBegin();
    }, { once: true });
  }

  setTimeout(beginGrow, READY_FALLBACK_MS);
})();
