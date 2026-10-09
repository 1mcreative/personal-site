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
  // from the idea, not the file), then "animation can be improved for the
  // character". The first pass was a front-facing pictogram whose straight
  // stick limbs scissored sideways. This one is drawn in profile, facing
  // the way it walks, with a knee and an elbow on every limb, so the motion
  // can be a real walk cycle (home.css .wxw-*): heel strike, knee flex
  // through the swing, arms in antiphase with the legs, body lowest at
  // contact and highest at passing, and ground dashes sized to the stride
  // so the feet don't skate. Acting sits on top of that rig: blinking, a
  // scarf that streams behind, a head that nods off, looks up or sets
  // against the wind, a wave, a shiver, a gust that tugs the umbrella in
  // time with the lightning. One person, a different performance per
  // condition. Tablet and up only (home.css .hero-weather-scene); the
  // compact mobile chip keeps the icons above.
  var INK = "#1f2733";
  var INK_FAR = "#121821";
  var SKIN = "#f5cfa8";
  var SKIN_FAR = "#e6b48a";
  var SHIRT = "#1d4ed8";
  var SHIRT_FAR = "#1b42ad";
  var ROUND = ' stroke-linecap="round" stroke-linejoin="round"';
  var HOLD = "animation:none";
  function line(col, w, d) {
    return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + ROUND + "/>";
  }
  // The outer <g> puts a joint at (x, y); the inner .wxc group rotates about
  // its own origin (home.css), so anything drawn hanging from (0, 0) swings
  // about that joint. --r is the resting angle, set inline; a class adds the
  // motion. Joints nest (hip > knee, shoulder > elbow), so a limb's angle is
  // always relative to the segment above it.
  function joint(x, y, cls, vars, inner) {
    return '<g transform="translate(' + x + " " + y + ')"><g class="wxc ' + cls + '" style="' + vars + '">' + inner + "</g></g>";
  }
  // Hip at (0, -15): thigh 7.6, shin 7.4, a shoe pointing forward (+x).
  // "far" is the limb behind the body: darker, and half a cycle out of phase.
  function leg(far, tc, tv, sc, sv) {
    var col = far ? INK_FAR : INK;
    return joint(0, -15, tc, tv, line(col, 3.4, "M0 0V7.6") + joint(0, 7.6, sc, sv, line(col, 3.2, "M0 0V7.4M0 7.4H3.8")));
  }
  // Shoulder at (.4, -27.6): upper arm 6.2 in shirt, forearm 5.2 and hand in skin.
  function arm(far, uc, uv, fc, fv) {
    var skin = far ? SKIN_FAR : SKIN;
    return joint(0.4, -27.6, uc, uv, line(far ? SHIRT_FAR : SHIRT, 3.1, "M0 0V6.2") +
      joint(0, 6.2, fc, fv, line(skin, 2.6, "M0 0V5.2") + '<circle cy="6.4" r="1.7" fill="' + skin + '"/>'));
  }
  var WALK = {
    legF: leg(true, "wxw-thigh wxw-far", "", "wxw-shin wxw-far", ""),
    legN: leg(false, "wxw-thigh", "", "wxw-shin", ""),
    armF: arm(true, "wxw-arm wxw-far", "", "wxw-fore wxw-far", ""),
    armN: arm(false, "wxw-arm", "", "wxw-fore", ""),
  };
  var STILL = {
    legF: leg(true, "", "--r:2deg;" + HOLD, "", "--r:0deg;" + HOLD),
    legN: leg(false, "", "--r:-2deg;" + HOLD, "", "--r:0deg;" + HOLD),
    armF: arm(true, "", "--r:5deg;" + HOLD, "", "--r:-10deg;" + HOLD),
    armN: arm(false, "", "--r:-4deg;" + HOLD, "", "--r:-10deg;" + HOLD),
  };
  // Arms folded across the chest (snow) and the arm that holds an umbrella.
  var HUG_F = arm(true, "", "--r:-24deg;" + HOLD, "", "--r:158deg;" + HOLD);
  var HUG_N = arm(false, "", "--r:-28deg;" + HOLD, "", "--r:160deg;" + HOLD);
  var UMB_ARM = arm(false, "", "--r:-100deg;" + HOLD, "", "--r:-45deg;" + HOLD);
  var TORSO = '<rect x="-4.4" y="-30" width="8.8" height="16" rx="3.8" fill="' + SHIRT + '"/>';
  var SKULL =
    '<circle cx="1" cy="-36.6" r="5.3" fill="' + SKIN + '"/><circle cx="6.2" cy="-36" r="1" fill="' + SKIN + '"/>' +
    '<circle cx=".2" cy="-36" r="1.2" fill="' + SKIN_FAR + '"/>' +
    '<path d="M-4.3 -36.4A5.4 5.4 0 0 1 6.3 -38.3C4.6 -38.2 3 -37.6 2 -36.2C.6 -37.1 -1.5 -37.5 -4.3 -36.4Z" fill="' + INK + '"/>';
  var EYE = '<circle class="wx wxs-blink" cx="3.8" cy="-37" r=".85" fill="' + INK + '"/>';
  var SMILE = line(INK, 0.7, "M3.7 -34.3q1.1 .7 2.2 0");
  var FACES = {
    smile: EYE + SMILE,
    shades: '<rect x="2.4" y="-38.6" width="4.6" height="3" rx="1.3" fill="' + INK + '"/>' + line(INK, 0.8, "M2.4 -37.4L-2.6 -37.9") + SMILE,
    sleep: line(INK, 0.8, "M2.7 -37q1.1 .9 2.2 0") + '<circle cx="5" cy="-34.2" r=".65" fill="' + INK + '"/>',
    grit: EYE + line(INK, 0.8, "M2.3 -38.9l3 .9") + line(INK, 0.9, "M3.6 -34.3h2.4"),
  };
  // The head pivots at the neck so it can nod or look up; its own coordinates
  // are the figure's, shifted back by the pivot.
  function head(face, cls, vars) {
    return joint(0.8, -31.6, cls || "", vars || "--r:0deg;" + HOLD, '<g transform="translate(-0.8 31.6)">' + SKULL + FACES[face] + "</g>");
  }
  var SCARF = '<rect x="-4.7" y="-32.3" width="9.4" height="3.4" rx="1.7" fill="' + SKY + '"/>';
  function scarfTail(vars) {
    return joint(-3.9, -30.4, "wxc-osc", vars, line(SKY, 2.6, "M0 0q-4.2 .6 -6.4 4.4"));
  }
  var GLINT = '<path class="wx wxs-glint" d="M5.6 -40.2L6.2 -38.8 7.6 -38.2 6.2 -37.6 5.6 -36.2 5 -37.6 3.6 -38.2 5 -38.8Z" fill="#fff"/>';
  var BREATH = [0, 0.6, 1.2].map(function (d) {
    return '<circle class="wx wxs-breath" style="animation-delay:-' + d + 's" cx="7.4" cy="-34.4" r="1.1" fill="' + SKY + '"/>';
  }).join("");
  var CANOPY =
    '<path d="M-14 -14Q-12 -24 0 -25Q12 -24 14 -14Q10.5 -16.6 7 -14Q3.5 -16.6 0 -14Q-3.5 -16.6 -7 -14Q-10.5 -16.6 -14 -14Z" fill="' + AMBER + '"/>' +
    line("rgba(20,23,28,.28)", 0.8, "M0 -25V-14");
  // Held in the hand at (10.2, -33.9) (where UMB_ARM ends): `lean` is the slow
  // movement (a sway, or the gust's pull), `shake` the fast one; flutter
  // squashes the canopy as the wind catches it.
  function umbrella(lean, shake, flutter) {
    return joint(10.2, -33.9, lean[0], lean[1],
      joint(0, 0, shake[0], shake[1], line(INK, 1.2, "M0 4V-14") + (flutter ? '<g class="wx wxs-flutter">' + CANOPY + "</g>" : CANOPY) +
        '<circle r="1.8" fill="' + SKIN + '"/>'));
  }
  function zzz() {
    var out = "";
    [[7, -44, 0.9, 0], [11, -49, 0.7, -0.9], [14, -53, 0.55, -1.8]].forEach(function (z) {
      out +=
        '<g transform="translate(' + z[0] + " " + z[1] + ") scale(" + z[2] + ')"><path class="wx wxs-zzz" style="animation-delay:' + z[3] +
        's" d="M0 0h4.6l-4.6 5.6h4.6" fill="none" stroke="' + SKY + '" stroke-width="1.3"' + ROUND + "/></g>";
    });
    return out;
  }
  // Back to front: far limbs, torso, scarf, head, near leg and arm, props.
  function fig(p) {
    return p.legF + p.armF + TORSO + (p.scarf || "") + head(p.face, p.hc, p.hv) + p.legN + p.armN + (p.props || "");
  }
  // Stands the figure on the ground at x. The outer group leans or gusts it
  // about the feet; the inner one carries the bob (walk), shiver or breathing,
  // and the --T / --k (cycle length, stride size) every walking limb inherits.
  function who(x, body, lean, bob) {
    return (
      '<g transform="translate(' + x + ' 60) scale(.78)"><ellipse cy=".6" rx="9" ry="1.6" fill="rgba(20,23,28,.12)"/>' +
      '<g class="wxc ' + lean[0] + '" style="' + lean[1] + '"><g class="' + bob[0] + '" style="' + bob[1] + '">' + body + "</g></g></g>"
    );
  }
  function walker(x, T, k, o) {
    o = o || {};
    return who(
      x,
      fig({ legF: WALK.legF, legN: WALK.legN, armF: WALK.armF, armN: o.armN || WALK.armN, face: o.face || "smile", hc: o.hc, hv: o.hv, scarf: o.scarf, props: o.props }),
      ["", "--r:3deg;" + HOLD], ["wxw-bob", "--T:" + T + "s;--k:" + k]
    );
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
  // Dashes slide left under a walker: two dash periods per stride cycle (T
  // seconds, stride k), so the loop is seamless and the planted foot keeps
  // pace with the ground instead of skating over it.
  function ground(T, k) {
    var p = 11 * k;
    return (
      '<path class="wxs-ground" style="--gs:' + (2 * p).toFixed(2) + "px;animation-duration:" + T + 's" d="M3 61H73" stroke="rgba(20,23,28,.26)" stroke-width="1.2" stroke-dasharray="' +
      (5 * k).toFixed(2) + " " + (6 * k).toFixed(2) + '" stroke-linecap="round"/>'
    );
  }
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
    // Waving hello in shades, a glint off the lens now and then.
    sun:
      piece("sun", "translate(42 1) scale(1.1)") + GROUND +
      who(24, fig({ legF: STILL.legF, legN: STILL.legN, armF: arm(true, "wxc-osc", "--r:6deg;--a:3deg;animation-duration:2.6s", "", "--r:-10deg;" + HOLD),
          armN: arm(false, "", "--r:-100deg;" + HOLD, "wxc-osc", "--r:-35deg;--a:20deg;animation-duration:.55s"), face: "shades", props: GLINT }),
        ["", "--r:2deg;" + HOLD], ["wxs-idle", ""]),
    // Nodding off: a slow droop, a jerk awake, Zzz, and a breathing chest.
    moon:
      piece("moon", "translate(44 -1) scale(1.05)") + GROUND +
      who(24, fig({ legF: STILL.legF, legN: STILL.legN, armF: STILL.armF, armN: STILL.armN, face: "sleep", hc: "wxs-nod", hv: "--T:3.6s", props: zzz() }),
        ["", "--r:1deg;" + HOLD], ["wxs-breathe", ""]),
    "cloud-sun": piece("cloud-sun", "translate(38 -1) scale(1.3)") + ground(0.9, 1) + walker(24, 0.9, 1),
    "cloud-moon": piece("cloud-moon", "translate(38 -1) scale(1.3)") + ground(1, 0.9) + walker(24, 1, 0.9),
    // Strolling with a glance up at the clouds.
    cloud: piece("cloud", "translate(36 0) scale(1.35)") + ground(1, 0.9) + walker(24, 1, 0.9, { hv: "--r:-10deg;" + HOLD }),
    // Fog bands are drawn last, so the figure is hazy behind them.
    "cloud-fog": cloud("translate(38 -1) scale(1.3)", "wx-drift", "currentColor") + ground(1.2, 0.8) + walker(24, 1.2, 0.8) + FOG,
    "cloud-rain":
      bank() + drops(9, "M0 0l-1.4 4.4", 8, 70, 0.85, "--dx:-6px") + RIPPLES + ground(0.85, 0.95) +
      walker(24, 0.85, 0.95, { armN: UMB_ARM, props: umbrella(["wxc-osc", "--r:-3deg;--a:2.5deg;animation-duration:1.7s"], ["", "--r:0deg;" + HOLD], false) }),
    // Stamping in place with arms wrapped round, shivering, breath puffing.
    "cloud-snow":
      bank() + flakes(9) + GROUND +
      who(24, fig({ legF: WALK.legF, legN: WALK.legN, armF: HUG_F, armN: HUG_N, face: "smile", scarf: SCARF + scarfTail("--r:-8deg;--a:7deg;animation-duration:1.4s"), props: BREATH }),
        ["", "--r:2deg;" + HOLD], ["wxc-shiver", "--T:.7s;--k:.3"]),
    // The reference's scene: heavy slanted rain, wind streaks, a bolt with a
    // warm glow, and a figure leaning into it all with a scarf streaming and
    // the umbrella wrenched back. Gust, bolt and glow share one 3.4s loop, so
    // the wind shoves just as the lightning strikes.
    "cloud-lightning":
      '<circle class="wxs-glow" cx="58" cy="24" r="16" fill="' + AMBER + '"/>' + bank("#c7d4ec") +
      '<g transform="translate(46 15) scale(.95)"><path class="wx wxs-bolt" d="M13 2L4 14h7l-1 8 10-13h-7Z" fill="' + AMBER +
      '" stroke="' + AMBER + '" stroke-width="1.6" stroke-linejoin="round"/></g>' +
      drops(12, "M0 0l-3.2 4.4", 10, 76, 0.55, "--dx:-14px") + WIND + ground(0.62, 0.55) +
      who(24, fig({ legF: WALK.legF, legN: WALK.legN, armF: arm(true, "wxc-osc", "--r:70deg;--a:10deg;animation-duration:.62s", "", "--r:-30deg;" + HOLD),
          armN: UMB_ARM, face: "grit", scarf: SCARF + scarfTail("--r:58deg;--a:14deg;animation-duration:.3s"),
          props: umbrella(["wxs-pull", "--r:-20deg"], ["wxc-osc", "--r:0deg;--a:8deg;animation-duration:.3s"], true) }),
        ["wxs-gust", "--r:12deg"], ["wxw-bob", "--T:.62s;--k:.55"]),
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
    label.className = "hero-weather-temp";
    label.textContent = Math.round(temp) + "°" + unit;
    chip.appendChild(label);

    // Condition/city line (see .hero-status-detail in home.css): hover-
    // revealed on the compact mobile chip, always visible as the widget's
    // second line from tablet width up. The " · " separator the compact
    // version needs is CSS (::before), so the widget line starts clean.
    var detail = document.createElement("span");
    detail.className = "hero-status-detail";
    detail.textContent = meta.label + (city ? ", " + city : "");
    chip.appendChild(detail);

    container.appendChild(chip);
    // Flush layout so the fade-in below animates from the CSS's opacity:0
    // start state instead of jumping straight to visible — same
    // "force a real paint first" pattern intro-sequence.js already uses
    // for its own FLIP morph.
    void chip.offsetWidth;
    chip.classList.add("hero-status-chip-in");
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
