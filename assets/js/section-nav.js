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

  // threshold: 0 (any pixel at all) looked right on paper but a snapped
  // section's neighbor can sit a sub-pixel (confirmed directly: 0.047px)
  // past the viewport edge from ordinary layout rounding — invisible, but
  // IntersectionObserver still counts it, so the previous section's icon
  // never actually turned off (direct report: "when I'm in album, youtube
  // icon also shows its color"). A small real threshold filters that noise
  // out while still catching genuine multi-section visibility mid-scroll.
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        linksBySection[entry.target.id].classList.toggle("is-active", entry.isIntersecting);
      });
    },
    { threshold: 0.02 }
  );

  sections.forEach(function (section) { observer.observe(section); });
})();
