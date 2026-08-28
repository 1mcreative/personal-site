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

  // Konami code — unlocks a direct portal to /life/. Not a substitute for
  // the real links (portal orb, spotlight text); just a bonus for whoever
  // still remembers the sequence. Works regardless of motion preference —
  // it's a keyboard shortcut, not an animation.
  var konami = [
    "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
    "b", "a"
  ];
  var konamiProgress = 0;
  window.addEventListener("keydown", function (e) {
    var expected = konami[konamiProgress];
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    konamiProgress = key === expected ? konamiProgress + 1 : 0;
    if (konamiProgress === konami.length) {
      window.location.href = "/life/";
    }
  });

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

  if (reduceMotion) return;

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
