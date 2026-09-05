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
    // Shared by goToResume and goToLife below — whichever gesture fires
    // first wins, the other is a no-op, since only one navigation can
    // ever actually happen.
    var navigated = false;

    // Swipe left (or the .life-pull-btn click) opens /life/: grow
    // .life-wipe from the button's own current box into a full black
    // screen, then navigate once it's covered. Same "no wheel/touch
    // actually locked, just react once the gesture is clearly intentional"
    // spirit as goToResume below, just simpler — there's no WebGL half to
    // coordinate with here.
    var lifeWipe = document.querySelector(".life-wipe");
    var pullBtn = document.querySelector(".life-pull-btn");

    // Keeps .life-wipe's rest clip-path pinned to the button's real
    // on-screen box (home.css's --wipe-* custom properties), so the panel
    // genuinely starts as the button's own shape instead of a
    // separately-sized rectangle that merely starts nearby. Run on load
    // and on resize — the button's size/position both change at the
    // 640px breakpoint.
    var syncLifeWipe = function () {
      if (!lifeWipe || !pullBtn) return;
      var r = pullBtn.getBoundingClientRect();
      lifeWipe.style.setProperty("--wipe-top", r.top + "px");
      lifeWipe.style.setProperty("--wipe-right", (window.innerWidth - r.right) + "px");
      lifeWipe.style.setProperty("--wipe-bottom", (window.innerHeight - r.bottom) + "px");
      lifeWipe.style.setProperty("--wipe-left", r.left + "px");
    };
    syncLifeWipe();
    window.addEventListener("resize", syncLifeWipe, { passive: true });

    var goToLife = function () {
      if (navigated || !lifeWipe) return;
      navigated = true;
      syncLifeWipe();
      lifeWipe.classList.add("life-wipe-active");
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        window.location.href = "/life/";
      };
      lifeWipe.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, 750);
    };

    if (pullBtn) {
      pullBtn.addEventListener("click", function (e) {
        e.preventDefault();
        goToLife();
      });
    }

    var goToResume = function () {
      if (navigated) return;
      navigated = true;
      // "Zoom to happen to the yellow dot — if it's on the back side the
      // globe should spin and bring it to the front, then fill the screen
      // with that color before the next page." globe.js's
      // globeFocusMarker() does the WebGL half (rotate to the marker, then
      // grow its own point sprite) and calls back once that finishes; this
      // also bumps --globe-zoom (home.css) ~700ms in, once the spin is
      // done and the marker's own zoom is under way, so the whole element
      // balloons up to actually cover the viewport at the same moment —
      // a WebGL canvas can only render within its own small box otherwise,
      // no matter how large a single point's gl_PointSize gets. A missing
      // globeFocusMarker (script didn't load, reduced motion, an error)
      // just means an immediate navigation, same as before this
      // transition existed — nothing here is load-bearing. Safety-net
      // timeout leaves margin past the spin+zoom+white-fade's combined
      // ~1750ms (spin 700 + zoom 700 + double-rAF ~32 + .resume-wipe's own
      // 320ms fade-then-navigate below).
      // The white handoff lives here, not in globe.js: fading just
      // the globe's own canvas used to reveal the rest of .hero (headline,
      // subhead, glitter, the life pull-tab, copyright) still sitting there
      // untouched — a real bug, reported as "the landing page again for
      // half a second" between the amber zoom and the actual navigation.
      // .resume-wipe covers the whole viewport, not just the canvas, so
      // there's nothing left showing through underneath it.
      var resumeWipe = document.querySelector(".resume-wipe");
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        if (!resumeWipe) {
          window.location.href = "/resume/";
          return;
        }
        resumeWipe.classList.add("resume-wipe-active");
        setTimeout(function () {
          window.location.href = "/resume/";
        }, 320);
      };
      if (typeof window.globeFocusMarker === "function") {
        window.globeFocusMarker(finish);
        var globeEl = document.querySelector(".hero-globe");
        if (globeEl) {
          setTimeout(function () {
            globeEl.style.setProperty("--globe-zoom", "9");
          }, 700);
        }
        setTimeout(finish, 2200);
      } else {
        finish();
      }
    };

    // Whichever axis moves more decides the destination — a wheel
    // gesture that's mostly vertical shouldn't accidentally fire the
    // left-swipe just because deltaX ticked up slightly, and vice versa.
    window.addEventListener(
      "wheel",
      function (e) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          if (e.deltaX > 4) goToLife();
        } else if (e.deltaY > 4) {
          goToResume();
        }
      },
      { passive: true }
    );

    // .hero-globe has its own drag-to-rotate gesture (globe.js) — a touch
    // that starts there is someone playing with the globe, not trying to
    // leave the page, and a drag in either direction (spinning or tilting
    // it) would otherwise read as exactly one of the swipes below.
    // Ignoring touches that start on the globe was the actual fix for
    // "the globe zooms in [when I'm just trying to rotate it]" — reported
    // after testing on a real phone, not reproducible via this session's
    // own synthetic touch events (those never touch the globe itself).
    var touchStartX = null;
    var touchStartY = null;
    var touchOnGlobe = false;
    window.addEventListener(
      "touchstart",
      function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchOnGlobe = !!(e.target && e.target.closest && e.target.closest(".hero-globe"));
      },
      { passive: true }
    );
    window.addEventListener(
      "touchmove",
      function (e) {
        if (touchStartX === null || touchOnGlobe) return;
        var dx = touchStartX - e.touches[0].clientX;
        var dy = touchStartY - e.touches[0].clientY;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 48) goToLife();
        } else if (dy > 48) {
          goToResume();
        }
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
