// Netflix-style video-card hover: after a short hover-intent delay, swap
// the static thumbnail for a real, muted, autoplaying YouTube embed and
// reveal the title/creator overlay — instead of a fake "preview," an
// actual clip of the actual video plays. Removed (not just hidden) on
// hover-out so playback genuinely stops rather than continuing off-screen.
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

  cards.forEach(function (card) {
    // Regular videos carry the id in ?v=; Shorts (see the .is-short cards)
    // use /shorts/<id> instead, with no query string at all.
    var match = card.href.match(/[?&]v=([^&]+)/) || card.href.match(/\/shorts\/([^/?&]+)/);
    var videoId = match && match[1];
    if (!videoId) return;

    var thumb = card.querySelector(".video-thumb");
    if (!thumb) return;

    var timer = null;
    var iframe = null;

    function start() {
      if (iframe) return;
      iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube.com/embed/" + videoId +
        "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=" + videoId;
      iframe.setAttribute("tabindex", "-1");
      iframe.setAttribute("aria-hidden", "true");
      iframe.allow = "autoplay; encrypted-media";
      thumb.appendChild(iframe);
      card.classList.add("is-hover-active");
    }

    function stop() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
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
