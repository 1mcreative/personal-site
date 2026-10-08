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
  function cloud(place, cls, stroke) {
    return (
      '<g transform="' + place + '"><path class="wx ' + cls + '" d="' + CLOUD_PATH +
      '" fill="#e6f0ff" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round"/></g>'
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

    // The icon markup is always one of this file's own hardcoded ICONS
    // strings above, never network data, so building it via innerHTML on
    // a throwaway wrapper (then moving the real <svg> out of it) is safe
    // here — the temperature/city text below goes through textContent
    // instead, since that IS untrusted data from the geolocation API.
    var wrap = document.createElement("span");
    wrap.innerHTML =
      '<svg class="hero-status-icon hero-weather-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      (ICONS[meta.icon] || ICONS.cloud) +
      "</svg>";
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
