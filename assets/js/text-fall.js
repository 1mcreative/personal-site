// Text Fall — ported from a React/canvas component the user supplied
// (Originkit "Text Fall"). The engine itself (createTextFall below) was
// already plain DOM/canvas code with no React dependency — only the outer
// wrapper (props handling, useLayoutEffect, JSX) was React-specific, so this
// port is mostly: strip TypeScript type annotations, drop the wrapper, call
// the engine directly. Two deliberate cuts, not just syntax changes:
//   1. Dropped the SVG-logo fallback mode entirely (LOGO_SVG_DESKTOP/MOBILE,
//      svgToImage, the mode==="logo" branch in ensureMask). The component
//      falls back to rendering a logo when no text is given; we always give
//      it text ("BHAVESH NAKUM"), so that whole path is dead code here —
//      cutting it is YAGNI, not a simplification of logic we actually use.
//   2. Framer's RenderTarget/static-export handling doesn't apply outside
//      that tool; this always runs the live loop unless prefers-reduced-motion.
// Everything else — the mask-sampling, phase state machine (idle/fall/form/
// spread), cursor magnetics, resize handling — is the same algorithm.
(function () {
  var CHARS = "01#@&ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var MASK_FONT_PX = 200;
  var MASK_FONT_FAMILY = "'Helvetica Neue', Arial, sans-serif";
  var MASK_FONT_WEIGHT = 800;
  var CURSOR_DAMPING = 16;
  var BASE_PHASE_MS = 1000;
  var MAX_PARTICLES = 4200;
  var MAX_LINES = 6;
  var LINE_PENALTY = 0.94;

  function latticeError(values, unit) {
    if (!values.length || !(unit > 0)) return 0;
    var min = Infinity;
    for (var i = 0; i < values.length; i++) if (values[i] < min) min = values[i];
    var worst = 0;
    for (var j = 0; j < values.length; j++) {
      var k = (values[j] - min) / unit;
      worst = Math.max(worst, Math.abs(k - Math.round(k)));
    }
    return worst;
  }

  function createTextFall(root, canvas, params) {
    var ctx = canvas.getContext("2d");
    var mouse = { x: 0, y: 0, active: false };

    var particles = [];
    var dpr = 1;
    var cellDevice = 10;
    var stepMask = 1;
    var dispScale = 1;
    var maskW = 1;
    var maskH = 1;
    var maskLines = 1;
    var phase = "idle";
    var fallStart = 0;
    var formStart = 0;
    var spreadStart = 0;
    var lastTime = 0;
    var floorY = 0;
    var rafId = 0;
    var visible = true;
    var resizeTimer = 0;
    var lastCssW = -1;
    var lastCssH = -1;
    var mask = null;
    var cachedMaskKey = null;
    var bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    var fitBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    var scrollRevealDone = false;
    var destroyed = false;

    function wrapInto(words, count, measure) {
      var widths = words.map(function (w) { return measure.measureText(w).width; });
      var spaceW = measure.measureText(" ").width;
      var total = spaceW * Math.max(0, words.length - 1);
      for (var i = 0; i < widths.length; i++) total += widths[i];
      var target = total / count;

      var lines = [];
      var cur = [];
      var curW = 0;
      for (var w = 0; w < words.length; w++) {
        var add = (cur.length ? spaceW : 0) + widths[w];
        var roomLeft = count - lines.length - 1;
        var wordsLeft = words.length - w;
        var mustBreak = cur.length > 0 && curW + add > target && roomLeft > 0;
        var mustFill = wordsLeft <= roomLeft && cur.length > 0;
        if (mustBreak || mustFill) {
          lines.push(cur.join(" "));
          cur = [words[w]];
          curW = widths[w];
        } else {
          cur.push(words[w]);
          curW += add;
        }
      }
      if (cur.length) lines.push(cur.join(" "));
      return lines;
    }

    function buildTextMask(value, fitW, fitH) {
      var measure = document.createElement("canvas").getContext("2d");
      var fontSpec = MASK_FONT_WEIGHT + " " + MASK_FONT_PX + "px " + MASK_FONT_FAMILY;
      measure.font = fontSpec;

      var hardLines = value.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      var lineHeight = MASK_FONT_PX * 1.16;
      var padX = MASK_FONT_PX * 0.16;
      var padY = MASK_FONT_PX * 0.16;

      var best = null;
      var candidates = [];
      if (hardLines.length > 1) {
        candidates.push(hardLines);
      } else {
        var words = (hardLines[0] || "").split(/\s+/).filter(Boolean);
        var maxLines = Math.max(1, Math.min(MAX_LINES, words.length));
        for (var n = 1; n <= maxLines; n++) {
          var lines = wrapInto(words, n, measure);
          if (lines.length === n) candidates.push(lines);
        }
      }

      for (var c = 0; c < candidates.length; c++) {
        var cand = candidates[c];
        var w = 1;
        for (var s = 0; s < cand.length; s++) w = Math.max(w, measure.measureText(cand[s]).width);
        var boxW = w + padX * 2;
        var boxH = lineHeight * cand.length + padY * 2;
        var scale = Math.min(fitW / boxW, fitH / boxH);
        var score = scale * Math.pow(LINE_PENALTY, cand.length - 1);
        if (!best || score > best.score) best = { lines: cand, w: boxW, h: boxH, scale: scale, score: score };
      }
      if (!best) best = { lines: [value], w: 1, h: 1, scale: 1, score: 1 };

      var outW = Math.max(1, Math.min(4000, Math.ceil(best.w)));
      var outH = Math.max(1, Math.min(4000, Math.ceil(best.h)));
      var out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      var mctx = out.getContext("2d");
      mctx.fillStyle = "#fff";
      mctx.textBaseline = "middle";
      mctx.font = fontSpec;
      mctx.textAlign = params.align === "left" ? "left" : "center";
      var ax = params.align === "left" ? padX : outW / 2;
      for (var li = 0; li < best.lines.length; li++) {
        mctx.fillText(best.lines[li], ax, padY + lineHeight * (li + 0.5));
      }
      maskLines = best.lines.length;
      return out;
    }

    function ensureMask() {
      var trimmed = typeof params.text === "string" ? params.text.trim() : "";
      var fitW = fitBox.maxX - fitBox.minX;
      var fitH = fitBox.maxY - fitBox.minY;
      var key = "t:" + trimmed + "|" + params.align + "|" + Math.round(fitW) + "x" + Math.round(fitH);
      if (mask && cachedMaskKey === key) return mask;
      cachedMaskKey = key;
      mask = buildTextMask(trimmed || " ", Math.max(1, fitW), Math.max(1, fitH));
      return mask;
    }

    function randChar() {
      return CHARS[Math.floor(Math.random() * CHARS.length)];
    }

    function phaseMs() {
      var k = Math.pow(2, (50 - params.speed) / 25);
      return Math.min(6000, Math.max(150, BASE_PHASE_MS * k));
    }

    function updateBounds() {
      var W = canvas.width;
      var H = canvas.height;
      var edge = Math.ceil(cellDevice * 0.5);
      bounds.minX = edge;
      bounds.minY = edge;
      bounds.maxX = Math.max(edge + 1, W - edge - cellDevice * 0.7);
      bounds.maxY = Math.max(edge + 1, H - edge - cellDevice * 1.05);
      floorY = bounds.maxY;

      var frac = Math.max(10, Math.min(100, params.textSize)) / 100;
      var boxW = Math.min(W - cellDevice * 2, W * frac);
      var boxH = Math.min(H - cellDevice * 2, H * frac);
      fitBox.minX = (W - boxW) / 2;
      fitBox.minY = (H - boxH) / 2;
      fitBox.maxX = fitBox.minX + Math.max(1, boxW);
      fitBox.maxY = fitBox.minY + Math.max(1, boxH);
    }

    function clampParticle(p) {
      p.x = Math.max(bounds.minX, Math.min(bounds.maxX, p.x));
      p.y = Math.max(bounds.minY, Math.min(bounds.maxY, p.y));
    }

    function resizeCanvas() {
      var cssW = root.offsetWidth || 1;
      var cssH = root.offsetHeight || 1;
      lastCssW = cssW;
      lastCssH = cssH;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(cssW * dpr));
      var h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      cellDevice = Math.max(3, Math.round(params.glyphSize * dpr));
      updateBounds();
    }

    function sampleTargets() {
      var img = ensureMask();
      if (destroyed || !img) return [];

      var iw = img.width || 1;
      var ih = img.height || 1;
      maskW = iw;
      maskH = ih;

      var off = document.createElement("canvas");
      off.width = iw;
      off.height = ih;
      var octx = off.getContext("2d", { willReadFrequently: true });
      octx.drawImage(img, 0, 0, iw, ih);
      var data = octx.getImageData(0, 0, iw, ih).data;

      var fitW = fitBox.maxX - fitBox.minX;
      var fitH = fitBox.maxY - fitBox.minY;
      dispScale = Math.min(fitW / iw, fitH / ih);
      stepMask = Math.max(1, Math.round(cellDevice / dispScale));

      function collect(step) {
        var pts = [];
        for (var y = 0; y < ih; y += step) {
          for (var x = 0; x < iw; x += step) {
            if (data[(y * iw + x) * 4 + 3] > 50) pts.push({ tx: x, ty: y });
          }
        }
        return pts;
      }

      var raw = collect(stepMask);
      if (raw.length > MAX_PARTICLES) {
        stepMask = Math.ceil(stepMask * Math.sqrt(raw.length / MAX_PARTICLES));
        raw = collect(stepMask);
        cellDevice = Math.max(3, Math.round(stepMask * dispScale));
        updateBounds();
      }

      var dispW = iw * dispScale;
      var dispH = ih * dispScale;
      var ox = params.align === "left" ? fitBox.minX : fitBox.minX + (fitW - dispW) / 2;
      var oy = fitBox.minY + (fitH - dispH) / 2;

      return raw.map(function (p) {
        return { tx: ox + p.tx * dispScale, ty: oy + p.ty * dispScale };
      });
    }

    function scatterRadius() {
      return (params.scatter / 100) * 0.5 * Math.min(canvas.width, canvas.height);
    }

    function computeNearPosition(t) {
      var jitter = scatterRadius();
      var angle = Math.random() * Math.PI * 2;
      var maxDist = Math.min(jitter, t.tx - bounds.minX, bounds.maxX - t.tx, t.ty - bounds.minY, bounds.maxY - t.ty);
      var dist = Math.random() * Math.max(0, maxDist);
      return { x: t.tx + Math.cos(angle) * dist, y: t.ty + Math.sin(angle) * dist };
    }

    function spawnParticles(targets) {
      return targets.map(function (t, i) {
        return {
          char: randChar(), x: t.tx, y: t.ty, vx: 0, vy: 0,
          hx: t.tx, hy: t.ty, tx: t.tx, ty: t.ty, fx: t.tx, fy: t.ty, sx: t.tx, sy: t.ty,
          delay: (i % 20) / 20, done: false,
        };
      });
    }

    function maybeScramble(p, ratePerSec, dt) {
      if (Math.random() < ratePerSec * dt) p.char = randChar();
    }

    function updateIdle(p, dt) {
      clampParticle(p);
      maybeScramble(p, 0.9, dt);
    }

    function applyMagnetic(p, dt) {
      if (params.strength > 0 && mouse.active) {
        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.hypot(dx, dy) || 1;
        var radius = (params.reach / 100) * 0.5 * Math.min(canvas.width, canvas.height);
        if (radius > 0 && dist < radius) {
          var t = 1 - dist / radius;
          var force = t * t * (params.strength / 100) * cellDevice * 2;
          p.x -= (dx / dist) * force;
          p.y -= (dy / dist) * force;
          if (t > 0.65 && Math.random() < 3.6 * dt) p.char = randChar();
        }
      }
      var k = 1 - Math.pow(1 - CURSOR_DAMPING / 100, dt * 60);
      p.x += (p.hx - p.x) * k;
      p.y += (p.hy - p.y) * k;
      clampParticle(p);
    }

    function updateFall(p, dt) {
      var accel = (params.gravity / 100) * 24 * canvas.height;
      p.vy += accel * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y >= floorY) {
        p.y = floorY;
        p.vy *= -0.25;
        p.vx *= 0.8;
      }
      clampParticle(p);
    }

    function startSpread(now) {
      phase = "spread";
      spreadStart = now;
      particles.forEach(function (p) {
        p.fx = p.x;
        p.fy = p.y;
        var pos = computeNearPosition(p);
        p.sx = pos.x;
        p.sy = pos.y;
        p.hx = p.sx;
        p.hy = p.sy;
        p.done = false;
      });
    }

    function tween(p, start, now) {
      var dur = phaseMs();
      var delay = p.delay * dur * 0.5;
      return Math.max(0, Math.min(1, (now - start - delay) / dur));
    }

    function updateSpread(p, now, dt) {
      var t = tween(p, spreadStart, now);
      var ease = 1 - Math.pow(1 - t, 3);
      p.x = p.fx + (p.sx - p.fx) * ease;
      p.y = p.fy + (p.sy - p.fy) * ease;
      clampParticle(p);
      if (t >= 1) p.done = true;
      maybeScramble(p, 0.72, dt);
    }

    function startForm(now) {
      phase = "form";
      formStart = now;
      particles.forEach(function (p) {
        p.fx = p.x;
        p.fy = p.y;
        p.done = false;
      });
    }

    function updateForm(p, now, dt) {
      var t = tween(p, formStart, now);
      var ease = 1 - Math.pow(1 - t, 3);
      p.x = p.fx + (p.tx - p.fx) * ease;
      p.y = p.fy + (p.ty - p.fy) * ease;
      if (t >= 0.98) {
        p.x = p.tx;
        p.y = p.ty;
      }
      clampParticle(p);
      if (t >= 1) p.done = true;
      maybeScramble(p, 0.72, dt);
    }

    function draw(now) {
      rafId = 0;
      if (!visible) return;

      var dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = params.color;
      ctx.font = cellDevice + "px " + params.glyphFamily;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (phase === "idle") {
          updateIdle(p, dt);
          applyMagnetic(p, dt);
        } else if (phase === "fall") updateFall(p, dt);
        else if (phase === "form") updateForm(p, now, dt);
        else if (phase === "spread") updateSpread(p, now, dt);
        else if (phase === "done") {
          applyMagnetic(p, dt);
          maybeScramble(p, 0.9, dt);
        }
        ctx.fillText(p.char, p.x, p.y);
      }

      if (phase === "form" && particles.every(function (p) { return p.done; })) {
        phase = "done";
        particles.forEach(function (p) {
          p.x = p.tx;
          p.y = p.ty;
          p.hx = p.tx;
          p.hy = p.ty;
        });
      }
      if (phase === "spread" && particles.every(function (p) { return p.done; })) phase = "idle";
      if (phase === "fall" && now - fallStart >= phaseMs()) startForm(now);

      rafId = requestAnimationFrame(draw);
    }

    function ensureLoop() {
      if (!rafId && visible) rafId = requestAnimationFrame(draw);
    }

    function stopLoop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      lastTime = 0;
    }

    function triggerFall() {
      if (phase !== "idle") return false;
      phase = "fall";
      fallStart = performance.now();
      var H = canvas.height;
      particles.forEach(function (p) {
        p.vy += (0.05 + Math.random() * 0.2) * H;
        p.vx += (Math.random() - 0.5) * 0.5 * H;
      });
      ensureLoop();
      return true;
    }

    function onClick() {
      if (phase !== "idle" && phase !== "done") return;
      if (phase === "done") {
        startSpread(performance.now());
        ensureLoop();
        return;
      }
      triggerFall();
    }

    function onPointerMove(e) {
      var rect = canvas.getBoundingClientRect();
      var sx = canvas.width / (rect.width || 1);
      var sy = canvas.height / (rect.height || 1);
      mouse.x = (e.clientX - rect.left) * sx;
      mouse.y = (e.clientY - rect.top) * sy;
      mouse.active = true;
    }

    function onPointerOut() {
      mouse.active = false;
    }

    function reset() {
      var wasSettled = phase === "done";
      resizeCanvas();
      var targets = sampleTargets();
      if (destroyed) return;
      particles = spawnParticles(targets);
      if (wasSettled) {
        phase = "done";
        particles.forEach(function (p) {
          p.x = p.tx;
          p.y = p.ty;
          p.hx = p.tx;
          p.hy = p.ty;
          p.done = true;
        });
      } else {
        phase = "idle";
      }
      lastTime = 0;
      ensureLoop();
    }

    function scheduleResize() {
      if (root.offsetWidth === lastCssW && root.offsetHeight === lastCssH) return;
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        reset();
      }, 120);
    }

    root.addEventListener("click", onClick);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerOut);
    canvas.addEventListener("pointercancel", onPointerOut);

    var ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(scheduleResize);
      ro.observe(root);
    } else {
      window.addEventListener("resize", scheduleResize);
    }

    var io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            visible = entry.isIntersecting;
            if (visible) {
              ensureLoop();
              if (params.autoFall && !scrollRevealDone && phase === "idle" && entry.intersectionRatio >= 0.8) {
                scrollRevealDone = true;
                triggerFall();
              }
            } else {
              stopLoop();
            }
          });
        }, { threshold: [0, 0.25, 0.5, 0.75, 0.8] })
      : null;
    if (io) io.observe(root);

    reset();

    return {
      destroy: function () {
        destroyed = true;
        stopLoop();
        clearTimeout(resizeTimer);
        root.removeEventListener("click", onClick);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerleave", onPointerOut);
        canvas.removeEventListener("pointercancel", onPointerOut);
        if (ro) ro.disconnect();
        else window.removeEventListener("resize", scheduleResize);
        if (io) io.disconnect();
      },
    };
  }

  // ---- wiring: no React, so just find the mount point and run it ----
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var heading = document.querySelector(".text-fall-heading");
  var root = document.querySelector(".text-fall-root");
  var canvas = document.querySelector(".text-fall-canvas");
  if (!heading || !root || !canvas) return;

  // Must happen before createTextFall(): it makes .text-fall-root
  // display:block, which is what gives it real offsetWidth/offsetHeight to
  // measure. Adding this after would size the canvas off a still-hidden
  // (0x0) box.
  heading.classList.add("text-fall-ready");

  createTextFall(root, canvas, {
    text: "BHAVESH NAKUM",
    glyphFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    color: "#1b1f24",
    align: "left",
    autoFall: true,
    glyphSize: 7,
    textSize: 100,
    speed: 50,
    gravity: 50,
    scatter: 100,
    strength: 150,
    reach: 30,
  });
})();
