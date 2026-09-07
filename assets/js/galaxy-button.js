// Randomizes each .star's orbit/drift properties — a near-verbatim port of
// the reference CodePen's own inline script. Runs unconditionally (even
// under prefers-reduced-motion): the CSS disables the animations in that
// case, so setting unused custom properties here is harmless.
//
// Distance/size are tuned for the nav-bar-scale button (professional.css) —
// this component's only use site-wide since it moved off the hero.
(function () {
  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  var stars = document.querySelectorAll(".galaxy-button .star");
  stars.forEach(function (star) {
    star.style.setProperty("--duration", random(6, 20));
    star.style.setProperty("--delay", random(1, 10));
    star.style.setProperty("--alpha", random(40, 90) / 100);
    star.style.setProperty("--size", random(2, 4));
    star.style.setProperty("--distance", random(14, 38));
  });
})();
