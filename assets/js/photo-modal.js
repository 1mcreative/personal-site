// Photo lightbox for the /life/ Album section — tapping a photo shows it
// full-size with no surrounding card (direct feedback: "remove whole card
// concept... show only photo"). Caption/location/date live in a toggled
// info overlay instead of always-visible card text, a floating toolbar
// (info/dots/download) sits on the photo's own bottom edge, and Prev/Next
// are an edge-hover cursor + click-the-edge gesture rather than static
// buttons (direct feedback: "remove static arrows... arrow should come
// when pointer is at left/right edge of photo"). Same open/close/
// focus-trap shell as contact-modal.js/slice-blade.js (.contact-modal in
// tokens.css), just without .contact-modal-panel, the glass "card" that's
// explicitly gone here. Content is populated per-click from whichever
// .photo-slide button was pressed, rather than one modal per photo.
(function () {
  var modal = document.querySelector("[data-photo-modal]");
  if (!modal) return;
  // Authored inside <main>, whose z-index:1 stacking context ties with the
  // footer's and loses on DOM order, so the footer painted over the lightbox.
  document.body.appendChild(modal);

  var figureEl = modal.querySelector(".photo-modal-figure");
  var img = modal.querySelector("[data-photo-modal-image]");
  var captionEl = modal.querySelector("[data-photo-modal-caption]");
  var metaEl = modal.querySelector("[data-photo-modal-meta]");
  var cursorEl = modal.querySelector("[data-photo-cursor]");
  var dotsEl = modal.querySelector("[data-photo-dots]");
  var infoBtn = modal.querySelector("[data-photo-info]");
  var infoPanel = modal.querySelector("[data-photo-info-panel]");
  var downloadBtn = modal.querySelector("[data-photo-download]");
  var closers = modal.querySelectorAll("[data-photo-close]");
  // photo-slider.js clones each real tile several times over to loop its
  // carousel seamlessly (assets/js/photo-slider.js's own `repeats`), so a
  // plain querySelectorAll here picks up every clone too, not just the 3
  // real photos. allOpeners is every clone — every single one needs its
  // own click-to-open listener, or a click on any clone past the first
  // occurrence of a photo would silently do nothing (a real, previously
  // shipped bug: "click should open no matter where it is in the
  // carousel" — fixed here, not by giving every clone a listener and then
  // also trying to dedupe that list). openers is deduped by src instead,
  // used only for things that mean "one real photo" — the dots and
  // Prev/Next cycling length — so there's exactly one dot per photo
  // regardless of how many times it's cloned.
  var allOpeners = Array.prototype.slice.call(document.querySelectorAll("[data-photo-open]"));
  var seenSrc = {};
  var openers = allOpeners.filter(function (el) {
    var src = el.getAttribute("data-full") || "";
    if (seenSrc[src]) return false;
    seenSrc[src] = true;
    return true;
  });

  function indexForSrc(src) {
    for (var i = 0; i < openers.length; i++) {
      if (openers[i].getAttribute("data-full") === src) return i;
    }
    return -1;
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Gates the pointer-follow edge cursor only — the click-the-edge
  // navigation itself works on touch too (there's no hover there to show
  // the cursor in, but a tap near either edge still needs to do something).
  var cursorNavEnabled =
    !reduceMotion && window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Fraction of the image's own width, from each side, that counts as
  // "the edge" for both the cursor and the click — a click in the middle
  // 50% does nothing.
  var EDGE_ZONE = 0.25;

  var lastFocused = null;
  var currentIndex = -1;
  var sliding = false;
  var SLIDE_MS = 200;
  var currentLocation = "";
  var currentDate = "";

  if (dotsEl) {
    if (openers.length > 1) {
      dotsEl.innerHTML = openers
        .map(function () {
          return '<span class="photo-modal-dot"></span>';
        })
        .join("");
    } else {
      dotsEl.hidden = true;
    }
  }

  function updateDots() {
    if (!dotsEl || openers.length <= 1) return;
    Array.prototype.forEach.call(dotsEl.children, function (dot, i) {
      dot.classList.toggle("is-active", i === currentIndex);
    });
  }

  function focusable() {
    return Array.prototype.slice.call(
      figureEl.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function metaRow(label, value) {
    return "<dt>" + label + "</dt><dd>" + value + "</dd>";
  }

  function populate(btn) {
    var caption = btn.getAttribute("data-caption") || "";
    var location = btn.getAttribute("data-location") || "";
    var date = btn.getAttribute("data-date") || "";
    currentLocation = location;
    currentDate = date;

    img.classList.remove("photo-modal-image-broken");
    img.src = btn.getAttribute("data-full") || "";
    img.alt = btn.querySelector("img") ? btn.querySelector("img").alt : "";
    figureEl.setAttribute("aria-label", img.alt || "Photo");
    captionEl.textContent = caption;
    captionEl.hidden = !caption;

    var rows = "";
    if (location) rows += metaRow("Where", location);
    if (date) rows += metaRow("When", date);
    metaEl.innerHTML = rows;
    metaEl.hidden = !rows;
  }

  // dir is +1 (next, slides in from the right) or -1 (prev, slides in from
  // the left) — omitted (or under reduced motion) swaps instantly.
  function navigate(i, dir) {
    if (sliding || openers.length <= 1) return;
    currentIndex = (i + openers.length) % openers.length;
    if (reduceMotion || !dir) {
      populate(openers[currentIndex]);
      updateDots();
      return;
    }
    sliding = true;
    img.classList.add(dir > 0 ? "is-slide-out-left" : "is-slide-out-right");
    setTimeout(function () {
      populate(openers[currentIndex]);
      updateDots();
      img.classList.remove("is-slide-out-left", "is-slide-out-right");
      img.classList.add(dir > 0 ? "is-slide-in-right" : "is-slide-in-left");
      void img.offsetWidth;
      requestAnimationFrame(function () {
        img.classList.remove("is-slide-in-right", "is-slide-in-left");
      });
      setTimeout(function () {
        sliding = false;
      }, SLIDE_MS);
    }, SLIDE_MS);
  }

  function setInfoOpen(isOpen) {
    if (!infoBtn || !infoPanel) return;
    infoPanel.hidden = !isOpen;
    infoBtn.setAttribute("aria-expanded", String(isOpen));
  }

  function open(event) {
    currentIndex = indexForSrc(event.currentTarget.getAttribute("data-full"));
    populate(event.currentTarget);
    updateDots();
    setInfoOpen(false);

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
      img.src = "";
    }, 200);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (openers.length > 1 && event.key === "ArrowLeft") {
      navigate(currentIndex - 1, -1);
      return;
    }
    if (openers.length > 1 && event.key === "ArrowRight") {
      navigate(currentIndex + 1, 1);
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

  allOpeners.forEach(function (el) {
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

  if (infoBtn) {
    infoBtn.addEventListener("click", function () {
      setInfoOpen(infoPanel.hidden);
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      var detail = currentLocation ? currentLocation + (currentDate ? " (" + currentDate + ")" : "") : "this photo";
      close();
      if (typeof window.openContactModal === "function") {
        window.openContactModal({
          topic: "Photo request",
          message: "Could I get the full-resolution version of the photo from " + detail + "? "
        });
      } else {
        // Defensive fallback only — footer.html always loads
        // contact-modal.js alongside this file, so openContactModal should
        // always exist in practice.
        var opener = document.querySelector("[data-contact-open][href]");
        if (opener) {
          window.location.href = opener.getAttribute("href") + "?subject=" + encodeURIComponent("Full-res photo request - " + detail);
        }
      }
    });
  }

  // Edge-zone navigation: a click within EDGE_ZONE of either side of the
  // image steps that way; the middle does nothing. Works regardless of
  // hover support, so a tap near the edge on touch navigates too.
  if (openers.length > 1) {
    img.addEventListener("click", function (event) {
      var rect = img.getBoundingClientRect();
      var relX = event.clientX - rect.left;
      var edge = rect.width * EDGE_ZONE;
      if (relX < edge) navigate(currentIndex - 1, -1);
      else if (relX > rect.width - edge) navigate(currentIndex + 1, 1);
    });

    // Pointer-follow chevron, adapted from a pasted "Cursor Image Gallery"
    // reference — hover-only, since there's no pointer position to follow
    // on touch. Bound to the image itself, not the whole figure, so
    // hovering the toolbar/close buttons (which sit on top of the image)
    // naturally keeps their own pointer styling — no special-casing
    // needed, the browser's own pointerleave on the image handles that.
    if (cursorNavEnabled && cursorEl && figureEl) {
      img.addEventListener("pointermove", function (event) {
        var rect = img.getBoundingClientRect();
        var figRect = figureEl.getBoundingClientRect();
        var relX = event.clientX - rect.left;
        var edge = rect.width * EDGE_ZONE;
        var inLeft = relX < edge;
        var inRight = relX > rect.width - edge;
        if (inLeft || inRight) {
          cursorEl.style.left = event.clientX - figRect.left + "px";
          cursorEl.style.top = event.clientY - figRect.top + "px";
          cursorEl.classList.toggle("is-right", inRight);
          cursorEl.classList.add("is-visible");
          img.classList.add("is-edge-cursor");
        } else {
          cursorEl.classList.remove("is-visible");
          img.classList.remove("is-edge-cursor");
        }
      });

      img.addEventListener("pointerleave", function () {
        cursorEl.classList.remove("is-visible");
        img.classList.remove("is-edge-cursor");
      });
    }
  }
})();
