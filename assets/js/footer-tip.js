// Footer icon links: while the pointer is over an icon, the system cursor is
// replaced by a pill with that icon's name. The pill is "sticky": it is pulled
// toward the icon's centre and only follows the pointer part of the way, easing
// after it, so it clings to one icon and slides across when you move to the next.
// Clamped inside the viewport. Keyboard focus shows it on the icon. Touch has no
// hover; there CSS shows the text under each icon.
(function () {
  var nav = document.querySelector(".footer-links");
  if (!nav || !window.matchMedia("(hover: hover)").matches) return;

  var PULL = 0.3;   // how much of the pointer's offset from the icon centre it follows
  var EASE = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0.16;

  var tip = document.createElement("div");
  tip.className = "footer-tip";
  tip.setAttribute("aria-hidden", "true");
  document.body.appendChild(tip);

  var cx = 0, cy = 0, tx = 0, ty = 0, on = false, raf = 0, leaveTimer = 0;

  function target(a, px, py) {
    var r = a.getBoundingClientRect();
    var ix = r.left + r.width / 2, iy = r.top + r.height / 2;
    var half = tip.offsetWidth / 2 + 8;
    tx = Math.min(Math.max(half, ix + (px - ix) * PULL), window.innerWidth - half);
    ty = iy + (py - iy) * PULL;
  }

  function paint() {
    tip.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
  }

  function frame() {
    cx += (tx - cx) * EASE;
    cy += (ty - cy) * EASE;
    paint();
    raf = on || Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(frame) : 0;
  }

  function show(a, px, py) {
    clearTimeout(leaveTimer);
    var first = !on && !tip.classList.contains("is-on");
    tip.textContent = a.getAttribute("data-label");
    on = true;
    target(a, px, py);
    if (first) { cx = tx; cy = ty; paint(); }
    tip.classList.add("is-on");
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // Short grace period so sliding between neighbouring icons keeps one pill.
  function hide() {
    on = false;
    leaveTimer = setTimeout(function () { tip.classList.remove("is-on"); }, 120);
  }

  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("pointerenter", function (e) { show(a, e.clientX, e.clientY); });
    a.addEventListener("pointermove", function (e) { show(a, e.clientX, e.clientY); });
    a.addEventListener("pointerleave", hide);
    a.addEventListener("focus", function () {
      if (!a.matches(":focus-visible")) return;
      var r = a.getBoundingClientRect();
      show(a, r.left + r.width / 2, r.top + r.height / 2);
    });
    a.addEventListener("blur", hide);
  });
})();
