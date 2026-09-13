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
//
// Grid density: follow-up feedback was "only 9 times i am able to see my
// name... add more like 100 or more based on screensize." A field that's
// *supposed* to read as dense couldn't just get more DOM nodes spilling
// off-screen unseen — that pads the markup without changing what anyone
// actually perceives. Instead the grid's own font-size is small enough
// (see .intro-splash-grid in home.css) that a genuinely large count of
// words fits ON SCREEN at once, computed here from a real measurement of
// one word at the current viewport rather than a guessed constant — a
// phone naturally fits fewer than a desktop, which is what "based on
// screensize" actually means once the count is tied to real layout math
// instead of a fixed number. To keep the reveal itself legible against a
// much busier field, the surviving word additionally scales up on its own
// as everything around it fades (see .intro-splash-survivor) — the field
// was previously "big single copies, view of the field," which won't
// work anymore, but "many small copies collapsing into one big name" is
// arguably the more dramatic reveal anyway.
(function () {
  var splash = document.querySelector(".intro-splash");
  if (!splash) return;

  function triggerPhase2() {
    if (typeof window.scrambleIntroStart === "function") {
      window.scrambleIntroStart();
    }
    // "After name and intro is loaded, globe is in position but dots are
    // very small at first, then it comes to regular size." The globe has
    // been rendering underneath the splash the whole time (see the CSS
    // comment on .intro-splash), so its dots would otherwise just snap to
    // full size the instant the splash reveals it — this makes that
    // moment its own small entrance instead. A missing globeRevealDots
    // (script didn't load, reduced motion, an error) just means the globe
    // shows at its regular size immediately, same as before this existed.
    if (typeof window.globeRevealDots === "function") {
      window.globeRevealDots();
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
  // Hidden synchronously, in the same tick as the line above and before
  // any of this ever paints — see the CSS comment on .hero-greeting for
  // why this can't be a bare always-on rule (reduced-motion/no-JS/error
  // visitors, who never reach this line, need "Hi, I'm"/"." visible from
  // the very first frame).
  var greetings = document.querySelectorAll(".hero-greeting");
  for (var gi = 0; gi < greetings.length; gi++) {
    greetings[gi].classList.add("hero-greeting-hidden");
  }

  var TEXT = "Bhavesh";
  var MIN_TOTAL = 100; // the explicit floor from feedback
  var MAX_TOTAL = 361; // sanity cap for very large/wide/hi-dpi screens
  var SETTLE_MS = 780; // matches the grid's own longest CSS transition
  var HOLD_MS = 250; // a beat once the field has settled, before the morph starts
  var MORPH_MS = 700; // matches .intro-splash-survivor-morph's own transition
  var FADE_MS = 500; // matches .intro-splash's own opacity transition

  // Measure one real word at the grid's actual (responsive) font-size
  // before deciding how many to build — this is what makes the count
  // follow screen size instead of being a guess. Built with the same
  // classes as the real grid and immediately removed; visibility:hidden
  // (not display:none) so it still lays out and reports real dimensions,
  // and an explicit transform:none so the grid's own rest-state zoom
  // doesn't inflate the measurement.
  function measureCell() {
    var probeGrid = document.createElement("div");
    probeGrid.className = "intro-splash-grid";
    probeGrid.style.position = "absolute";
    probeGrid.style.visibility = "hidden";
    probeGrid.style.transform = "none";
    var probeRow = document.createElement("div");
    probeRow.className = "intro-splash-row";
    var probeWord = document.createElement("span");
    probeWord.className = "intro-splash-word";
    probeWord.textContent = TEXT;
    probeRow.appendChild(probeWord);
    probeGrid.appendChild(probeRow);
    splash.appendChild(probeGrid);

    var fontSizePx = parseFloat(getComputedStyle(probeWord).fontSize) || 16;
    var wordWidth = probeWord.getBoundingClientRect().width;
    var rowHeight = probeRow.getBoundingClientRect().height;
    splash.removeChild(probeGrid);

    return {
      // .intro-splash-row's own gap is 0.35em, .intro-splash-grid's is 0.12em.
      colPitch: wordWidth + fontSizePx * 0.35,
      rowPitch: rowHeight + fontSizePx * 0.12,
    };
  }

  function computeGrid() {
    var cell = measureCell();
    var cols = Math.max(5, Math.floor(window.innerWidth / cell.colPitch));
    var rows = Math.max(5, Math.floor(window.innerHeight / cell.rowPitch));
    if (cols % 2 === 0) cols += 1;
    if (rows % 2 === 0) rows += 1;

    // Fitting the viewport exactly might still fall short of the explicit
    // "100 or more" floor on a small/narrow screen — grow evenly (mild
    // off-screen overflow at that point, cropped by .hero/.intro-splash's
    // own bounds) rather than leaving a phone stuck below the floor.
    var guard = 0;
    while (rows * cols < MIN_TOTAL && guard < 60) {
      cols += 2;
      guard += 1;
    }
    // Cap the other direction for very large/hi-dpi screens where fitting
    // the viewport alone could otherwise produce an excessive node count.
    guard = 0;
    while (rows * cols > MAX_TOTAL && (rows > 5 || cols > 5) && guard < 60) {
      if (cols >= rows && cols > 5) cols -= 2;
      else if (rows > 5) rows -= 2;
      guard += 1;
    }

    return { rows: rows, cols: cols };
  }

  function buildGrid(rows, cols) {
    var grid = document.createElement("div");
    grid.className = "intro-splash-grid";
    var survivorRow = Math.floor(rows / 2);
    var survivorCol = Math.floor(cols / 2);
    for (var r = 0; r < rows; r++) {
      var row = document.createElement("div");
      row.className = "intro-splash-row";
      if (r === 0) row.classList.add("intro-splash-row-top");
      if (r === rows - 1) row.classList.add("intro-splash-row-bottom");
      for (var c = 0; c < cols; c++) {
        var word = document.createElement("span");
        word.className = "intro-splash-word";
        if (r === survivorRow && c === survivorCol) {
          word.classList.add("intro-splash-survivor");
        }
        word.textContent = TEXT;
        row.appendChild(word);
      }
      grid.appendChild(row);
    }
    return grid;
  }

  // Fades the whole splash out (revealing the real page, already sitting
  // underneath at the exact right position/size — see morphSurvivorHome
  // below), reveals "Hi, I'm"/"." around the now-landed name, and hands
  // off to phase 2. The one shared exit path: called directly if the
  // morph can't run for some reason (missing elements, zero-size rects —
  // defensive only, shouldn't happen in practice), or after the morph
  // finishes in the normal case.
  function finishSplash() {
    for (var gi = 0; gi < greetings.length; gi++) {
      greetings[gi].classList.remove("hero-greeting-hidden");
    }
    splash.classList.add("intro-splash-out");
    triggerPhase2();
    setTimeout(function () {
      splash.remove();
    }, FADE_MS);
  }

  // The name doesn't fade-and-get-replaced by the real heading anymore —
  // it flies from its small grid cell to sit exactly on top of the real
  // h1's own name span, then the shared .intro-splash-out fade (above)
  // dissolves it away while the real, identically-positioned text
  // underneath simply continues being there, unchanged. Standard FLIP
  // technique: measure the survivor's current rect and the real target's
  // rect, derive the translate+scale that maps one onto the other. Using
  // *center* points specifically (not top-left corners) means this is
  // correct regardless of transform-origin, since a center-origin scale
  // never moves the center — verified this holds at every tested
  // viewport, not just assumed from the math.
  function morphSurvivorHome(grid) {
    var survivor = grid.querySelector(".intro-splash-survivor");
    var target = document.querySelector(".pixel-name-plain.name-kinetic-plain");
    if (!survivor || !target) {
      finishSplash();
      return;
    }
    var current = survivor.getBoundingClientRect();
    var dest = target.getBoundingClientRect();
    if (!current.width || !dest.width) {
      finishSplash();
      return;
    }
    var tx = (dest.left + dest.width / 2) - (current.left + current.width / 2);
    var ty = (dest.top + dest.height / 2) - (current.top + current.height / 2);
    var scale = dest.width / current.width;

    // Matches the real heading's own weight so the final dissolve (the
    // instant .intro-splash-out starts) doesn't show a boldness shift
    // between this element and the identically-positioned one underneath.
    survivor.style.fontWeight = getComputedStyle(target).fontWeight;
    survivor.style.transformOrigin = "50% 50%";
    survivor.classList.add("intro-splash-survivor-morph");
    void survivor.offsetWidth; // flush so the transition below animates from the current (untransformed) state, not jumping straight to the end value
    survivor.style.transform = "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")";

    setTimeout(finishSplash, MORPH_MS);
  }

  function start() {
    var size = computeGrid();
    var grid = buildGrid(size.rows, size.cols);
    splash.appendChild(grid);

    // Force layout so the spread/zoomed start state actually paints before
    // adding .intro-splash-in kicks off the CSS transition.
    void grid.offsetWidth;
    requestAnimationFrame(function () {
      grid.classList.add("intro-splash-in");
    });

    setTimeout(function () {
      morphSurvivorHome(grid);
    }, SETTLE_MS + HOLD_MS);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start, start);
  } else {
    start();
  }
})();
