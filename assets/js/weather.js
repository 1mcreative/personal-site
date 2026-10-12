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
  function spark(x, y, r, delay) {
    return (
      '<path class="wx wx-twinkle" style="animation-delay:' + delay + 's" fill="' + SKY + '" d="M' + x + " " + (y - r) +
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
  // from the idea, not the file). The first two passes were adult-proportioned
  // pictograms, stick limbs facing the viewer and then a profile walker, and
  // they read as funny, not cute ("looks funny not cute"). This one is a
  // chibi: a big round head on a small body, glossy eyes with two highlights,
  // blush, stubby limbs, white sneakers. It faces the viewer in every scene,
  // and the walking ones are a waddle in place (home.css .wxb-*) instead of
  // a stride. It does not wave on a loop either ("saying hi continuously is
  // unnatural"): the greeting is one wave when the tile first appears and
  // another when the pointer comes in (see the end of renderChip), in the
  // scenes where a hand is free. Acting sits on top of the idle: blinking,
  // breathing, a bobbing tuft of hair, a nightcap and a snot bubble for the
  // sleeper, a beanie and shivering for the snow, a wrenched umbrella and a
  // startled face in the storm. Tablet and up only (home.css
  // .hero-weather-scene); the compact mobile chip keeps the icons above.
  var INK = "#1f2733";
  var SKIN = "#fbd9bd";
  var SKIN_SH = "#efbc93";
  var HAIR = "#3b2a20";
  var SHIRT = "#1d4ed8";
  var PANTS = "#2a3550";
  var ROUND = ' stroke-linecap="round" stroke-linejoin="round"';
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
  // Shoulder at (x, -12.4): a stubby sleeve and a hand. --r hangs it
  // slightly out from the body; wxb-hi marks the arm that waves hello (--s
  // is its side, see home.css .is-hello).
  function arm(x, cls, vars, hand) {
    return joint(x, -12.4, cls, vars, line(SHIRT, 3.3, "M0 0V5.2") + '<circle cy="6.4" r="2" fill="' + (hand || SKIN) + '"/>');
  }
  var ARM_L = arm(-6.4, "", "--r:11deg");
  var ARM_R = arm(6.4, "", "--r:-11deg");
  var HI_L = arm(-6.4, "wxb-hi", "--r:11deg;--s:-1");
  var HI_R = arm(6.4, "wxb-hi", "--r:-11deg;--s:1");
  // Two sneakers, or yellow boots; step makes them lift in turn.
  function feet(step, boot) {
    var fill = boot ? AMBER : "#fff";
    var edge = boot ? "#b45309" : INK;
    function one(x, cls) {
      return (
        '<g class="' + cls + '"><path d="M' + x + ' -6V-2.4" stroke="' + PANTS + '" stroke-width="2.9"' + ROUND + "/>" +
        '<ellipse cx="' + x + '" cy="-1.5" rx="3.5" ry="2.1" fill="' + fill + '" stroke="' + edge + '" stroke-width=".9"/></g>'
      );
    }
    return one(-3.7, step ? step + " wxb-far" : "") + one(3.7, step || "");
  }
  var TORSO =
    '<rect x="-6.3" y="-15" width="12.6" height="11.2" rx="5" fill="' + SHIRT + '"/>' +
    '<path d="M-3.8 -8.2H3.8L4.6 -4.6H-4.6Z" fill="rgba(255,255,255,.16)"/>' +
    '<path d="M-1.6 -13.8v2.6M1.6 -13.8v2.6" stroke="#fff" stroke-width=".9"' + ROUND + "/>";
  // A black oval with a big and a small white highlight: the glossy look.
  function glossy(x, y, rx, ry) {
    return (
      '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + INK + '"/>' +
      '<circle cx="' + (x - rx * 0.32).toFixed(2) + '" cy="' + (y - ry * 0.34).toFixed(2) + '" r="' + (rx * 0.42).toFixed(2) + '" fill="#fff"/>' +
      '<circle cx="' + (x + rx * 0.38).toFixed(2) + '" cy="' + (y + ry * 0.4).toFixed(2) + '" r="' + (rx * 0.2).toFixed(2) + '" fill="#fff"/>'
    );
  }
  function eyes(y, rx, ry) {
    return '<g class="wx wxs-blink">' + glossy(-4.2, y, rx, ry) + glossy(4.2, y, rx, ry) + "</g>";
  }
  var EYES = {
    open: eyes(-22.4, 1.9, 2.4),
    up: eyes(-23.6, 1.9, 2.4),
    wide: eyes(-22.4, 2.4, 3),
    happy: line(INK, 1.2, "M-6.3 -21.4Q-4.2 -24.6 -2.1 -21.4M2.1 -21.4Q4.2 -24.6 6.3 -21.4"),
    sleep: line(INK, 1.1, "M-6.2 -22.6Q-4.2 -20.4 -2.2 -22.6M2.2 -22.6Q4.2 -20.4 6.2 -22.6"),
  };
  var MOUTHS = {
    smile: line(INK, 1, "M-1.8 -18.3Q0 -16.5 1.8 -18.3"),
    grin: '<path d="M-2.5 -18.7Q0 -15.2 2.5 -18.7Z" fill="#7f1d1d"/><ellipse cy="-16.9" rx="1" ry=".55" fill="#f9a8b8"/>',
    o: '<ellipse cy="-17.5" rx=".95" ry="1.2" fill="' + INK + '"/>',
    flat: line(INK, 1, "M-1.1 -17.9h2.2"),
  };
  var BLUSH =
    '<ellipse cx="-6.8" cy="-19.2" rx="2.2" ry="1.3" fill="rgba(244,114,150,.42)"/>' +
    '<ellipse cx="6.8" cy="-19.2" rx="2.2" ry="1.3" fill="rgba(244,114,150,.42)"/>';
  var HAIR_SHAPE =
    '<path d="M-10.6 -23.4C-11.4 -38.4 11.4 -38.4 10.6 -23.4C8.8 -27.2 4.4 -29 .6 -27.8C-2.8 -29.2 -8.2 -27.6 -10.6 -23.4Z" fill="' + HAIR + '"/>' +
    '<path class="wxb-tuft" d="M-.6 -34.3Q-1.5 -37.4 1.7 -37.7" stroke="' + HAIR + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
  // Nightcap (sky blue, white band and pom-pom) and beanie (amber, white
  // cuff and pom-pom). They sit over the hair.
  var HATS = {
    cap:
      '<path d="M-10.5 -26.6C-10.2 -36.2 -2.4 -41.2 6.6 -39.4C12 -38.2 14.6 -33.8 15 -29.8C11.8 -32.8 8 -32.4 6 -30.4C4 -28.4 6.2 -26.6 10.5 -26.6Z" fill="' + SKY + '"/>' +
      line("#fff", 2.8, "M-10.6 -26.4Q0 -29.6 10.6 -26.4") + '<circle cx="15" cy="-28.4" r="2.4" fill="#fff"/>',
    beanie:
      '<path d="M-10.8 -26.6C-11 -41 11 -41 10.8 -26.6Z" fill="' + AMBER + '"/>' +
      '<rect x="-11.4" y="-28.8" width="22.8" height="4.8" rx="2.4" fill="#fff"/><circle cy="-38.8" r="2.8" fill="#fff"/>',
  };
  var NOSE_BUBBLE =
    '<circle cx=".6" cy="-20.6" r=".7" fill="' + SKIN_SH + '"/>' +
    '<circle class="wx wxb-bubble" cx="2.6" cy="-19.4" r="2.3" fill="rgba(255,255,255,.55)" stroke="' + SKY + '" stroke-width=".7"/>';
  var SWEAT = '<path d="M8.6 -30.4q-1.6 2.6 0 3.6q1.6 -1 0 -3.6Z" fill="' + SKY + '"/>';
  // The head pivots at the neck so it can nod or tilt (.wxb-head).
  function head(o) {
    return (
      '<g class="wxb-head ' + (o.hc || "") + '" style="' + (o.hv || "") + '">' +
      '<circle cx="-10.1" cy="-23" r="2" fill="' + SKIN_SH + '"/><circle cx="10.1" cy="-23" r="2" fill="' + SKIN_SH + '"/>' +
      '<circle cy="-23.5" r="10.2" fill="' + SKIN + '"/>' + (o.hat ? "" : HAIR_SHAPE) + EYES[o.eyes] + BLUSH + MOUTHS[o.mouth] +
      (o.face || "") + (HATS[o.hat] || "") + "</g>"
    );
  }
  var SCARF = line(SKY, 3.6, "M-6.6 -14.8Q0 -11.4 6.6 -14.8");
  function scarfTail(vars) {
    return joint(4.6, -13.4, "wxc-osc", vars, line(SKY, 2.8, "M0 0q3.4 .6 5.4 4.6"));
  }
  var CANOPY =
    '<path d="M-14 -25Q-12 -35 0 -36Q12 -35 14 -25Q10.5 -27.6 7 -25Q3.5 -27.6 0 -25Q-3.5 -27.6 -7 -25Q-10.5 -27.6 -14 -25Z" fill="' + AMBER + '"/>' +
    line("rgba(20,23,28,.28)", 0.8, "M0 -36V-25");
  // Held in the right hand at (12, -15.4) (where the raised right arm ends).
  // `lean` is the slow movement (a sway, or the gust's pull), `shake` the
  // fast one; flutter squashes the canopy as the wind catches it.
  function umbrella(lean, shake, flutter) {
    return joint(12, -15.4, lean[0], lean[1],
      joint(0, 0, shake[0], shake[1], line(INK, 1.2, "M0 2V-25") +
        (flutter ? '<g class="wx wxs-flutter">' + CANOPY + "</g>" : CANOPY) + '<circle r="2" fill="' + SKIN + '"/>'));
  }
  var UMB_ARM = arm(6.4, "", "--r:-118deg");
  var HUG_L = arm(-6.4, "", "--r:-64deg", "#fff");
  var HUG_R = arm(6.4, "", "--r:64deg", "#fff");
  var BREATH = [0, 0.6, 1.2].map(function (d) {
    return '<circle class="wx wxs-breath" style="animation-delay:-' + d + 's" cx="4.6" cy="-17.2" r="1" fill="' + SKY + '"/>';
  }).join("");
  function zzz() {
    var out = "";
    [[12, -40, 0.9, 0], [15.5, -45, 0.7, -0.9], [18.5, -49.5, 0.55, -1.8]].forEach(function (z) {
      out +=
        '<g transform="translate(' + z[0] + " " + z[1] + ") scale(" + z[2] + ')"><path class="wx wxs-zzz" style="animation-delay:' + z[3] +
        's" d="M0 0h4.6l-4.6 5.6h4.6" fill="none" stroke="' + SKY + '" stroke-width="1.3"' + ROUND + "/></g>";
    });
    return out;
  }
  // Back to front: feet, torso, arms, scarf, head, props.
  function kid(o) {
    return feet(o.step, o.boot) + TORSO + (o.armL || ARM_L) + (o.armR || ARM_R) + (o.scarf || "") + head(o) + (o.props || "");
  }
  // Stands the figure on the ground at x. The .wxc group carries the body
  // motion about the feet (waddle, gust, shiver, breathing) and the --T
  // (cycle length) the waddling limbs inherit.
  function who(x, body, cls, vars, scale) {
    return (
      '<g transform="translate(' + x + " 60) scale(" + (scale || 1.15) + ')"><ellipse cy=".6" rx="8.6" ry="1.5" fill="rgba(20,23,28,.12)"/>' +
      '<g class="wxc ' + cls + '" style="' + vars + '">' + body + "</g></g>"
    );
  }
  // The waddle: the body rocks (the .wxc group), bobs twice a cycle (this
  // wrapper), and the feet lift in turn (kid's `step`).
  function waddle(x, T, o, scale) {
    o.step = "wxb-step";
    return who(x, '<g class="wxb-bob">' + kid(o) + "</g>", "wxb-waddle", "--T:" + T + "s", scale);
  }
  // Rain streaks fall from under the cloud bank to the ground, each loop
  // offset by a negative delay so it is already mid-fall on first paint.
  function drops(n, d, x0, x1, dur, vars) {
    var out = "";
    for (var i = 0; i < n; i++) {
      out +=
        '<g transform="translate(' + (x0 + ((x1 - x0) * i) / (n - 1)).toFixed(1) + ' 18)"><path class="wx wxs-rain" style="' + vars +
        ";animation-duration:" + dur + "s;animation-delay:-" + ((i * 0.37) % dur).toFixed(2) + 's" d="' + d +
        '" stroke="' + SKY + '" stroke-width="1.2"' + ROUND + "/></g>";
    }
    return out;
  }
  function flakes(n) {
    var out = "";
    for (var i = 0; i < n; i++) {
      out +=
        '<circle class="wx wxs-snow" style="animation-delay:-' + ((i * 0.83) % 2.6).toFixed(2) + 's" cx="' +
        (9 + (58 * i) / (n - 1)).toFixed(1) + '" cy="20" r="' + (i % 2 ? 1.1 : 1.5) + '" fill="' + SKY + '"/>';
    }
    return out;
  }
  function piece(kind, place) {
    return '<g transform="' + place + '">' + ICONS[kind] + "</g>";
  }
  function bank(fill) {
    return (
      cloud("translate(3 -2) scale(1.2)", "wx-drift", "currentColor", fill) +
      cloud("translate(31 -5) scale(1.45)", "wx-drift wx-rev", "currentColor", fill)
    );
  }
  var GROUND = '<path d="M3 61H73" stroke="rgba(20,23,28,.16)" stroke-width="1.2"' + ROUND + "/>";
  var WIND = [32, 42, 51].map(function (y, i) {
    return (
      '<g transform="translate(70 ' + y + ')"><path class="wx wxs-wind" style="animation-delay:-' + (i * 0.27).toFixed(2) +
      's" d="M0 0h' + (12 + i * 3) + '" stroke="' + SKY + '" stroke-width="1.2"' + ROUND + "/></g>"
    );
  }).join("");
  var RIPPLES = [[10, 0], [38, 0.8]].map(function (r) {
    return '<ellipse class="wx wxs-ripple" style="animation-delay:-' + r[1] + 's" cx="' + r[0] + '" cy="60.8" rx="4" ry="1" fill="none" stroke="' + SKY + '" stroke-width=".8"/>';
  }).join("");
  var FOG =
    '<g fill="rgba(214,229,247,.8)"><rect class="wx wxs-fog" x="2" y="34" width="34" height="4.4" rx="2.2"/>' +
    '<rect class="wx wxs-fog wx-rev" style="animation-delay:-1.4s" x="30" y="43" width="40" height="4.4" rx="2.2"/>' +
    '<rect class="wx wxs-fog" style="animation-delay:-2.6s" x="8" y="52" width="38" height="4.4" rx="2.2"/></g>';
  var SCENES = {
    // Basking: eyes shut happily, a big grin, a tuft that bobs. Says hello
    // with its free hand when the tile appears (and when you come in).
    sun:
      piece("sun", "translate(42 1) scale(1.1)") + GROUND +
      who(22, kid({ eyes: "happy", mouth: "grin", hc: "wxb-idle", armR: HI_R }), "wxs-breathe", ""),
    // Asleep standing up: nightcap, a nodding head, a snot bubble, Zzz.
    moon:
      piece("moon", "translate(47 -1) scale(1.05)") + GROUND +
      who(22, kid({ eyes: "sleep", mouth: "flat", hat: "cap", hc: "wxb-nod", hv: "--T:4s", face: NOSE_BUBBLE, props: zzz() }), "wxs-breathe", ""),
    "cloud-sun": piece("cloud-sun", "translate(38 -1) scale(1.3)") + GROUND + waddle(22, 0.9, { eyes: "open", mouth: "smile", hc: "wxb-idle", armR: HI_R }),
    // The sleepwalker: eyes shut, still waddling, nightcap and all.
    "cloud-moon": piece("cloud-moon", "translate(38 -1) scale(1.3)") + GROUND + waddle(22, 1.3, { eyes: "sleep", mouth: "flat", hat: "cap", props: zzz() }),
    // Strolling along with a glance up at the clouds.
    cloud: piece("cloud", "translate(36 0) scale(1.35)") + GROUND + waddle(22, 1, { eyes: "up", mouth: "o", hv: "transform:rotate(-8deg)", armR: HI_R }),
    // Fog bands are drawn last, so the figure is hazy behind them.
    "cloud-fog": cloud("translate(38 -1) scale(1.3)", "wx-drift", "currentColor") + GROUND + waddle(22, 1.3, { eyes: "open", mouth: "smile", armR: HI_R }) + FOG,
    // A yellow umbrella and boots; the free left hand waves hello.
    "cloud-rain":
      bank() + drops(9, "M0 0l-1.4 4.4", 8, 70, 0.85, "--dx:-6px") + RIPPLES + GROUND +
      waddle(22, 1, {
        eyes: "open", mouth: "smile", boot: true, armL: HI_L, armR: UMB_ARM,
        props: umbrella(["wxc-osc", "--r:-22deg;--a:2.5deg;animation-duration:1.9s"], ["", "--r:0deg"], false),
      }, 1),
    // Arms wrapped round, shivering, breath puffing, in a beanie and scarf.
    "cloud-snow":
      bank() + flakes(9) + GROUND +
      who(22, kid({ eyes: "happy", mouth: "smile", hat: "beanie", scarf: SCARF + scarfTail("--r:-8deg;--a:7deg;animation-duration:1.4s"), armL: HUG_L, armR: HUG_R, props: BREATH }),
        "wxc-shiver", "", 1),
    // The reference's scene: heavy slanted rain, wind streaks, a bolt with a
    // warm glow, and a startled kid leaning into it all with the scarf
    // streaming and the umbrella wrenched back. Gust, bolt and glow share one
    // 3.4s loop, so the wind shoves just as the lightning strikes.
    "cloud-lightning":
      '<circle class="wxs-glow" cx="58" cy="24" r="16" fill="' + AMBER + '"/>' + bank("#c7d4ec") +
      '<g transform="translate(46 15) scale(.95)"><path class="wx wxs-bolt" d="M13 2L4 14h7l-1 8 10-13h-7Z" fill="' + AMBER +
      '" stroke="' + AMBER + '" stroke-width="1.6" stroke-linejoin="round"/></g>' +
      drops(12, "M0 0l-3.2 4.4", 10, 76, 0.55, "--dx:-14px") + WIND + GROUND +
      who(22, kid({
          eyes: "wide", mouth: "o", boot: true, hc: "wxc-shiver", face: SWEAT,
          scarf: SCARF + scarfTail("--r:58deg;--a:14deg;animation-duration:.3s"),
          armL: arm(-6.4, "wxc-osc", "--r:34deg;--a:10deg;animation-duration:.62s"), armR: UMB_ARM,
          props: umbrella(["wxs-pull", "--r:-22deg"], ["wxc-osc", "--r:0deg;--a:8deg;animation-duration:.3s"], true),
        }), "wxs-gust", "--r:10deg", 1),
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
