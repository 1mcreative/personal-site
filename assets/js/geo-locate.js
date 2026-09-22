// Shared visitor-location resolver — used by both weather.js and
// distance.js so one page load only ever runs one location lookup, not
// two independent ones.
//
// Never actively prompts for location. Per explicit correction (2026-09-
// 22): "do not ask for location access, if it already given to browser
// take it or else take browser/network location" — the browser's exact
// Geolocation API is only used when permission was already granted some
// other way (checked via the Permissions API, which reads the current
// state without showing any UI of its own); anything else — not yet
// decided, denied, or the Permissions API itself unsupported — goes
// straight to the same silent, approximate IP-based lookup (ipwho.is)
// weather.js used on its own before this file existed. A visitor who has
// never been asked never sees a popup.
//
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

  function useGeolocation() {
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
        // Permission was already "granted" going in, so this shouldn't
        // normally fire — but a real device/OS-level location failure is
        // still possible. Fall back the same way as everywhere else.
        viaIp();
      },
      { timeout: 6000, maximumAge: 5 * 60 * 1000 }
    );
  }

  function start() {
    if (started) return;
    started = true;

    if (!window.navigator || !navigator.geolocation) {
      viaIp();
      return;
    }

    if (!navigator.permissions || !navigator.permissions.query) {
      // No Permissions API to check first — calling getCurrentPosition
      // directly here risks a real prompt, which is exactly what this
      // file must never do. Skip straight to the IP fallback instead.
      viaIp();
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then(function (status) {
        if (status.state === "granted") {
          useGeolocation();
        } else {
          // "prompt" (not yet decided) or "denied" — either way, never
          // trigger the popup ourselves.
          viaIp();
        }
      })
      .catch(function () {
        // Some browsers (a real Safari gap in places) support
        // navigator.permissions but reject a "geolocation" query
        // specifically — same reasoning, don't risk a prompt.
        viaIp();
      });
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
