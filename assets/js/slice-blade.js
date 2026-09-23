// Slice Blade — a hidden-in-plain-sight game reachable from the "Getting
// bored?" prompt in the footer of every page (and its own homepage
// trigger, since the homepage has no footer at all by deliberate,
// long-standing design). Adapted from a pasted Originkit React/
// TypeScript component per direct request, the same treatment every
// canvas effect on this site gets: dropped React/TypeScript, kept the
// actual game logic (physics, cutting, the bitmap-font renderer, the
// self-playing "attract mode" AI) verbatim.
//
// Two real departures from the reference, both deliberate:
// (1) Colors are read live from the current page's own theme tokens
//     (getComputedStyle against --bg/--text/--accent) instead of the
//     reference's cssColor()/var()-unwrapping prop indirection — so the
//     identical game automatically matches whichever theme
//     (professional/personal/lab) it's opened from, with no per-theme
//     config needed. The unused unwrap helper was dropped as dead code
//     once colors stopped arriving as var(...) strings.
// (2) The reference's host div had a hardcoded minWidth:1200/
//     minHeight:800 — dropped for a genuinely responsive modal panel,
//     since this site is tested down to 375px throughout and a fixed
//     1200px box would force horizontal overflow on a phone.
//
// Reuses this site's own established modal shell (open/close, focus
// trap, Escape, backdrop click — the exact pattern contact-modal.js
// already uses) rather than building new modal plumbing from scratch.
(function () {
  var GLYPHS = {
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
    J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
    "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
    "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    ".": ["00000", "00000", "00000", "00000", "00000", "00000", "00100"],
    ":": ["00000", "00100", "00000", "00000", "00000", "00100", "00000"],
  };
  var GW = 5;
  var GH = 7;

  function chars(title, fallback) {
    var src = (title || "")
      .toUpperCase()
      .split("")
      .filter(function (c) {
        return GLYPHS[c];
      });
    return src.length ? src : fallback.split("");
  }

  function drawGlyph(ctx, ch, cx, cy, px) {
    var bits = GLYPHS[ch];
    if (!bits) return;
    var x0 = cx - (GW * px) / 2;
    var y0 = cy - (GH * px) / 2;
    for (var r = 0; r < GH; r++) {
      for (var c = 0; c < GW; c++) {
        if (bits[r][c] === "1") ctx.fillRect(x0 + c * px, y0 + r * px, px + 0.4, px + 0.4);
      }
    }
  }

  function drawText(ctx, s, x, y, px) {
    var t = String(s).toUpperCase();
    var ox = x;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (ch === " ") {
        ox += 4 * px;
        continue;
      }
      var bits = GLYPHS[ch];
      if (!bits) {
        ox += (GW + 1) * px;
        continue;
      }
      for (var r = 0; r < GH; r++) {
        for (var c = 0; c < GW; c++) {
          if (bits[r][c] === "1") ctx.fillRect(ox + c * px, y + r * px, px, px);
        }
      }
      ox += (GW + 1) * px;
    }
    return ox - x;
  }

  function textWidth(s, px) {
    var t = String(s).toUpperCase();
    var w = 0;
    for (var i = 0; i < t.length; i++) {
      w += (t[i] === " " ? 4 : GW + 1) * px;
    }
    return Math.max(0, w - px);
  }

  function segDist(ax, ay, bx, by, px, py) {
    var dx = bx - ax;
    var dy = by - ay;
    var len2 = dx * dx + dy * dy;
    var t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  var GRAVITY = 900;
  var SPAWN_EVERY = 0.95;
  var RAMP = 0.012;
  var MAX_RAMP = 2.2;
  var TRAIL_LIFE = 0.22;
  var COMBO_WINDOW = 0.45;
  var SELF_SPEED = 760;
  var SELF_REST = 0.88;
  var OVER_AUTOPLAY = 2.4;
  var IDLE_RESUME = 12;

  function newWorld(lives) {
    return {
      pieces: [],
      halves: [],
      trail: [],
      score: 0,
      best: 0,
      combo: 0,
      comboT: 0,
      lives: lives,
      livesSet: lives,
      over: false,
      overT: 0,
      spawnIn: 0,
      played: false,
      idle: 0,
      flash: 0,
      aimX: 0,
      aimY: 0,
      prevX: 0,
      prevY: 0,
      layoutKey: "",
    };
  }

  // Reads the current page's own theme tokens so the identical game
  // matches professional/personal/lab automatically, no per-theme
  // config needed.
  function themeColors() {
    // Every theme (.theme-home/.theme-professional/.theme-personal)
    // scopes --bg/--text/--accent to the class on <body>, not :root —
    // reading document.documentElement (html, --bg/--text/--accent's
    // own ancestor, not a descendant of the scoping class) sees nothing
    // and silently falls back to the light-theme defaults below on
    // every page, which is real, confirmed via computed style on
    // /life/: getComputedStyle(document.documentElement) reported an
    // empty string for --bg where getComputedStyle(document.body)
    // correctly reported #0f1419.
    var cs = getComputedStyle(document.body);
    function tok(name, fallback) {
      var v = cs.getPropertyValue(name);
      return v && v.trim() ? v.trim() : fallback;
    }
    return {
      background: tok("--bg", "#ffffff"),
      ink: tok("--text", "#14171c"),
      accent: tok("--accent", "#1d4ed8"),
    };
  }

  var TITLE = "BHAVESH";
  var BOMB_PERCENT = 14;
  var LIVES = 3;

  var engine = null; // built once, first time the modal opens

  function buildEngine(host, canvas) {
    var ctx = canvas.getContext("2d");
    var w = 0;
    var h = 0;
    var world = newWorld(LIVES);
    var rafId = null;
    var last = 0;
    var hovering = false;
    var stroke = [];
    var wantRestart = false;
    var running = false;
    var colors = themeColors();

    function measure() {
      var cw = Math.max(1, canvas.clientWidth || host.offsetWidth);
      var ch = Math.max(1, canvas.clientHeight || host.offsetHeight);
      if (cw === w && ch === h) return false;
      w = cw;
      h = ch;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function gpx() {
      return Math.max(2, Math.min(w, h) * 0.017);
    }
    function radius() {
      return (gpx() * GH) / 2 + 4;
    }
    function ramp() {
      return Math.min(MAX_RAMP, 1 + RAMP * world.score);
    }

    function throwOne(apex) {
      var g = GRAVITY;
      var rise = h * apex;
      var vy = -Math.sqrt(2 * g * rise);
      var cs = chars(TITLE, "SLICE");
      var x = w * (0.14 + Math.random() * 0.72);
      world.pieces.push({
        x: x,
        y: h + radius(),
        vx: (w / 2 - x) * 0.28 + (Math.random() - 0.5) * 90,
        vy: vy,
        rot: Math.random() * 6.283,
        vr: (Math.random() - 0.5) * 3.4,
        ch: cs[Math.floor(Math.random() * cs.length)],
        bomb: Math.random() < Math.max(0, Math.min(60, Math.round(BOMB_PERCENT))) / 100,
      });
    }

    function wave() {
      var n = 2 + Math.floor(Math.random() * 3);
      for (var i = 0; i < n; i++) throwOne(0.5 + Math.random() * 0.24);
    }

    function restart() {
      world.best = Math.max(world.best, world.score);
      world.score = 0;
      world.combo = 0;
      world.comboT = 0;
      world.lives = Math.max(1, Math.round(LIVES));
      world.livesSet = world.lives;
      world.over = false;
      world.overT = 0;
      world.pieces = [];
      world.halves = [];
      world.trail = [];
      world.spawnIn = SPAWN_EVERY;

      wave();
      for (var i = 0; i < world.pieces.length; i++) {
        var p = world.pieces[i];
        var t = 0.35 + Math.random() * 0.3;
        p.x += p.vx * t;
        p.y += p.vy * t + 0.5 * GRAVITY * t * t;
        p.vy += GRAVITY * t;
        p.rot += p.vr * t;
      }
    }

    function layout(force) {
      var key = TITLE + "|" + Math.round(w) + "x" + Math.round(h);
      if (!force && key === world.layoutKey) return;
      world.layoutKey = key;
      restart();
    }

    function cut(i, ang) {
      var p = world.pieces[i];
      world.pieces.splice(i, 1);

      if (p.bomb) {
        world.lives--;
        world.flash = 1;
        world.combo = 0;
        if (world.lives <= 0) {
          world.over = true;
          world.overT = 0;
          world.best = Math.max(world.best, world.score);
        }
        return;
      }

      world.comboT = COMBO_WINDOW;
      world.combo++;
      world.score += world.combo;

      var nx = Math.cos(ang + Math.PI / 2);
      var ny = Math.sin(ang + Math.PI / 2);
      var kick = 150 + Math.random() * 90;
      for (var s = 0; s <= 1; s++) {
        var sign = s === 0 ? -1 : 1;
        world.halves.push({
          x: p.x,
          y: p.y,
          vx: p.vx + nx * kick * sign,
          vy: p.vy + ny * kick * sign,
          rot: p.rot,
          vr: p.vr + sign * 2.2,
          ch: p.ch,
          cutA: ang - p.rot,
          side: s,
          life: 1.4,
        });
      }
    }

    function sweep(ax, ay, bx, by) {
      var r = radius();
      for (var i = world.pieces.length - 1; i >= 0; i--) {
        var p = world.pieces[i];
        if (segDist(ax, ay, bx, by, p.x, p.y) > r) continue;
        cut(i, Math.atan2(by - ay, bx - ax));
      }
    }

    function step(dt) {
      var mul = 1;

      if (hovering) {
        world.played = true;
        world.idle = 0;
      }
      world.idle += dt;
      if (world.idle > IDLE_RESUME) world.played = false;

      if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 3);
      if (world.comboT > 0) {
        world.comboT -= dt;
        if (world.comboT <= 0) world.combo = 0;
      }

      for (var i = 2; i < world.trail.length; i += 3) world.trail[i] += dt;
      while (world.trail.length && world.trail[2] > TRAIL_LIFE) world.trail.splice(0, 3);

      if (world.over) {
        stroke.length = 0;
        world.overT += dt;

        for (var qi = 0; qi < world.halves.length; qi++) {
          var q = world.halves[qi];
          q.vy += GRAVITY * mul * dt;
          q.x += q.vx * mul * dt;
          q.y += q.vy * mul * dt;
          q.rot += q.vr * mul * dt;
          q.life -= dt;
        }
        var auto = !world.played && world.overT > OVER_AUTOPLAY;
        if (wantRestart || auto) {
          wantRestart = false;
          restart();
        }
        return;
      }
      wantRestart = false;

      var g = GRAVITY * mul;
      for (var pi = 0; pi < world.pieces.length; pi++) {
        var p = world.pieces[pi];
        p.vy += g * dt;
        p.x += p.vx * mul * dt;
        p.y += p.vy * mul * dt;
        p.rot += p.vr * mul * dt;
      }
      for (var hi = 0; hi < world.halves.length; hi++) {
        var h2 = world.halves[hi];
        h2.vy += g * dt;
        h2.x += h2.vx * mul * dt;
        h2.y += h2.vy * mul * dt;
        h2.rot += h2.vr * mul * dt;
        h2.life -= dt;
      }

      var r = radius();
      for (var pj = world.pieces.length - 1; pj >= 0; pj--) {
        if (world.pieces[pj].y - r > h + 40) world.pieces.splice(pj, 1);
      }
      for (var hj = world.halves.length - 1; hj >= 0; hj--) {
        if (world.halves[hj].life <= 0 || world.halves[hj].y - r > h + 60) world.halves.splice(hj, 1);
      }

      world.spawnIn -= dt * mul * ramp();
      if (world.spawnIn <= 0) {
        world.spawnIn = SPAWN_EVERY;
        wave();
      }

      if (world.played) {
        for (var si = 0; si + 1 < stroke.length; si += 2) {
          var ax = si === 0 ? world.prevX : stroke[si - 2];
          var ay = si === 0 ? world.prevY : stroke[si - 1];
          var bx = stroke[si];
          var by = stroke[si + 1];
          world.trail.push(bx, by, 0);
          if (ax || ay) sweep(ax, ay, bx, by);
          world.prevX = bx;
          world.prevY = by;
        }
        stroke.length = 0;
      } else {
        stroke.length = 0;

        var best = null;
        var bs = -Infinity;
        for (var bi = 0; bi < world.pieces.length; bi++) {
          var bp = world.pieces[bi];
          if (bp.y > h * 0.72) continue;
          var sc = -Math.abs(bp.vy) - Math.abs(bp.x - world.aimX) * 0.35;
          if (sc > bs) {
            bs = sc;
            best = bp;
          }
        }
        var tx = best ? best.x : w / 2;
        var ty = best ? best.y : h * SELF_REST;
        var px = world.aimX;
        var py = world.aimY;
        var dx = tx - px;
        var dy = ty - py;
        var d = Math.hypot(dx, dy);
        var stepLen = Math.min(d, SELF_SPEED * mul * dt);
        if (d > 0.001) {
          world.aimX = px + (dx / d) * stepLen;
          world.aimY = py + (dy / d) * stepLen;
          world.trail.push(world.aimX, world.aimY, 0);
          sweep(px, py, world.aimX, world.aimY);
        }
        world.prevX = world.aimX;
        world.prevY = world.aimY;
      }
    }

    function paintHalf(q, px, col) {
      var R = px * GH * 1.2;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.beginPath();
      ctx.save();
      ctx.rotate(q.cutA);
      ctx.rect(-R, q.side === 0 ? -R : 0, 2 * R, R);
      ctx.restore();
      ctx.clip();
      ctx.fillStyle = col;
      drawGlyph(ctx, q.ch, 0, 0, px);
      ctx.restore();
    }

    function paint() {
      var px = gpx();
      var u = Math.min(w, h);

      ctx.globalAlpha = 1;
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, w, h);

      for (var qi = 0; qi < world.halves.length; qi++) {
        var q = world.halves[qi];
        ctx.globalAlpha = Math.max(0, Math.min(1, q.life / 0.6));
        paintHalf(q, px, colors.ink);
      }
      ctx.globalAlpha = 1;

      for (var pi = 0; pi < world.pieces.length; pi++) {
        var p = world.pieces[pi];
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.bomb) {
          ctx.fillStyle = colors.accent;
          ctx.beginPath();
          ctx.arc(0, 0, px * GH * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = colors.background;
          drawGlyph(ctx, "X", 0, 0, px * 0.62);
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -px * GH * 0.42);
          ctx.lineTo(px * 1.6, -px * GH * 0.72);
          ctx.stroke();
        } else {
          ctx.fillStyle = colors.ink;
          drawGlyph(ctx, p.ch, 0, 0, px);
        }
        ctx.restore();
      }

      var tr = world.trail;
      if (tr.length >= 6) {
        ctx.strokeStyle = colors.accent;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (var i = 3; i < tr.length; i += 3) {
          var age = tr[i + 2];
          var k = Math.max(0, 1 - age / TRAIL_LIFE);
          ctx.globalAlpha = k * 0.9;
          ctx.lineWidth = Math.max(1, u * 0.014 * k);
          ctx.beginPath();
          ctx.moveTo(tr[i - 3], tr[i - 2]);
          ctx.lineTo(tr[i], tr[i + 1]);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineCap = "butt";
        ctx.lineJoin = "miter";
      }

      // Score / lives HUD — not in the reference (which relied on a
      // surrounding page for this), added since the game stands alone
      // in a modal here with nothing else showing the player's state.
      ctx.globalAlpha = 1;
      var hp = Math.max(3, Math.round(u * 0.03));
      ctx.fillStyle = colors.ink;
      drawText(ctx, "SCORE " + world.score, 14, 14, hp);
      var livesStr = "";
      for (var li = 0; li < world.livesSet; li++) livesStr += li < world.lives ? "X" : "-";
      ctx.fillStyle = colors.accent;
      drawText(ctx, livesStr, w - 14 - textWidth(livesStr, hp), 14, hp);

      if (world.over) {
        var bp2 = Math.max(4, Math.min(10, Math.round(w / 150)));
        var s = "GAME OVER";
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.accent;
        drawText(ctx, s, (w - textWidth(s, bp2)) / 2, h / 2 - GH * bp2, bp2);
        var sub = "SCORE " + world.score;
        var spx = Math.max(2, Math.round(bp2 / 2));
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = colors.ink;
        drawText(ctx, sub, (w - textWidth(sub, spx)) / 2, h / 2 + GH * bp2 * 0.6, spx);
        ctx.globalAlpha = 1;
      }

      if (world.flash > 0) {
        ctx.globalAlpha = world.flash * 0.32;
        ctx.fillStyle = colors.accent;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }
    }

    var ro = new ResizeObserver(function () {
      if (measure()) {
        layout(true);
        paint();
      }
    });

    function onMove(e) {
      var rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      var x = ((e.clientX - rect.left) / rect.width) * canvas.clientWidth;
      var y = ((e.clientY - rect.top) / rect.height) * canvas.clientHeight;
      stroke.push(x, y);
      if (stroke.length > 64) stroke.splice(0, stroke.length - 64);
      hovering = true;
      world.played = true;
      world.idle = 0;
    }
    function onDown(e) {
      wantRestart = true;
      onMove(e);
    }
    function onEnter() {
      hovering = true;
      world.played = true;
      world.idle = 0;
    }
    function onLeave() {
      hovering = false;
      world.prevX = 0;
      world.prevY = 0;
    }

    function frame(now) {
      var prev = last || now;
      last = now;
      var dt = Math.min(0.05, (now - prev) / 1000);
      layout(false);
      if (dt > 0) step(dt);
      paint();
      rafId = requestAnimationFrame(frame);
    }

    return {
      start: function () {
        if (running) return;
        running = true;
        colors = themeColors();
        ro.observe(host);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerdown", onDown);
        host.addEventListener("pointerenter", onEnter);
        host.addEventListener("pointerleave", onLeave);
        measure();
        layout(true);
        world.aimX = w / 2;
        world.aimY = h * 0.8;
        paint();
        last = 0;
        rafId = requestAnimationFrame(frame);
      },
      stop: function () {
        if (!running) return;
        running = false;
        ro.disconnect();
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerdown", onDown);
        host.removeEventListener("pointerenter", onEnter);
        host.removeEventListener("pointerleave", onLeave);
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
      },
    };
  }

  // Modal open/close — mirrors contact-modal.js's own shell (hidden
  // attribute + .is-open transition class, focus trap, Escape, backdrop
  // click) exactly, so this doesn't invent a second modal pattern.
  var modal = document.querySelector("[data-slice-blade-modal]");
  if (!modal) return;
  var panel = modal.querySelector(".slice-blade-panel");
  var host = modal.querySelector("[data-slice-blade-host]");
  var canvas = modal.querySelector("[data-slice-blade-canvas]");
  var openers = document.querySelectorAll("[data-slice-blade-open]");
  var closers = modal.querySelectorAll("[data-slice-blade-close]");
  var lastFocused = null;
  var closeTimer = 0;

  function focusable() {
    return Array.prototype.slice
      .call(panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) {
        return el.offsetParent !== null;
      });
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key !== "Tab") return;
    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open(event) {
    if (event) event.preventDefault();
    lastFocused = document.activeElement;
    clearTimeout(closeTimer);
    modal.hidden = false;
    void modal.offsetWidth;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeydown);

    if (!engine) engine = buildEngine(host, canvas);
    // Canvas can't measure a real size while [hidden] — start once the
    // panel is actually visible, same reflow-then-act pattern used
    // throughout this codebase for exactly this class of bug.
    requestAnimationFrame(function () {
      engine.start();
    });

    var closeBtn = panel.querySelector(".slice-blade-close");
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    if (engine) engine.stop();
    closeTimer = setTimeout(function () {
      modal.hidden = true;
    }, 200);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  Array.prototype.forEach.call(openers, function (el) {
    el.addEventListener("click", open);
  });
  Array.prototype.forEach.call(closers, function (el) {
    el.addEventListener("click", close);
  });
})();
