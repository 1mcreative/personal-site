/* Glide — a paper plane steering through gates. Loop shape (gravity, autopilot
   demo, scrolling obstacles) follows a pasted Originkit "Flap" reference, but
   the look is its own: plane, rounded gates with accent caps, drifting dots.
   Colors come from the page's own theme tokens on <body>. */
(function () {
  var modal = document.querySelector("[data-glide-modal]");
  if (!modal) return;
  var panel = modal.querySelector(".slice-blade-panel");
  var host = modal.querySelector("[data-glide-host]");
  var canvas = modal.querySelector("[data-glide-canvas]");
  var scoreEl = modal.querySelector("[data-glide-score]");
  var bestEl = modal.querySelector("[data-glide-best]");
  var hintEl = modal.querySelector("[data-glide-hint]");
  var ctx = canvas.getContext("2d");

  var SCROLL = 230, SPACING = 360, PILLAR_W = 92, GRAV = 1750, FLAP = 560;
  var BIRD_X = 0.28, BIRD_R = 15, IDLE_RESUME = 3, GAP = 0.39;

  var w = 0, h = 0, raf = 0, last = 0, running = false, colors;
  var world = { pillars: [], y: 0, vy: 0, score: 0, best: 0, flash: 0, played: false, idle: 0, dist: 0, over: false, started: false };

  function theme() {
    var cs = getComputedStyle(document.body);
    function tok(n, f) { var v = cs.getPropertyValue(n); return v && v.trim() ? v.trim() : f; }
    return { bg: tok("--bg", "#fff"), ink: tok("--text", "#14171c"), accent: tok("--accent", "#1d4ed8") };
  }

  function measure() {
    var cw = Math.max(1, host.clientWidth), ch = Math.max(1, host.clientHeight);
    if (cw === w && ch === h) return false;
    w = cw; h = ch;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function reset() {
    world.pillars = [];
    for (var i = 0; i < 6; i++) world.pillars.push({ x: w + 220 + i * SPACING, gap: 0.28 + Math.random() * 0.44, scored: false });
    world.y = h / 2; world.vy = 0;
    world.best = Math.max(world.best, world.score);
    world.score = 0; world.started = false;
    hud();
  }

  function hud() {
    scoreEl.textContent = "Score " + world.score;
    bestEl.textContent = "Best " + Math.max(world.best, world.score);
  }

  function flap(byUser) {
    if (world.over) return;
    if (byUser) {
      world.played = true; world.idle = 0;
      if (hintEl) hintEl.hidden = true;
    }
    world.started = true;
    world.vy = -FLAP;
  }

  function gameOver() {
    world.over = true; world.flash = 0;
    world.best = Math.max(world.best, world.score);
    hud();
    share.score.textContent = world.score;
    share.note.textContent = "";
    share.wrap.hidden = false;
  }

  function playAgain() {
    world.over = false; world.played = false; world.score = 0;
    share.wrap.hidden = true;
    reset();
    flap(true); // straight into a human run, not the demo
  }

  function step(dt) {
    if (world.over) return;
    var gapPx = h * GAP, bx = w * BIRD_X;
    world.idle += dt; world.dist += SCROLL * dt;
    if (world.idle > IDLE_RESUME) { world.played = false; if (hintEl) hintEl.hidden = false; }
    if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 3);

    if (!world.played) { // autopilot demo
      var next = null;
      world.pillars.forEach(function (p) { if (p.x + PILLAR_W > bx - BIRD_R && (!next || p.x < next.x)) next = p; });
      var target = next ? next.gap * h - gapPx * 0.12 : h / 2;
      if (world.y > target && world.vy > -60) flap(false);
      world.started = true;
    }

    if (!world.started) {
      world.y = h / 2 + Math.sin(performance.now() / 520) * 14; world.vy = 0;
    } else {
      world.vy += GRAV * dt; world.y += world.vy * dt;
    }

    world.pillars.forEach(function (p) {
      p.x -= SCROLL * dt;
      if (!p.scored && p.x + PILLAR_W < bx) { p.scored = true; world.score++; hud(); }
    });
    world.pillars.forEach(function (p) {
      if (p.x + PILLAR_W < -40) {
        var far = 0;
        world.pillars.forEach(function (q) { far = Math.max(far, q.x); });
        p.x = far + SPACING; p.gap = 0.28 + Math.random() * 0.44; p.scored = false;
      }
    });

    var dead = world.y < BIRD_R || world.y > h - BIRD_R;
    if (!dead) {
      for (var i = 0; i < world.pillars.length; i++) {
        var p = world.pillars[i];
        if (bx + BIRD_R < p.x || bx - BIRD_R > p.x + PILLAR_W) continue;
        var gy = p.gap * h;
        if (world.y - BIRD_R < gy - gapPx / 2 || world.y + BIRD_R > gy + gapPx / 2) { dead = true; break; }
      }
    }
    if (dead) {
      world.flash = 1;
      if (world.played) return gameOver(); // a human run ends in the share panel; demo deaths just restart
      reset();
    }
  }

  function paint() {
    var gapPx = h * GAP, bx = w * BIRD_X;
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = colors.ink;
    ctx.globalAlpha = 0.12;
    for (var d = 0; d < 14; d++) { // parallax dots, no state needed
      var dx = ((d * 137 - world.dist * (0.15 + (d % 3) * 0.1)) % w + w) % w;
      ctx.fillRect(dx, (d * 89) % h, 3, 3);
    }
    ctx.globalAlpha = 1;
    world.pillars.forEach(function (p) {
      if (p.x > w || p.x + PILLAR_W < 0) return;
      var gy = p.gap * h, topH = gy - gapPx / 2, botY = gy + gapPx / 2, r = PILLAR_W / 2;
      ctx.fillStyle = colors.ink;
      if (topH > 0) { ctx.beginPath(); ctx.roundRect(p.x, -r, PILLAR_W, topH + r, r); ctx.fill(); }
      if (botY < h) { ctx.beginPath(); ctx.roundRect(p.x, botY, PILLAR_W, h - botY + r, r); ctx.fill(); }
      ctx.fillStyle = colors.accent; // bright rim on each gate lip
      if (topH > 0) ctx.fillRect(p.x + 10, topH - 4, PILLAR_W - 20, 4);
      if (botY < h) ctx.fillRect(p.x + 10, botY, PILLAR_W - 20, 4);
    });
    ctx.save();
    ctx.translate(bx, world.y);
    ctx.rotate(Math.max(-0.5, Math.min(1.1, world.vy / 900)));
    ctx.fillStyle = colors.accent; // paper plane
    ctx.beginPath(); ctx.moveTo(BIRD_R * 1.4, 0); ctx.lineTo(-BIRD_R, -BIRD_R * 0.9); ctx.lineTo(-BIRD_R * 0.4, 0); ctx.lineTo(-BIRD_R, BIRD_R * 0.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = colors.bg; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.moveTo(BIRD_R * 1.4, 0); ctx.lineTo(-BIRD_R * 0.4, 0); ctx.lineTo(-BIRD_R, BIRD_R * 0.9); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
    if (world.over) { // dim + score, redrawn every frame so a screenshot includes it
      ctx.fillStyle = colors.bg; ctx.globalAlpha = 0.6; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
      ctx.fillStyle = colors.ink; ctx.textAlign = "center";
      ctx.font = "700 " + Math.round(Math.min(w / 9, 56)) + "px sans-serif";
      ctx.fillText("GAME OVER", w / 2, h * 0.3);
      ctx.font = "600 " + Math.round(Math.min(w / 16, 28)) + "px sans-serif";
      ctx.fillText("Score " + world.score + " \u00b7 Glide", w / 2, h * 0.3 + 40);
    }
    if (world.flash > 0) {
      ctx.globalAlpha = world.flash * 0.35; ctx.fillStyle = colors.accent; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (measure()) reset();
    if (dt > 0) step(dt);
    paint();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    colors = theme(); measure(); world.over = false; world.played = false; share.wrap.hidden = true; reset();
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  canvas.addEventListener("pointerdown", function (e) { e.preventDefault(); flap(true); });

  var share = {
    wrap: modal.querySelector("[data-glide-share]"),
    score: modal.querySelector("[data-glide-share-score]"),
    note: modal.querySelector("[data-glide-share-note]"),
  };
  function sbtn(n) { return modal.querySelector("[data-glide-share-" + n + "]"); }
  function shareUrl() {
    var p = new URLSearchParams(location.search); p.set("glide", world.score);
    return location.origin + location.pathname + "?" + p.toString();
  }
  function shareText() { return "I scored " + world.score + " in Glide! Can you beat me?"; }
  function shot(cb) { canvas.toBlob(cb, "image/png"); }
  function save(done) {
    shot(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "glide-score.png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href); done();
    });
  }
  function nativeShare() {
    var payload = { title: "Glide", text: shareText(), url: shareUrl() };
    shot(function (blob) {
      var f = blob ? new File([blob], "glide-score.png", { type: "image/png" }) : null;
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) payload.files = [f];
      navigator.share(payload).catch(function () {});
    });
  }
  if (navigator.share) sbtn("native").hidden = false;
  sbtn("native").addEventListener("click", nativeShare);
  sbtn("whatsapp").addEventListener("click", function () {
    window.open("https://wa.me/?text=" + encodeURIComponent(shareText() + " " + shareUrl()), "_blank", "noopener");
  });
  sbtn("linkedin").addEventListener("click", function () {
    window.open("https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(shareUrl()), "_blank", "noopener");
  });
  sbtn("copy").addEventListener("click", function () {
    var u = shareUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(u).then(function () { share.note.textContent = "Link copied!"; }, function () { share.note.textContent = u; });
    } else share.note.textContent = u;
  });
  sbtn("save").addEventListener("click", function () { save(function () { share.note.textContent = "Image saved."; }); });
  // Instagram has no web share intent: native sheet if present, else save the image.
  sbtn("instagram").addEventListener("click", function () {
    if (navigator.share) nativeShare();
    else save(function () { share.note.textContent = "Image saved. Open Instagram and share it from your gallery."; });
  });
  modal.querySelector("[data-glide-again]").addEventListener("click", function () {
    playAgain();
    panel.querySelector(".slice-blade-close").focus();
  });

  // Modal shell mirrors slice-blade.js (hidden + .is-open, Escape, focus trap).
  var lastFocused = null, closeTimer = 0;
  function onKeydown(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.code === "Space" || e.key === "ArrowUp") {
      if (world.over) return; // let Space press the focused share button
      e.preventDefault(); flap(true); return;
    }
    if (e.key !== "Tab") return;
    var items = [].slice.call(panel.querySelectorAll("button:not([disabled])"));
    var first = items[0], lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  }
  function open(e) {
    if (e) e.preventDefault();
    // Opened from inside Slice Blade: close that one first so two games never run at once.
    var sb = document.querySelector("[data-slice-blade-modal]:not([hidden]) [data-slice-blade-close].slice-blade-close");
    if (sb) sb.click();
    lastFocused = document.activeElement;
    // Opened via the picker: its card is about to hide, so return focus to the real trigger.
    if (lastFocused.closest && lastFocused.closest("[data-game-picker]") && window.gamePickerOrigin) lastFocused = window.gamePickerOrigin;
    clearTimeout(closeTimer);
    modal.hidden = false; void modal.offsetWidth;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeydown);
    requestAnimationFrame(start);
    panel.querySelector(".slice-blade-close").focus();
  }
  function close() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    stop();
    closeTimer = setTimeout(function () { modal.hidden = true; }, 200);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  var friend = parseInt(new URLSearchParams(location.search).get("glide"), 10);
  if (friend > 0) {
    hintEl.textContent = "Beat my score: " + friend + "! Press Space, \u2191 or tap to climb.";
    setTimeout(open, 400);
  }
  [].forEach.call(document.querySelectorAll("[data-glide-open]"), function (el) { el.addEventListener("click", open); });
  [].forEach.call(modal.querySelectorAll("[data-glide-close]"), function (el) { el.addEventListener("click", close); });
})();
