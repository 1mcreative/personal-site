// Netflix-style video-card hover: after a short hover-intent delay, swap
// the static thumbnail for a real, muted, autoplaying YouTube embed —
// instead of a fake "preview," an actual clip of the actual video plays.
// Removed (not just hidden) on hover-out so playback genuinely stops
// rather than continuing off-screen. After a longer continued hover, the
// embed reloads unmuted (direct feedback: "don't let it silent") — this
// is a best-effort, not a guarantee: Chrome/Safari/Firefox all require a
// real click (not hover) before they'll allow audible autoplay, so a
// browser enforcing that policy will keep it muted regardless of this
// src swap. There's no JS-visible way to detect that refusal from outside
// the iframe (cross-origin), so this can't fall back to anything smarter.
//
// Gated to matchMedia('hover: hover') — the same gate this site already
// uses for spotlight-text and the Black Hole's pointer-follow — since a
// touch tap has no hover-intent to detect and should just open the real
// YouTube link as before.
(function () {
  if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) return;

  var cards = Array.prototype.slice.call(document.querySelectorAll(".video-card"));
  if (!cards.length) return;

  var INTENT_MS = 450; // avoids loading an embed for every card the cursor merely passes over
  var SOUND_MS = 3000; // continued hover past this point tries to unmute

  function embedSrc(id, muted) {
    return "https://www.youtube.com/embed/" + id +
      "?autoplay=1&mute=" + (muted ? "1" : "0") +
      "&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=" + id;
  }

  cards.forEach(function (card) {
    // Regular videos carry the id in ?v=; Shorts use /shorts/<id> instead,
    // with no query string at all — both card shapes are visually uniform
    // now, but the underlying URLs still differ. Channel cards (no video
    // id at all) fall through untouched.
    var match = card.href.match(/[?&]v=([^&]+)/) || card.href.match(/\/shorts\/([^/?&]+)/);
    var videoId = match && match[1];
    if (!videoId) return;

    var thumb = card.querySelector(".video-thumb");
    if (!thumb) return;

    var timer = null;
    var soundTimer = null;
    var iframe = null;

    function start() {
      if (iframe) return;
      iframe = document.createElement("iframe");
      iframe.src = embedSrc(videoId, true);
      iframe.setAttribute("tabindex", "-1");
      iframe.setAttribute("aria-hidden", "true");
      iframe.allow = "autoplay; encrypted-media";
      thumb.appendChild(iframe);
      card.classList.add("is-hover-active");
      soundTimer = setTimeout(function () {
        if (iframe) iframe.src = embedSrc(videoId, false);
      }, SOUND_MS);
    }

    function stop() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (soundTimer) {
        clearTimeout(soundTimer);
        soundTimer = null;
      }
      card.classList.remove("is-hover-active");
      if (iframe) {
        iframe.remove();
        iframe = null;
      }
    }

    card.addEventListener("mouseenter", function () {
      timer = setTimeout(start, INTENT_MS);
    });
    card.addEventListener("mouseleave", stop);
    card.addEventListener("focus", start);
    card.addEventListener("blur", stop);
  });
})();
