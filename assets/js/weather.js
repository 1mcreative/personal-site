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

  // Small hand-drawn icon set, same stroke language as the rest of this
  // page's SVGs (currentColor, ~1.6px stroke, round caps) — authored for
  // this file, not pulled from an icon library, matching how every other
  // icon here was made.
  var ICONS = {
    sun:
      '<circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    "cloud-sun":
      '<circle cx="7" cy="7" r="2.8" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M7 2v1.4M7 10.6V12M2 7H0.6M13.4 7H12M3.5 3.5l1 1M3.5 3.5l1 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M9 20.5h6.5a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 6.8 15.2 3.3 3.3 0 0 0 9 20.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    cloud:
      '<path d="M7 19h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.5 3.5 3.5 0 0 0 7 19Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    "cloud-fog":
      '<path d="M6.5 13.5h9a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 6.5 8.5a3 3 0 0 0 0 5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M4 17.5h16M6 20.5h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    "cloud-rain":
      '<path d="M7 14h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 4.5 3.5 3.5 0 0 0 7 14Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M9 17.5l-1.3 3M13 17.5l-1.3 3M17 17.5l-1.3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    "cloud-snow":
      '<path d="M7 14h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 4.5 3.5 3.5 0 0 0 7 14Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M8.5 18v3M12 17.5v4M15.5 18v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    "cloud-lightning":
      '<path d="M7 13h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 3.5 3.5 3.5 0 0 0 7 13Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M13 15.5l-3 4h3l-2 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  // WMO weather codes (Open-Meteo's `weathercode`) collapsed into the
  // icon set above, grouped the same way Open-Meteo's own docs group
  // them: https://open-meteo.com/en/docs's weather code table.
  function iconFor(code) {
    if (code === 0) return { icon: "sun", label: "Clear" };
    if (code === 1 || code === 2) return { icon: "cloud-sun", label: "Partly cloudy" };
    if (code === 3) return { icon: "cloud", label: "Overcast" };
    if (code === 45 || code === 48) return { icon: "cloud-fog", label: "Foggy" };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { icon: "cloud-rain", label: "Rainy" };
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: "cloud-snow", label: "Snowy" };
    if (code >= 95) return { icon: "cloud-lightning", label: "Stormy" };
    return { icon: "cloud", label: "Cloudy" };
  }

  function renderChip(temp, code, unit, city) {
    if (typeof temp !== "number" || isNaN(temp)) return;

    var meta = iconFor(code);
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
      '<svg class="hero-status-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      (ICONS[meta.icon] || ICONS.cloud) +
      "</svg>";
    chip.appendChild(wrap.firstChild);

    var label = document.createElement("span");
    label.textContent = Math.round(temp) + "°" + unit;
    chip.appendChild(label);

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
        renderChip(cw.temperature, cw.weathercode, unit, city);
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
