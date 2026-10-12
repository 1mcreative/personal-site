// Weather segment (index.md/home.css: one of the .hero-status chips) — per
// explicit follow-up ("next step is showing weather info based on users
// location"). Location comes from assets/js/geo-locate.js's shared resolver
// (the browser's own precise Geolocation, when granted, falling back to an
// approximate IP lookup) rather than this file doing its own lookup; see
// that file's header comment for why sharing one resolver matters. The
// resulting lat/lon feeds Open-Meteo (free, keyless: this is a static site
// with no backend to keep a secret API key in, so a keyless API is the only
// kind that can safely live in client-side JS here).
//
// Fails silent and inert, same progressive-enhancement shape as every other
// effect on this page: the chip element doesn't exist at all until a
// successful fetch has real data to show, so a blocked request (ad blocker,
// offline, API down) just means one fewer chip, never a stuck spinner.
//
// How it looks has been through four passes: animated icons; a stick-figure
// person ("funny, not cute"); a chibi kid ("personality like a kid"); a cast
// of cartoon sun and cloud characters ("still looks kiddish, make it more
// mature and fun"). So the weather is now drawn as a sky, not a character:
// layered gradients, drifting cloud banks, stars, ridges and a few quiet
// surprises (a plane and its contrail on a clear day, a shooting star on a
// clear night, rain running down the glass, lightning that lights the
// clouds). It is the same scene at two sizes: a small round "orb", the
// glyph of the dock segment, and a wide header on the hover panel.
//
// The panel is deliberately small: the sky, the temperature, what it feels
// like, and one line of advice ("Take an umbrella", with the hour the rain is
// due). A full report was tried (humidity, wind, UV, sunrise, a twelve-hour
// chart) and cut: "we do not need to provide the whole weather info here,
// they can go to a weather website if they want the whole report".
(function () {
  var container = document.querySelector(".hero-status");
  if (!container) return;

  // ---------------------------------------------------------------- scenes
  // skyScene(kind, day, W, H, mini) returns the inside of an <svg viewBox="0 0
  // W H"> that is drawn 1:1, so a gradient or a star is the size it looks.
  // kind: clear | partly | cloudy | fog | rain | snow | storm. Everything
  // that moves is transform or opacity only (.sk-* in home.css) and stops
  // under reduced motion, leaving a still picture.
  // Seeded at random so two instances of this script (a hot reload, a test
  // page) never hand out the same gradient id twice.
  var skyCount = Math.floor(Math.random() * 1e6);
  function rng(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
  // Sky top, middle, bottom, then the far and near ridge, for day then night.
  var PAL = {
    clear: [["#2f7bff", "#6bb6ff", "#cfe8ff", "#5e9be0", "#2e6fb8"], ["#070a1f", "#141b52", "#343c8a", "#1b2260", "#0b1034"]],
    cloudy: [["#7d93b3", "#a9bad0", "#d6dfea", "#8ea3c0", "#5f7596"], ["#131a2e", "#222c47", "#3a4666", "#2a3552", "#141b30"]],
    fog: [["#aeb9c8", "#cdd5df", "#eef1f5", "#bcc6d3", "#9eabbd"], ["#1e2536", "#384256", "#5a6579", "#2b3447", "#1a2133"]],
    rain: [["#49597a", "#7a8cab", "#b4c2d6", "#66799b", "#3d4d6d"], ["#0d1224", "#1b2440", "#323e5f", "#222c48", "#0e1428"]],
    snow: [["#9fb0c7", "#cdd8e6", "#f0f4f9", "#cfd9e6", "#f6f9fc"], ["#1b2440", "#3a4a73", "#7384ad", "#55658f", "#8f9ec3"]],
    storm: [["#1f2638", "#3b4560", "#66728d", "#2c354c", "#171d2e"], ["#080b18", "#151b30", "#2b3452", "#1b2238", "#0a0e1c"]],
  };
  function cloudFill(kind, day, mini) {
    // At orb size the dark kinds would vanish into their own sky.
    if (mini && kind === "storm") return day ? ["#8d98b2", "#555f7a"] : ["#6a76a0", "#363f63"];
    if (mini && kind === "rain") return day ? ["#c4cfe0", "#8493ad"] : ["#7e8bb4", "#454f78"];
    if (mini && kind === "cloudy") return day ? ["#f3f7fb", "#b3c0d3"] : ["#8f9bc4", "#505a84"];
    if (kind === "storm") return day ? ["#4f5a76", "#262f49"] : ["#2b3352", "#10152a"];
    if (kind === "rain") return day ? ["#74839f", "#404d68"] : ["#3b4568", "#1a2038"];
    if (kind === "cloudy") return day ? ["#e3eaf3", "#a5b3c7"] : ["#69739a", "#323a5c"];
    if (kind === "snow") return day ? ["#f2f6fb", "#c1cddd"] : ["#6c78a2", "#3a4670"];
    return day ? ["#ffffff", "#d5e2f2"] : ["#5f6a96", "#2d3558"];
  }
  // One cumulus about 44 wide, centred on (0, 0). Every circle references one
  // gradient in the cloud's own units, so the puffs read as one body.
  var PUFF = '<ellipse cy="5" rx="21" ry="6.5"/><circle cx="-12" cy="2" r="7.5"/><circle cx="-1" cy="-3" r="10"/><circle cx="11" cy="1" r="8"/>';
  function cloud(uid, x, y, s, op, dur, delay) {
    return (
      '<g transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + s.toFixed(2) + ')" opacity="' + op + '">' +
      '<g class="sk-drift" style="animation-duration:' + dur + "s;animation-delay:-" + delay + 's" fill="url(#' + uid + 'c)">' + PUFF + "</g></g>"
    );
  }
  // A ridge line as a filled shape, and a function for its height at x.
  function ridge(W, H, base, amp, seed) {
    var r = rng(seed), a = r() * 6, b = r() * 6, c = r() * 6, pts = [];
    var fn = function (x) {
      return base + amp * (0.55 * Math.sin((x / W) * 5 + a) + 0.3 * Math.sin((x / W) * 11 + b) + 0.15 * Math.sin((x / W) * 23 + c));
    };
    for (var x = 0; x <= W + 3; x += 3) pts.push(x.toFixed(1) + " " + fn(x).toFixed(1));
    return { d: "M0 " + H + "L" + pts.join("L") + "L" + W + " " + H + "Z", y: fn };
  }
  function stars(W, H, n, avoidX, avoidY) {
    var r = rng(5), out = "";
    for (var i = 0; i < n; i++) {
      var x = r() * W, y = r() * H * 0.62;
      if (Math.hypot(x - avoidX, y - avoidY) < H * 0.2) continue;
      out +=
        '<circle class="sk-tw" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (0.35 + r() * 0.6).toFixed(2) +
        '" fill="#fff" style="animation-duration:' + (2 + r() * 3).toFixed(1) + "s;animation-delay:-" + (r() * 4).toFixed(1) + 's"/>';
    }
    return out;
  }
  // y0 is where the drops start, fall how far they travel (so the orb's start
  // under its cloud and stop at its bottom edge).
  function rain(W, H, n, y0, fall) {
    var r = rng(7), out = "";
    // share of the drops, width, length, fall time, opacity: far, mid, near
    [[0.45, 0.6, 5, 0.95, 0.32], [0.3, 0.85, 7, 0.7, 0.5], [0.25, 1.1, 10, 0.55, 0.72]].forEach(function (L) {
      for (var i = 0, c = Math.max(2, Math.round(n * L[0])); i < c; i++) {
        out +=
          '<g transform="translate(' + (r() * (W + 14) - 4).toFixed(1) + " " + y0 + ')"><path class="sk-rain" style="--dx:-' + (H * 0.18).toFixed(1) +
          "px;--dy:" + fall + "px;animation-duration:" + L[3] + "s;animation-delay:-" + (r() * L[3]).toFixed(2) + 's" d="M0 0l-' +
          (L[2] * 0.22).toFixed(1) + " " + L[2] + '" stroke="rgba(220,232,255,' + L[4] + ')" stroke-width="' + L[1] + '" stroke-linecap="round" fill="none"/></g>';
      }
    });
    return out;
  }
  function snow(W, H, n, y0, fall) {
    var r = rng(11), out = "";
    // share, radius, fall time, opacity: far, mid, near
    [[0.4, 0.7, 7.5, 0.55], [0.35, 1.1, 5.2, 0.8], [0.25, 1.7, 3.8, 0.95]].forEach(function (L) {
      for (var i = 0, c = Math.max(2, Math.round(n * L[0])); i < c; i++) {
        out +=
          '<g transform="translate(' + (r() * W).toFixed(1) + " " + y0 + ')"><g class="sk-fall" style="--dy:' + fall + "px;animation-duration:" + L[2] +
          "s;animation-delay:-" + (r() * L[2]).toFixed(2) + 's"><circle class="sk-sway" style="animation-duration:' + (2 + r() * 2).toFixed(1) +
          "s;animation-delay:-" + (r() * 3).toFixed(1) + 's" r="' + L[1] + '" fill="#fff" opacity="' + L[3] + '"/></g></g>';
      }
    });
    return out;
  }
  // Drops running down the glass: a bead, a highlight, a faint trail.
  function glass(W, H) {
    var r = rng(13), out = "";
    [0.12, 0.34, 0.55, 0.78, 0.92].forEach(function (f, i) {
      var y = r() * H * 0.35, d = 6 + r() * 6;
      out +=
        '<g transform="translate(' + (f * W).toFixed(1) + " " + y.toFixed(1) + ')"><g class="sk-slide" style="--dy:' + (H * 0.8).toFixed(0) +
        "px;animation-duration:" + d.toFixed(1) + "s;animation-delay:-" + (i * 1.7).toFixed(1) + 's">' +
        '<path d="M0 -1.4v-' + (5 + r() * 5).toFixed(1) + '" stroke="rgba(255,255,255,.16)" stroke-width="1.1" stroke-linecap="round"/>' +
        '<circle r="1.7" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.5)" stroke-width=".45"/>' +
        '<circle cx="-.5" cy="-.55" r=".5" fill="rgba(255,255,255,.85)"/></g></g>';
    });
    return out;
  }
  function skyScene(kind, day, W, H, mini) {
    var uid = "sk" + ++skyCount + "-";
    var P = PAL[kind === "partly" ? "clear" : kind][day ? 0 : 1];
    var cf = cloudFill(kind, day, mini);
    var u = H / 60;
    var cx = W * (mini ? 0.62 : 0.68), cy = H * (mini ? 0.38 : 0.3), r = Math.max(3.4, H * (mini ? 0.17 : 0.1));
    var body = { clear: 1, partly: 1, cloudy: 0.5, fog: 0.5 }[kind] || 0;
    var area = (W * H) / (92 * 76);
    var out =
      "<defs>" +
      '<linearGradient id="' + uid + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P[0] + '"/><stop offset=".6" stop-color="' + P[1] + '"/><stop offset="1" stop-color="' + P[2] + '"/></linearGradient>' +
      '<linearGradient id="' + uid + 'c" gradientUnits="userSpaceOnUse" x1="0" y1="-13" x2="0" y2="11"><stop offset="0" stop-color="' + cf[0] + '"/><stop offset="1" stop-color="' + cf[1] + '"/></linearGradient>' +
      '<radialGradient id="' + uid + 'g"><stop offset="0" stop-color="#fff6cf" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe08a" stop-opacity=".5"/><stop offset="1" stop-color="#ffd25a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + uid + 'h"><stop offset="0" stop-color="#b8c4ff" stop-opacity=".55"/><stop offset="1" stop-color="#b8c4ff" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + uid + 'f"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + uid + 't"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
      "</defs>" +
      '<rect width="' + W + '" height="' + H + '" fill="url(#' + uid + 's)"/>';

    // The sun or the moon, dimmed behind cloud or fog.
    if (body) {
      out += '<g opacity="' + body + '">';
      if (day) {
        var rays = "";
        for (var i = 0; i < 9; i++) {
          var a = (i * 40 * Math.PI) / 180, L = H * 1.1, s = 0.075;
          rays +=
            "M" + cx.toFixed(1) + " " + cy.toFixed(1) + "L" + (cx + Math.cos(a - s) * L).toFixed(1) + " " + (cy + Math.sin(a - s) * L).toFixed(1) +
            "L" + (cx + Math.cos(a + s) * L).toFixed(1) + " " + (cy + Math.sin(a + s) * L).toFixed(1) + "Z";
        }
        out +=
          '<circle class="sk-glow" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (r * 4.6).toFixed(1) + '" fill="url(#' + uid + 'g)"/>' +
          (mini ? "" : '<g class="sk-spin" style="transform-origin:' + cx.toFixed(1) + "px " + cy.toFixed(1) + 'px"><path d="' + rays + '" fill="rgba(255,255,255,.14)"/></g>') +
          '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#fff3c4"/><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (r * 0.72).toFixed(1) + '" fill="#ffd95a"/>';
      } else {
        out +=
          '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (r * 4).toFixed(1) + '" fill="url(#' + uid + 'h)"/>' +
          '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#f6f2e2"/>' +
          '<circle cx="' + (cx - r * 0.35).toFixed(1) + '" cy="' + (cy - r * 0.2).toFixed(1) + '" r="' + (r * 0.22).toFixed(1) + '" fill="rgba(150,150,175,.35)"/>' +
          '<circle cx="' + (cx + r * 0.3).toFixed(1) + '" cy="' + (cy + r * 0.32).toFixed(1) + '" r="' + (r * 0.3).toFixed(1) + '" fill="rgba(150,150,175,.3)"/>' +
          '<circle cx="' + (cx + r * 0.1).toFixed(1) + '" cy="' + (cy - r * 0.45).toFixed(1) + '" r="' + (r * 0.14).toFixed(1) + '" fill="rgba(150,150,175,.3)"/>';
      }
      out += "</g>";
    }
    if (!day && (kind === "clear" || kind === "partly")) {
      out += stars(W, H, mini ? 6 : Math.round(26 * area), cx, cy);
      if (kind === "clear" && !mini) {
        out +=
          '<g transform="translate(' + (W * 0.86).toFixed(1) + " " + (H * 0.1).toFixed(1) + ') rotate(152)"><g class="sk-shoot">' +
          '<rect x="-16" y="-.5" width="16" height="1" rx=".5" fill="url(#' + uid + 't)"/></g></g>';
      }
    }
    if (day && kind === "clear" && !mini) {
      out +=
        '<g transform="translate(-34 ' + (H * 0.2).toFixed(1) + ')"><g class="sk-plane" style="--dx:' + (W + 70) + "px;--dy:-" + (H * 0.1).toFixed(1) + 'px">' +
        '<path d="M-30 0h30" stroke="rgba(255,255,255,.55)" stroke-width=".9" stroke-linecap="round"/><ellipse rx="3.2" ry=".9" fill="#fff"/><path d="M-.4 0l-2.4-2.6h1.4l1.9 2.6z" fill="#fff"/></g></g>';
    }

    // Cloud banks: [x, y, scale, opacity, drift seconds, drift offset]
    var banks = (mini ? {
      partly: [[0.38, 0.64, 0.66, 1, 15, 0]],
      cloudy: [[0.34, 0.5, 0.78, 1, 15, 0], [0.74, 0.64, 0.56, 0.9, 18, 3]],
      fog: [[0.4, 0.42, 0.66, 0.7, 20, 2]],
      rain: [[0.5, 0.3, 0.95, 1, 16, 0]],
      snow: [[0.5, 0.3, 0.95, 1, 16, 0]],
      storm: [[0.5, 0.28, 1, 1, 14, 0]],
    } : {
      partly: [[0.9, 0.38, 0.6, 0.8, 19, 3], [0.64, 0.46, 1.1, 1, 15, 0]],
      cloudy: [[0.14, 0.4, 0.9, 0.7, 22, 5], [0.86, 0.46, 0.95, 0.75, 20, 2], [0.5, 0.32, 1.45, 1, 17, 0], [0.3, 0.6, 1.2, 1, 14, 6]],
      fog: [[0.3, 0.3, 1.2, 0.5, 24, 4], [0.76, 0.4, 1.1, 0.45, 21, 1]],
      rain: [[0.1, 0.14, 1.7, 1, 18, 2], [0.4, 0.1, 1.9, 1, 16, 0], [0.72, 0.14, 1.8, 1, 19, 5], [0.98, 0.1, 1.6, 1, 17, 3]],
      snow: [[0.14, 0.12, 1.5, 0.95, 20, 2], [0.5, 0.08, 1.8, 1, 17, 0], [0.86, 0.12, 1.5, 0.95, 19, 4]],
      storm: [[0.08, 0.14, 1.9, 1, 17, 1], [0.36, 0.08, 2.1, 1, 15, 0], [0.66, 0.14, 2, 1, 18, 4], [0.94, 0.1, 1.8, 1, 16, 2]],
    })[kind] || [];
    var cloudsAt = function () {
      var o = "";
      banks.forEach(function (b) {
        o += cloud(uid, b[0] * W, b[1] * H, b[2] * u, b[3], b[4], b[5]);
      });
      return o;
    };
    var mist = "";
    if (kind === "fog") {
      [[0.34, 0.12, 26, 0], [0.52, 0.14, 32, 6], [0.7, 0.11, 22, 3], [0.86, 0.1, 28, 9]].forEach(function (f) {
        mist +=
          '<ellipse class="sk-fog" cx="' + (W / 2).toFixed(1) + '" cy="' + (f[0] * H).toFixed(1) + '" rx="' + (W * 0.78).toFixed(1) + '" ry="' + (f[1] * H).toFixed(1) +
          '" fill="url(#' + uid + 'f)" style="animation-duration:' + f[2] + "s;animation-delay:-" + f[3] + 's"/>';
      });
    }

    if (mini) {
      // The orb has no ground: clouds, weather, done.
      out += cloudsAt();
      if (kind === "rain") out += rain(W, H, 8, H * 0.5, H * 0.55);
      if (kind === "snow") out += snow(W, H, 8, H * 0.5, H * 0.5);
      if (kind === "fog") out += mist;
      if (kind === "storm") {
        out +=
          rain(W, H, 5, H * 0.5, H * 0.55) +
          '<path class="sk-bolt" d="M' + (W * 0.56).toFixed(1) + " " + (H * 0.5).toFixed(1) + "L" + (W * 0.45).toFixed(1) + " " + (H * 0.7).toFixed(1) + "L" + (W * 0.54).toFixed(1) + " " + (H * 0.71).toFixed(1) + "L" + (W * 0.43).toFixed(1) + " " + (H * 0.94).toFixed(1) +
          '" fill="none" stroke="#ffd95a" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>' +
          '<rect class="sk-flash" width="' + W + '" height="' + H + '" fill="#dbe6ff"/>';
      }
      return out;
    }

    var far = ridge(W, H, H * 0.76, H * 0.1, 3), near = ridge(W, H, H * 0.88, H * 0.07, 9);
    out += cloudsAt();
    if (kind === "rain" || kind === "storm") out += rain(W, H, Math.round((kind === "storm" ? 34 : 24) * area), -12, H + 14);
    if (kind === "snow") out += snow(W, H, Math.round(30 * area), -4, H + 8);
    if (kind === "storm") {
      var B = function (fx, fy) {
        return (fx * W).toFixed(1) + " " + (fy * H).toFixed(1);
      };
      var bolt = "M" + B(0.62, 0.16) + "L" + B(0.56, 0.38) + "L" + B(0.61, 0.4) + "L" + B(0.5, 0.7) + "M" + B(0.56, 0.38) + "L" + B(0.67, 0.54);
      out +=
        '<g class="sk-bolt"><path d="' + bolt + '" fill="none" stroke="rgba(190,210,255,.5)" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="' + bolt + '" fill="none" stroke="#fff" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/></g>';
    }
    out += '<path d="' + far.d + '" fill="' + P[3] + '" opacity="' + (kind === "fog" ? 0.45 : 0.6) + '"/>';
    if (kind === "fog") out += mist;
    out += '<path d="' + near.d + '" fill="' + P[4] + '"/>';
    if (!day && kind !== "storm" && kind !== "snow") {
      var lr = rng(17);
      for (var k = 0; k < Math.round(8 * area); k++) {
        var lx = lr() * W;
        out +=
          '<circle class="sk-tw" cx="' + lx.toFixed(1) + '" cy="' + (near.y(lx) + 1.5 + lr() * H * 0.05).toFixed(1) + '" r=".55" fill="#ffd27a" style="animation-duration:' +
          (3 + lr() * 4).toFixed(1) + "s;animation-delay:-" + (lr() * 5).toFixed(1) + 's"/>';
      }
    }
    if (kind === "rain" || kind === "storm") out += glass(W, H);
    if (kind === "storm") out += '<rect class="sk-flash" width="' + W + '" height="' + H + '" fill="#dbe6ff"/>';
    // A faint sheen and edge, so the scene reads as glass.
    out +=
      '<path d="M0 0H' + (W * 0.5).toFixed(1) + "L" + (W * 0.12).toFixed(1) + " " + H + 'H0Z" fill="rgba(255,255,255,.05)"/>' +
      '<rect x=".5" y=".5" width="' + (W - 1) + '" height="' + (H - 1) + '" fill="none" stroke="rgba(255,255,255,.22)"/>';
    return out;
  }

  // ------------------------------------------------------------------ data
  // WMO weather codes (Open-Meteo's `weather_code`) collapsed into the scene
  // kinds above, grouped the way Open-Meteo's own docs group them:
  // https://open-meteo.com/en/docs's weather code table.
  function describe(code) {
    if (code === 0) return { kind: "clear", label: "Clear" };
    if (code === 1 || code === 2) return { kind: "partly", label: "Partly cloudy" };
    if (code === 3) return { kind: "cloudy", label: "Overcast" };
    if (code === 45 || code === 48) return { kind: "fog", label: "Foggy" };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { kind: "rain", label: "Rainy" };
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "snow", label: "Snowy" };
    if (code >= 95) return { kind: "storm", label: "Stormy" };
    return { kind: "cloudy", label: "Cloudy" };
  }
  // The one line at the bottom of the panel. First match wins; the weather
  // is the visitor's own, so "take an umbrella" is advice to them. `when` is
  // the hour the rain is due ("around 9 PM", or "now"), when it is due.
  function quip(w, kind, day, when) {
    var c = w.imperial ? ((w.temp - 32) * 5) / 9 : w.temp;
    var kmh = w.imperial ? w.wind * 1.609 : w.wind;
    var chance = w.rainChance || 0;
    if (kind === "storm") return "Stay in. Good weather to ship something.";
    if (kind === "rain") return "Take an umbrella.";
    if (chance >= 60) return when ? "Rain likely " + when + ". Take an umbrella." : "Take an umbrella.";
    if (kind === "snow") return "Bundle up out there.";
    if (kind === "fog") return "Visibility is low. Take it slow.";
    if (kmh >= 35) return "Windy. Hold onto your hat.";
    if (chance >= 30) return when ? "Might rain " + when + ". Keep an umbrella close." : "Might rain. Keep an umbrella close.";
    if (day && kind === "clear" && c >= 34) return "Hot one. Stay hydrated.";
    if (day && w.uv >= 8 && kind !== "cloudy") return "UV is high, sunscreen helps.";
    if (kind === "clear") return day ? "Good light out there." : "Clear skies tonight.";
    if (kind === "partly") return day ? "A bit of sun, a bit of cloud." : "A quiet night sky.";
    return day ? "Flat light today. Good for focus." : "A quiet night.";
  }

  function renderChip(w) {
    var meta = describe(w.code);
    var kind = meta.kind;
    var day = w.isDay;
    var chip = document.createElement("span");
    chip.className = "hero-status-chip hero-status-chip-dynamic hero-weather-chip";
    chip.setAttribute("data-wx", kind);

    var deg = "\u00b0";
    var light = (kind === "fog" || kind === "snow" || kind === "cloudy") && day;
    var when = "";
    if (w.rainAt != null) {
      var dt = new Date(w.rainAt.time);
      when = w.rainAt.index === 0 ? "now" : isNaN(dt) ? "" : "around " + new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(dt);
    }

    // Everything below is this file's own markup plus numbers from the API;
    // the one network string that is text (the city) goes in through
    // textContent afterwards.
    chip.innerHTML =
      '<svg class="hero-weather-orb" viewBox="0 0 28 28" aria-hidden="true">' + skyScene(kind, day, 28, 28, true) + "</svg>" +
      '<span class="hero-seg-val hero-weather-temp"></span>' +
      '<span class="hero-seg-sub"></span>' +
      '<span class="hero-pop hero-weather-pop">' +
      '<span class="wx-pop-sky' + (light ? " is-light" : "") + '"><svg viewBox="0 0 278 104" aria-hidden="true">' + skyScene(kind, day, 278, 104) + "</svg>" +
      '<span class="wx-pop-city"></span>' +
      '<span class="wx-pop-now"><b>' + Math.round(w.temp) + deg + "</b><span>" + meta.label +
      (w.feels != null ? ", feels like " + Math.round(w.feels) + deg : "") + "</span></span></span>" +
      '<span class="hero-pop-line">' + quip(w, kind, day, when) + "</span></span>";

    chip.querySelector(".hero-weather-temp").textContent = Math.round(w.temp) + deg + w.unit;
    chip.querySelector(".hero-seg-sub").textContent = meta.label;
    if (w.city) chip.querySelector(".wx-pop-city").textContent = w.city;

    container.appendChild(chip);
    // Flush layout so the fade-in below animates from the CSS's opacity:0
    // start state instead of jumping straight to visible, the same "force a
    // real paint first" pattern intro-sequence.js already uses for its own
    // FLIP morph.
    void chip.offsetWidth;
    chip.classList.add("hero-status-chip-in");
  }

  function fetchWeather(lat, lon, imperial, city) {
    var params =
      "latitude=" + encodeURIComponent(lat) + "&longitude=" + encodeURIComponent(lon) +
      "&current=temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m" +
      "&hourly=precipitation_probability&daily=temperature_2m_max,uv_index_max&timezone=auto&forecast_days=1";
    if (imperial) params += "&temperature_unit=fahrenheit&wind_speed_unit=mph";

    fetch("https://api.open-meteo.com/v1/forecast?" + params)
      .then(function (res) {
        return res.ok ? res.json() : Promise.reject(res.status);
      })
      .then(function (json) {
        var c = json && json.current;
        if (!c || typeof c.temperature_2m !== "number") return;
        var h = json.hourly || {}, d = json.daily || {}, rainChance = null, rainAt = null;
        // The hourly array starts at midnight today (location time); look at
        // the current hour and the twelve after it for the chance of rain,
        // and the first hour it gets close to that.
        var i0 = h.time ? h.time.indexOf(String(c.time).slice(0, 13) + ":00") : -1;
        if (i0 > -1 && h.precipitation_probability) {
          var pops = h.precipitation_probability.slice(i0, i0 + 13);
          rainChance = Math.max.apply(null, pops);
          if (rainChance >= 30) {
            var th = Math.max(30, Math.round(rainChance * 0.8));
            for (var i = 0; i < pops.length; i++) {
              if (pops[i] >= th) {
                rainAt = { index: i, time: h.time[i0 + i] };
                break;
              }
            }
          }
        }
        renderChip({
          temp: c.temperature_2m, feels: c.apparent_temperature, code: c.weather_code, isDay: c.is_day !== 0,
          wind: c.wind_speed_10m, unit: imperial ? "F" : "C", imperial: imperial, city: city,
          rainChance: rainChance, rainAt: rainAt, uv: d.uv_index_max && d.uv_index_max[0],
        });
      })
      .catch(function () {
        // Weather fetch failed: no chip, no error shown (see top comment).
      });
  }

  if (typeof window.resolveVisitorLocation !== "function") return;

  window.resolveVisitorLocation(function (loc) {
    if (!loc) return;
    // Fahrenheit and mph for a visitor geo-locate.js resolved as US-based,
    // Celsius and km/h otherwise: the same "match what the visitor is
    // already used to" reasoning the clock applies to 12h/24h.
    fetchWeather(loc.lat, loc.lon, !!loc.prefersImperial, loc.city);
  });
})();
