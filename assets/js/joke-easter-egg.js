// Joke easter egg — a hidden feature, not advertised anywhere on the page
// itself: press "J" and a small one-liner joke appears, attached to the
// cursor, and follows it until you click anywhere to dismiss it. per
// direct request. Homepage-only, matching this project's existing
// easter eggs (the console.log message, the since-removed Konami code)
// — nothing here shows unless you go looking for it or stumble onto the
// key by accident.
//
// Jokes come from JokeAPI (v2.jokeapi.dev), filtered to `type=single` —
// genuinely one-liners, not the setup/punchline two-part jokes the same
// API also serves — plus `safe-mode`, which strips anything flagged
// nsfw, religious, political, racist, sexist, or explicit. Free,
// keyless, CORS-enabled: no backend here to keep a secret key in, so
// only a keyless API is actually safe to wire in this way.
(function () {
  var lastX = 0;
  var lastY = 0;
  var bubble = null;
  var rafId = null;
  var safetyTimer = null;
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

  function positionBubble() {
    if (!bubble) return;
    var rect = bubble.getBoundingClientRect();
    var x = lastX + 16;
    var y = lastY + 20;
    if (x + rect.width > window.innerWidth - 8) x = lastX - rect.width - 16;
    if (y + rect.height > window.innerHeight - 8) y = lastY - rect.height - 20;
    x = Math.max(8, x);
    y = Math.max(8, y);
    bubble.style.left = x + "px";
    bubble.style.top = y + "px";
  }

  // Re-clamps every frame while visible so it keeps flipping correctly
  // if the cursor drifts near a different edge mid-follow, not just
  // once at spawn.
  function followLoop() {
    if (!bubble) {
      rafId = null;
      return;
    }
    positionBubble();
    rafId = requestAnimationFrame(followLoop);
  }

  function removeBubble() {
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (bubble) {
      bubble.remove();
      bubble = null;
    }
  }

  // Click anywhere dismisses it — the bubble itself is pointer-events:
  // none (see home.css), so this never blocks the click from also
  // reaching whatever's actually underneath the cursor.
  document.addEventListener("click", function () {
    removeBubble();
  });

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

    positionBubble();
    void el.offsetWidth;
    el.classList.add("joke-bubble-in");

    rafId = requestAnimationFrame(followLoop);
    // A generous fallback only — click is the real dismiss now, this
    // just guarantees it doesn't linger forever if a visitor wanders
    // off without ever clicking again.
    safetyTimer = setTimeout(removeBubble, 20000);
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
