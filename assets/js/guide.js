// Site guide: "Kiddo", a Blobatar (blobatar.dev, MIT, vendored in
// assets/third-party/blobatar) that lives bottom-left on every page. It follows the
// pointer with its eyes, reacts to scrolling, falls asleep when idle and wakes
// up startled. No backend or AI: moods and quips are scripted, links are a menu.
import { blobatar } from "../third-party/blobatar/blob.js";

var NAME = "Kiddo"; // the guide's name, used in its greeting
var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
var NS = "http://www.w3.org/2000/svg";
var path = location.pathname.replace(/index\.html$/, "");
var $ = function (tag, cls, parent) {
  var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e;
};
var S = function (tag, attrs, parent) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e); return e;
};

// Option labels are phrased as what the guide does for you, not as nav names.
var L = { home: ["Take me home", "/"], grind: ["Show me the résumé", "/resume/"], chaos: ["Show me Bhavesh's socials and photos", "/life/"], hot: ["Let me practice interview questions", "/questions/"], lab: ["Show me how this site is built", "/lab/"], skills: ["Show me the Claude Skills", "/skills/"] };
var TIPS = {
  "/": ["Hi, I'm " + NAME + ", Bhavesh's site guide. Where to?", [L.grind, L.chaos, L.hot]],
  "/resume/": ["This is the work side. Looking for something?", [L.hot, L.chaos, L.lab]],
  "/life/": ["The personal side: Instagram, YouTube and photos.", [L.grind, L.hot, L.home]],
  "/lab/": ["Every effect on this site, live and copyable.", [L.skills, L.grind, L.home]],
  "/questions/": ["Real interview questions. Use the filters to narrow them down.", [L.grind, L.skills, L.home]],
  "/skills/": ["Claude Skills used to build and run this site.", [L.lab, L.hot, L.home]]
};
var tip = TIPS[path] || ["Need a hand finding something?", [L.home, L.grind, L.chaos]];
var FACTS = [
  "Press J on the homepage. Something silly happens.",
  "The Component Lab has every effect on this site, with copyable code.",
  // The homepage has no footer; its game button is the "Getting bored?" pill up top.
  path === "/" ? "There's a small game up top. Tap \"Getting bored?\"." : "The footer has a small game. Give it a try.",
  "The Chaos page has Bhavesh's Instagram and YouTube work.",
  "The Hot Seat has real interview questions with worked examples.",
  "I'm Kiddo, a little Blobatar made from the word \"bhavesh\".",
  "My colour changes with my mood. Try poking me.",
  "If you leave me alone for a while, I fall asleep.",
  "Psst. Try hovering over me."
];

// The package only builds the animated form inside its framework adapters, so
// rebuild that structure (breathe > bob > body + eyes) around the static SVG.
var doc = new DOMParser().parseFromString(blobatar("bhavesh", { size: 72 }), "image/svg+xml");
var svg = document.importNode(doc.documentElement, true);
var gs = svg.querySelectorAll(":scope > g");
var body = gs[0], eyes = gs[1];
var head = body.getAttribute("fill"), eyeColor = eyes.getAttribute("fill");
body.removeAttribute("fill"); eyes.removeAttribute("fill");
eyes.setAttribute("class", "mo-eyes");
Array.prototype.forEach.call(eyes.children, function (p, i) {
  var w = S("g", { "class": "guide-eye", "data-side": i ? "r" : "l" });
  var g = S("g", { "class": "mo-eye", style: "--mo-wrap:" + (i ? 1 : -1) });
  eyes.replaceChild(w, p); w.appendChild(g); g.appendChild(p);
});
var eyeWrap = S("g", { "class": "guide-eyes" });
eyeWrap.appendChild(eyes);
var bob = S("g", { "class": "mo-bob" }), breathe = S("g", { "class": "mo-breathe" });
bob.appendChild(body); bob.appendChild(eyeWrap); breathe.appendChild(bob); svg.appendChild(breathe);
svg.setAttribute("class", "mo-root mo-always");
svg.setAttribute("style", "--mo-head:" + head + ";--mo-eye:" + eyeColor);
svg.setAttribute("aria-hidden", "true");

