// Video lightbox for the /life/ Youtube section — direct request: clicking
// a video card opens the real video in an in-page player first, not an
// immediate tab-away to youtube.com; only an explicit "Watch on Youtube"
// click (or the embed's own native fullscreen, which stays on this page
// regardless) actually leaves. The card's own href stays a real youtube.com
// link throughout (no-JS/middle-click/"open in new tab" all still work) —
// this only intercepts a plain click. Same open/close/focus-trap shell as
// photo-modal.js/contact-modal.js (.contact-modal in tokens.css).
(function () {
  var modal = document.querySelector("[data-video-modal]");
  if (!modal) return;
  document.body.appendChild(modal);

  var figure = modal.querySelector(".video-modal-figure");
  var frame = modal.querySelector("[data-video-modal-frame]");
  var titleEl = modal.querySelector("[data-video-modal-title]");
  var externalLink = modal.querySelector("[data-video-modal-link]");
  var closers = modal.querySelectorAll("[data-video-close]");
  var lastFocused = null;

  function focusable() {
    return Array.prototype.slice.call(
      figure.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function open(videoId, isShort, href, title) {
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube.com/embed/" + videoId + "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    frame.innerHTML = "";
    frame.appendChild(iframe);
    frame.classList.toggle("is-vertical", isShort);
    externalLink.href = href;
    titleEl.textContent = title || "";
    figure.setAttribute("aria-label", title || "Video");

    lastFocused = document.activeElement;
    modal.hidden = false;
    void modal.offsetWidth;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeydown);
    var close = modal.querySelector(".photo-modal-close");
    if (close) close.focus();
  }

  function close() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    setTimeout(function () {
      modal.hidden = true;
      frame.innerHTML = "";
    }, 200);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key !== "Tab") return;
    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll(".video-card"), function (card) {
    // Regular videos carry the id in ?v=; Shorts use /shorts/<id> instead
    // (same two shapes video-hover.js already parses for its own preview).
    var match = card.href.match(/[?&]v=([^&]+)/) || card.href.match(/\/shorts\/([^/?&]+)/);
    var videoId = match && match[1];
    if (!videoId) return;
    var isShort = card.href.indexOf("/shorts/") !== -1;
    var titleEl2 = card.querySelector(".video-title");

    card.addEventListener("click", function (event) {
      event.preventDefault();
      open(videoId, isShort, card.href, titleEl2 ? titleEl2.textContent : "");
    });
  });

  Array.prototype.forEach.call(closers, function (el) {
    el.addEventListener("click", close);
  });
})();
