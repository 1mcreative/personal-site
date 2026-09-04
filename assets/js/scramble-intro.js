// Scramble Intro — a left-to-right character scramble-then-lock reveal for
// the hero subhead, adapted from a pasted Originkit "Scramble Text"
// (GlitchCharReveal) React reference. Ported just its core "enter,
// oneLine" mechanic: every character cycles through random glitch
// characters, locking to its real character in left-to-right order across
// a fixed total duration.
//
// Cut from the reference: its hover-triggered diffusion/wave glitch
// effects, per-character flicker, multi-line/random enter modes, and
// scroll-into-view replay. The hover effects specifically are a deliberate
// cut, not a scope-trim — this is body text meant to be read, and
// re-scrambling words every time the cursor passes over them while reading
// would be a real usability regression, not a flourish. The page also has
// nothing to scroll into view on (this plays once on load, same as every
// other one-shot effect on this page).
//
// No separate glitch color either, matching the reference's own default
// (glitchColor === color there too) — the moving letters themselves are
// the whole effect.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var el = document.querySelector(".hero-sub-text");
  if (!el) return;

  var GLITCH_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var GLITCH_LOWER = "abcdefghijklmnopqrstuvwxyz";
  var TOTAL_MS = 1400;
  var GLITCH_CHANCE = 0.35; // per-frame chance a still-scrambling char changes

  function randomGlitch(ch) {
    var isLower = ch === ch.toLowerCase() && ch !== ch.toUpperCase();
    var pool = isLower ? GLITCH_LOWER : GLITCH_UPPER;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function start() {
    var text = el.textContent;
    // Clear and rebuild synchronously — no paint happens between these
    // statements, so there's no flash of empty text.
    el.textContent = "";

    var tokens = text.match(/\s+|\S+/g) || [];
    var chars = [];
    tokens.forEach(function (tok) {
      if (/^\s+$/.test(tok)) {
        el.appendChild(document.createTextNode(tok));
        return;
      }
      for (var i = 0; i < tok.length; i++) {
        var span = document.createElement("span");
        span.className = "scramble-char";
        span.textContent = randomGlitch(tok[i]);
        el.appendChild(span);
        chars.push({ span: span, real: tok[i], locked: false, lockAt: 0 });
      }
    });

    var total = Math.max(1, chars.length);
    chars.forEach(function (c, i) {
      c.lockAt = (i + 1) / total;
    });

    var startTime = null;
    function tick(now) {
      if (startTime === null) startTime = now;
      var progress = Math.min(1, (now - startTime) / TOTAL_MS);
      var allLocked = true;
      for (var i = 0; i < chars.length; i++) {
        var c = chars[i];
        if (c.locked) continue;
        if (progress >= c.lockAt) {
          c.span.textContent = c.real;
          c.locked = true;
        } else {
          allLocked = false;
          if (Math.random() < GLITCH_CHANCE) {
            c.span.textContent = randomGlitch(c.real);
          }
        }
      }
      if (!allLocked) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start, start);
  } else {
    start();
  }
})();