var wrap = $("div", "site-guide");
var panel = $("div", "site-guide-panel", wrap);
panel.id = "site-guide-panel"; panel.hidden = true;
var msg = $("p", "", panel);
var nav = $("nav", "", panel); nav.setAttribute("aria-label", "Suggested pages");
var shown = tip[1].filter(function (l) { return l[1] !== path; });
function renderNav(list) {
  nav.textContent = "";
  list.forEach(function (l, i) {
    var a = $("a", "", nav); a.href = l[1]; a.textContent = l[0]; a.style.setProperty("--i", i);
  });
}
// "Know more" also reshuffles the options, so repeat clicks surface other pages.
function shuffleNav() {
  var pool = Object.keys(L).map(function (k) { return L[k]; }).filter(function (l) { return l[1] !== path; }), pick;
  for (var tries = 0; tries < 5; tries++) {
    pool.sort(function () { return Math.random() - 0.5; });
    pick = pool.slice(0, 3);
    if (pick.map(function (l) { return l[1]; }).join() !== shown.map(function (l) { return l[1]; }).join()) break;
  }
  shown = pick; renderNav(shown);
}
renderNav(shown);
$("span", "site-guide-tail", panel).setAttribute("aria-hidden", "true");
var more = $("button", "site-guide-more", panel); more.type = "button"; $("span", "", more).textContent = "Wanna know more about me?";
$("small", "", more).textContent = "Click to find out";
var btn = $("button", "site-guide-btn", wrap);
btn.type = "button"; btn.setAttribute("aria-label", "Site guide"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", panel.id);
btn.appendChild(svg);
$("span", "site-guide-shadow", wrap).setAttribute("aria-hidden", "true");
var z = $("span", "site-guide-z", wrap); z.textContent = "z z"; z.setAttribute("aria-hidden", "true");
document.body.appendChild(wrap);

var mood = "", lockUntil = 0;
// Body colour follows the mood (pastels, so the dark eyes stay readable).
var MOOD_COLOR = { joy: "#ffe08a", excited: "#ffc27a", love: "#ffb3c7", shy: "#ffc9dc", angry: "#ff9a9a", sad: "#a9c7ff", sleepy: "#cdbfff", surprised: "#ffd9a0", curious: "#a8f0d0", wink: "#ffd0b0", dizzy: "#c8e8a0", bored: "#cfd3da", scared: "#e4ecf5" };
function setMood(m) {
  if (m === mood) return; mood = m; wrap.dataset.mood = m;
  svg.style.setProperty("--mo-head", MOOD_COLOR[m] || head);
  wrap.style.setProperty("--kiddo", MOOD_COLOR[m] || head);
}
// A short-lived emotion that pointer movement can't override, then back to happy.
function flash(m, ms) {
  setMood(m); lockUntil = Date.now() + ms;
  setTimeout(function () { if (mood === m && Date.now() >= lockUntil - 20) setMood("happy"); }, ms);
}
setMood("happy");

var typing, hideT, quips = 0;
function say(text, ms) {
  clearInterval(typing); clearTimeout(hideT);
  panel.hidden = false; panel.style.width = "";
  msg.textContent = text; panel.style.width = panel.offsetWidth + "px"; fit();
  var i = 0;
  if (reduce) msg.textContent = text;
  else typing = setInterval(function () { msg.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typing); }, 18);
  if (ms) hideT = setTimeout(function () { if (!panel.classList.contains("is-open")) { panel.hidden = true; panel.style.width = ""; } }, ms + text.length * 18);
}
// Kiddo "talks" inside the open bubble: eyes up at it, a little bob while typing.
function speak(text) {
  clearInterval(typing); eyes.style.transform = "translate(0,-3px)";
  if (reduce) { msg.textContent = text; return; }
  wrap.classList.add("is-talking"); var i = 0;
  typing = setInterval(function () { msg.textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(typing); wrap.classList.remove("is-talking"); } }, 16);
}
function quip(text, m, ms) {
  if (panel.classList.contains("is-open") || quips >= 3 || document.querySelector("[data-slice-blade-modal]:not([hidden])")) return;
  quips++; flash(m || "happy", ms || 2200); say(text, 6500);
}
function hop() {
  if (reduce) return;
  btn.classList.remove("is-hop"); void btn.offsetWidth; btn.classList.add("is-hop");
}
function setOpen(open) {
  clearInterval(typing); clearTimeout(hideT); wrap.classList.remove("is-talking");
  panel.classList.toggle("is-open", open);
  panel.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  panel.style.width = "";
  if (open) { if (Date.now() >= lockUntil) setMood("happy"); msg.textContent = tip[0]; fit(); speak(tip[0]); }
}
nav.addEventListener("mouseover", function (e) { if (e.target.closest("a")) flash("excited", 900); });
var fact = Math.floor(Math.random() * FACTS.length);
more.addEventListener("click", function () { fact = (fact + 1) % FACTS.length; speak(FACTS[fact]); shuffleNav(); flash("wink", 1200); hop(); });
var pokes = [];
btn.addEventListener("click", function () {
  wake(); freeze(); hop();
  var now = Date.now(); pokes = pokes.filter(function (t) { return now - t < 2500; }); pokes.push(now);
  if (pokes.length >= 8) { flash("dizzy", 2500); setOpen(true); speak("Too... many... pokes..."); }
  else if (pokes.length >= 4) { flash("angry", 1800); setOpen(true); speak("Okay okay, stop poking!"); }
  else { flash("joy", 700); setOpen(!panel.classList.contains("is-open")); }
});
document.addEventListener("keydown", function (e) { wake(); if (e.key === "Escape" && panel.classList.contains("is-open")) { setOpen(false); btn.focus(); } });
document.addEventListener("click", function (e) {
  if (panel.classList.contains("is-open") && !wrap.contains(e.target)) setOpen(false);
  if (e.target.closest("[data-slice-blade-open]")) setOpen(false);
});

