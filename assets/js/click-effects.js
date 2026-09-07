// Click Effects — adapted from a pasted Originkit "Click Effects" React/GSAP
// component (6 selectable interaction modes: rings, burst, particles,
// crosshair, wavy, sniper). Ported only the "sniper" mode — a small reticle
// snap of 4 ticks + 8 flying dots on every click — since that's the one
// actually shipped here; the other 5 modes exist only in the untouched
// pasted reference, not as dead branches in this file. Plain CSS
// transitions instead of GSAP timelines, same house pattern as every other
// adapted effect on this site (see name-kinetic.js).
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var SIZE = 80;
  var STROKE = 2;
  var DURATION = 320;
  var TICK_LEN = SIZE * 0.22;
  var TICK_GAP = SIZE * 0.06;
  var DOT_TRAVEL = SIZE * 0.42;
  var TICK_ANGLES = [0, 90, 180, 270];
  var DOT_ANGLES = [30, 60, 120, 150, 210, 240, 300, 330];

  var layer = null;

  function ensureLayer() {
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "click-fx-layer";
      layer.setAttribute("aria-hidden", "true");
      document.body.appendChild(layer);
    }
    return layer;
  }

  function spawnParticle(container, angleDeg, isTick) {
    var el = document.createElement("div");
    el.className = isTick ? "click-fx-tick" : "click-fx-dot";
    el.style.width = (isTick ? TICK_LEN : STROKE) + "px";
    el.style.height = STROKE + "px";
    el.style.transform =
      "translate(-50%, -50%) rotate(" + angleDeg + "deg) translateX(" +
      (isTick ? TICK_GAP : 0) + "px)";
    container.appendChild(el);

    void el.offsetWidth;

    requestAnimationFrame(function () {
      var endGap = isTick ? TICK_GAP + TICK_LEN * 1.4 : DOT_TRAVEL;
      el.style.transform =
        "translate(-50%, -50%) rotate(" + angleDeg + "deg) translateX(" + endGap + "px)" +
        (isTick ? " scaleX(0)" : "");
      el.style.opacity = "0";
    });
  }

  function handleClick(e) {
    if (e.target && e.target.closest && e.target.closest(".click-fx-layer")) return;

    var container = document.createElement("div");
    container.className = "click-fx";
    container.style.left = e.clientX + "px";
    container.style.top = e.clientY + "px";
    ensureLayer().appendChild(container);

    TICK_ANGLES.forEach(function (a) { spawnParticle(container, a, true); });
    DOT_ANGLES.forEach(function (a) { spawnParticle(container, a, false); });

    setTimeout(function () { container.remove(); }, DURATION + 60);
  }

  document.addEventListener("click", handleClick);
})();
