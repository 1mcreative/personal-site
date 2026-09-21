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

  // .hero-clock-time (index.md, styled in home.css as one of .hero-status's
  // chips): the visitor's own local time, read straight off their browser —
  // Intl/Date already know the system time zone with zero permission
  // prompt, nothing sent anywhere. Locale left as `undefined` (the
  // browser's own default) so 12h-vs-24h and AM/PM formatting matches
  // whatever the visitor is already used to, rather than a fixed choice.
  // Not gated on reduceMotion below: updating a line of text once a
  // minute isn't motion, and a visitor who wants less animation has no
  // reason to also want a frozen, slowly-wrong clock.
  var clockEl = document.querySelector(".hero-clock-time");
  if (clockEl && window.Intl && Intl.DateTimeFormat) {
    var timeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    var updateClock = function () {
      clockEl.textContent = timeFormatter.format(new Date());
    };
    updateClock();
    // No seconds shown, so once a minute is plenty — aligned to the next
    // real minute boundary first (rather than a plain setInterval from
    // page-load instant) so it can't slowly drift out of sync with the
    // visitor's own system clock over a long visit.
    var msToNextMinute = 60000 - (Date.now() % 60000);
    setTimeout(function () {
      updateClock();
      setInterval(updateClock, 60000);
    }, msToNextMinute);
  }

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
    // .life-wipe from a small circle centered on the button into one big
    // enough to cover the whole screen, then navigate. Same "no
    // wheel/touch actually locked, just react once the gesture is
    // clearly intentional" spirit as goToResume below, just simpler —
    // there's no WebGL half to coordinate with here.
    var lifeWipe = document.querySelector(".life-wipe");
    var pullBtn = document.querySelector(".life-pull-btn");

    // Keeps .life-wipe's rest clip-path pinned to the button's real
    // on-screen center, so the circle genuinely starts as the dot itself
    // rather than a separately-placed shape that merely starts nearby.
    // Run on load and on resize — the button's position changes at the
    // 640px breakpoint. No-ops once a navigation is already under way, so
    // a stray resize event mid-transition can't overwrite the "grow to
    // cover everything" target goToLife() is about to set.
    var syncLifeWipe = function () {
      if (navigated || !lifeWipe || !pullBtn) return;
      var r = pullBtn.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var restR = Math.min(r.width, r.height) / 2;
      lifeWipe.style.clipPath = "circle(" + restR + "px at " + cx + "px " + cy + "px)";
    };
    syncLifeWipe();
    window.addEventListener("resize", syncLifeWipe, { passive: true });

    var goToLife = function () {
      if (navigated || !lifeWipe || !pullBtn) return;
      navigated = true;
      syncLifeWipe();
      lifeWipe.classList.add("life-wipe-active");
      // The circle's center never moves, so growing it to cover every
      // pixel just needs one number: the distance from that center to
      // whichever corner is farthest away (Pythagoras on the larger of
      // the two horizontal gaps and the larger of the two vertical
      // gaps) — same idea as clip-path's own "farthest-corner" keyword,
      // computed by hand since a transition needs an actual number on
      // both ends, not a keyword, to interpolate between.
      var r = pullBtn.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var dx = Math.max(cx, window.innerWidth - cx);
      var dy = Math.max(cy, window.innerHeight - cy);
      var farthest = Math.sqrt(dx * dx + dy * dy);
      lifeWipe.style.clipPath = "circle(" + farthest + "px at " + cx + "px " + cy + "px)";
      setTimeout(function () {
        window.location.href = "/life/";
      }, 700);
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
            // Was a flat "9" — enough to cover a desktop viewport at the
            // globe sizes this was tuned against, but not guaranteed at
            // every combination of viewport size and the globe's own
            // responsive size (min(66vw, 820px, ...) on desktop,
            // min(94vw, 430px) on mobile) — reported directly as "make
            // sure orange covers whole page... display width should not
            // matter." Computed fresh from real geometry instead, same
            // "distance to the farthest screen corner" idea .life-wipe
            // already uses for its own circle-expand transition: half the
            // scaled element's width needs to reach at least that far.
            // Measured before any zoom is applied, since --globe-zoom's
            // transform-origin is the element's own (still-centered) box.
            var r = globeEl.getBoundingClientRect();
            var cx = r.left + r.width / 2;
            var cy = r.top + r.height / 2;
            var dx = Math.max(cx, window.innerWidth - cx);
            var dy = Math.max(cy, window.innerHeight - cy);
            var farthest = Math.sqrt(dx * dx + dy * dy);
            // 1.08x margin: the formula above already guarantees coverage
            // exactly to the corner (and a squared-off element clears a
            // circle of that radius with room to spare — see globe.js's
            // own comment on the fill quad's ±4 reach), this just buys a
            // little more room against any remaining edge-pixel rounding.
            var zoom = (farthest / (r.width / 2)) * 1.08;
            globeEl.style.setProperty("--globe-zoom", zoom.toFixed(2));
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
    // Threshold raised from 4 to 40: at 4, a single light trackpad nudge
    // (someone just checking "does this page scroll," completely normal
    // on every other web page) was enough to launch a full multi-second
    // transition with zero warning — flagged directly by a UX audit as
    // triggerable from ordinary exploration, not just deliberate intent.
    // 40 still fires readily on a genuine scroll gesture (a standard
    // mouse-wheel notch is generally well over 100) while filtering out
    // the smallest incidental ticks.
    window.addEventListener(
      "wheel",
      function (e) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          if (e.deltaX > 40) goToLife();
        } else if (e.deltaY > 40) {
          goToResume();
        }
      },
      { passive: true }
    );

    // .hero-globe used to have its own touch-drag-to-rotate (globe.js),
    // which meant a touch starting there had to be excluded here or it'd
    // fire a swipe navigation underneath the drag. That exclusion became
    // the bug itself, reported as "while scrolling down sometimes user
    // interacts with globe": a swipe that happened to start over the
    // globe (a large, centered target) got swallowed with no navigation
    // at all. globe.js now ignores touch input entirely — mobile just
    // auto-rotates, see its own onPointerDown — so every touch on the
    // hero, globe included, is free to be read as a plain swipe here.
    var touchStartX = null;
    var touchStartY = null;
    window.addEventListener(
      "touchstart",
      function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );
    // Threshold raised from 48 to 80 for the same reason as the wheel
    // check above: an ordinary, non-committal flick (checking whether
    // the page scrolls, or just an idle touch while reading) can easily
    // cover 48px without the visitor meaning to navigate anywhere. 80px
    // is close to a real swipe's typical travel distance, comfortably
    // past an idle brush.
    window.addEventListener(
      "touchmove",
      function (e) {
        if (touchStartX === null) return;
        var dx = touchStartX - e.touches[0].clientX;
        var dy = touchStartY - e.touches[0].clientY;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 80) goToLife();
        } else if (dy > 80) {
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
