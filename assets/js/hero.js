// Scrolling all the way past the hero opens the resume page. Deliberately not
// scroll-jacking: native scroll is never intercepted, this only reacts once
// the user reaches the natural bottom of the page. The portal orb reaches
// /life/ identically without any of this, so nothing here is load-bearing.
(function () {
  console.log(
    "%cLooking under the hood?",
    "font-size: 15px; font-weight: 600;"
  );
  console.log(
    "Plain Jekyll, no framework, no build step. Source: https://github.com/1mcreative/personal-site"
  );

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Blobs drift a few px toward the cursor — purely decorative, skipped
  // entirely under reduced motion.
  if (!reduceMotion) {
    var blobs = document.querySelector(".hero-blobs");
    if (blobs) {
      window.addEventListener(
        "mousemove",
        function (e) {
          var mx = ((e.clientX / window.innerWidth) - 0.5) * 24;
          var my = ((e.clientY / window.innerHeight) - 0.5) * 24;
          blobs.style.setProperty("--mx", mx.toFixed(1) + "px");
          blobs.style.setProperty("--my", my.toFixed(1) + "px");
        },
        { passive: true }
      );
    }
  }

  // Spotlight text: only worth the cursor-tracking flashlight effect on a
  // real hover-capable pointer with motion allowed. Everything else just
  // gets the plain readable link underneath (see home.css) — never
  // actually hidden, only ever enhanced.
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    var spotlight = document.querySelector(".spotlight-text");
    if (spotlight) {
      spotlight.classList.add("spotlight-ready");
      spotlight.addEventListener(
        "pointermove",
        function (e) {
          var rect = spotlight.getBoundingClientRect();
          spotlight.style.setProperty("--spot-x", (e.clientX - rect.left) + "px");
          spotlight.style.setProperty("--spot-y", (e.clientY - rect.top) + "px");
        },
        { passive: true }
      );
    }
  }

  // The homepage no longer scrolls at all (.theme-home has overflow:hidden —
  // see home.css) — there's nothing below the hero to reveal. Instead, any
  // wheel/touch scroll *gesture* is read as "take me to the resume" and
  // navigates there directly, letting the sitewide view-transition wipe
  // (tokens.css) play exactly as it would from a normal link click. This
  // replaces the deprecated sentinel/IntersectionObserver mechanic below —
  // same intent (a scroll gesture opens /resume/), but since the page
  // physically can't scroll anymore there's no sentinel to watch for.
  // Downward gestures only (deltaY > 0 / swipe-up), so a user idly rocking
  // a trackpad or trying to scroll back up doesn't get launched into a
  // navigation. The always-present .scroll-cue link is still the fallback
  // for reduced-motion, keyboard, and no-JS visitors.
  if (!reduceMotion) {
    var navigated = false;
    var goToResume = function () {
      if (navigated) return;
      navigated = true;
      // "Zoom into globe and than change to resume page" — a quick,
      // dramatic scale-up (see .hero-globe's --globe-zoom transition in
      // home.css) reading as diving into the sphere right as the page
      // changes. No opacity fade: .hero's own overflow:hidden clips the
      // blown-up sphere to the viewport, so growing it fills the screen
      // with dots rushing past rather than just vanishing — the actual
      // page navigation is the hard cut, same as the rest of this site's
      // transitions never needed a fade-to-black first. Purely CSS-driven
      // and fire-and-forget: it doesn't gate navigation the way
      // pixel-name's explode does below, since a missing .hero-globe
      // (e.g. reduced motion never rendered one) is just a no-op, not a
      // broken transition.
      var globe = document.querySelector(".hero-globe");
      if (globe) {
        globe.style.setProperty("--globe-zoom", "9");
      }
      // pixel-name.js's explode is a loading-screen flourish, not a
      // dependency — if it never formed (still loading, reduced motion,
      // an error) the function is just never defined, and this falls
      // straight through to an immediate navigation like before. The
      // setTimeout is a safety net in case the callback itself never
      // fires for some reason: the nav must never depend on a single
      // JS animation completing.
      if (typeof window.pixelNameExplode === "function") {
        var finished = false;
        var finish = function () {
          if (finished) return;
          finished = true;
          window.location.href = "/resume/";
        };
        window.pixelNameExplode(finish);
        setTimeout(finish, 900);
      } else {
        window.location.href = "/resume/";
      }
    };

    window.addEventListener(
      "wheel",
      function (e) {
        if (e.deltaY > 4) goToResume();
      },
      { passive: true }
    );

    // .hero-globe has its own drag-to-rotate gesture (globe.js) — a touch
    // that starts there is someone playing with the globe, not trying to
    // leave the page, and an upward drag (rotating it) would otherwise
    // read as exactly the swipe-up this listener is watching for. Ignoring
    // touches that start on the globe was the actual fix for "the globe
    // zooms in [when I'm just trying to rotate it]" — reported after
    // testing on a real phone, not reproducible via this session's own
    // synthetic touch events (those never touch the globe itself).
    var touchStartY = null;
    var touchOnGlobe = false;
    window.addEventListener(
      "touchstart",
      function (e) {
        touchStartY = e.touches[0].clientY;
        touchOnGlobe = !!(e.target && e.target.closest && e.target.closest(".hero-globe"));
      },
      { passive: true }
    );
    window.addEventListener(
      "touchmove",
      function (e) {
        if (touchStartY === null || touchOnGlobe) return;
        var dy = touchStartY - e.touches[0].clientY;
        if (dy > 48) goToResume();
      },
      { passive: true }
    );
  }

  // DEPRECATED (not deleted): auto-navigating to /resume/ once the user
  // scrolled past a sentinel. Explicit feedback: real visitors don't commit
  // to a long deliberate scroll, they either bail after a small scroll
  // attempt or use the "keep going" button — and this mechanic meant the
  // footer (right after the sentinel in home.html) was never reachable,
  // since navigation fired the moment the sentinel came into view. Superseded
  // above by a direct wheel/touch listener now that the page can't scroll at
  // all. Re-enabling: restore .scroll-veil/.scroll-runway/#hero-sentinel in
  // index.md and remove this return.
  return;

  var sentinel = document.getElementById("hero-sentinel");
  if (!sentinel || !("IntersectionObserver" in window)) return;

  // The color wash builds up as the user scrolls toward the sentinel, well
  // before it actually fires the navigation below.
  var root = document.documentElement;
  var updateVeil = function () {
    var target = sentinel.getBoundingClientRect().top + window.scrollY;
    var progress = Math.min(1, Math.max(0, window.scrollY / Math.max(1, target - window.innerHeight)));
    root.style.setProperty("--scroll-progress", progress.toFixed(3));
  };
  window.addEventListener("scroll", updateVeil, { passive: true });
  updateVeil();

  var hasScrolled = false;
  window.addEventListener(
    "scroll",
    function onScroll() {
      hasScrolled = true;
      window.removeEventListener("scroll", onScroll);
    },
    { passive: true, once: true }
  );

  var fired = false;
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && hasScrolled && !fired) {
          fired = true;
          observer.disconnect();
          window.location.href = "/resume/";
        }
      });
    },
    { threshold: 1 }
  );

  observer.observe(sentinel);
})();
