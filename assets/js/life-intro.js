// Load sequence for /life/, per direct request: blank screen, then the
// Black Hole grows in from a dot, then content appears one piece at a
// time — nav, then the heading, then the subhead, then everything else —
// instead of it all arriving together. black-hole-lite.js has been baking/
// rendering underneath the veil the entire time regardless, so "grows from
// a dot" is a pure CSS transform on .life-hero (see personal.css), not
// something coordinated with the canvas itself.
//
// All the hiding/scaling CSS is scoped under body.js-intro (added
// synchronously in personal.html, before this deferred script even runs)
// specifically so a no-JS visitor never sees a permanently black screen or
// a stuck tiny dot — this file only ever adds classes to elements that
// start effectively inert without that class present at all.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var veil = document.querySelector(".life-intro-veil");
  var hero = document.querySelector(".life-hero");
  var header = document.querySelector(".site-header");
  var h1 = document.querySelector(".life-hero-inner h1");
  var p = document.querySelector(".life-hero-inner p");
  var rest = Array.prototype.slice.call(document.querySelectorAll(".section-nav, .life-section"));
  if (!veil || !hero || !header) return;

  var HOLD_MS = 250; // pure black, giving the canvas a moment to bake its first real frame
  var GROW_MS = 1100; // must match .life-hero's own transition duration in personal.css
  var STAGGER_MS = 200; // gap between each piece of content appearing

  function runSequence(steps) {
    var i = 0;
    function next() {
      if (i >= steps.length) return;
      var step = steps[i++];
      setTimeout(function () {
        step[1]();
        next();
      }, step[0]);
    }
    next();
  }

  runSequence([
    [HOLD_MS, function () {
      veil.classList.add("is-hidden");
      hero.classList.add("is-grown");
    }],
    [GROW_MS, function () {
      header.classList.add("is-visible");
    }],
    [STAGGER_MS, function () {
      if (h1) h1.classList.add("is-visible");
    }],
    [STAGGER_MS, function () {
      if (p) p.classList.add("is-visible");
    }],
    [STAGGER_MS, function () {
      rest.forEach(function (el) { el.classList.add("is-visible"); });
    }]
  ]);
})();
