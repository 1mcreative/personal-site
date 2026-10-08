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
  // from the idea, not the file). Tablet-and-up widget only (home.css
  // .hero-weather-scene): each condition is a 76x64 scene (drawn at 92x77) where one
  // pictogram person reacts to the weather. Shades and a wave in the sun, a
  // sleepy nod under the moon, a walk through cloud and fog, an umbrella in
  // the rain, a shiver in the snow, and a lean into the wind with a
  // blown-about umbrella under lightning. Same hand-built SVG + CSS
  // keyframes as the icons above; the compact mobile chip keeps the icons.
  var INK = "#1f2733";
  var SKIN = "#f5cfa8";
  var SHIRT = "#1d4ed8";
  var ROUND = ' stroke-linecap="round" stroke-linejoin="round"';
  var STILL = "animation:none";
  var WALK = "--a:24deg;animation-duration:.9s";
  var WALK_B = WALK + ";animation-delay:-.45s";
  // The outer <g> puts a joint at (x, y); the inner .wxc group rotates
  // about its own origin (home.css), so a limb drawn hanging from (0, 0)
  // swings about the shoulder or hip. --r is the resting angle, --a the
  // swing around it, set inline per limb.
  function pivot(x, y, vars, inner) {
    return '<g transform="translate(' + x + " " + y + ')"><g class="wxc wxc-osc" style="' + vars + '">' + inner + "</g></g>";
  }
  function leg(x, vars) {
    return pivot(x, -15, vars, '<path d="M0 0V15" stroke="' + INK + '" stroke-width="3.4"' + ROUND + "/>");
  }
  function arm(x, vars) {
    return pivot(x, -27.5, vars,
      '<path d="M0 0V8.5" stroke="' + SHIRT + '" stroke-width="3.2"' + ROUND + '/><circle cy="10.4" r="1.9" fill="' + SKIN + '"/>');
  }
  var TORSO = '<rect x="-5.8" y="-30" width="11.6" height="16.5" rx="4.2" fill="' + SHIRT + '"/>';
  var EYES = '<circle cx="-1.9" cy="-35.6" r=".8" fill="' + INK + '"/><circle cx="1.9" cy="-35.6" r=".8" fill="' + INK + '"/>';
  var MOUTH = '<path d="M-1.5 -33.3q1.5 1.3 3 0" fill="none" stroke="' + INK + '" stroke-width=".8"' + ROUND + "/>";
  var FACES = {
    smile: EYES + MOUTH,
    shades:
      '<g fill="' + INK + '"><rect x="-5" y="-37.2" width="4.3" height="3" rx="1.3"/><rect x=".7" y="-37.2" width="4.3" height="3" rx="1.3"/>' +
      '<rect x="-1" y="-36.4" width="2" height=".8"/></g>' + MOUTH,
    sleep:
      '<path d="M-3.2 -35.6q1.3 1 2.6 0M.6 -35.6q1.3 1 2.6 0" fill="none" stroke="' + INK + '" stroke-width=".8"' + ROUND + "/>" +
      '<circle cy="-33" r=".7" fill="' + INK + '"/>',
    grit:
      EYES + '<path d="M-3.6 -37.4l2.6 .8M3.6 -37.4l-2.6 .8" fill="none" stroke="' + INK + '" stroke-width=".8"' + ROUND + "/>" +
      '<circle cy="-33" r="1" fill="' + INK + '"/>',
  };
  function head(face) {
    return (
      '<circle cy="-36.5" r="5.4" fill="' + SKIN + '"/>' +
      '<path d="M-5.5 -37A5.5 5.5 0 0 1 5.5 -37C3.2 -40 -2.8 -40 -5.5 -37Z" fill="' + INK + '"/>' + FACES[face]
    );
  }
  var SCARF = '<rect x="-6.4" y="-31.8" width="12.8" height="3.4" rx="1.7" fill="' + SKY + '"/>';
  function scarfTail(vars) {
    return pivot(-3.4, -29.6, vars, '<path d="M0 0q-3.8 3.4-1.8 9" fill="none" stroke="' + SKY + '" stroke-width="2.6"' + ROUND + "/>");
  }
  var CANOPY =
    '<path d="M-14 -14Q-12 -24 0 -25Q12 -24 14 -14Q10.5 -16.6 7 -14Q3.5 -16.6 0 -14Q-3.5 -16.6 -7 -14Q-10.5 -16.6 -14 -14Z" fill="' + AMBER + '"/>' +
    '<path d="M0 -25V-14" stroke="rgba(20,23,28,.28)" stroke-width=".8"/>';
  // Held in the near hand at (8, -32): pole and canopy rotate about it.
  // flutter also squashes the canopy as the wind catches it.
  function umbrella(vars, flutter) {
    return (
      '<path d="M5.2 -27.5L8 -32" stroke="' + SHIRT + '" stroke-width="3.2"' + ROUND + "/>" +
      pivot(8, -32, vars,
        '<path d="M0 4V-14" stroke="' + INK + '" stroke-width="1.2"' + ROUND + "/>" +
        (flutter ? '<g class="wx wxs-flutter">' + CANOPY + "</g>" : CANOPY) +
        '<circle r="1.9" fill="' + SKIN + '"/>')
    );
  }
  function zzz() {
    var out = "";
    [[6, -44, 0.9, 0], [10, -49, 0.7, -0.9], [13, -53, 0.55, -1.8]].forEach(function (z) {
      out +=
        '<g transform="translate(' + z[0] + " " + z[1] + ") scale(" + z[2] + ')"><path class="wx wxs-zzz" style="animation-delay:' + z[3] +
        's" d="M0 0h4.6l-4.6 5.6h4.6" fill="none" stroke="' + SKY + '" stroke-width="1.3"' + ROUND + "/></g>";
    });
    return out;
  }
  // The figure stands on the ground line at x. The body group's own class
  // (bob, shiver, lean) moves the whole figure about the feet while the
  // shadow stays put outside it.
  function who(x, body, cls, vars) {
    return (
      '<g transform="translate(' + x + ' 60) scale(.78)"><ellipse cy=".6" rx="9.5" ry="1.7" fill="rgba(20,23,28,.12)"/>' +
      '<g class="wxc ' + cls + '" style="' + vars + '">' + body + "</g></g>"
    );
  }
  function walker(x) {
    return who(
      x,
      leg(-2.6, WALK) + leg(2.6, WALK_B) + arm(-5.2, "--a:20deg;animation-duration:.9s;animation-delay:-.45s") +
        TORSO + head("smile") + arm(5.2, "--a:20deg;animation-duration:.9s"),
      "wxc-bob", "animation-duration:.45s"
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
  // Dashes slide left under a walker (wxs-ground) so the walk goes somewhere.
  var TREAD = '<path class="wxs-ground" d="M3 61H73" stroke="rgba(20,23,28,.26)" stroke-width="1.2" stroke-dasharray="5 6" stroke-linecap="round"/>';
  var WIND = [32, 42, 51].map(function (y, i) {
    return (
      '<g transform="translate(70 ' + y + ')"><path class="wx wxs-wind" style="animation-delay:-' + (i * 0.27).toFixed(2) +
      's" d="M0 0h' + (12 + i * 3) + '" stroke="' + SKY + '" stroke-width="1.2"' + ROUND + "/></g>"
    );
  }).join("");
  var SCENES = {
    sun:
      piece("sun", "translate(42 1) scale(1.1)") + GROUND +
      who(22, leg(-2.6, STILL) + leg(2.6, STILL) + arm(-5.2, "--r:8deg;--a:4deg;animation-duration:2.4s") + TORSO +
        head("shades") + arm(5.2, "--r:-140deg;--a:22deg;animation-duration:.75s"), "wxc-bob", "animation-duration:1.8s"),
    moon:
      piece("moon", "translate(44 -1) scale(1.05)") + GROUND +
      who(22, leg(-2.6, STILL) + leg(2.6, STILL) + arm(-5.2, "--r:5deg;" + STILL) + TORSO +
        pivot(0, -31, "--a:7deg;animation-duration:2.8s", '<g transform="translate(0 31)">' + head("sleep") + "</g>") +
        arm(5.2, "--r:-5deg;" + STILL) + zzz(), "wxc-bob", "animation-duration:2.8s"),
    "cloud-sun": piece("cloud-sun", "translate(38 -1) scale(1.3)") + TREAD + walker(22),
    "cloud-moon": piece("cloud-moon", "translate(38 -1) scale(1.3)") + TREAD + walker(22),
    cloud: piece("cloud", "translate(36 0) scale(1.35)") + TREAD + walker(22),
    // Bands drawn after the walker, so the figure is hazy behind them.
    "cloud-fog":
      cloud("translate(38 -1) scale(1.3)", "wx-drift", "currentColor") + TREAD + walker(24) +
      '<g fill="rgba(214,229,247,.8)"><rect class="wx wxs-fog" x="2" y="34" width="34" height="4.4" rx="2.2"/>' +
      '<rect class="wx wxs-fog wx-rev" style="animation-delay:-1.4s" x="30" y="43" width="40" height="4.4" rx="2.2"/>' +
      '<rect class="wx wxs-fog" style="animation-delay:-2.6s" x="8" y="52" width="38" height="4.4" rx="2.2"/></g>',
    "cloud-rain":
      bank() + drops(9, "M0 0l-1.4 4.4", 8, 70, 0.85, "--dx:-6px") + TREAD +
      who(26, leg(-2.6, WALK) + leg(2.6, WALK_B) + arm(-5.2, "--a:16deg;animation-duration:.9s;animation-delay:-.45s") +
        TORSO + head("smile") + umbrella("--r:-4deg;--a:3deg;animation-duration:1.8s"), "wxc-bob", "animation-duration:.45s"),
    "cloud-snow":
      bank() + flakes(9) + GROUND +
      who(26, leg(-2.6, STILL) + leg(2.6, STILL) + TORSO + SCARF + scarfTail("--a:10deg;animation-duration:1.4s") + head("smile") +
        arm(-5.2, "--r:-58deg;" + STILL) + arm(5.2, "--r:58deg;" + STILL), "wxc-shiver", ""),
    // The reference's scene: heavy slanted rain, wind streaks, a flashing
    // bolt with a warm glow behind it, and a figure leaning into it all,
    // umbrella wrenched sideways and flapping.
    "cloud-lightning":
      '<circle class="wxs-glow" cx="58" cy="24" r="16" fill="' + AMBER + '"/>' + bank("#c7d4ec") +
      '<g transform="translate(46 15) scale(.95)"><path class="wx wx-flash" d="M13 2L4 14h7l-1 8 10-13h-7Z" fill="' + AMBER +
      '" stroke="' + AMBER + '" stroke-width="1.6" stroke-linejoin="round"/></g>' +
      drops(12, "M0 0l-3.2 4.4", 10, 76, 0.55, "--dx:-14px") + WIND + GROUND +
      who(24, leg(-2.6, "--r:10deg;--a:5deg;animation-duration:.3s") + leg(2.6, "--r:-8deg;--a:5deg;animation-duration:.3s;animation-delay:-.15s") +
        arm(-5.2, "--r:72deg;--a:12deg;animation-duration:.4s") + TORSO + SCARF + scarfTail("--r:62deg;--a:16deg;animation-duration:.3s") +
        head("grit") + umbrella("--r:-26deg;--a:11deg;animation-duration:.35s", true), "wxc-osc", "--r:9deg;--a:1.6deg;animation-duration:.28s"),
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
