// Cursor trail — a trail of small glowing "glyph" particles following the
// real pointer, plus a burst on click. Adapted from a pasted Originkit
// "Glyph Burst" React/TypeScript component, per explicit request: "add
// this mouse trail... keep system default mouse pointer, but trail and
// other effects use [this]." Site-wide (every layout), unlike every other
// canvas effect here, which is scoped to one page.
//
// Cut almost everything that wasn't the trail/burst particle system
// itself: the reference bundles a generic WebGL program compiler
// (createProgram) and a play/hold/restore trigger state machine
// (stepTrigger) that the mounted component never actually calls, a demo
// "card" background renderer (drawCard/FramerFont/wrapLines) for Framer's
// own canvas-editor preview, a background dot-grid, and a sine-wave
// "auto-pilot" cursor path (ptr.demo) that drives the effect when nobody's
// hovering, also only meaningful inside Framer's own editor thumbnail — a
// real visitor's pointer is either present or it isn't, nothing needs to
// fake motion when it's absent. None of that ships here.
//
// The one genuinely load-bearing cut: the reference hides the real OS
// cursor (`cursor: none`) and draws its own bitmap arrow every frame
// (ARROW/arrowRows). Explicitly NOT wanted ("keep system default mouse
// pointer") — this canvas never sets `cursor` on anything and the arrow
// sprite/rows are gone entirely, not just unused.
//
// Recolored to this page's own --accent (read live per page, since this
// script runs identically on every theme) instead of the reference's
// five-color pink/cyan/white/violet/lime palette — this site has never
// introduced a color outside each theme's own single accent, and a
// site-wide effect is exactly the place that rule matters most.
//
// Gated on prefers-reduced-motion (skipped entirely, same as every other
// ambient/decorative effect on this site) and on a real hover-capable
// pointer (hover:hover + pointer:fine) — a "trail" has no coherent
// meaning on touch, where there's no persistent pointer position to
// trail from, so touch visitors never pay for a canvas/rAF loop that
// couldn't express the effect anyway.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var MAX_PARTICLES = 140;
  var CELL = 3; // px per glyph "pixel"
  var GLOW_PX = 6;
  var GLOW_ALPHA = 0.35;
  var DRAG = 7; // higher = particles reach their target offset faster

  var TRAIL_SPACING = 26; // px of real pointer movement between trail spawns
  var TRAIL_DRIFT = 10; // px of random extra drift added per trail particle
  var TRAIL_LIFE_MIN = 0.35;
  var TRAIL_LIFE_MAX = 0.6;

  var BURST_COUNT = 14;
  var BURST_REACH = 46; // px
  var BURST_LIFE_MIN = 0.35;
  var BURST_LIFE_MAX = 0.6;

  // Abstract blocky shapes, not real characters — the reference's own
  // "glyph" bitmap font, ported verbatim (7x7, '#' = filled cell).
  var GLYPHS = [
    [".#####.", "#.....#", "#.....#", "#.....#", "#.....#", "#.....#", ".#####."],
    ["#.....#", ".#...#.", "..#.#..", "...#...", "..#.#..", ".#...#.", "#.....#"],
    ["...#...", "...#...", "...#...", "#######", "...#...", "...#...", "...#..."],
    ["#######", "#.....#", "#.....#", "#.....#", "#.....#", "#.....#", "#######"],
    [".......", "#######", ".......", "#######", ".......", "#######", "......."],
    ["..#.#..", "..#.#..", "#######", "..#.#..", "#######", "..#.#..", "..#.#.."],
    [".......", "..###..", ".#####.", ".#####.", ".#####.", "..###..", "......."],
  ];

  var canvas = document.createElement("canvas");
  canvas.className = "cursor-trail-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var W = 0,
    H = 0,
    dpr = 1;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // --accent is scoped to the body's own theme class (see DESIGN.md), so
  // this always reads the current page's real accent, never a guess.
  var rgb = hexToRgb(getComputedStyle(document.body).getPropertyValue("--accent").trim()) || [29, 78, 216];

  function makeSprite(bits) {
    var pad = Math.ceil(GLOW_PX * 1.5) + 2;
    var size = 7 * CELL + pad * 2;
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(size * dpr));
    c.height = Math.max(1, Math.round(size * dpr));
    var g = c.getContext("2d");
    if (!g) return c;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.beginPath();
    for (var r = 0; r < bits.length; r++) {
      var row = bits[r];
      for (var k = 0; k < row.length; k++) {
        if (row[k] === "#") g.rect(pad + k * CELL, pad + r * CELL, CELL, CELL);
      }
    }
    g.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
    g.shadowColor = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + GLOW_ALPHA + ")";
    g.shadowBlur = GLOW_PX * dpr;
    g.fill();
    g.shadowBlur = 0;
    g.fill();
    return c;
  }
  var SPRITE_PAD = Math.ceil(GLOW_PX * 1.5) + 2;
  var sprites = GLYPHS.map(makeSprite);
  var half = Math.floor((7 * CELL) / 2);

  var parts = [];
  for (var i = 0; i < MAX_PARTICLES; i++) {
    parts.push({ alive: false, x: 0, y: 0, dx: 0, dy: 0, life: 0, age: 0, glyph: 0 });
  }
  var head = 0;
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function spawn(x, y, dx, dy, life) {
    var q = parts[head];
    head = (head + 1) % parts.length;
    q.alive = true;
    q.x = x;
    q.y = y;
    q.dx = dx;
    q.dy = dy;
    q.life = life;
    q.age = 0;
    q.glyph = (Math.random() * sprites.length) | 0;
  }

  var mouseX = NaN,
    mouseY = NaN,
    lastX = NaN,
    lastY = NaN,
    carry = 0;

  document.addEventListener(
    "pointermove",
    function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerdown",
    function (e) {
      for (var i = 0; i < BURST_COUNT; i++) {
        var a = Math.random() * Math.PI * 2;
        var d = BURST_REACH * rand(0.4, 1);
        spawn(e.clientX, e.clientY, Math.cos(a) * d, Math.sin(a) * d, rand(BURST_LIFE_MIN, BURST_LIFE_MAX));
      }
    },
    { passive: true }
  );

  var raf = 0,
    lastT = 0;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    // Costs nothing while the tab is backgrounded, same courtesy every
    // other persistent canvas loop on this site already extends.
    if (document.hidden) {
      lastT = 0;
      return;
    }
    var dt = lastT ? Math.min((t - lastT) / 1000, 1 / 20) : 0;
    lastT = t;

    if (!isNaN(mouseX)) {
      if (isNaN(lastX)) {
        lastX = mouseX;
        lastY = mouseY;
        carry = 0;
      }
      var mx = mouseX - lastX;
      var my = mouseY - lastY;
      var dist = Math.hypot(mx, my);
      var short = Math.max(W, H);
      if (dist > 0 && dist < short) {
        carry += dist;
        var made = 0;
        while (carry >= TRAIL_SPACING && made < 4) {
          carry -= TRAIL_SPACING;
          var tt = Math.min(1, Math.max(0, (dist - carry) / dist));
          var da = Math.random() * Math.PI * 2;
          var dd = TRAIL_DRIFT * Math.random();
          spawn(lastX + mx * tt, lastY + my * tt, Math.cos(da) * dd, Math.sin(da) * dd, rand(TRAIL_LIFE_MIN, TRAIL_LIFE_MAX));
          made++;
        }
      } else if (dist >= short) {
        carry = 0; // a teleport (new tab, window resize) — not a real swipe
      }
      lastX = mouseX;
      lastY = mouseY;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i];
      if (!q.alive) continue;
      q.age += dt;
      if (q.age >= q.life) {
        q.alive = false;
        continue;
      }
      var eased = 1 - Math.exp(-DRAG * q.age);
      var fadeIn = Math.min(1, q.age / 0.08);
      var fadeOut = Math.min(1, (q.life - q.age) / (q.life * 0.4));
      ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.85;
      var cx = Math.round(q.x + q.dx * eased);
      var cy = Math.round(q.y + q.dy * eased);
      var spr = sprites[q.glyph];
      ctx.drawImage(spr, cx - half - SPRITE_PAD, cy - half - SPRITE_PAD, spr.width / dpr, spr.height / dpr);
    }
    ctx.restore();
  }
  raf = requestAnimationFrame(loop);
})();
