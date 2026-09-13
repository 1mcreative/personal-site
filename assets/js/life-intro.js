// Load sequence for /life/: black, then the Black Hole background alone,
// then the nav and content — per explicit request. The veil (an opaque
// black div, z-index above everything) starts covering the whole page;
// black-hole-lite.js has been baking/rendering underneath it the entire
// time regardless, so "reveal the background" is just fading the veil out,
// not waiting on the canvas to become ready. Nav/content start at
// opacity:0 independently of the veil and fade in afterward, so the
// three-stage order (black / background alone / everything) holds even
// though the veil's own fade only ever covers one layer.
//
// All the hiding CSS is scoped under body.js-intro (added synchronously in
// personal.html, before this deferred script even runs) specifically so a
// no-JS visitor never sees a permanently black screen — this file only
// ever adds/removes classes on elements that start effectively inert
// without it.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var veil = document.querySelector(".life-intro-veil");
  var header = document.querySelector(".site-header");
  var main = document.querySelector("main#main");
  if (!veil || !header || !main) return;

  var HOLD_MS = 250; // pure black, giving the canvas a moment to bake its first real frame
  var CONTENT_DELAY_MS = 350; // how far into the veil's own fade the content starts appearing

  setTimeout(function () {
    veil.classList.add("is-hidden");
    setTimeout(function () {
      header.classList.add("is-visible");
      main.classList.add("is-visible");
    }, CONTENT_DELAY_MS);
  }, HOLD_MS);
})();
