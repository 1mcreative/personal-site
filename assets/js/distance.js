// Distance chip (index.md/home.css: the third .hero-status chip, stacking
// below the clock and weather) — how far the visitor is from Bhavesh's
// own location, per direct request: "show user distance between them and
// me... calculate distance and animate and show them." Shares
// assets/js/geo-locate.js's resolver with weather.js rather than running
// a second, independent location lookup — see that file's own header
// comment for why.
//
// HOME_LAT/HOME_LON were looked up once, at dev time, via a real
// geocoding query against the exact pincode given (560035) rather than
// guessed — nominatim.openstreetmap.org resolved it to Hadosiddapura,
// Bangalore East — and hardcoded here as a constant, the same "look it
// up once, bake in the result" approach globe.js already uses for its
// own continent data. No live geocoding call happens for real visitors.
//
// Redesigned per direct feedback on the first version's "14 km from me"
// label: unclear ("what does that mean?" — "from me" reads backwards
// just as easily, like a store-locator's "near me" means near the
// *visitor*, not the site owner) and it named the home city outright,
// which the city/country string this chip used to show (in both the
// label and the hover tooltip) made easy to reverse-geocode — an
// explicit "do not tell directly I am in Bangalore" ask. The animated
// number stays (still the one explicit "animate" requirement from the
// original request), but it's now paired with a plain-English proximity
// phrase instead of a bare unit, and HOME_LAT/HOME_LON's resolved city
// is never rendered anywhere in this file, label or tooltip.
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

  // The actual "creative, playful, something new" part: a felt sense of
  // distance reads more honestly than a raw number most people have no
  // intuition for anyway (is 640km close? far? depends who you ask) —
  // and, unlike "X km from me", none of these phrases need a city name
  // or a preposition to make sense standing alone next to a pin icon.
  // Thresholds are rough, not measured against anything in particular;
  // this is a vibe, not a travel-time estimate.
  function proximityPhrase(km) {
    if (km < 20) return "next door";
    if (km < 150) return "a short drive away";
    if (km < 800) return "a road trip away";
    if (km < 3000) return "a flight away";
    if (km < 7000) return "a long flight away";
    return "a world away";
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

  function renderChip(km, useMiles, city) {
    var value = Math.round(useMiles ? km * KM_TO_MILES : km);
    // unit flows into every place the label gets built (the count-up,
    // the reduced-motion branch, and the initial "0 ..." text below), so
    // baking the proximity phrase in here fixes the resting state
    // everywhere at once rather than patching three call sites. Computed
    // off the real km, not `value`, since the thresholds above are
    // always in km regardless of which unit is actually displayed.
    var unit = (useMiles ? "mi" : "km") + " · " + proximityPhrase(km);
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Never the destination city — only ever the visitor's own, which is
    // their own public info, not Bhavesh's.
    var crowFlies = "as the crow flies" + (city ? " from " + city : "");

    var chip = document.createElement("span");
    chip.className = "hero-status-chip hero-status-chip-dynamic hero-distance-chip";
    chip.title = crowFlies;

    // Trusted, hardcoded icon markup only — see weather.js's own comment
    // on why this is safe with innerHTML while the label text below still
    // goes through textContent instead.
    // A tiny map: the visitor's own blue dot, a dashed route that draws
    // itself across, a dot riding its head, and an amber pin (the same
    // amber as the globe's marker, i.e. "me") that drops in when the dot
    // arrives. No place name anywhere in it, same rule as the label. The
    // keyframes (.wxd-* in home.css) all share one 4.6s loop; the rider's
    // translate keyframes are sampled at equal arc lengths along this exact
    // curve (M10 24 Q30 -2 50 24), so it stays at the head of the drawn line.
    var wrap = document.createElement("span");
    wrap.innerHTML =
      '<svg class="hero-status-icon hero-distance-scene" viewBox="0 0 60 32" fill="none" aria-hidden="true">' +
      '<rect x="1" y="3" width="58" height="26" rx="9" fill="rgba(110,193,255,.16)"/>' +
      '<path d="M7 25L18 14 28 19 40 9 53 13" stroke="rgba(29,78,216,.13)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M10 24Q30 -2 50 24" stroke="rgba(29,78,216,.3)" stroke-width="1.4" stroke-dasharray="1.6 2.6" stroke-linecap="round"/>' +
      '<path class="wxd-route" d="M10 24Q30 -2 50 24" pathLength="1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>' +
      '<circle class="wx wxd-ping" cx="10" cy="24" r="2.6" stroke="currentColor" stroke-width="1"/>' +
      '<circle cx="10" cy="24" r="2.7" fill="currentColor"/><circle cx="10" cy="24" r="1" fill="#fff"/>' +
      '<ellipse class="wx wxd-land" cx="50" cy="24.3" rx="3" ry="1" stroke="#f59e0b" stroke-width=".9"/>' +
      '<ellipse class="wx wxd-shadow" cx="50" cy="24.3" rx="2.8" ry=".9" fill="rgba(20,23,28,.2)"/>' +
      '<g class="wx wxd-pin"><path d="M50 24C47.4 20.6 46.2 18.8 46.2 16.6A3.8 3.8 0 1 1 53.8 16.6C53.8 18.8 52.6 20.6 50 24Z" fill="#f59e0b"/><circle cx="50" cy="16.6" r="1.4" fill="#fff"/></g>' +
      '<circle class="wxd-ride" cx="10" cy="24" r="1.9" fill="#fff" stroke="currentColor" stroke-width="1.2"/>' +
      "</svg>";
    chip.appendChild(wrap.firstChild);

    var label = document.createElement("span");
    label.textContent = "0 " + unit;
    chip.appendChild(label);

    // Hover-reveal detail (see .hero-status-detail in home.css) — same
    // text as the title tooltip above, now visible on hover too.
    var detail = document.createElement("span");
    detail.className = "hero-status-detail";
    detail.textContent = " · " + crowFlies;
    chip.appendChild(detail);

    container.appendChild(chip);
    void chip.offsetWidth;
    chip.classList.add("hero-status-chip-in");

    animateCount(label, value, unit, reduceMotion);
  }

  window.resolveVisitorLocation(function (loc) {
    if (!loc) return;
    var km = haversineKm(loc.lat, loc.lon, HOME_LAT, HOME_LON);
    renderChip(km, loc.prefersImperial, loc.city);
  });
})();
