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

  // ---- Share ------------------------------------------------------------
  // Same shape as Slice Blade's own share panel (assets/js/slice-blade.js):
  // the Web Share API first when the browser has it (puts WhatsApp,
  // Instagram, LinkedIn, Messages, etc. in the OS's own native sheet for
  // free, no extra UI needed) — otherwise the Share button toggles open a
  // small row of explicit WhatsApp/LinkedIn/copy-link fallbacks.
  document.querySelectorAll("[data-share-btn]").forEach(function (btn) {
    var card = btn.closest(".skill-card");
    if (!card) return;
    var panel = card.querySelector("[data-share-panel]");
    var note = card.querySelector("[data-share-note]");
    var url = btn.getAttribute("data-share-url");
    var title = btn.getAttribute("data-share-title");
    var text = btn.getAttribute("data-share-text");

    btn.addEventListener("click", function () {
      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url }).catch(function () {});
        return;
      }
      if (!panel) return;
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    });

    if (!panel) return;

    var waBtn = panel.querySelector("[data-share-whatsapp]");
    var liBtn = panel.querySelector("[data-share-linkedin]");
    var copyBtn = panel.querySelector("[data-share-copy]");

    if (waBtn) {
      waBtn.addEventListener("click", function () {
        window.open("https://wa.me/?text=" + encodeURIComponent(text + " " + url), "_blank", "noopener");
      });
    }
    if (liBtn) {
      liBtn.addEventListener("click", function () {
        window.open("https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url), "_blank", "noopener");
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var done = function (ok) { if (note) note.textContent = ok ? "Link copied!" : url; };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
        } else {
          done(false);
        }
      });
    }
  });
})();
