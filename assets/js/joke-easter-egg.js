// Joke easter egg — a hidden feature, not advertised anywhere on the page
// itself: press "J" and a small one-liner joke appears right at the
// cursor, per direct request. Homepage-only, matching this project's
// existing easter eggs (the console.log message, the since-removed
// Konami code) — nothing here shows unless you go looking for it or
// stumble onto the key by accident.
//
// Jokes come from JokeAPI (v2.jokeapi.dev), filtered to `type=single` —
// genuinely one-liners, not the setup/punchline two-part jokes the same
// API also serves — plus `safe-mode`, which strips anything flagged
// nsfw, religious, political, racist, sexist, or explicit. Free,
// keyless, CORS-enabled: no backend here to keep a secret key in, so
// only a keyless API is actually safe to wire in this way.
//
// Appears wherever the cursor happens to be at the moment "J" is
// pressed, not a cursor-follower — stays put once shown so the text
// doesn't shift under your eyes while reading it.
(function () {
  var lastX = 0;
  var lastY = 0;
  var bubble = null;
  var hideTimer = null;
  var fetchToken = 0;

  document.addEventListener("mousemove", function (e) {
    lastX = e.clientX;
    lastY = e.clientY;
  });

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  function removeBubble() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (bubble) {
      bubble.remove();
      bubble = null;
    }
  }

  function showJoke(text) {
    removeBubble();

    var el = document.createElement("div");
    el.className = "joke-bubble";
    el.setAttribute("aria-hidden", "true");
    el.textContent = text;
    // Placed off-screen first so its real rendered size can be measured
    // before picking a final, edge-clamped position — avoids a visible
    // flash-then-jump once it's actually shown.
    el.style.left = "-9999px";
    el.style.top = "-9999px";
    document.body.appendChild(el);
    bubble = el;

    var rect = el.getBoundingClientRect();
    var x = lastX + 16;
    var y = lastY + 20;
    if (x + rect.width > window.innerWidth - 8) x = lastX - rect.width - 16;
    if (y + rect.height > window.innerHeight - 8) y = lastY - rect.height - 20;
    x = Math.max(8, x);
    y = Math.max(8, y);
    el.style.left = x + "px";
    el.style.top = y + "px";

    void el.offsetWidth;
    el.classList.add("joke-bubble-in");

    hideTimer = setTimeout(removeBubble, 4500);
  }

  function fetchJoke() {
    var token = ++fetchToken;
    fetch("https://v2.jokeapi.dev/joke/Any?type=single&safe-mode")
      .then(function (res) {
        return res.ok ? res.json() : Promise.reject(res.status);
      })
      .then(function (data) {
        // A slower-arriving response from an earlier keypress shouldn't
        // clobber a newer one — only the most recent request may render.
        if (token !== fetchToken) return;
        if (!data || data.error || typeof data.joke !== "string") return;
        showJoke(data.joke);
      })
      .catch(function () {
        // Fetch failed — no bubble, no error shown, same
        // progressive-enhancement shape as every other effect here.
      });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "j" && e.key !== "J") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTypingTarget(document.activeElement)) return;
    fetchJoke();
  });
})();
