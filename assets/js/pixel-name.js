// Pixel Name — a canvas particle formation for the word "Bhavesh" in the
// homepage hero heading. Adapted from a pasted Originkit "Pixel Drift"
// React/canvas component (ParticleText): kept its core idea (sample text
// into a grid of square particles, spawn each one outside the canvas, tween
// it in), dropped everything else — no onHover mode, no mouse-repulsion
// interactivity, no color palette — per explicit instruction ("dont use
// whole effect just use initial iffect"). Once the formation finishes it
// freezes: the rAF loop stops entirely rather than idling, so the settled
// word really has zero ongoing animation until the explode trigger below.
//
// The plain "Bhavesh" text in the h1 (.pixel-name-plain) is the real,
// accessible content the whole time — this only ever makes it transparent
// (not display:none/clip'd out of flow), so it keeps reserving its normal
// inline space in "Hi, I'm ___ ." and screen readers/SEO/no-JS/reduced-
// motion all still see plain text, same progressive-enhancement shape as
// .text-fall-plain on /resume/.
//
// window.pixelNameExplode(callback) is the one thing this adds beyond the
// reference: hero.js calls it right before navigating to /resume/ on the
// scroll-gesture, so the particles blow outward and fade before the page
// actually leaves. If this script never got this far (reduced motion,
// missing markup, an error), the function is simply never defined — hero.js
// already treats that as "navigate immediately," so nothing here is
// load-bearing for the navigation itself.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.querySelector(".pixel-name-canvas");
  var plain = document.querySelector(".pixel-name-plain");
  var hero = document.querySelector(".hero");
  if (!canvas || !plain || !hero) return;

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var STEP_CSS = 2.5;
  var PARTICLE_SIZE = 2.2;
  var FORM_MS = 1100;
  var EXPLODE_MS = 700;

  var dpr = 1, cssW = 0, cssH = 0;
  var count = 0;
  var ox = new Float32Array(0), oy = new Float32Array(0);
  var sx = new Float32Array(0), sy = new Float32Array(0);
  var color = "#14171c";
  var phase = "idle"; // idle -> in -> done -> out
  var animStart = 0;
  var rafId = 0;
  var explodeCallback = null;
  var resizeTimer = 0;
  var lastCssW = -1, lastCssH = -1;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInCubic(t) { return t * t * t; }

  function sample() {
    var heroRect = hero.getBoundingClientRect();
    var plainRect = plain.getBoundingClientRect();
    cssW = Math.max(1, heroRect.width);
    cssH = Math.max(1, heroRect.height);
    lastCssW = hero.offsetWidth;
    lastCssH = hero.offsetHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    var cs = getComputedStyle(plain);
    color = cs.color;
    var fontSpec = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;

    var off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    var octx = off.getContext("2d", { willReadFrequently: true });
    octx.scale(dpr, dpr);
    octx.font = fontSpec;
    octx.textAlign = "left";
    octx.textBaseline = "middle";
    octx.fillStyle = "#fff";
    var localX = plainRect.left - heroRect.left;
    var localY = (plainRect.top + plainRect.bottom) / 2 - heroRect.top;
    octx.fillText(plain.textContent, localX, localY);

    var data = octx.getImageData(0, 0, off.width, off.height).data;
    var step = Math.max(1, Math.round(STEP_CSS * dpr));
    var pts = [];
    for (var y = 0; y < off.height; y += step) {
      for (var x = 0; x < off.width; x += step) {
        if (data[(y * off.width + x) * 4 + 3] > 120) {
          pts.push(x / dpr, y / dpr);
        }
      }
    }
    count = pts.length / 2;
    ox = new Float32Array(count);
    oy = new Float32Array(count);
    sx = new Float32Array(count);
    sy = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      ox[i] = pts[i * 2];
      oy[i] = pts[i * 2 + 1];
    }
  }

  // Spawn/explode targets: scattered across (and beyond) the whole hero, so
  // particles genuinely travel in "from around the screen" rather than a
  // tight ring right next to the letters.
  function assignScatter(out_x, out_y) {
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = Math.max(cssW, cssH) * (0.55 + Math.random() * 0.55);
      out_x[i] = cssW / 2 + Math.cos(ang) * rad;
      out_y[i] = cssH / 2 + Math.sin(ang) * rad;
    }
  }

  function ensureLoop() {
    if (!rafId) rafId = requestAnimationFrame(draw);
  }

  function draw(now) {
    rafId = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var dur = phase === "out" ? EXPLODE_MS : FORM_MS;
    var t = Math.min(1, (now - animStart) / dur);
    var half = PARTICLE_SIZE / 2;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = color;

    if (phase === "in") {
      var e = easeOutCubic(t);
      ctx.globalAlpha = e;
      for (var i = 0; i < count; i++) {
        var x = sx[i] + (ox[i] - sx[i]) * e;
        var y = sy[i] + (oy[i] - sy[i]) * e;
        ctx.fillRect(x - half, y - half, PARTICLE_SIZE, PARTICLE_SIZE);
      }
    } else if (phase === "out") {
      var e2 = easeInCubic(t);
      ctx.globalAlpha = Math.max(0, 1 - e2);
      for (var j = 0; j < count; j++) {
        var x2 = ox[j] + (sx[j] - ox[j]) * e2;
        var y2 = oy[j] + (sy[j] - oy[j]) * e2;
        ctx.fillRect(x2 - half, y2 - half, PARTICLE_SIZE, PARTICLE_SIZE);
      }
    }

    ctx.restore();

    if (t < 1) {
      ensureLoop();
      return;
    }

    if (phase === "in") {
      // Settled: draw the final frame once more at full opacity/exact
      // target positions, then stop the loop entirely — no ongoing
      // animation, exactly a static frame until the explode trigger.
      phase = "done";
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      for (var k = 0; k < count; k++) {
        ctx.fillRect(ox[k] - half, oy[k] - half, PARTICLE_SIZE, PARTICLE_SIZE);
      }
      ctx.restore();
    } else if (phase === "out") {
      phase = "exploded";
      var cb = explodeCallback;
      explodeCallback = null;
      if (cb) cb();
    }
  }

  function startForm() {
    sample();
    assignScatter(sx, sy);
    plain.classList.add("pixel-name-hidden");
    phase = "in";
    animStart = performance.now();
    ensureLoop();
  }

  function start() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(startForm, startForm);
    } else {
      startForm();
    }
  }

  start();

  // A ResizeObserver on .hero itself, not a window "resize" listener —
  // same fix this codebase already applied to text-fall.js for the exact
  // same failure mode: a freshly-navigated automation tab can report a
  // near-zero layout box for a moment before real layout settles, which
  // would otherwise bake a tiny/wrong hero size into the particle
  // positions permanently (a plain "resize" event only fires on a real
  // viewport-size change, so it would never correct that). Guarded against
  // no-op firings via lastCssW/lastCssH so normal repaints don't restart
  // anything.
  function handleResize() {
    if (hero.offsetWidth === lastCssW && hero.offsetHeight === lastCssH) return;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (phase === "done") {
        sample();
        // Snap straight to the settled frame — a resize/reflow isn't a
        // fresh appearance, so it shouldn't replay the formation.
        var half = PARTICLE_SIZE / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = color;
        for (var i = 0; i < count; i++) {
          ctx.fillRect(ox[i] - half, oy[i] - half, PARTICLE_SIZE, PARTICLE_SIZE);
        }
        ctx.restore();
      } else if (phase === "in") {
        // Rare: a real size change mid-formation. Simplest correct fix is
        // to restart the intro fresh at the corrected size rather than try
        // to reproject an in-flight animation.
        startForm();
      }
    }, 150);
  }

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(handleResize).observe(hero);
  } else {
    window.addEventListener("resize", handleResize);
  }

  window.pixelNameExplode = function (callback) {
    if (phase !== "done") {
      if (callback) callback();
      return;
    }
    explodeCallback = callback || null;
    assignScatter(sx, sy);
    phase = "out";
    animStart = performance.now();
    ensureLoop();
  };
})();
