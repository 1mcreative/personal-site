// Photo info modal for the /life/ Album section — tapping a photo shows
// its story and metadata (location/date). Same open/close/focus-trap shell
// as contact-modal.js and slice-blade.js (see .contact-modal in
// tokens.css), just populated per-click instead of being static content.
(function () {
  var modal = document.querySelector("[data-photo-modal]");
  if (!modal) return;

  var panel = modal.querySelector(".contact-modal-panel");
  var img = modal.querySelector("[data-photo-modal-image]");
  var captionEl = modal.querySelector("[data-photo-modal-caption]");
  var metaEl = modal.querySelector("[data-photo-modal-meta]");
  var requestLink = modal.querySelector("[data-photo-modal-request]");
  var requestHrefBase = requestLink ? requestLink.getAttribute("href") : "";
  var openers = document.querySelectorAll("[data-photo-open]");
  var closers = modal.querySelectorAll("[data-photo-close]");

  var lastFocused = null;

  function focusable() {
    return Array.prototype.slice.call(
      panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function metaRow(label, value) {
    return "<dt>" + label + "</dt><dd>" + value + "</dd>";
  }

  function open(event) {
    var btn = event.currentTarget;
    var caption = btn.getAttribute("data-caption") || "";
    var location = btn.getAttribute("data-location") || "";
    var date = btn.getAttribute("data-date") || "";

    img.src = btn.getAttribute("data-full") || "";
    img.alt = btn.querySelector("img") ? btn.querySelector("img").alt : "";
    captionEl.textContent = caption;
    captionEl.hidden = !caption;

    var rows = "";
    if (location) rows += metaRow("Where", location);
    if (date) rows += metaRow("When", date);
    metaEl.innerHTML = rows;
    metaEl.hidden = !rows;

    if (requestLink && requestHrefBase) {
      var subject = "Full-res photo" + (location ? " — " + location : "") + (date ? " (" + date + ")" : "");
      requestLink.setAttribute("href", requestHrefBase + "?subject=" + encodeURIComponent(subject));
    }

    lastFocused = document.activeElement;
    modal.hidden = false;
    void modal.offsetWidth;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeydown);
    var close = modal.querySelector(".contact-modal-close");
    if (close) close.focus();
  }

  function close() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    setTimeout(function () {
      modal.hidden = true;
      img.src = "";
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

  Array.prototype.forEach.call(openers, function (el) {
    el.addEventListener("click", open);
    // Soft deterrent only — any image a browser renders can still be
    // screenshotted, so this just removes the convenient "Save image as"
    // path, it isn't real protection. See _data/album.yml's own header
    // comment for the actual mitigation (don't publish full-res
    // originals). Bound here rather than in photo-slider.js so it still
    // applies under prefers-reduced-motion, where that file never runs.
    el.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    });
  });
  Array.prototype.forEach.call(closers, function (el) {
    el.addEventListener("click", close);
  });
})();
