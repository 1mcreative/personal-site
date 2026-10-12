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

  // Shared with weather.js. The status tiles' characters say hello once
  // the intro splash is gone (`delay` ms after it, so two characters take
  // turns instead of waving together) and again when the pointer comes
  // into their tile, at most every nine seconds, never on a loop. Adds
  // .is-hello to `target` for two seconds; home.css plays the wave off it.
  window.heroGreet = function (chip, target, delay) {
    if (reduceMotion || !chip || !target) return;
    var last = 0;
    var hello = function () {
      if (Date.now() - last < 9000) return;
      last = Date.now();
      target.classList.remove("is-hello");
      void target.getBoundingClientRect();
      target.classList.add("is-hello");
      setTimeout(function () {
        target.classList.remove("is-hello");
      }, 2100);
    };
    chip.addEventListener("pointerenter", hello);
    if (window.heroIntroDone) {
      setTimeout(hello, delay);
    } else {
      document.addEventListener("hero:intro-done", function () {
        setTimeout(hello, delay);
      }, { once: true });
    }
  };

  // .hero-clock-time (index.md, styled in home.css as one of .hero-status's
  // tiles): the visitor's own local time, read straight off their browser —
  // Intl/Date already know the system time zone with zero permission
  // prompt, nothing sent anywhere. Locale left as `undefined` (the
  // browser's own default) so 12h-vs-24h and AM/PM formatting matches
  // whatever the visitor is already used to, rather than a fixed choice.
  // Not gated on reduceMotion below: updating a line of text once a
  // minute isn't motion, and a visitor who wants less animation has no
  // reason to also want a frozen, slowly-wrong clock.
  var clockEl = document.querySelector(".hero-clock-time");
  var clockDateEl = document.querySelector(".hero-clock-date");
  var clockChip = document.querySelector(".hero-clock-chip");
  if (clockEl && window.Intl && Intl.DateTimeFormat) {
    var timeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    var dateFormatter = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    // The clock character (_includes/clock-mascot.svg) has no hands over
    // its face; the time is read off the dial instead. The white dot on the
    // ticks is the hour and the white bead on the rim is the minute, both
    // driven here through --r. The angles keep counting past 360 (the turn
    // counters below) instead of wrapping, since the markers ease between
    // values with a CSS transition and a wrap from 354deg back to 0 would
    // spin the minute bead almost a full circle backwards at every hour.
    // Like the digits they update under reduced motion too (home.css just
    // drops the easing there).
    var mascot = document.querySelector(".hero-clock-mascot");
    var hourHand = mascot && mascot.querySelector('[data-hand="h"]');
    var minHand = mascot && mascot.querySelector('[data-hand="m"]');
    var lastMin = -1;
    var lastHour = -1;
    var minTurns = 0;
    var hourTurns = 0;
    var dingTimer = 0;
    var setHands = function (now) {
      if (!hourHand) return;
      var m = now.getMinutes();
      var h = now.getHours() % 12;
      if (m < lastMin) minTurns++;
      if (h < lastHour) hourTurns++;
      lastMin = m;
      lastHour = h;
      minHand.style.setProperty("--r", m * 6 + minTurns * 360 + "deg");
      hourHand.style.setProperty("--r", (h + m / 60) * 30 + hourTurns * 360 + "deg");
    };
    var updateClock = function (ding) {
      var now = new Date();
      clockEl.textContent = timeFormatter.format(now);
      if (clockDateEl) clockDateEl.textContent = dateFormatter.format(now);
      setHands(now);
      // A hop and a sparkle on each new minute (not on load, when the
      // page is still behind the intro splash anyway).
      if (ding === true && mascot && !reduceMotion) {
        mascot.classList.remove("is-ding");
        void mascot.getBoundingClientRect();
        mascot.classList.add("is-ding");
        clearTimeout(dingTimer);
        dingTimer = setTimeout(function () {
          mascot.classList.remove("is-ding");
        }, 950);
      }
    };
    updateClock();
    // The brown dot on the rim is the second hand: a 60-step CSS loop,
    // started here at the current second so it ticks with the visitor's own
    // clock.
    var orbit = mascot && mascot.querySelector(".wxk-orbit");
    if (orbit) {
      var t0 = new Date();
      orbit.style.animationDelay = "-" + (t0.getSeconds() + t0.getMilliseconds() / 1000) + "s";
    }
    // No seconds shown, so once a minute is plenty — aligned to the next
    // real minute boundary first (rather than a plain setInterval from
    // page-load instant) so it can't slowly drift out of sync with the
    // visitor's own system clock over a long visit.
    var msToNextMinute = 60000 - (Date.now() % 60000);
    setTimeout(function () {
      updateClock(true);
      setInterval(function () {
        updateClock(true);
      }, 60000);
    }, msToNextMinute);

    // The popover (.hero-clock-pop): the time to "the nanosecond", and how
    // long since the Big Bang. Only runs while the tile is hovered or open.
    // The first six digits after the point are real (a browser's clock is
    // only good to about 0.1 ms; some blur it further on purpose), the last
    // five are random and are labelled as such on the popover. The universe
    // is 13.787 billion years old give or take 20 million (Planck 2018), so
    // the "and N days" tail is the current year's progress, a gag.
    var nsEl = clockChip && clockChip.querySelector("[data-ns]");
    var uniRestEl = clockChip && clockChip.querySelector("[data-uni-rest]");
    var pad = function (n, w) {
      n = String(n);
      while (n.length < w) n = "0" + n;
      return n;
    };
    var drawPop = function () {
      var ms = performance.timeOrigin + performance.now();
      var d = new Date(ms);
      var clock = pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2) + ":" + pad(d.getSeconds(), 2);
      if (nsEl) {
        nsEl.textContent = clock + "." + pad(Math.floor((ms % 1000) * 10), 4) + pad(Math.floor(Math.random() * 1e5), 5);
      }
      if (uniRestEl) {
        var days = Math.round(
          (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 864e5
        );
        uniRestEl.textContent = "and " + days + " days, " + clock + "." + pad(Math.floor(ms % 1000), 3);
      }
    };
    var tickRaf = 0;
    var lastTick = 0;
    var tick = function (ts) {
      tickRaf = 0;
      if (!clockChip.matches(":hover, .is-open")) return;
      // Reduced motion: a once-a-second snapshot instead of a blur of digits.
      if (!reduceMotion || ts - lastTick >= 1000) {
        lastTick = ts;
        drawPop();
      }
      tickRaf = requestAnimationFrame(tick);
    };
    var startTick = function () {
      if (!tickRaf) tickRaf = requestAnimationFrame(tick);
    };
    if (clockChip && (nsEl || uniRestEl)) {
      drawPop();
      clockChip.addEventListener("pointerenter", startTick);
    }

    // Touch has no hover, so a tap opens a tile's popover (and a tap
    // anywhere else closes it). Pointer devices get the CSS :hover instead.
    if (window.matchMedia("(hover: none)").matches) {
      document.addEventListener("click", function (e) {
        var chip = e.target.closest && e.target.closest(".hero-status-chip");
        var open = document.querySelectorAll(".hero-status-chip.is-open");
        for (var i = 0; i < open.length; i++) {
          if (open[i] !== chip) open[i].classList.remove("is-open");
        }
        if (chip && chip.querySelector(".hero-pop")) {
          chip.classList.toggle("is-open");
          if (chip === clockChip) startTick();
        }
      });
    }

    window.heroGreet(clockChip, mascot, 900);

    // The character's eyes follow the pointer, easing in as it gets within
    // ~90px so a far-away cursor doesn't pin them to the edge. --ex/--ey
    // are in the SVG's own units (the pupils have about 2.6 of room
    // sideways). Once the pointer has stayed close (170px, released at
    // 230px so it doesn't flicker on the boundary) she goes .is-watching:
    // lids a notch lower, smirk instead of smile, fingers tapping. Needs a
    // real hover-capable pointer and motion allowed; everyone else just
    // gets the blink.
    if (mascot && !reduceMotion && window.matchMedia("(hover: hover)").matches) {
      var eyeRaf = 0;
      var px = 0;
      var py = 0;
      var aim = function () {
        eyeRaf = 0;
        var r = mascot.getBoundingClientRect();
        var dx = px - (r.left + r.width / 2);
        var dy = py - (r.top + r.height * 0.37);
        var d = Math.hypot(dx, dy) || 1;
        var k = Math.min(d / 90, 1);
        mascot.style.setProperty("--ex", ((dx / d) * k * 2.6).toFixed(2) + "px");
        mascot.style.setProperty("--ey", ((dy / d) * k * 2.1).toFixed(2) + "px");
        mascot.classList.toggle("is-watching", d < (mascot.classList.contains("is-watching") ? 230 : 170));
      };
      window.addEventListener(
        "pointermove",
        function (e) {
          px = e.clientX;
          py = e.clientY;
          if (!eyeRaf) eyeRaf = requestAnimationFrame(aim);
        },
        { passive: true }
      );
      document.addEventListener("mouseleave", function () {
        mascot.style.setProperty("--ex", "0px");
        mascot.style.setProperty("--ey", "0px");
        mascot.classList.remove("is-watching");
      });
    }
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

    // Reported "while playing the game, an accidental swipe up opens
    // /resume/" — the wheel/touchmove listeners below are on window, so a
    // drag gesture across Slice Blade's own canvas (dragging to slice a
    // letter is itself just a swipe, from this listener's point of view)
    // still bubbles all the way up and reads as "leave the page" even
    // though the game modal is covering the whole hero. Checked inside
    // goToResume/goToLife themselves, not each listener separately, so
    // every path that can trigger either (wheel, touchmove, and — just as
    // a defensive match, though the modal's own backdrop already blocks
    // this one — .life-pull-btn's click) is covered by one guard.
    var sliceBladeModal = document.querySelector("[data-slice-blade-modal]");
    var sliceBladeOpen = function () {
      return !!(sliceBladeModal && !sliceBladeModal.hidden);
    };

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
      if (navigated || !lifeWipe || !pullBtn || sliceBladeOpen()) return;
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
      if (navigated || sliceBladeOpen()) return;
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
