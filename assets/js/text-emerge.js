// Text Emerge — adapted from a React/GSAP Originkit component ("Text
// Emerge" / InkdropSpread) the user supplied: split text into words, fade
// each one in from opacity:0/scale:0/blur(4px) with a stagger. The GSAP
// engine and React wrapper are the only React/animation-library-specific
// parts of the original — the actual effect is just "hide each word, then
// transition it to visible on a delay," which plain CSS transitions plus
// transitionDelay do without a new dependency, matching how every other
// pasted reference component on this site has been ported.
//
// Scoped to the resume's content columns (Summary through Education) —
// the hero header already has its own distinct entrance treatment
// (text-fall.js) and isn't touched here. Each "reveal unit" below is one
// chunk of the page that fades/rises in together the moment it scrolls
// into view; because scroll position decides trigger order, sections
// higher on the page always animate before ones further down with no
// extra scheduling needed — that's what makes this read as top-to-bottom.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var container = document.querySelector(".resume-columns");
  if (!container) return;

  var WORD_STAGGER_MS = 18;
  var CHUNK_STAGGER_MS = 70;

  // Rebuilds an element's text as a run of inline <span class="word">
  // pieces (whitespace kept as plain text nodes between them, so wrapping
  // and spacing stay exactly as they were). Walks the actual DOM rather
  // than flattening el.textContent, so a bullet like "<strong>Label:</strong>
  // rest of the sentence" keeps its <strong> wrapper — only the text inside
  // each node gets split, recursing into element children rather than
  // replacing them. That also makes it safe on .entry-heading, whose two
  // <span> children (job title, date range) stay exactly where they are
  // for its own flex/space-between layout — only the text inside each one
  // gets split.
  function wrapWordsIn(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      var tokens = node.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      var words = [];
      tokens.forEach(function (token) {
        if (token === "") return;
        if (/^\s+$/.test(token)) {
          frag.appendChild(document.createTextNode(token));
          return;
        }
        var span = document.createElement("span");
        span.className = "word";
        span.textContent = token;
        frag.appendChild(span);
        words.push(span);
      });
      node.parentNode.replaceChild(frag, node);
      return words;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      var childWords = [];
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        childWords = childWords.concat(wrapWordsIn(child));
      });
      return childWords;
    }
    return [];
  }

  function wrapWords(el) {
    return wrapWordsIn(el);
  }

  function setupUnit(unit, chunkSelector) {
    var chunks = chunkSelector ? unit.querySelectorAll(chunkSelector) : [unit];
    Array.prototype.forEach.call(chunks, function (chunk, chunkIndex) {
      var words = wrapWords(chunk);
      words.forEach(function (word, wordIndex) {
        var delay = chunkIndex * CHUNK_STAGGER_MS + wordIndex * WORD_STAGGER_MS;
        word.style.transitionDelay = delay + "ms";
      });
    });
    unit.classList.add("emerge-pending");
  }

  var revealUnits = [];

  container.querySelectorAll(".resume-section").forEach(function (section) {
    var entries = section.querySelectorAll(".resume-entry");
    if (entries.length) {
      // Experience: its own heading is one small unit, then each job
      // entry reveals independently as it's scrolled to — this section is
      // much taller than the others, so one reveal for the whole thing
      // would fire all four jobs (including ones still below the fold)
      // the instant the top of the section appears.
      var heading = section.querySelector("h2");
      if (heading) revealUnits.push({ el: heading, chunks: null });
      entries.forEach(function (entry) {
        revealUnits.push({ el: entry, chunks: "p, li" });
      });
    } else {
      revealUnits.push({ el: section, chunks: "h2, p, li, dt, dd" });
    }
  });

  revealUnits.forEach(function (u) {
    setupUnit(u.el, u.chunks);
  });

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        entry.target.classList.add("emerge-in");
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
  );

  revealUnits.forEach(function (u) {
    io.observe(u.el);
  });
})();
