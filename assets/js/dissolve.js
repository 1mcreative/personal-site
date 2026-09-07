// The deferred "Thanos snap" transition: clicking into /life/ via the page
// corner or portal orb turns the hero to black and blows it apart into
// particles sweeping right-to-left, instead of the sitewide clip-path wipe
// every other link uses. Those two links are the only triggers — this is a
// deliberately bigger flourish for the one deliberately overt jump into the
// personal side, not a replacement for the shared transition (which still
// runs on arrival at /life/, same as any other navigation).
//
// Particles are sampled per real content element (h1, subhead, buttons, the
// hint links themselves), not one generic full-viewport grid — so each
// piece of the page reads as disintegrating on its own, at its own
// position, rather than a single uniform overlay.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var triggers = document.querySelectorAll(".page-corner, .portal-orb");
  if (!triggers.length) return;

  var TARGETS_SELECTOR =
    ".hero-inner h1, .hero-inner .hero-sub, .galaxy-button, .spotlight-text, .scroll-cue, .page-corner, .portal-orb";
  var CELL = 16; // px spacing between sampled particles within each element
  var SWEEP_MS = 450; // right edge starts immediately, left edge waits this long
  var FADE_RATE = 1.5; // higher = particles vanish sooner after their own start
  var DURATION = 1200;
  var busy = false;

  function collectParticles() {
    var w = window.innerWidth;
    var particles = [];
    document.querySelectorAll(TARGETS_SELECTOR).forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      var cols = Math.max(1, Math.round(r.width / CELL));
      var rows = Math.max(1, Math.round(r.height / CELL));
      var cellW = r.width / cols;
      var cellH = r.height / rows;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var px = r.left + x * cellW + cellW / 2 + (Math.random() - 0.5) * cellW * 0.6;
          var py = r.top + y * cellH + cellH / 2 + (Math.random() - 0.5) * cellH * 0.6;
          particles.push({
            x: px,
            y: py,
            size: 1 + Math.random() * 1.5,
            vx: -(220 + Math.random() * 320),
            vy: (Math.random() - 0.5) * 40,
            // right-to-left sweep: particles further right start sooner
            delay: ((w - px) / w) * SWEEP_MS + Math.random() * 60,
          });
        }
      }
    });
    return particles;
  }

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

    var particles = collectParticles();

    var start = null;
    function frame(now) {
      if (!start) start = now;
      var elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var t = Math.max(0, elapsed - p.delay) / 1000;
        var alpha = Math.max(0, 1 - t * FADE_RATE);
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
