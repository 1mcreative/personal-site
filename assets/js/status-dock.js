// The status dock's invitation (index.md/home.css: .hero-status). The dock
// is three quiet segments, and a quiet thing gets skipped, so for a few
// seconds the segments take turns catching the eye: a soft tint and a ring
// pinging out of the one that has the spotlight, and its label (the date,
// the weather) sliding open, like the island layout it was chosen to feel
// like ("make sure it captures users attention like island does so that
// user try to hover or click there"). It stops the moment anyone touches
// the dock (hover, tap or focus), for the rest of the visit, and after two
// rounds if nobody does; under reduced motion it never starts.
(function () {
  var bar = document.querySelector(".hero-status");
  if (!bar) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var KEY = "statusDockSeen";
  try {
    if (window.sessionStorage.getItem(KEY)) return;
  } catch (e) {
    /* storage blocked: the tour just runs each load */
  }

  var order = [".hero-clock-chip", ".hero-weather-chip", ".hero-distance-chip"];
  var timer = 0;
  var step = -1;
  var rounds = 0;
  var MAX_ROUNDS = 2;
  var STEP_MS = 3600;

  function chips() {
    return order
      .map(function (s) {
        return bar.querySelector(s);
      })
      .filter(Boolean);
  }
  function clear() {
    chips().forEach(function (c) {
      c.classList.remove("is-spot");
    });
  }
  function stop(remember) {
    clearInterval(timer);
    clear();
    if (!remember) return;
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch (e) {
      /* see above */
    }
  }
  function tick() {
    // Never compete with a visitor who is already using it, and wait out the
    // game if it is open.
    if (bar.matches(":hover") || bar.querySelector(".is-open")) return;
    var list = chips();
    if (!list.length) return;
    clear();
    step++;
    if (step >= list.length) {
      step = 0;
      rounds++;
      if (rounds >= MAX_ROUNDS) return stop(false);
    }
    list[step].classList.add("is-spot");
  }
  function start() {
    timer = setInterval(tick, STEP_MS);
    tick();
  }

  ["pointerenter", "focusin", "touchstart"].forEach(function (type) {
    bar.addEventListener(type, function () {
      stop(true);
    }, { passive: true });
  });
  // The first lap waits for the intro to finish, so it happens on screen.
  if (window.heroIntroDone) {
    setTimeout(start, 1200);
  } else {
    document.addEventListener("hero:intro-done", function () {
      setTimeout(start, 1200);
    }, { once: true });
  }
})();