// Kiddo has a life of its own. Its mood drifts on a random timer, it naps when left
// alone, wanders now and then and mutters a line once in a while. It reacts only to
// being poked or hovered, not to everything the visitor does.
var idleT;
function wake() {
  clearTimeout(idleT);
  if (mood === "sleepy") { flash("surprised", 700); hop(); }
  idleT = setTimeout(function () { if (!panel.classList.contains("is-open")) { setMood("sleepy"); panel.hidden = true; } }, 70000);
}
wake();
function rand(a, b) { return a + Math.random() * (b - a); }
function later(fn, a, b) { setTimeout(fn, rand(a, b)); }
function choose(list) { return list[Math.floor(Math.random() * list.length)]; }

if (!reduce) {
  // The eyes only follow the cursor when it is close; otherwise it minds its own business.
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    wake();
    var r = btn.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    var d = Math.hypot(dx, dy) || 1;
    if (walking && d < 150) freeze();
    if (d < 260) { var k = Math.min(1, d / 200) * 3.5; eyes.style.transform = "translate(" + (dx / d * k) + "px," + (dy / d * k) + "px)"; }
  });
  // Being hovered sometimes makes it happy, sometimes it doesn't care.
  var lastLove = 0;
  btn.addEventListener("pointerenter", function (e) {
    if (e.pointerType !== "mouse" || Date.now() < lockUntil || Date.now() - lastLove < 20000) return;
    lastLove = Date.now();
    if (Math.random() < 0.4) flash("love", 1400);
  });
  document.addEventListener("scroll", recheck, { capture: true, passive: true });

  // Its mood drifts by itself. Weighted, so mostly content, sometimes anything else.
  var DRIFT = [["happy", 34], ["curious", 14], ["joy", 10], ["bored", 12], ["wink", 8], ["shy", 8], ["excited", 6]];
  var driftTotal = DRIFT.reduce(function (n, m) { return n + m[1]; }, 0);
  var drift = function () {
    if (idle() && Date.now() >= lockUntil) {
      var r = Math.random() * driftTotal, m = "happy";
      for (var i = 0; i < DRIFT.length; i++) { r -= DRIFT[i][1]; if (r <= 0) { m = DRIFT[i][0]; break; } }
      flash(m, rand(4000, 9000));
    }
    later(drift, 12000, 35000);
  };
  later(drift, 8000, 20000);
  // It glances around or winks at nothing in particular.
  var glance = function () {
    if (mood === "happy" && idle()) {
      if (Math.random() < 0.15) flash("wink", 900);
      else eyes.style.transform = "translate(" + (Math.random() * 6 - 3) + "px," + (Math.random() * 4 - 2) + "px)";
    }
    later(glance, 7000, 20000);
  };
  later(glance, 6000, 12000);
  // It wanders off now and then, not on a schedule.
  var wander = function () { if (Math.random() < 0.55) roam(); later(wander, 20000, 50000); };
  later(wander, 15000, 30000);
}

// Things it says to itself, a few times per visit at most. Relatable, a little dry.
var MUSINGS = [
  "Is it snack time yet? I don't even have a mouth.",
  "I was thinking about nothing. It was great.",
  "Do pixels get tired? Asking for a friend.",
  "Some days you scroll, some days you stare. Both count.",
  "I walked all the way over here. Worth it.",
  "Don't mind me. Just a blob, doing blob things.",
  "Somewhere there's a tab you forgot about. Just saying.",
  "I could really use a nap.",
  "No legs, still get around.",
  "Drink some water. I can't, but you can."
];
var PAGE_MUSINGS = {
  "/": "Nice view. That globe never gets dizzy.",
  "/resume/": "Bhavesh wrote all this. I mostly supervise.",
  "/life/": "That black hole is my favourite neighbour.",
  "/lab/": "Everything in here actually works. Rare, I know.",
  "/questions/": "Interview nerves are normal. Even blobs get them.",
  "/skills/": "I'm not a skill. I'm more of a vibe."
};
var said = {};
function chatter() {
  if (quips < 3 && idle() && mood !== "sleepy" && Math.random() < 0.6) {
    var pool = MUSINGS.concat(PAGE_MUSINGS[path] ? [PAGE_MUSINGS[path], PAGE_MUSINGS[path]] : []).filter(function (t) { return !said[t]; });
    if (pool.length) { var t = choose(pool); said[t] = 1; quip(t, choose(["happy", "curious", "joy", "wink", "bored", "shy"]), 2800); }
  }
  later(chatter, 50000, 110000);
}
later(chatter, 30000, 60000);

