// /skills/ page: a plain text search over each card's data-search blob
// (name + tagline + description + tags, lowercased server-side). The
// "Copy SKILL.md" button reuses lab.js's own [data-copy-target] handler
// (already loaded by the lab layout this page shares) rather than a
// second copy implementation here. No-ops entirely on any other page,
// same convention as every other script this layout loads unconditionally.
(function () {
  var input = document.querySelector("[data-skills-search-input]");
  var list = document.querySelector("[data-skills-list]");
  if (!input || !list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll(".question-card"));
  var countEl = document.querySelector("[data-skills-count]");
  var emptyEl = document.querySelector("[data-skills-empty]");

  function apply() {
    var term = input.value.trim().toLowerCase();
    var visible = 0;
    cards.forEach(function (card) {
      var match = !term || card.getAttribute("data-search").indexOf(term) !== -1;
      card.hidden = !match;
      if (match) visible += 1;
    });

    if (countEl) {
      countEl.textContent = visible === cards.length
        ? cards.length + (cards.length === 1 ? " skill" : " skills")
        : "Showing " + visible + " of " + cards.length;
    }
    if (emptyEl) emptyEl.hidden = visible !== 0;
  }

  input.addEventListener("input", apply);
  apply();
})();
