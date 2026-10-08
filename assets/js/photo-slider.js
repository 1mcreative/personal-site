// Smooth Scroll Slider — ported from a pasted Originkit React component
// (auto-looping, drag/wheel-driven, scale+dim-by-distance carousel) into
// plain JS, same house style as every other port here (IIFE, var,
// hardcoded constants instead of the reference's configurable prop API,
// since this page only ever needs one instance tuned once).
//
// Progressive enhancement, not a JS-only widget: the real markup in
// life/index.md is already a plain, horizontally-scrollable row of real
// <img>/placeholder tiles (personal.css's own default .photo-slider
// rules). A no-JS or prefers-reduced-motion visitor keeps exactly that,
// scrollable natively, and this file never runs for them. When motion is
// allowed, this takes the same DOM, clones it enough times to loop
// seamlessly, and drives it with the reference's own physics.
//
// Deliberate deviation from the reference: its wheel handler consumes
// every wheel event regardless of axis. This page's own section-to-section
// navigation IS native vertical wheel scroll (scroll-snap on body, see
// personal.css's html:has() comment) — hijacking vertical wheel here would
// trap a visitor who's merely trying to scroll past the album, the same
// "stuck scroll" class of bug this project already found and fixed once
// for the YouTube section. So only a genuinely horizontal wheel gesture
// (deltaX dominant) drives the carousel; plain vertical wheel passes
// through untouched.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var root = document.getElementById("photo-slider");
  if (!root) return;

  var original = Array.prototype.slice.call(root.children);
  if (original.length < 2) return; // nothing to loop or drag through

  var SLIDE = 170;
  var GAP = 16;
  var STEP = SLIDE + GAP;
  var EASE = 0.12;
  var MAX_SCALE = 1.3;
  var MIN_SCALE = 0.8;
  var DIM = 0.55;
  var WHEEL_MULT = 1.1;
  var DRAG_MULT = 1.4;

  // Repeat the real slide set enough times that the loop-wrap never shows
  // a visible seam on a wide viewport. A fixed heuristic, not a measured
  // fit — ponytail: good enough for any reasonable photo count/viewport;
  // upgrade to a real width-based measurement if a very small photo set
  // ever makes the seam visible in practice.
  var repeats = Math.max(2, Math.ceil(20 / original.length));

  root.classList.add("is-enhanced");
  root.style.height = SLIDE + "px";

  var nodes = [];
  for (var r = 0; r < repeats; r++) {
    original.forEach(function (node) {
      var el = r === 0 ? node : node.cloneNode(true);
      if (r > 0) root.appendChild(el);
      nodes.push(el);
    });
  }

  var count = nodes.length;
  var span = count * STEP;
  var current = 0;
  var target = 0;
  var width = root.getBoundingClientRect().width;

  window.addEventListener("resize", function () {
    width = root.getBoundingClientRect().width;
  });

  function wrap(value, m) {
    return ((value % m) + m) % m;
  }

  var last = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    var delta = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    last = now;
    if (width <= 0) return;

    if (current > span || current < -span) {
      var shift = Math.trunc(current / span) * span;
      current -= shift;
      target -= shift;
    }

    var k = 1 - Math.pow(1 - EASE, delta * 60);
    current += (target - current) * k;

    var pad = (width - SLIDE) / 2;
    var half = width / 2;

    for (var i = 0; i < count; i++) {
      var node = nodes[i];
      var raw = i * STEP - current + pad;
      var x = wrap(raw + STEP, span) - STEP;

      var distance = x + SLIDE / 2 - half;
      var scale, push;
      if (distance > 0) {
        scale = Math.min(MAX_SCALE, 1 + distance / width);
        push = (scale - 1) * SLIDE * 0.75;
      } else {
        scale = Math.max(MIN_SCALE, 1 + distance / width);
        push = 0;
      }

      node.style.transform = "translate3d(" + (x + push) + "px, -50%, 0) scale(" + scale + ")";
      if (scale < 1) {
        var t = (1 - scale) / (1 - MIN_SCALE);
        node.style.filter = "brightness(" + (1 - t * DIM) + ")";
      } else {
        node.style.filter = "none";
      }
    }
  }
  requestAnimationFrame(tick);

  root.addEventListener(
    "wheel",
    function (event) {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      target += event.deltaX * WHEEL_MULT;
    },
    { passive: false }
  );

  var pointerId = null;
  var lastX = 0;
  var dragDistance = 0;

  root.addEventListener("pointerdown", function (event) {
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    lastX = event.clientX;
    dragDistance = 0;
    root.setPointerCapture(pointerId);
    root.classList.add("is-dragging");
  });
  root.addEventListener("pointermove", function (event) {
    if (event.pointerId !== pointerId) return;
    var dx = event.clientX - lastX;
    lastX = event.clientX;
    dragDistance += Math.abs(dx);
    target -= dx * DRAG_MULT;
  });
  function endDrag(event) {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    root.classList.remove("is-dragging");
    if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
  }
  root.addEventListener("pointerup", endDrag);
  root.addEventListener("pointercancel", endDrag);

  // A drag that ends over a photo button still fires a native click on
  // release — swallow it once the gesture has moved enough to have been a
  // drag, not a tap, so dragging the carousel doesn't also pop the photo
  // modal open on whatever slide happens to be under the cursor at
  // release. Capture phase, so this runs before each slide's own click
  // handler (assets/js/photo-modal.js) ever sees the event.
  //
  // Separately: setPointerCapture above (needed so a fast drag keeps
  // tracking even once the cursor leaves the strip) also retargets the
  // resulting click's compatibility mouse event to root itself, even for
  // a plain zero-movement tap — confirmed directly, not assumed: event.
  // target on every click was root, never the tapped button, regardless
  // of drag distance. Root-caused rather than removing pointer capture
  // (which would degrade the drag itself): re-dispatch a real click at
  // whatever .photo-slide is actually under the pointer so the button's
  // own listener (photo-modal.js) still fires. isTrusted guards against
  // that re-dispatch (itself untrusted) looping back through this same
  // listener.
  root.addEventListener(
    "click",
    function (event) {
      if (dragDistance > 6) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.isTrusted && event.target === root) {
        var real = document.elementFromPoint(event.clientX, event.clientY);
        var slide = real && real.closest(".photo-slide");
        if (slide) slide.click();
      }
    },
    true
  );
})();