// Free roaming: Kiddo may wander anywhere on screen, but only onto spots where it
// would not cover anything functional (links, buttons, inputs, headings, text,
// images, the nav, the homepage globe). Candidate spots are hit-tested first.
var walking = false, curX = 0, curY = 0, walkT, recheckT;
var BLOCK = 'a,button,input,textarea,select,summary,label,[role="button"],[tabindex]:not([tabindex="-1"]),h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote,pre,img,video,iframe,.hero-globe,.site-header,.hero-status,.section-nav,.life-pull-btn';
var TOP_CLEAR = 84; // keep clear of the fixed nav bars
function baseLeft() { return parseFloat(getComputedStyle(wrap).left); }
function baseTop() { return innerHeight - parseFloat(getComputedStyle(wrap).bottom) - btn.offsetHeight; }
function bounds() { return { maxX: Math.max(0, innerWidth - btn.offsetWidth - 2 * baseLeft()), minY: -Math.max(0, baseTop() - TOP_CLEAR) }; }
function blockedAt(left, top, size) {
  var pad = 6;
  for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
    var els = document.elementsFromPoint(left + pad + (size - 2 * pad) * i / 3, top + pad + (size - 2 * pad) * j / 3);
    for (var k = 0; k < els.length; k++) if (!wrap.contains(els[k]) && els[k].closest(BLOCK)) return true;
  }
  return false;
}
function pickSpot(minDist) {
  var bd = bounds(), size = btn.offsetWidth;
  for (var t = 0; t < 30; t++) {
    var x = Math.random() * bd.maxX, y = Math.random() * bd.minY;
    if (Math.hypot(x - curX, y - curY) < minDist) continue;
    if (!blockedAt(baseLeft() + x, baseTop() + y, size)) return { x: x, y: y };
  }
  return null;
}
function walkTo(x, y, dur) {
  curX = x; curY = y;
  wrap.style.setProperty("--walk", dur + "s"); wrap.style.setProperty("--x", x + "px"); wrap.style.setProperty("--y", y + "px");
}
function goTo(spot, speed) {
  var dist = Math.hypot(spot.x - curX, spot.y - curY), dur = Math.min(24, dist / speed);
  eyes.style.transform = "translate(" + (spot.x > curX ? 3 : -3) + "px," + (spot.y > curY ? 2 : -2) + "px)";
  walking = true; btn.classList.add("is-walking"); walkTo(spot.x, spot.y, dur);
  walkT = setTimeout(function () { walking = false; btn.classList.remove("is-walking"); hop(); }, dur * 1000);
}
// Keep an open bubble on screen: nudge Kiddo left/down if the bubble would overflow.
function fit() {
  if (walking) return;
  // Measured from the button and the panel's layout size: the panel's own rect is
  // scaled down while its pop-in animation starts.
  var b = btn.getBoundingClientRect(), right = b.left + panel.offsetWidth, top = b.top - 10 - panel.offsetHeight, x = curX, y = curY;
  if (right > innerWidth - 12) x = Math.max(0, curX - (right - (innerWidth - 12)));
  if (top < TOP_CLEAR) y = Math.min(0, curY + (TOP_CLEAR - top));
  if (x !== curX || y !== curY) walkTo(x, y, 0.3);
}
function freeze() {
  if (!walking) return;
  walking = false; clearTimeout(walkT); btn.classList.remove("is-walking");
  var r = btn.getBoundingClientRect();
  walkTo(Math.max(0, r.left - baseLeft()), Math.min(0, r.top - baseTop()), 0);
}
function idle() {
  return !(reduce || document.hidden || walking || panel.classList.contains("is-open") || !panel.hidden || wrap.matches(":hover, :focus-within") || document.querySelector("[data-slice-blade-modal]:not([hidden])"));
}
function roam() {
  if (!idle() || mood === "sleepy") return;
  var r = btn.getBoundingClientRect(), stuck = blockedAt(r.left, r.top, r.width);
  var spot = pickSpot(stuck ? 0 : 120); if (spot) goTo(spot, stuck ? 90 : 30);
}
// If scrolling or resizing slides content under Kiddo, move it to a free spot.
function recheck() {
  clearTimeout(recheckT);
  recheckT = setTimeout(function () {
    if (!idle()) return;
    var bd = bounds(), r = btn.getBoundingClientRect();
    if (curX > bd.maxX || curY < bd.minY || blockedAt(r.left, r.top, r.width)) { var spot = pickSpot(0); if (spot) goTo(spot, 90); }
  }, 450);
}
addEventListener("resize", recheck);
