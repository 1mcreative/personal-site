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
// Color history, so the next reader doesn't have to reconstruct it. The
// reference ships a five-color pink/cyan/white/violet/lime palette; the
// first port replaced it with each page's own --accent alone (this site
// had never used a color outside each theme's accent, and a site-wide
// effect is where that rule matters most). Direct follow-ups pushed back
// twice: "color full as our website is purly white", then "bit smaller and
// add more colors". It is now six colors: the page's own --accent (read
// live per page, about a quarter of the particles, so each page still
// leads with its own blue), amber (#f59e0b, already the secondary accent
// on globe.js's marker and the Black Hole's redshift tint), and four that
// are NOT established site colors: pink, emerald, violet and cyan. That is
// a deliberate, requested exception to the palette rule, the same kind of
// carve-out the Instagram and YouTube cards already are, confined to a
// decorative overlay that carries no text or meaning. All 500-weight hues,
// so each one reads on the white pages and on /life/'s dark one.
//
// Gated on prefers-reduced-motion (skipped entirely, same as every other
// ambient/decorative effect on this site) and on a real hover-capable
// pointer (hover:hover + pointer:fine) — a "trail" has no coherent
// meaning on touch, where there's no persistent pointer position to
// trail from, so touch visitors never pay for a canvas/rAF loop that
// couldn't express the effect anyway.
//
// Reported directly as "very big... lagging... big offset between
// pointer and trail" — one real root cause behind all three: the canvas
// never had an explicit CSS size (see .cursor-trail-canvas in
// tokens.css), so as a replaced element it rendered at its own
// width/height ATTRIBUTE value (the DPR-scaled backing-buffer size set
// below) instead of being stretched to the viewport by inset:0 alone —
// everything drawn in "CSS pixel" coordinates ended up displayed at
// roughly double its real size and position. Fixed in tokens.css.
// Separately, and only found while re-verifying that fix: resize() ran
// exactly once and only re-ran on a real `resize` event — the same
// "0x0 viewport at first measurement" race this project has already hit
// and fixed (via ResizeObserver) in text-fall.js/pixel-name.js, except
// this script had no self-correction at all if that race landed. loop()
// below now re-checks the real viewport size every frame instead
// (cheaper than a ResizeObserver for a plain full-viewport overlay with
// no single host element to observe, and correct regardless of whether
// any particular resize event ever fires in a given browser).
// CELL/GLOW_PX also shrunk per direct "make it small" feedback (and a
// third time, 1.5/3 to 1.2/2.5, on "bit smaller"), and MAX_PARTICLES/
// TRAIL_SPACING pulled back per "it is lagging" — on top of the sizing
// fix, which already accounted for most of both reports (a canvas
// drawing at ~2x its intended area was both the visibly oversized trail
// and roughly 4x the real pixel fill-rate cost).
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var MAX_PARTICLES = 90;
  var CELL = 1.2; // px per glyph "pixel"
  var GLOW_PX = 2.5;
  var GLOW_ALPHA = 0.35;
  var DRAG = 7; // higher = particles reach their target offset faster
  var ACCENT_SHARE = 0.25; // fraction of particles in the page's own --accent, rest split evenly across the other colors

  var TRAIL_SPACING = 32; // px of real pointer movement between trail spawns
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
  // No `resize` listener: loop() below re-checks the real viewport size
  // every frame instead, which is both faster to react and correct
  // regardless of whether this browser/navigation ever actually fires
  // one — see the file header comment.

  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // --accent is scoped to the body's own theme class (see DESIGN.md), so
  // this always reads the current page's real accent, never a guess.
  // PALETTE[0] is that accent; the rest are fixed hexes with no custom
  // property behind them (see the file header comment on which of them
  // are established site colors and which are the requested exception).
  var PALETTE = [
    hexToRgb(getComputedStyle(document.body).getPropertyValue("--accent").trim()) || [29, 78, 216],
    hexToRgb("#f59e0b"), // amber
    hexToRgb("#ec4899"), // pink
    hexToRgb("#10b981"), // emerald
    hexToRgb("#8b5cf6"), // violet
    hexToRgb("#06b6d4"), // cyan
  ];

  function makeSprite(bits, rgb) {
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
  // sprites[paletteIndex][glyphIndex] — one full glyph set baked per color.
  var sprites = PALETTE.map(function (rgb) {
    return GLYPHS.map(function (bits) {
      return makeSprite(bits, rgb);
    });
  });
  var half = Math.floor((7 * CELL) / 2);

  var parts = [];
  for (var i = 0; i < MAX_PARTICLES; i++) {
    parts.push({ alive: false, x: 0, y: 0, dx: 0, dy: 0, life: 0, age: 0, glyph: 0, pal: 0 });
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
    q.glyph = (Math.random() * GLYPHS.length) | 0;
    q.pal = Math.random() < ACCENT_SHARE ? 0 : 1 + ((Math.random() * (PALETTE.length - 1)) | 0);
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
    // Self-healing instead of relying on a `resize` event ever firing —
    // see the file header comment on why a one-shot measurement isn't
    // safe here. Two cheap reads, correct every frame regardless of
    // whether this particular browser/navigation fires resize for a
    // given size change.
    if (window.innerWidth !== W || window.innerHeight !== H) resize();
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
      var spr = sprites[q.pal][q.glyph];
      ctx.drawImage(spr, cx - half - SPRITE_PAD, cy - half - SPRITE_PAD, spr.width / dpr, spr.height / dpr);
    }
    ctx.restore();
  }
  raf = requestAnimationFrame(loop);
})();
