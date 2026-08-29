// Glitter warp-tunnel background — ported from a React/canvas component the
// user supplied (Originkit "GlitterWrap"). Two real adaptations, not just a
// syntax port:
//   1. Dropped all Framer/React scaffolding (useRef/useEffect, RenderTarget
//      static-export handling, property-control defaults) - none of it
//      applies to a plain page; this always runs the live loop unless
//      prefers-reduced-motion, in which case it never starts at all.
//   2. Recolored AND rebuilt the star draw for a light background. The
//      original used globalCompositeOperation "lighter" (additive) with a
//      white/purple/magenta palette - additive blending glows on black and
//      washes out to plain white on a light page, so the actual sparkle
//      would have been invisible here. Star draws now use normal
//      source-over blending with richer, more opaque colors instead; the
//      trail-fade step (destination-out) is unaffected by background color
//      and is unchanged.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.querySelector(".hero-glitter");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Tuned modest on purpose - this sits behind readable text on a personal
  // site, not a full-bleed hero on a marketing landing page. The original's
  // presets (particleCount 1000, glitterIntensity 10) are built for a canvas
  // that IS the whole visual; here it's one layer among several.
  var CONFIG = {
    particleCount: 70,
    colors: ["#1d4ed8", "#f59e0b", "#34d399"],
    speed: 2,
    density: 60,
    starSize: 2.2,
    focalDepth: 0.12,
    turbulence: 0.6,
    brightness: 0.55,
    glitterIntensity: 3,
    trailAmount: 88,
    reverse: false,
  };

  var stars = [];
  var elapsed = 0;
  var lastT = performance.now();
  var size = { w: 0, h: 0, dpr: 1 };
  var rafId = null;

  function resetStar(s, initial) {
    var angle = Math.random() * Math.PI * 2;
    var radius = (0.2 + Math.random() * 0.8) * (CONFIG.density / 15);
    s.x = Math.cos(angle) * radius;
    s.y = Math.sin(angle) * radius;
    s.z = initial ? Math.random() : 1.0;
    s.px = NaN;
    s.py = NaN;
    s.seed = Math.random() * 1000;
    s.vmul = 0.6 + Math.random() * 0.8;
    s.colorIdx = Math.floor(Math.random() * CONFIG.colors.length);
    s.flashUntil = 0;
    s.nextFlash = elapsed + 1 + Math.random() * 4 / Math.max(0.0001, CONFIG.glitterIntensity * 0.1);
  }

  function makeStar() {
    return { x: 0, y: 0, z: 0, px: NaN, py: NaN, seed: 0, vmul: 1, colorIdx: 0, flashUntil: 0, nextFlash: 0 };
  }

  for (var i = 0; i < CONFIG.particleCount; i++) {
    var s = makeStar();
    resetStar(s, true);
    stars.push(s);
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, canvas.clientWidth);
    var h = Math.max(1, canvas.clientHeight);
    if (size.w === w && size.h === h && size.dpr === dpr) return;
    size = { w: w, h: h, dpr: dpr };
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  function drawFrame(deltaSec) {
    var stepZ = CONFIG.speed * 0.0008;
    var focalDepth = CONFIG.focalDepth;
    var starScale = CONFIG.starSize * 0.15;
    var turbulence = CONFIG.turbulence * 0.2;
    var glitter = CONFIG.glitterIntensity * 0.1;
    var brightness = CONFIG.brightness;
    var trail = CONFIG.trailAmount / 100;

    var w = size.w, h = size.h;
    var cx = w / 2, cy = h / 2;
    var projScale = Math.min(w, h) * 0.9;
    var dt = Math.max(0.001, Math.min(0.1, deltaSec)) * 60;

    var keep = Math.pow(Math.min(0.98, Math.max(0, trail)), dt);
    var trailAlpha = Math.max(0.03, 1 - keep);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0, 0, 0, " + trailAlpha + ")";
    ctx.fillRect(0, 0, w, h);

    // Normal blending, not "lighter" — additive light doesn't read on a
    // light page (see file header).
    ctx.globalCompositeOperation = "source-over";

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var vz = stepZ * s.vmul * dt;
      s.z -= vz;
      if (s.z <= focalDepth) {
        resetStar(s, false);
        continue;
      }

      var tx = s.x, ty = s.y;
      if (turbulence > 0) {
        var t = elapsed * 1.2 + s.seed;
        var amp = turbulence * (1 - s.z) * 0.25;
        tx += Math.sin(t + s.seed) * amp;
        ty += Math.cos(t * 1.13 + s.seed * 0.7) * amp;
      }

      var persp = focalDepth / Math.max(s.z, 0.0001);
      var sx = cx + tx * persp * projScale;
      var sy = cy + ty * persp * projScale;

      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) {
        resetStar(s, false);
        continue;
      }

      var flashMult = 1;
      if (glitter > 0) {
        if (elapsed >= s.nextFlash && s.flashUntil < elapsed) {
          s.flashUntil = elapsed + 0.04 + Math.random() * 0.07;
          s.nextFlash = elapsed + 1 + Math.random() * 4 / Math.max(0.0001, glitter);
        }
        if (elapsed <= s.flashUntil) flashMult = 1 + 2.5 * glitter;
      }

      var sizePersp = Math.min(2.5, (focalDepth / Math.max(s.z, 0.0001)) * 0.6);
      var baseR = Math.max(0.25, starScale * (0.4 + sizePersp));
      var maxR = 1 + starScale * 2.5;
      var r = Math.min(baseR * flashMult, maxR);

      var lifeT = 1 - s.z;
      var a = Math.min(1, lifeT * 0.9 + 0.05) * brightness * (flashMult > 1 ? 1 : 0.85);
      var colStr = CONFIG.colors[s.colorIdx];

      if (!isNaN(s.px) && !isNaN(s.py)) {
        ctx.globalAlpha = a * 0.5;
        ctx.strokeStyle = colStr;
        ctx.lineWidth = Math.max(0.4, r * 0.4);
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      ctx.globalAlpha = a;
      ctx.fillStyle = colStr;
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);

      if (flashMult > 1) {
        var rf = Math.min(r * 1.4, maxR * 1.4);
        ctx.globalAlpha = a * 0.5;
        ctx.fillRect(sx - rf, sy - rf, rf * 2, rf * 2);
      }

      s.px = sx;
      s.py = sy;
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    elapsed += Math.min(0.1, Math.max(0, deltaSec));
  }

  function loop(t) {
    var deltaSec = (t - lastT) / 1000;
    lastT = t;
    drawFrame(deltaSec);
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  window.addEventListener("pagehide", function () {
    if (rafId != null) cancelAnimationFrame(rafId);
  });
})();
