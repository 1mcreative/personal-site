// Weather chip (index.md/home.css: the second .hero-status chip,
// stacking below the clock) — per explicit follow-up ("next step is
// showing weather info based on users location"). Location comes from
// assets/js/geo-locate.js's shared resolver (the browser's own precise
// Geolocation, when granted, falling back to an approximate IP lookup)
// rather than this file doing its own lookup — see that file's header
// comment for why sharing one resolver matters once distance.js needed
// the identical location too. The resulting lat/lon feeds Open-Meteo
// (free, keyless — this is a static site with no backend to keep a
// secret API key in, so a keyless API is the only kind that can safely
// live in client-side JS here).
//
// Fails silent and inert, same progressive-enhancement shape as every
// other effect on this page: the chip element doesn't exist at all until
// a successful fetch has real data to show, so a blocked request (ad
// blocker, offline, either API down) just means one fewer chip, never a
// stuck spinner or a broken pill — unlike .hero-clock-time, which is
// always-present markup because Intl/Date can't fail this way.
(function () {
  var container = document.querySelector(".hero-status");
  if (!container) return;

  // Animated icon set, per "add weather animations like these"
  // (Iconscout's Seasons & Weather Lottie pack). That pack is licensed,
  // JS-rendered, and would make lottie-web this site's first runtime
  // dependency, so these are hand-built inline SVG moved by the CSS
  // keyframes in home.css (.wx-*: transform/opacity only, off under
  // reduced motion) — same zero-dependency approach as every other effect
  // here. Filled shapes in the site's own blue + amber instead of the old
  // single-color outlines, since a 16px stroke icon can't carry motion.
  // Geometry is all on a 24 grid; .wx marks anything a keyframe moves.
  var AMBER = "#f59e0b";
  var SKY = "#6ec1ff";
  var CLOUD_PATH = "M7 19h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.5 3.5 3.5 0 0 0 7 19Z";
  // Cloud body in its own <g> so the placement transform and the drift
  // keyframe's transform don't overwrite each other (CSS transform
  // replaces the SVG attribute rather than composing with it).
  function cloud(place, cls, stroke, fill) {
    return (
      '<g transform="' + place + '"><path class="wx ' + cls + '" d="' + CLOUD_PATH +
      '" fill="' + (fill || "#e6f0ff") + '" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round"/></g>'
    );
  }
  var RAIN_CLOUD = "translate(1.4 -3.4) scale(.9)";
  var MOON_PATH = "M20.3 14.7A8.5 8.5 0 1 1 11.9 3.5A7 7 0 0 0 20.3 14.7Z";
  // Four-point sparkle, concave sides, centered on (x, y).
  function spark(x, y, r, delay, col) {
    return (
      '<path class="wx wx-twinkle" style="animation-delay:' + delay + 's" fill="' + (col || SKY) + '" d="M' + x + " " + (y - r) +
      "Q" + x + " " + y + " " + (x + r) + " " + y + "Q" + x + " " + y + " " + x + " " + (y + r) +
      "Q" + x + " " + y + " " + (x - r) + " " + y + "Q" + x + " " + y + " " + x + " " + (y - r) + 'Z"/>'
    );
  }
  // All eight rays (even ones a cloud will hide) so the group's bounding
  // box stays centered on the sun and the spin pivots on it.
  function rays(cx, cy, from, to) {
    var d = "";
    for (var i = 0; i < 8; i++) {
      var a = (i * Math.PI) / 4;
      var c = Math.cos(a);
      var s = Math.sin(a);
      d += "M" + (cx + c * from).toFixed(2) + " " + (cy + s * from).toFixed(2) +
        "L" + (cx + c * to).toFixed(2) + " " + (cy + s * to).toFixed(2);
    }
    return '<g class="wx wx-spin"><path d="' + d + '" stroke="' + AMBER + '" stroke-width="1.8" stroke-linecap="round"/></g>';
  }
  var ICONS = {
    sun:
      rays(12, 12, 7.2, 9.6) +
      '<circle class="wx wx-breathe" cx="12" cy="12" r="4.6" fill="' + AMBER + '"/>',
    moon:
      '<g class="wx wx-sway"><path d="' + MOON_PATH + '" fill="' + AMBER + '"/></g>' +
      spark(18, 7.5, 2.6, 0) + spark(21, 3.8, 1.5, -1.1),
    "cloud-sun":
      rays(8.5, 8.5, 5.1, 7) +
      '<circle class="wx wx-breathe" cx="8.5" cy="8.5" r="3.4" fill="' + AMBER + '"/>' +
      cloud("translate(4.3 4.4) scale(.8)", "wx-drift", "currentColor"),
    "cloud-moon":
      '<g transform="translate(-.3 -.1) scale(.72)"><g class="wx wx-sway"><path d="' + MOON_PATH + '" fill="' + AMBER + '"/></g></g>' +
      spark(18.5, 5.5, 2, 0) +
      cloud("translate(4.3 4.4) scale(.8)", "wx-drift", "currentColor"),
    cloud:
      cloud("translate(7.5 .2) scale(.62)", "wx-drift wx-rev", SKY) +
      cloud("translate(-.4 3.6) scale(.86)", "wx-drift", "currentColor"),
    "cloud-fog":
      cloud("translate(1.9 -3.1) scale(.85)", "wx-drift", "currentColor") +
      '<g stroke="' + SKY + '" stroke-width="1.8" stroke-linecap="round">' +
      '<path class="wx wx-fog" d="M4 16.2h13"/>' +
      '<path class="wx wx-fog wx-rev" d="M8 19.2h12"/>' +
      '<path class="wx wx-fog" style="animation-delay:-1.2s" d="M5 22.2h9"/></g>',
    // Precipitation is drawn before the cloud so each drop emerges from
    // behind its lower edge instead of popping in on top of it.
    "cloud-rain":
      '<g stroke="' + SKY + '" stroke-width="2" stroke-linecap="round">' +
      '<path class="wx wx-fall" d="M8.2 16.4l-.9 2.6"/>' +
      '<path class="wx wx-fall" style="animation-delay:-.4s" d="M12.7 16.4l-.9 2.6"/>' +
      '<path class="wx wx-fall" style="animation-delay:-.75s" d="M17.2 16.4l-.9 2.6"/></g>' +
      cloud(RAIN_CLOUD, "wx-drift", "currentColor"),
    "cloud-snow":
      '<g fill="' + SKY + '">' +
      '<circle class="wx wx-snow" cx="8" cy="17" r="1.3"/>' +
      '<circle class="wx wx-snow" style="animation-delay:-.9s" cx="12" cy="18.5" r="1.3"/>' +
      '<circle class="wx wx-snow" style="animation-delay:-1.7s" cx="16" cy="17" r="1.3"/></g>' +
      cloud(RAIN_CLOUD, "wx-drift", "currentColor"),
    "cloud-lightning":
      '<g transform="translate(7 12.2) scale(.5)"><path class="wx wx-flash" d="M13 2L4 14h7l-1 8 10-13h-7Z" fill="' + AMBER +
      '" stroke="' + AMBER + '" stroke-width="2" stroke-linejoin="round"/></g>' +
      cloud(RAIN_CLOUD, "wx-drift", "currentColor"),
  };

  // Characters, per "add some character like" the Iconscout man-fighting-a-
  // thunderstorm Lottie (that page sits behind a bot check, so this is built
  // from the idea, not the file). Three passes so far. A stick-figure person
  // read as "funny, not cute"; a chibi kid was cute but "has a personality
  // like a kid, I don't like it", which also sat oddly on a senior
  // engineer's portfolio. So now the weather itself is the character, drawn
  // like the clock character beside it (thick ink outline, flat fills, big
  // glossy eyes, white gloves) so the tiles read as one cast: a bubbly sun
  // with a wave, a sleepy moon in a nightcap, a lazy overcast cloud that
  // yawns, a moody rain cloud, a cosy snow cloud in a beanie, a grumpy storm
  // cloud with its arms crossed. They float, blink, glance about and say
  // hello once when the tile appears and once when the pointer comes in (see
  // the end of renderChip), never on a loop. Tablet and up only (home.css
  // .hero-weather-scene); the compact mobile chip keeps the icons above.
  var INK = "#1f2733";
  var ROUND = ' stroke-linecap="round" stroke-linejoin="round"';
  var OUT = 2.4; // outline layer width: half of it shows outside the fill
  function line(col, w, d) {
    return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + ROUND + "/>";
  }
  // The outer <g> puts a joint at (x, y); the inner .wxc group rotates about
  // its own origin (home.css), so anything drawn hanging from (0, 0) swings
  // about that joint. --r is the resting angle, set inline; a class adds the
  // motion.
  function joint(x, y, cls, vars, inner) {
    return '<g transform="translate(' + x + " " + y + ')"><g class="wxc ' + cls + '" style="' + vars + '">' + inner + "</g></g>";
  }
  // A noodle arm from a shoulder at (x, y) with a white glove on the end.
  // --r hangs it out from the body; wxm-hi marks the arm that waves hello
  // (--s is its side, see home.css .is-hello).
  function arm(x, y, cls, vars) {
    var s = x < 0 ? -1 : 1;
    return joint(x, y, cls, vars,
      line(INK, 1.8, "M0 0Q" + 2.4 * s + " 4.6 0 8.8") + '<circle cy="10.6" r="3.1" fill="#fff" stroke="' + INK + '" stroke-width=".9"/>');
  }
  function arms(x, y, hi, rest) {
    rest = rest == null ? 22 : rest;
    return arm(-x, y, hi === "L" ? "wxm-hi" : "", "--r:" + rest + "deg;--s:-1") + arm(x, y, hi === "R" ? "wxm-hi" : "", "--r:" + -rest + "deg;--s:1");
  }
  // Big white eyes outlined in ink, pupils that drift side to side, and a
  // blink. `lid` (the body colour) drops a lid over the top half for sleepy
  // faces; brows are separate so a blink doesn't squash them.
  function eyes(o) {
    o = o || {};
    var gap = o.gap || 6.4, rx = o.rx || 4.5, ry = o.ry || 5.5, y = o.y == null ? -1 : o.y, out = "", sides = [-1, 1];
    sides.forEach(function (s) {
      out += '<ellipse cx="' + s * gap + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="#fff"/>';
    });
    out += '<g class="wxm-look">';
    sides.forEach(function (s) {
      var cx = s * gap;
      out += '<circle cx="' + cx + '" cy="' + (y + ry * 0.16).toFixed(2) + '" r="' + (rx * 0.6).toFixed(2) + '" fill="' + INK + '"/>' +
        '<circle cx="' + (cx - rx * 0.2).toFixed(2) + '" cy="' + (y - ry * 0.1).toFixed(2) + '" r="' + (rx * 0.2).toFixed(2) + '" fill="#fff"/>';
    });
    out += "</g>";
    if (o.lid) {
      sides.forEach(function (s) {
        var cx = s * gap;
        out += '<path d="M' + (cx - rx) + " " + y + "A" + rx + " " + ry + " 0 0 1 " + (cx + rx) + " " + y + 'Z" fill="' + o.lid + '"/>' +
          line(INK, 1.1, "M" + (cx - rx) + " " + y + "H" + (cx + rx));
      });
    }
    sides.forEach(function (s) {
      out += '<ellipse cx="' + s * gap + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="' + INK + '" stroke-width=".9"/>';
    });
    var brows = "";
    if (o.brow) {
      // "angry" slants down toward the nose (the inner end is the lower), "sad" the other way.
      var a = o.brow === "angry" ? 1 : -1;
      sides.forEach(function (s) {
        var cx = s * gap;
        brows += line(INK, 1.6, "M" + (cx - s * rx - s * 0.4) + " " + (y - ry + 1.6 * a) + "L" + (cx + s * rx * 0.8) + " " + (y - ry - 2.2 * a));
      });
    }
    return '<g class="wx wxs-blink">' + out + "</g>" + brows;
  }
  // Eyes shut: "happy" is ^ ^, "sleep" is u u.
  function shut(kind, gap, y) {
    var up = kind === "happy" ? -1 : 1, d = "";
    [-1, 1].forEach(function (s) {
      var cx = s * (gap || 6.4);
      d += "M" + (cx - 3.6) + " " + y + "Q" + cx + " " + (y + 4.4 * up) + " " + (cx + 3.6) + " " + y;
    });
    return line(INK, 1.5, d);
  }
  function cheeks(x, y) {
    return '<ellipse cx="' + -x + '" cy="' + y + '" rx="2.7" ry="1.6" fill="rgba(244,114,150,.42)"/><ellipse cx="' + x + '" cy="' + y + '" rx="2.7" ry="1.6" fill="rgba(244,114,150,.42)"/>';
  }
  var MOUTH = {
    smile: line(INK, 1.1, "M-2.6 7.6Q0 10.2 2.6 7.6"),
    grin: '<path d="M-4 6.8Q0 13.4 4 6.8Z" fill="#7f1d1d" stroke="' + INK + '" stroke-width=".9" stroke-linejoin="round"/><ellipse cy="10.8" rx="1.7" ry=".9" fill="#f9a8b8"/>',
    o: '<ellipse cy="8.8" rx="1.5" ry="1.9" fill="' + INK + '"/>',
    flat: line(INK, 1.1, "M-2.2 8.6h4.4"),
    frown: line(INK, 1.1, "M-2.6 9.8Q0 7.2 2.6 9.8"),
    scowl: line(INK, 1.3, "M-3.6 10.2Q0 6.8 3.6 10.2"),
    sleep: line(INK, 1, "M-1.6 8.4Q0 9.8 1.6 8.4"),
    none: "",
  };
  // The sun: 12 outlined rays that turn slowly behind a disc that doesn't.
  function sunBody() {
    var d = "";
    for (var i = 0; i < 12; i++) {
      var c = Math.cos((i * Math.PI) / 6), s = Math.sin((i * Math.PI) / 6);
      d += "M" + (c * 19.6).toFixed(2) + " " + (s * 19.6).toFixed(2) + "L" + (c * 25.4).toFixed(2) + " " + (s * 25.4).toFixed(2);
    }
    return (
      '<g class="wx wxm-rays"><path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="5.2"' + ROUND + '/><path d="' + d +
      '" fill="none" stroke="#f59e0b" stroke-width="3"' + ROUND + "/></g>" +
      '<circle r="16.5" fill="#fbbf24" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<ellipse cx="-6.4" cy="-9.6" rx="6.2" ry="3" transform="rotate(-32 -6.4 -9.6)" fill="#fff" opacity=".28"/>'
    );
  }
  function sunChar(o) {
    return sunBody() + '<g transform="translate(0 -1)">' +
      (o.shut ? shut("happy", 5.6, -1) : eyes({ gap: 5.6, rx: 4.1, ry: 5 })) + cheeks(10.4, 5.2) + MOUTH[o.mouth || "grin"] + "</g>" +
      (o.noArms ? "" : arms(16, 4.4, o.hi));
  }
  // The moon: a fat crescent (a big circle with a bite out of the top
  // right), asleep. Its face sits on the thick left side.
  var CRESCENT = "M10.02 -18.46A21 21 0 1 0 20.96 -1.26A11.5 11.5 0 1 1 10.02 -18.46Z";
  function moonBody() {
    return (
      '<path d="' + CRESCENT + '" fill="#fde68a" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<ellipse cx="-12" cy="-8" rx="5.6" ry="2.6" transform="rotate(-48 -12 -8)" fill="#fff" opacity=".4"/>'
    );
  }
  function moonChar(o) {
    o = o || {};
    return moonBody() +
      '<g transform="translate(-6.6 4)">' + shut("sleep", 5.2, -1) + cheeks(9.4, 4.6) + MOUTH.sleep + "</g>" + (o.cap === false ? "" : NIGHTCAP);
  }
  // Nightcap: sky blue, white band and pom-pom; the pom-pom swings.
  var NIGHTCAP =
    '<g transform="translate(-10 -13) rotate(-30)">' +
    '<path d="M-10 4C-10 -8 0 -15 12 -13C17 -12 19 -7 19.4 -2C15.8 -5.6 11 -5.2 8.4 -2.2C6 0.6 8 4 12 4Z" fill="#6ec1ff" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/>' +
    '<rect x="-11" y="2" width="24" height="5" rx="2.5" fill="#fff" stroke="' + INK + '" stroke-width="1"/>' +
    joint(19.4, -2, "wxc-osc", "--r:0deg;--a:14deg;animation-duration:2.6s", '<circle cy="2.4" r="3" fill="#fff" stroke="' + INK + '" stroke-width="1"/>') + "</g>";
  // Clouds: circles and a flat base, outlined by drawing them twice (ink
  // with a stroke, then the fill on top) so only the silhouette gets a line.
  var CLOUD = '<circle cx="-11" cy="3" r="10"/><circle cx="-1" cy="-5" r="13"/><circle cx="12" cy="-1" r="10.5"/><rect x="-19" y="3" width="41" height="10" rx="5"/>';
  function cloudBody(fill) {
    return (
      '<g fill="' + INK + '" stroke="' + INK + '" stroke-width="' + OUT + '" stroke-linejoin="round">' + CLOUD + "</g>" +
      '<g fill="' + fill + '">' + CLOUD + "</g>" +
      '<ellipse cx="1" cy="10.6" rx="16" ry="2.4" fill="rgba(90,115,170,.16)"/>' +
      '<ellipse cx="-8" cy="-9" rx="5.4" ry="2.6" transform="rotate(-32 -8 -9)" fill="#fff" opacity=".7"/>'
    );
  }
  // o: fill, eyes (an eyes() options object, or "happy"/"sleep" for shut
  // eyes), mouth, brow, hat, scarf, hi/hug (arm pose), and extra face bits.
  function cloudChar(o) {
    var face =
      (typeof o.eyes === "string" ? shut(o.eyes, 6.4, -1) : eyes(o.eyes)) + cheeks(11.4, 5.6) + MOUTH[o.mouth || "smile"] + (o.face || "");
    var hug = o.hug
      ? arm(-19, 6, "", "--r:-66deg") + arm(19, 6, "", "--r:66deg")
      : "";
    return (o.hug ? "" : arms(19, 7, o.hi)) + cloudBody(o.fill) + (o.scarf || "") + '<g transform="translate(0 ' + (o.faceY == null ? 1 : o.faceY) + ')">' + face + "</g>" + hug + (o.hat || "");
  }
  var BEANIE =
    '<path d="M-10 -14C-10 -29 8 -29 8 -14Z" fill="#f59e0b" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/>' +
    '<rect x="-11.4" y="-16.4" width="21.8" height="5" rx="2.5" fill="#fff" stroke="' + INK + '" stroke-width="1"/>' +
    '<circle cx="-1" cy="-26.6" r="3" fill="#fff" stroke="' + INK + '" stroke-width="1"/>';
  var SCARF =
    line(INK, 5.6, "M-15 9Q1 14.6 17 9") + line("#6ec1ff", 3.4, "M-15 9Q1 14.6 17 9") +
    joint(12, 11.4, "wxc-osc", "--r:-8deg;--a:7deg;animation-duration:1.4s", line(INK, 5.4, "M0 0q1 6 -1.4 11") + line("#6ec1ff", 3.2, "M0 0q1 6 -1.4 11"));
  var SWEAT = '<path d="M13.6 -9.6q-1.8 3 0 4.2q1.8 -1.2 0 -4.2Z" fill="#6ec1ff" stroke="' + INK + '" stroke-width=".7"/>';
  function zzz(x, y) {
    var out = "";
    [[0, 0, 0.9, 0], [4.4, -5, 0.7, -0.9], [7.6, -9.4, 0.55, -1.8]].forEach(function (z) {
      out +=
        '<g transform="translate(' + (x + z[0]) + " " + (y + z[1]) + ") scale(" + z[2] + ')"><path class="wx wxs-zzz" style="animation-delay:' + z[3] +
        's" d="M0 0h4.6l-4.6 5.6h4.6" fill="none" stroke="#6ec1ff" stroke-width="1.3"' + ROUND + "/></g>";
    });
    return out;
  }
  // Rain streaks fall from under the cloud to the ground, each loop offset
  // by a negative delay so it is already mid-fall on first paint. --dy is
  // how far they fall before fading, so they stop at the ground line.
  function drops(n, d, x0, x1, dur, vars, y0) {
    var out = "";
    for (var i = 0; i < n; i++) {
      out +=
        '<g transform="translate(' + (x0 + ((x1 - x0) * i) / (n - 1)).toFixed(1) + " " + y0 + ')"><path class="wx wxs-rain" style="' + vars +
        ";animation-duration:" + dur + "s;animation-delay:-" + ((i * 0.37) % dur).toFixed(2) + 's" d="' + d +
        '" stroke="#6ec1ff" stroke-width="1.3"' + ROUND + "/></g>";
    }
    return out;
  }
  function flakes(n, x0, x1, y0, dy) {
    var out = "";
    for (var i = 0; i < n; i++) {
      out +=
        '<circle class="wx wxs-snow" style="--dy:' + dy + "px;animation-delay:-" + ((i * 0.83) % 2.6).toFixed(2) + 's" cx="' +
        (x0 + ((x1 - x0) * i) / (n - 1)).toFixed(1) + '" cy="' + y0 + '" r="' + (i % 2 ? 1.1 : 1.5) + '" fill="#6ec1ff"/>';
    }
    return out;
  }
  // x, y, scale: puts a character at a spot; its own group floats (cls).
  function char(x, y, s, body, cls, vars) {
    return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')"><g class="' + cls + '" style="' + (vars || "") + '">' + body + "</g></g>";
  }
  function shadow(x, y, rx) {
    return '<ellipse class="wx wxm-shadow" cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="1.7" fill="rgba(20,23,28,.12)"/>';
  }
  var GROUND = '<path d="M3 61H73" stroke="rgba(20,23,28,.14)" stroke-width="1.2"' + ROUND + "/>";
  var WIND = [30, 40, 49].map(function (y, i) {
    return (
      '<g transform="translate(70 ' + y + ')"><path class="wx wxs-wind" style="animation-delay:-' + (i * 0.27).toFixed(2) +
      's" d="M0 0h' + (12 + i * 3) + '" stroke="#6ec1ff" stroke-width="1.2"' + ROUND + "/></g>"
    );
  }).join("");
  var RIPPLES = [[24, 0], [46, 0.8]].map(function (r) {
    return '<ellipse class="wx wxs-ripple" style="animation-delay:-' + r[1] + 's" cx="' + r[0] + '" cy="60.8" rx="4" ry="1" fill="none" stroke="#6ec1ff" stroke-width=".8"/>';
  }).join("");
  var FOG =
    '<g fill="rgba(214,229,247,.82)"><rect class="wx wxs-fog" x="2" y="30" width="38" height="4.6" rx="2.3"/>' +
    '<rect class="wx wxs-fog wx-rev" style="animation-delay:-1.4s" x="34" y="39" width="40" height="4.6" rx="2.3"/>' +
    '<rect class="wx wxs-fog" style="animation-delay:-2.6s" x="8" y="48" width="40" height="4.6" rx="2.3"/></g>';
  var SCENES = {
    // Cheerful and a bit show-off: rays turning, a big grin, little sparkles.
    sun:
      shadow(38, 59, 13) + spark(14, 14, 2.2, 0, "#f59e0b") + spark(63, 50, 1.8, -1.1, "#f59e0b") +
      char(38, 32, 0.95, sunChar({ hi: "R" }), "wxm-float", ""),
    // Fast asleep in a nightcap, Zzz drifting out of the bite, stars twinkling.
    moon:
      shadow(36, 59, 12) + spark(61, 14, 2.4, 0) + spark(66, 38, 1.5, -1.1) + spark(11, 12, 1.7, -0.5) +
      char(36, 34, 1, moonChar(), "wxm-float", "") + zzz(48, 22),
    "cloud-sun":
      shadow(31, 59, 13) +
      char(54, 22, 0.5, sunChar({ noArms: true, mouth: "smile" }), "wxm-float", "animation-delay:-1.3s") +
      char(31, 36, 0.98, cloudChar({ fill: "#f4f8ff", eyes: {}, mouth: "smile", hi: "R" }), "wxm-float", ""),
    "cloud-moon":
      shadow(31, 59, 13) + spark(66, 12, 1.8, -0.6) +
      char(55, 20, 0.5, moonChar({ cap: false }), "wxm-float", "animation-delay:-1.3s") +
      char(31, 36, 0.98, cloudChar({ fill: "#eef1ff", eyes: "sleep", mouth: "sleep" }), "wxm-float", "") + zzz(46, 22),
    // Lazy and unbothered: half-lidded, a flat mouth, a yawn now and then, a
    // smaller friend drifting along behind.
    cloud:
      shadow(34, 59, 13) +
      char(58, 22, 0.5, cloudBody("#dfe8f7"), "wxm-float", "animation-delay:-1.6s") +
      char(33, 34, 1.02, cloudChar({ fill: "#f4f8ff", eyes: { lid: "#f4f8ff" }, mouth: "none", hi: "R", face: '<g class="wxm-calm">' + MOUTH.flat + '</g><g class="wxm-yawn">' + MOUTH.o + "</g>" }), "wxm-float", ""),
    // Dreamy, half hidden behind the fog bands.
    "cloud-fog":
      shadow(34, 59, 13) +
      char(34, 34, 1.02, cloudChar({ fill: "#eef3fb", eyes: { lid: "#eef3fb" }, mouth: "sleep", hi: "R" }), "wxm-float", "") + FOG,
    // Gloomy but sweet: droopy brows, a small frown, a steady drip.
    "cloud-rain":
      shadow(36, 60, 12) + GROUND + RIPPLES + drops(8, "M0 0l-1.2 4.2", 20, 54, 0.85, "--dx:-4px;--dy:15px", 44) +
      char(36, 27, 1.02, cloudChar({ fill: "#c4d3ee", eyes: { brow: "sad" }, mouth: "frown", hi: "L" }), "wxm-float", ""),
    // Cosy in a beanie and scarf, arms wrapped round, shivering, flakes drifting down.
    "cloud-snow":
      GROUND + flakes(9, 14, 62, 42, 18) +
      char(36, 29, 1, cloudChar({ fill: "#eaf4ff", eyes: "happy", mouth: "smile", hat: BEANIE, scarf: SCARF, hug: true, faceY: 0 }), "wxc-shiver", ""),
    // The reference's scene: slanted rain, wind streaks, a bolt with a warm
    // glow and a grumpy dark cloud with its arms crossed. Gust, bolt and glow
    // share one 3.4s loop, so the wind shoves just as the lightning strikes.
    "cloud-lightning":
      '<circle class="wxs-glow" cx="52" cy="44" r="15" fill="#f59e0b"/>' + GROUND +
      drops(10, "M0 0l-3 4.2", 8, 70, 0.55, "--dx:-12px;--dy:16px", 42) + WIND +
      '<g transform="translate(46 33) scale(.95)"><path class="wx wxs-bolt" d="M13 2L4 14h7l-1 8 10-13h-7Z" fill="#f59e0b" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/></g>' +
      char(32, 25, 1.02, cloudChar({ fill: "#8493b2", eyes: { brow: "angry", rx: 4.2, ry: 4.6 }, mouth: "scowl", hug: true, face: SWEAT, faceY: 0 }), "wxm-gust", ""),
  };

  // WMO weather codes (Open-Meteo's `weathercode`) collapsed into the
  // icon set above, grouped the same way Open-Meteo's own docs group
  // them: https://open-meteo.com/en/docs's weather code table. `isDay`
  // comes from the same current_weather block, so a clear 2am doesn't
  // get a spinning sun.
  function iconFor(code, isDay) {
    if (code === 0) return { icon: isDay ? "sun" : "moon", label: "Clear" };
    if (code === 1 || code === 2) return { icon: isDay ? "cloud-sun" : "cloud-moon", label: "Partly cloudy" };
    if (code === 3) return { icon: "cloud", label: "Overcast" };
    if (code === 45 || code === 48) return { icon: "cloud-fog", label: "Foggy" };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { icon: "cloud-rain", label: "Rainy" };
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: "cloud-snow", label: "Snowy" };
    if (code >= 95) return { icon: "cloud-lightning", label: "Stormy" };
    return { icon: "cloud", label: "Cloudy" };
  }

  function renderChip(temp, code, isDay, unit, city) {
    if (typeof temp !== "number" || isNaN(temp)) return;

    var meta = iconFor(code, isDay);
    var chip = document.createElement("span");
    chip.className = "hero-status-chip hero-status-chip-dynamic hero-weather-chip";
    if (city) chip.title = meta.label + " in " + city;

    // The icon and scene markup is always one of this file's own hardcoded
    // strings above, never network data, so building it via innerHTML on
    // a throwaway wrapper (then moving the real <svg>s out of it) is safe
    // here — the temperature/city text below goes through textContent
    // instead, since that IS untrusted data from the geolocation API.
    // Both SVGs are always in the chip; home.css shows the small icon on
    // mobile and the character scene from tablet width up, and a
    // display:none SVG doesn't run its animations.
    var wrap = document.createElement("span");
    wrap.innerHTML =
      '<svg class="hero-status-icon hero-weather-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      (ICONS[meta.icon] || ICONS.cloud) +
      "</svg>" +
      '<svg class="hero-weather-scene" viewBox="0 0 76 64" fill="none" aria-hidden="true">' +
      (SCENES[meta.icon] || SCENES.cloud) +
      "</svg>";
    chip.appendChild(wrap.firstChild);
    chip.appendChild(wrap.firstChild);

    // Tint/glow in home.css key off the icon name (sun, moon, cloud-rain...).
    chip.setAttribute("data-wx", meta.icon);

    var label = document.createElement("span");
    label.className = "hero-weather-temp hero-tile-val";
    label.textContent = Math.round(temp) + "°" + unit;
    chip.appendChild(label);

    // Condition/city line (see .hero-status-detail in home.css): hover-
    // revealed on the compact mobile chip, always visible as the widget's
    // second line from tablet width up. The " · " separator the compact
    // version needs is CSS (::before), so the widget line starts clean.
    var detail = document.createElement("span");
    detail.className = "hero-status-detail hero-tile-sub";
    detail.textContent = meta.label + (city ? ", " + city : "");
    chip.appendChild(detail);

    container.appendChild(chip);
    // Flush layout so the fade-in below animates from the CSS's opacity:0
    // start state instead of jumping straight to visible — same
    // "force a real paint first" pattern intro-sequence.js already uses
    // for its own FLIP morph.
    void chip.offsetWidth;
    chip.classList.add("hero-status-chip-in");
    // One wave hello once the intro is done (after the clock's), and
    // another when the pointer comes in; see window.heroGreet in hero.js.
    if (window.heroGreet) window.heroGreet(chip, chip, 3000);
  }

  function fetchWeather(lat, lon, unit, city) {
    var params =
      "latitude=" + encodeURIComponent(lat) + "&longitude=" + encodeURIComponent(lon) + "&current_weather=true";
    if (unit === "F") params += "&temperature_unit=fahrenheit";

    fetch("https://api.open-meteo.com/v1/forecast?" + params)
      .then(function (res) {
        return res.ok ? res.json() : Promise.reject(res.status);
      })
      .then(function (json) {
        var cw = json && json.current_weather;
        if (!cw) return;
        renderChip(cw.temperature, cw.weathercode, cw.is_day !== 0, unit, city);
      })
      .catch(function () {
        // Weather fetch failed — no chip, no error shown (see top comment).
      });
  }

  if (typeof window.resolveVisitorLocation !== "function") return;

  window.resolveVisitorLocation(function (loc) {
    if (!loc) return;
    // Fahrenheit for a visitor geo-locate.js resolved as US-based,
    // Celsius otherwise — same "match what the visitor is already used
    // to" reasoning the clock applies to 12h/24h.
    fetchWeather(loc.lat, loc.lon, loc.prefersImperial ? "F" : "C", loc.city);
  });
})();
