// Shared visitor-location resolver — used by both weather.js and
// distance.js so one page load only ever runs one location lookup, not
// two independent ones (which would mean either two separate permission
// prompts or two redundant IP-lookup calls, depending on which path each
// consumer happened to take on its own).
//
// Tries the browser's own Geolocation API first (exact coordinates, but
// shows a real permission prompt), falling back to the same silent,
// approximate IP-based lookup (ipwho.is) weather.js used on its own
// before this file existed — per direct instruction: "if user has given
// exact location that take that or based on network/browser location."
// Memoizes the result: the first caller triggers the actual lookup,
// every later caller in the same page load just gets queued and
// notified once settled, rather than starting a second lookup of its
// own.
(function () {
  var started = false;
  var hasResolved = false;
  var resolvedValue = null;
  var waiting = [];

  function settle(result) {
    hasResolved = true;
    resolvedValue = result;
    var callbacks = waiting;
    waiting = [];
    callbacks.forEach(function (cb) {
      cb(result);
    });
  }

  // US visitor gets imperial units (weather in F, distance in miles);
  // everyone else gets metric. The Geolocation API only ever gives
  // coordinates, no country, so `navigator.language` stands in as a
  // best-effort signal in that case — not perfectly reliable, but a
  // reasonable extension of the same "match what the visitor is already
  // used to" idea the clock already applies to 12h/24h formatting.
  function prefersImperial(countryCode) {
    if (countryCode) return countryCode === "US";
    return typeof navigator !== "undefined" && navigator.language === "en-US";
  }

  function viaIp() {
    fetch("https://ipwho.is/")
      .then(function (res) {
        return res.ok ? res.json() : Promise.reject(res.status);
      })
      .then(function (geo) {
        if (!geo || !geo.success || typeof geo.latitude !== "number" || typeof geo.longitude !== "number") {
          settle(null);
          return;
        }
        settle({
          lat: geo.latitude,
          lon: geo.longitude,
          city: geo.city || null,
          countryCode: geo.country_code || null,
          prefersImperial: prefersImperial(geo.country_code),
          source: "ip",
        });
      })
      .catch(function () {
        settle(null);
      });
  }

  function start() {
    if (started) return;
    started = true;

    if (!window.navigator || !navigator.geolocation) {
      viaIp();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        settle({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          city: null,
          countryCode: null,
          prefersImperial: prefersImperial(null),
          source: "geo",
        });
      },
      function () {
        // Denied, unavailable, or timed out — fall back silently, same
        // progressive-enhancement shape as every other effect here.
        viaIp();
      },
      { timeout: 6000, maximumAge: 5 * 60 * 1000 }
    );
  }

  window.resolveVisitorLocation = function (callback) {
    if (hasResolved) {
      callback(resolvedValue);
      return;
    }
    waiting.push(callback);
    start();
  };
})();
