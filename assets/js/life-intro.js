// Load sequence for /life/, per direct request: blank screen, then the
// Black Hole grows from its own center outward, then content appears one
// piece at a time — nav, then text and the side nav together, then the
// side nav's own three icons in order (Instagram, YouTube, Album) —
// instead of it all arriving together.
//
// The grow doesn't start on a fixed timer. black-hole-lite.js's first real
// frame (bake + shade + composite) can take anywhere from a few hundred ms
// to several seconds depending on the GPU, and a fixed hold was racing
// that. This waits for black-hole-lite.js's own "blackhole:ready" event
// (fired after its first submitted frame) before starting the grow, so
// growth is always shown against a canvas that already has something real
// underneath it. The grow itself is not a CSS transform on this element —
// window.blackHoleGrow() (see black-hole-lite.js) animates the disk's own
// visual radius inside the shader, so what's actually growing is the black
// hole itself, not a scaled-up copy of the whole rendered frame.
//
// All the hiding CSS is scoped under body.js-intro (added synchronously in
// personal.html, before this deferred script even runs) specifically so a
// no-JS visitor never sees a permanently black screen or a stuck-hidden
// nav — this file only ever adds classes to elements that start
// effectively inert without that class present at all.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var veil = document.querySelector(".life-intro-veil");
  var canvas = document.querySelector(".life-hero-canvas");
  var header = document.querySelector(".site-header");
  var h1 = document.querySelector(".life-hero-inner h1");
  var p = document.querySelector(".life-hero-inner p");
  var sectionNav = document.querySelector(".section-nav");
  var navLinks = ["instagram", "youtube", "album"].map(function (name) {
    return document.querySelector('.section-nav-link[data-section="' + name + '"]');
  });
  var lifeSections = Array.prototype.slice.call(document.querySelectorAll(".life-section"));
  if (!veil || !header) return;

  var MIN_HOLD_MS = 200; // guaranteed blank-screen beat even if the canvas signals ready almost instantly
  var READY_FALLBACK_MS = 4000; // starts anyway if black-hole-lite.js never signals (no WebGPU, failed init) so visitors never stay stuck on the veil
  var GROW_MS = 1100; // must match window.blackHoleGrow()'s own default duration
  var STAGGER_MS = 200; // gap between each piece of content appearing
  var ICON_STAGGER_MS = 150; // gap between each side-nav icon specifically — a tighter beat than the bigger content reveals

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

    // The page's own content sections (Instagram/YouTube/Album) are all
    // off-screen during this whole sequence — nothing below revealing them
    // early is visible until the visitor actually scrolls there, so they
    // just go straight to their settled state rather than waiting in the
    // timed sequence for a moment nobody can see anyway.
    lifeSections.forEach(function (el) { el.classList.add("is-visible"); });

    runSequence([
      [0, function () {
        veil.classList.add("is-hidden");
        if (canvas && window.blackHoleGrow) window.blackHoleGrow(GROW_MS);
      }],
      [GROW_MS, function () {
        header.classList.add("is-visible");
      }],
      [STAGGER_MS, function () {
        if (h1) h1.classList.add("is-visible");
        if (p) p.classList.add("is-visible");
        if (sectionNav) sectionNav.classList.add("is-visible");
      }],
      [STAGGER_MS, function () {
        if (navLinks[0]) navLinks[0].classList.add("is-visible");
      }],
      [ICON_STAGGER_MS, function () {
        if (navLinks[1]) navLinks[1].classList.add("is-visible");
      }],
      [ICON_STAGGER_MS, function () {
        if (navLinks[2]) navLinks[2].classList.add("is-visible");
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
