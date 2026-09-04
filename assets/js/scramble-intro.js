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
// would be a real usability regression, not a flourish.
//
// No separate glitch color either, matching the reference's own default
// (glitchColor === color there too) — the moving letters themselves are
// the whole effect.
//
// Sequencing: this used to start itself on document.fonts.ready. Per an
// explicit request to sequence the whole homepage intro — the name alone
// first, full-screen, then everything else together — this now waits for
// intro-sequence.js to call window.scrambleIntroStart() once its splash
// fades away, so the scramble visibly plays as part of "phase 2" instead
// of having already finished underneath the splash. A generous fallback
// timer still fires on its own regardless, guarded so it's a no-op if the
// real trigger already ran: this effect must never depend on another
// script actually calling it, the same "never load-bearing" rule every
// cross-script handoff on this page already follows.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var el = document.querySelector(".hero-sub-text");
  if (!el) return;

  var started = false;

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
    if (started) return;
    started = true;

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

  window.scrambleIntroStart = start;

  // Fallback: if intro-sequence.js's splash never got here (missing
  // markup, a script error, or it's simply not loaded) this still runs on
  // its own a couple seconds in — comfortably past the splash's own
  // ~1.6s sequence in the normal case, so the fallback never fires
  // alongside a real trigger; `started` makes double-firing harmless
  // either way.
  var FALLBACK_MS = 2600;
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      setTimeout(start, FALLBACK_MS);
    });
  } else {
    setTimeout(start, FALLBACK_MS);
  }
})();
