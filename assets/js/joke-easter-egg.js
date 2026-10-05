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

  // A hint for desktop visitors who haven't found this on their own —
  // shows once, 10s after page load, then fades out on its own; pressing
  // J (the exact thing it suggests) dismisses it immediately too, since
  // there's no point telling someone to do what they just did. Gated to
  // real mouse/desktop use the same way spotlight-text already is
  // (hover:hover + pointer:fine) — a keyboard-shortcut nudge means
  // nothing to a touch-only visitor. Shown at most once per browser
  // session (sessionStorage), so a reload or an already-discovered
  // easter egg doesn't get nagged about again.
  var HINT_SESSION_KEY = "jokeHintSeen";
  var HINT_DELAY_MS = 10000;
  var HINT_VISIBLE_MS = 6000;
  var hintEl = null;
  var hintFadeTimer = null;

  function markHintSeen() {
    try {
      sessionStorage.setItem(HINT_SESSION_KEY, "1");
    } catch (e) {
      // sessionStorage unavailable (private mode, disabled) — fine, the
      // hint might just show again next reload, not worth guarding harder.
    }
  }

  function dismissHint() {
    if (hintFadeTimer) {
      clearTimeout(hintFadeTimer);
      hintFadeTimer = null;
    }
    if (!hintEl) return;
    var el = hintEl;
    hintEl = null;
    el.classList.remove("joke-hint-in");
    setTimeout(function () {
      el.remove();
    }, 400);
  }

  function showHint() {
    if (hintEl) return;
    var el = document.createElement("div");
    el.className = "joke-hint";
    el.setAttribute("aria-hidden", "true");
    // The "J" badge is this file's own static markup, not user/network
    // data, so innerHTML here is safe the same way the joke icons are.
    el.innerHTML = 'Press <kbd class="joke-hint-key">J</kbd> for something fun';
    document.body.appendChild(el);
    hintEl = el;
    void el.offsetWidth;
    el.classList.add("joke-hint-in");
    hintFadeTimer = setTimeout(dismissHint, HINT_VISIBLE_MS);
  }

  if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var hintAlreadySeen = false;
    try {
      hintAlreadySeen = sessionStorage.getItem(HINT_SESSION_KEY) === "1";
    } catch (e) {
      hintAlreadySeen = false;
    }
    if (!hintAlreadySeen) {
      setTimeout(function () {
        showHint();
        markHintSeen();
      }, HINT_DELAY_MS);
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "j" && e.key !== "J") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTypingTarget(document.activeElement)) return;
    dismissHint();
    markHintSeen();
    fetchJoke();
  });
})();
