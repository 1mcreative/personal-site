// The deferred "Thanos snap" transition: clicking into /life/ via the page
// corner or portal orb turns the hero to black and blows it apart into
// particles drifting left, instead of the sitewide clip-path wipe every
// other link uses. Those two links are the only triggers — this is a
// deliberately bigger flourish for the one deliberately overt jump into the
// personal side, not a replacement for the shared transition (which still
// runs on arrival at /life/, same as any other navigation).
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var triggers = document.querySelectorAll(".page-corner, .portal-orb");
  if (!triggers.length) return;

  var DURATION = 900;
  var busy = false;

  function dissolveTo(href) {
    busy = true;
    document.documentElement.classList.add("dissolving");

    var canvas = document.createElement("canvas");
    canvas.className = "dissolve-canvas";
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    var cols = 26;
    var rows = 16;
    var cellW = w / cols;
    var cellH = h / rows;
    var particles = [];
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        particles.push({
          x: x * cellW + cellW / 2 + (Math.random() - 0.5) * cellW * 0.5,
          y: y * cellH + cellH / 2 + (Math.random() - 0.5) * cellH * 0.5,
          size: 2 + Math.random() * 3,
          vx: -(220 + Math.random() * 340),
          vy: (Math.random() - 0.5) * 70,
          delay: Math.random() * 260,
        });
      }
    }

    var start = null;
    function frame(now) {
      if (!start) start = now;
      var elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var t = Math.max(0, elapsed - p.delay) / 1000;
        var alpha = Math.max(0, 1 - t * 1.3);
        if (alpha <= 0) continue;
        ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
        ctx.fillRect(p.x + p.vx * t, p.y + p.vy * t, p.size, p.size);
      }
      if (elapsed < DURATION) {
        requestAnimationFrame(frame);
      } else {
        window.location.href = href;
      }
    }
    requestAnimationFrame(frame);
  }

  triggers.forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (busy) { e.preventDefault(); return; }
      e.preventDefault();
      dissolveTo(el.getAttribute("href"));
    });
  });
})();
