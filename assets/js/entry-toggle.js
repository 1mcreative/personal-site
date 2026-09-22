// Experience entries default to collapsed (see resume/index.md — every
// .entry-details starts with the `hidden` attribute) and only open when
// this deliberately toggles them; nothing here auto-expands on load,
// hover, or scroll. Standard disclosure pattern: a real <button> with
// aria-expanded, not a clickable div.
//
// The `hidden` attribute (not just the CSS grid-collapse in
// professional.css) is what actually keeps closed content out of the
// accessibility tree — relying on zero rendered height alone would still
// leave it in some screen readers' browse-mode navigation. That means
// hidden can't just be toggled instantly: on expand it has to come off
// *before* the open transition starts (so there's something to animate
// into), and on collapse it can only go back on *after* the close
// transition finishes (so the row doesn't just vanish with no animation).
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".entry-toggle").forEach(function (btn) {
    var entry = btn.closest(".resume-entry");
    var wrap = entry ? entry.querySelector(".entry-details-wrap") : null;
    var details = document.getElementById(btn.getAttribute("aria-controls"));
    var label = btn.querySelector(".entry-toggle-label");
    if (!entry || !wrap || !details) return;

    btn.addEventListener("click", function () {
      var expanding = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(expanding));
      if (label) label.textContent = expanding ? "Hide details" : "Show details";

      if (expanding) {
        details.hidden = false;
        // Force layout before adding the class that starts the transition —
        // otherwise the browser can coalesce "unhide" and "expand" into one
        // frame and just snap straight to open with no visible animation.
        void wrap.offsetHeight;
        entry.classList.add("is-expanded");
        return;
      }

      entry.classList.remove("is-expanded");
      if (reduceMotion) {
        details.hidden = true;
        return;
      }
      var onEnd = function (e) {
        if (e.target !== wrap || e.propertyName !== "grid-template-rows") return;
        wrap.removeEventListener("transitionend", onEnd);
        details.hidden = true;
      };
      wrap.addEventListener("transitionend", onEnd);
    });
  });
})();
