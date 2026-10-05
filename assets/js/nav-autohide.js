// Floating top nav hides on scroll-down, returns on scroll-up — per direct
// request. Tracks body.scrollTop, the real scroll container on this page
// (see personal.css's html:has() fix — window.scrollY never moves here),
// not window.scrollY. A small threshold (4px) ignores sub-pixel rounding
// noise rather than actual scroll intent; scroll-snap means most real
// deltas here are a full section height anyway, so this is a generous
// margin, not a tight tolerance.
(function () {
  var header = document.querySelector(".site-header");
  if (!header) return;

  var THRESHOLD = 4;
  var lastScrollTop = document.body.scrollTop;

  document.body.addEventListener("scroll", function () {
    var current = document.body.scrollTop;
    if (current > lastScrollTop + THRESHOLD) {
      header.classList.add("is-nav-hidden");
    } else if (current < lastScrollTop - THRESHOLD) {
      header.classList.remove("is-nav-hidden");
    }
    lastScrollTop = current;
  }, { passive: true });
})();
