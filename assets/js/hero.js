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

  // DEPRECATED (not deleted): auto-navigating to /resume/ once the user
  // scrolled past a sentinel. Explicit feedback: real visitors don't commit
  // to a long deliberate scroll, they either bail after a small scroll
  // attempt or use the "keep going" button — and this mechanic meant the
  // footer (right after the sentinel in home.html) was never reachable,
  // since navigation fired the moment the sentinel came into view. The
  // scroll-cue link (a real <a href="/resume/">) is now the only path from
  // the homepage into /resume/ via scrolling intent — simpler than before,
  // since it no longer needs to double as "the reduced-motion fallback for
  // the mechanic below" now that there's only one mechanism for everyone.
  // Re-enabling: restore .scroll-veil/.scroll-runway/#hero-sentinel in
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
