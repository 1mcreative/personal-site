// Floating top nav hides on scroll-down, returns on scroll-up, sitewide —
// per direct request to match /life/'s own nav on every page. The real
// scroll container differs by page: /life/ scrolls on body (see
// personal.css's html:has() fix — window.scrollY never moves there), while
// /resume//lab//skills/ scroll the window normally (body.scrollTop stays
// 0 there). The `||` chain below picks whichever one is actually nonzero,
// and listening on both window and body costs nothing since only the one
// that's the real scroll container ever fires. A small threshold (4px)
// ignores sub-pixel rounding noise rather than actual scroll intent.
(function () {
  var header = document.querySelector(".site-header, .lab-header");
  if (!header) return;

  var THRESHOLD = 4;

  function scrollTop() {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  var lastScrollTop = scrollTop();

  function onScroll() {
    var current = scrollTop();
    if (current > lastScrollTop + THRESHOLD) {
      header.classList.add("is-nav-hidden");
    } else if (current < lastScrollTop - THRESHOLD) {
      header.classList.remove("is-nav-hidden");
    }
    lastScrollTop = current;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  document.body.addEventListener("scroll", onScroll, { passive: true });
})();
