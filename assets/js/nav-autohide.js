// Floating top nav hides on scroll-down, returns on scroll-up, sitewide —
// per direct request to match /life/'s own nav on every page. The real
// scroll container differs by page: /life/ scrolls on body (see
// personal.css's html:has() fix — window.scrollY never moves there), while
// /resume//lab//skills/ scroll the window normally (body.scrollTop stays
// 0 there). The `||` chain below picks whichever one is actually nonzero,
// and listening on both window and body costs nothing since only the one
// that's the real scroll container ever fires. A small threshold (4px)
// ignores sub-pixel rounding noise rather than actual scroll intent.
//
// MIN_HIDE: real bug, caught live on /life/ — its scroll-snap resting
// position for the very first section isn't literally 0, it settles a few
// px off-zero once fonts/canvas/images finish loading, and that alone
// (never an actual user gesture) was enough to cross THRESHOLD and hide
// the nav before the visitor had scrolled at all. Never hiding within the
// first MIN_HIDE px is both the fix and standard practice for this
// pattern — the nav should never disappear while still essentially at
// the top of the page.
(function () {
  var header = document.querySelector(".site-header, .lab-header");
  if (!header) return;

  var THRESHOLD = 4;
  var MIN_HIDE = 80;

  function scrollTop() {
    return Math.max(0, window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0);
  }

  var lastScrollTop = scrollTop();

  function onScroll() {
    var current = scrollTop();
    if (current <= MIN_HIDE) {
      header.classList.remove("is-nav-hidden");
    } else if (current > lastScrollTop + THRESHOLD) {
      header.classList.add("is-nav-hidden");
    } else if (current < lastScrollTop - THRESHOLD) {
      header.classList.remove("is-nav-hidden");
    }
    lastScrollTop = current;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  document.body.addEventListener("scroll", onScroll, { passive: true });

  // Glass-edge glint (tokens.css's .site-header::before/.lab-header::before)
  // — same "cursor position drives a CSS custom property" technique
  // assets/js/spotlight-text.js already uses. Gated to real pointers so a
  // touch tap never leaves --glass-mx/--glass-my stuck wherever it last
  // landed; the matching CSS media query is the actual on/off switch, this
  // guard just avoids doing pointless work on devices that can't hover.
  if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    header.addEventListener("pointermove", function (e) {
      var r = header.getBoundingClientRect();
      header.style.setProperty("--glass-mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      header.style.setProperty("--glass-my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  }
})();
