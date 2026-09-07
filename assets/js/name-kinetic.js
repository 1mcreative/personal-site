// Name Kinetic — a small one-shot "appear" flourish for the word "Bhavesh"
// in the hero heading, adapted from a pasted Originkit "Appear Text" /
// KineticTextGrid React+Framer-Motion reference: a grid of repeated copies
// spreads out and zooms in, then all but one fade away, leaving the
// survivor to settle exactly where the plain text already sits. Plain CSS
// transitions instead of Framer Motion's keyframe timeline, and the
// reference's infinite marquee loop is cut entirely — this plays once on
// load then hands off to plain, simple text permanently, matching the
// "make it simple" request for the steady state; only the entrance keeps
// some personality.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var wrap = document.querySelector(".name-kinetic-wrap");
  var plain = document.querySelector(".name-kinetic-plain");
  if (!wrap || !plain) return;

  var TEXT = plain.textContent;
  var ROWS = 3;
  var COLS = 3;
  var SURVIVOR_ROW = 1;
  var SURVIVOR_COL = 1;
  var CLEANUP_MS = 780;

  function buildGrid() {
    var grid = document.createElement("div");
    grid.className = "name-kinetic-grid";
    grid.setAttribute("aria-hidden", "true");
    for (var r = 0; r < ROWS; r++) {
      var row = document.createElement("div");
      row.className = "name-kinetic-row";
      if (r === 0) row.classList.add("name-kinetic-row-top");
      if (r === ROWS - 1) row.classList.add("name-kinetic-row-bottom");
      for (var c = 0; c < COLS; c++) {
        var word = document.createElement("span");
        word.className = "name-kinetic-word";
        if (r === SURVIVOR_ROW && c === SURVIVOR_COL) {
          word.classList.add("name-kinetic-survivor");
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
    wrap.appendChild(grid);
    plain.classList.add("name-kinetic-hidden");

    // Force layout so the spread/zoomed start state actually paints before
    // adding .name-kinetic-in kicks off the CSS transition.
    void grid.offsetWidth;
    requestAnimationFrame(function () {
      grid.classList.add("name-kinetic-in");
    });

    // Fixed timeout rather than transitionend: several elements (the grid,
    // each row, every word) transition independently with different
    // durations/delays, and transitionend bubbles from all of them — the
    // first one to finish isn't the same as the whole sequence finishing.
    setTimeout(function () {
      grid.remove();
      plain.classList.remove("name-kinetic-hidden");
    }, CLEANUP_MS);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start, start);
  } else {
    start();
  }
})();
