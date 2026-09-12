// Left-edge jump nav on /life/ — each icon (Instagram/YouTube/Album) goes
// colorful while its own section has any part on screen, and back to
// monochrome once it doesn't. Deliberately per-icon, not a single
// scroll-spy "winner": on a page this short, Youtube and Album can both be
// visible in the same viewport at once, and both icons should light up
// together in that case rather than one arbitrarily excluding the other —
// an earlier single-active-section version picked by "closest to viewport
// center" and that logic could skip Youtube's icon entirely (never
// centered, sandwiched between Instagram and the page's scroll limit). The
// colorful/monochrome swap itself is plain CSS (see .section-nav-icon in
// personal.css); this script only ever adds/removes .is-active. Anchor
// clicks need no JS at all — the sitewide `scroll-behavior: smooth` rule in
// tokens.css already animates the jump.
(function () {
  var nav = document.querySelector(".section-nav");
  if (!nav) return;

  var links = Array.prototype.slice.call(nav.querySelectorAll("[data-section]"));
  if (!links.length) return;

  var linksBySection = {};
  links.forEach(function (link) {
    linksBySection[link.getAttribute("data-section")] = link;
  });

  var sections = Object.keys(linksBySection)
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if (!sections.length) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        linksBySection[entry.target.id].classList.toggle("is-active", entry.isIntersecting);
      });
    },
    { threshold: 0 }
  );

  sections.forEach(function (section) { observer.observe(section); });
})();
