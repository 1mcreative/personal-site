// Distance tile (index.md/home.css: the third .hero-status chip) — how far
// the visitor is from Bhavesh's own location, per direct request: "show
// user distance between them and me... calculate distance and animate and
// show them." Shares assets/js/geo-locate.js's resolver with weather.js
// rather than running a second, independent location lookup — see that
// file's own header comment for why.
//
// HOME_LAT/HOME_LON were looked up once, at dev time, via a real
// geocoding query against the exact pincode given (560035) rather than
// guessed — nominatim.openstreetmap.org resolved it to Hadosiddapura,
// Bangalore East — and hardcoded here as a constant, the same "look it
// up once, bake in the result" approach globe.js already uses for its
// own continent data. No live geocoding call happens for real visitors.
//
// Redesigned twice on direct feedback. First ("km from me" read
// backwards, and the label named the home city): the number got a
// plain-English proximity phrase and the home city was never rendered
// anywhere. Then ("user can not figure out what does it mean... is it
// some random distance? it is distance between me and my users"): the
// scene now shows two labelled endpoints, YOU (a cursor arrow) and ME (a
// pin with a face) with a route drawn between them, the label says
// "between you and me", and hovering (or tapping) opens a popover with
// what that distance means in travel times. HOME_LAT/HOME_LON's resolved
// city is still never rendered, in the label, the popover or the scene.
(function () {
  var container = document.querySelector(".hero-status");
  if (!container) return;
  if (typeof window.resolveVisitorLocation !== "function") return;

  var HOME_LAT = 12.8960214;
  var HOME_LON = 77.6998193;
  var EARTH_RADIUS_KM = 6371;
  var KM_TO_MILES = 0.621371;
  var COUNT_MS = 1200;

  function haversineKm(lat1, lon1, lat2, lon2) {
    var toRad = function (deg) {
      return (deg * Math.PI) / 180;
    };
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // A felt sense of distance reads more honestly than a raw number most
  // people have no intuition for (is 640km close? far? depends who you
  // ask). Thresholds are rough, not measured against anything in
  // particular; this is a vibe, not a travel-time estimate (the popover
  // has those).
  function proximityPhrase(km) {
    if (km < 20) return "next door";
    if (km < 150) return "a short drive away";
    if (km < 800) return "a road trip away";
    if (km < 3000) return "a flight away";
    if (km < 7000) return "a long flight away";
    return "a world away";
  }

  // What the distance means, as time. Speeds in km/h; min/max (km) keep
  // each row sensible (nobody drives to another continent, nobody flies
  // next door). Light is c, a snail is about 13 mm/s.
  var TRAVEL = [
    { label: "Walking", kmh: 5, max: 50 },
    { label: "Driving", kmh: 60, max: 1500 },
    { label: "Flying", kmh: 800, min: 50 },
    { label: "Light", kmh: 299792 * 3600 },
    { label: "A snail", kmh: 0.047 },
  ];

  function formatDuration(s) {
    if (s < 1e-6) return Math.round(s * 1e9) + " ns";
    if (s < 1e-3) return Math.round(s * 1e6) + " µs";
    if (s < 1) return Math.round(s * 1e3) + " ms";
    if (s < 60) return Math.round(s) + " s";
    var m = Math.round(s / 60);
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60);
    if (h < 24) return h + " h" + (m % 60 ? " " + (m % 60) + " min" : "");
    var d = Math.round(s / 86400);
    if (d < 365) return d + (d === 1 ? " day" : " days");
    var y = Math.round(s / 31557600);
    return y + (y === 1 ? " year" : " years");
  }

  // Counts up from 0 to the real distance rather than just printing it,
  // per the explicit "animate" ask, easing out so it settles rather than
  // stopping abruptly. Skipped under reduced motion (jumps straight to
  // the final value), same as every other animated effect on this page.
  function animateCount(el, target, unit, reduceMotion) {
    if (reduceMotion) {
      el.textContent = target.toLocaleString() + " " + unit;
      return;
    }
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / COUNT_MS, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString() + " " + unit;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // YOU is a cursor arrow in the accent blue (your own pointer, in a way),
  // ME an amber pin with a face (the amber of the globe's marker). A
  // dashed route draws itself from one to the other, a dot rides its head,
  // and the pin hops and ripples when it lands; YOU gets a small click as
  // the signal leaves. All parts share one 4.8s loop (.wxd-* in home.css);
  // the rider's keyframes there are sampled along this exact curve
  // (M28 41 Q60 2 89 31). The YOU / ME labels only show in the tile; the
  // compact phone pill shows the map small.
  var SCENE =
    '<svg class="hero-status-icon hero-distance-scene" viewBox="0 0 116 76" fill="none" aria-hidden="true">' +
    '<rect x="1" y="1" width="114" height="74" rx="16" fill="rgba(110,193,255,.16)"/>' +
    '<path d="M8 62Q30 46 54 56T108 40" stroke="rgba(29,78,216,.12)" stroke-width="1.4" stroke-linecap="round"/>' +
    '<path d="M12 22L38 32 64 24 100 38" stroke="rgba(29,78,216,.1)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M28 41Q60 2 89 31" stroke="rgba(29,78,216,.32)" stroke-width="1.5" stroke-dasharray="1.8 3" stroke-linecap="round"/>' +
    '<path class="wxd-route" d="M28 41Q60 2 89 31" pathLength="1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    '<ellipse class="wx wxd-ping" cx="23" cy="55" rx="5.5" ry="1.7" stroke="currentColor" stroke-width="1"/>' +
    '<ellipse cx="23" cy="55" rx="5.5" ry="1.5" fill="rgba(29,78,216,.22)"/>' +
    '<g class="wxd-you"><path d="M17 34V49L21 45.2 23.8 51.4 26.2 50.3 23.5 44.4H28.8Z" fill="currentColor" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></g>' +
    '<text class="wxd-lbl" x="23" y="67" text-anchor="middle" font-size="8" font-weight="700" letter-spacing=".08em" fill="currentColor">YOU</text>' +
    '<ellipse class="wx wxd-land" cx="92" cy="52.3" rx="5" ry="1.4" stroke="#f59e0b" stroke-width=".9"/>' +
    '<ellipse class="wx wxd-shadow" cx="92" cy="52.3" rx="4.8" ry="1.3" fill="rgba(20,23,28,.2)"/>' +
    '<g class="wxd-pin"><path d="M92 52C86.6 45.4 84.4 42.2 84.4 38.4A7.6 7.6 0 1 1 99.6 38.4C99.6 42.2 97.4 45.4 92 52Z" fill="#f59e0b"/>' +
    '<circle cx="89.3" cy="37.2" r="1.15" fill="#1f2733"/><circle cx="94.7" cy="37.2" r="1.15" fill="#1f2733"/>' +
    '<path d="M89.4 40.3Q92 42.8 94.6 40.3" stroke="#1f2733" stroke-width="1.1" stroke-linecap="round"/></g>' +
    '<text class="wxd-lbl" x="92" y="67" text-anchor="middle" font-size="8" font-weight="700" letter-spacing=".08em" fill="#b45309">ME</text>' +
    '<circle class="wxd-ride" cx="28" cy="41" r="2.3" fill="#fff" stroke="currentColor" stroke-width="1.4"/>' +
    "</svg>";

  function renderChip(km, useMiles, city) {
    var value = Math.round(useMiles ? km * KM_TO_MILES : km);
    var unit = useMiles ? "mi" : "km";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var rows = "";
    TRAVEL.forEach(function (t) {
      if ((t.min && km < t.min) || (t.max && km >= t.max)) return;
      rows +=
        '<span class="hero-pop-row"><span>' + t.label + "</span><span>" +
        formatDuration((km / t.kmh) * 3600) + "</span></span>";
    });

    var chip = document.createElement("span");
    chip.className = "hero-status-chip hero-status-chip-dynamic hero-distance-chip";
    // Everything in here is this file's own hardcoded markup and numbers
    // computed from coordinates; the only network-sourced string (the
    // visitor's own city) goes in through textContent below.
    chip.innerHTML =
      SCENE +
      '<span class="hero-tile-val">0 ' + unit + "</span>" +
      '<span class="hero-tile-sub"><span class="hero-sub-short">between us</span><span class="hero-sub-long">between you and me</span></span>' +
      '<span class="hero-pop hero-distance-pop">' +
      '<span class="hero-pop-k">Between you and me</span>' +
      '<span class="hero-pop-big">' + value.toLocaleString() + " " + unit + "</span>" +
      '<span class="hero-pop-small">' + proximityPhrase(km) + "</span>" +
      rows +
      '<span class="hero-pop-fine"></span>' +
      "</span>";

    chip.querySelector(".hero-pop-fine").textContent =
      "As the crow flies" + (city ? " from " + city : "") + ". You are the blue arrow, I am the pin.";

    container.appendChild(chip);
    void chip.offsetWidth;
    chip.classList.add("hero-status-chip-in");

    animateCount(chip.querySelector(".hero-tile-val"), value, unit, reduceMotion);
  }

  window.resolveVisitorLocation(function (loc) {
    if (!loc) return;
    var km = haversineKm(loc.lat, loc.lon, HOME_LAT, HOME_LON);
    renderChip(km, loc.prefersImperial, loc.city);
  });
})();
