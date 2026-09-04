// Intro Sequence — orchestrates the homepage's load-in per explicit
// sequencing request: "Bhavesh" appears alone, full-screen, first (the
// same grid-spread-then-survivor "Appear Text" mechanic name-kinetic.js
// used inline, now supersizing it into a splash); once that settles the
// splash fades away and everything else — the globe, glitter, and the
// subhead's own Scramble Text reveal — is revealed together. Those other
// pieces aren't actually delayed or coordinated by this script at all:
// they've been running/rendering underneath the opaque splash the entire
// time (see .intro-splash in home.css), so "reveal together" is just this
// splash's own fade-out, not a scheduling change to globe.js/glitter.js.
// The one thing this DOES coordinate is scramble-intro.js, which no
// longer starts on its own — see the handoff at the bottom.
(function () {
  var splash = document.querySelector(".intro-splash");
  if (!splash) return;

  function triggerPhase2() {
    if (typeof window.scrambleIntroStart === "function") {
      window.scrambleIntroStart();
    }
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // No splash at all — the real page (already fully rendered underneath,
    // since none of its markup depends on this splash existing) is what a
    // reduced-motion visitor sees immediately. Still hand off to phase 2
    // rather than leaving scramble-intro.js waiting on a trigger that would
    // otherwise never come — its own reduced-motion check is what actually
    // decides whether it does anything with that, not this script's call.
    triggerPhase2();
    return;
  }

  splash.classList.add("intro-splash-active");

  var TEXT = "Bhavesh";
  var ROWS = 3;
  var COLS = 3;
  var SURVIVOR_ROW = 1;
  var SURVIVOR_COL = 1;
  var SETTLE_MS = 780; // matches the grid's own longest CSS transition
  var HOLD_MS = 300; // beat of stillness once the name has formed
  var FADE_MS = 500; // matches .intro-splash's own opacity transition

  function buildGrid() {
    var grid = document.createElement("div");
    grid.className = "intro-splash-grid";
    for (var r = 0; r < ROWS; r++) {
      var row = document.createElement("div");
      row.className = "intro-splash-row";
      if (r === 0) row.classList.add("intro-splash-row-top");
      if (r === ROWS - 1) row.classList.add("intro-splash-row-bottom");
      for (var c = 0; c < COLS; c++) {
        var word = document.createElement("span");
        word.className = "intro-splash-word";
        if (r === SURVIVOR_ROW && c === SURVIVOR_COL) {
          word.classList.add("intro-splash-survivor");
        }
        word.textContent = TEXT;
        row.appendChild(word);
      }
      grid.appendChild(row);
    }
    return grid;
  }

  function start() {
    var grid = buildGrid();
    splash.appendChild(grid);

    // Force layout so the spread/zoomed start state actually paints before
    // adding .intro-splash-in kicks off the CSS transition.
    void grid.offsetWidth;
    requestAnimationFrame(function () {
      grid.classList.add("intro-splash-in");
    });

    setTimeout(function () {
      splash.classList.add("intro-splash-out");
      triggerPhase2();
      setTimeout(function () {
        splash.remove();
      }, FADE_MS);
    }, SETTLE_MS + HOLD_MS);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start, start);
  } else {
    start();
  }
})();
