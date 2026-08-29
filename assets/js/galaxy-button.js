// Randomizes each .star's orbit/drift properties — a near-verbatim port of
// the reference CodePen's own inline script. Runs unconditionally (even
// under prefers-reduced-motion): the CSS disables the animations in that
// case, so setting unused custom properties here is harmless.
(function () {
  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  var stars = document.querySelectorAll(".galaxy-button .star");
  stars.forEach(function (star) {
    star.style.setProperty("--duration", random(6, 20));
    star.style.setProperty("--delay", random(1, 10));
    star.style.setProperty("--alpha", random(40, 90) / 100);
    star.style.setProperty("--size", random(2, 6));
    star.style.setProperty("--distance", random(30, 90));
  });
})();
