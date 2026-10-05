// /questions/ page: faceted filtering (company / round / tech stack) plus
// a per-card "Show details" disclosure. No-ops entirely on any other
// page, same as every other script this layout loads unconditionally
// (text-fall.js, galaxy-button.js, etc.) — safe to include sitewide.
(function () {
  var filters = document.querySelector("[data-questions-filters]");
  var list = document.querySelector("[data-questions-list]");
  if (!filters || !list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll(".question-card"));
  var countEl = document.querySelector("[data-questions-count]");
  var emptyEl = document.querySelector("[data-questions-empty]");
  var resetBtn = document.querySelector("[data-filter-reset]");

  // One Set of active values per facet. A facet with nothing selected
  // matches every card (OR within a facet, AND across facets) — the
  // standard faceted-search shape.
  var active = { company: new Set(), round: new Set(), techstack: new Set() };

  function cardMatches(card) {
    var company = card.getAttribute("data-company");
    var round = card.getAttribute("data-round");
    var techs = card.getAttribute("data-techstack").split("///");

    if (active.company.size && !active.company.has(company)) return false;
    if (active.round.size && !active.round.has(round)) return false;
    if (active.techstack.size && !techs.some(function (t) { return active.techstack.has(t); })) return false;
    return true;
  }

  function apply() {
    var visible = 0;
    cards.forEach(function (card) {
      var match = cardMatches(card);
      card.hidden = !match;
      if (match) visible += 1;
    });

    if (countEl) {
      countEl.textContent = visible === cards.length
        ? cards.length + (cards.length === 1 ? " question" : " questions")
        : "Showing " + visible + " of " + cards.length;
    }
    if (emptyEl) emptyEl.hidden = visible !== 0;

    var anyActive = active.company.size || active.round.size || active.techstack.size;
    if (resetBtn) resetBtn.hidden = !anyActive;
  }

  filters.querySelectorAll(".filter-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var group = chip.getAttribute("data-filter-group");
      var value = chip.getAttribute("data-filter-value");
      var set = active[group];
      var pressed = chip.getAttribute("aria-pressed") === "true";

      if (pressed) {
        set.delete(value);
      } else {
        set.add(value);
      }
      chip.setAttribute("aria-pressed", String(!pressed));
      apply();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      Object.keys(active).forEach(function (group) { active[group].clear(); });
      filters.querySelectorAll('.filter-chip[aria-pressed="true"]').forEach(function (chip) {
        chip.setAttribute("aria-pressed", "false");
      });
      apply();
    });
  }

  apply();

  // Per-card "Show details" disclosure — same disclosure shape as
  // .entry-toggle on /resume/ (real <button>, aria-expanded, the `hidden`
  // attribute timed around the CSS grid-collapse transition so it comes
  // off before the open animation starts and goes back on only after the
  // close animation finishes), reimplemented here with its own class
  // names since these cards aren't .resume-entry elements.
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".question-toggle").forEach(function (btn) {
    var card = btn.closest(".question-card");
    var wrap = card ? card.querySelector(".question-answer-wrap") : null;
    var answer = document.getElementById(btn.getAttribute("aria-controls"));
    var label = btn.querySelector(".entry-toggle-label");
    if (!card || !wrap || !answer) return;

    btn.addEventListener("click", function () {
      var expanding = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(expanding));
      if (label) label.textContent = expanding ? "Hide details" : "Show details";

      if (expanding) {
        answer.hidden = false;
        void wrap.offsetHeight;
        wrap.classList.add("is-expanded");
        return;
      }

      wrap.classList.remove("is-expanded");
      if (reduceMotion) {
        answer.hidden = true;
        return;
      }
      var onEnd = function (e) {
        if (e.target !== wrap || e.propertyName !== "grid-template-rows") return;
        wrap.removeEventListener("transitionend", onEnd);
        answer.hidden = true;
      };
      wrap.addEventListener("transitionend", onEnd);
    });
  });
})();
