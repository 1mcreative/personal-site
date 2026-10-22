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
tip[1].forEach(function (l) {
  if (l[1] === path) return;
  var a = $("a", "", nav); a.href = l[1]; a.textContent = l[0];
});
var more = $("button", "site-guide-more", panel); more.type = "button"; more.textContent = "Tell me something";
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
function quip(text, m, ms) {
  if (panel.classList.contains("is-open") || quips >= 8 || document.querySelector("[data-slice-blade-modal]:not([hidden])")) return;
  quips++; flash(m || "happy", ms || 2200); hop(); say(text, 4500);
}
function hop() {
  if (reduce) return;
  btn.classList.remove("is-hop"); void btn.offsetWidth; btn.classList.add("is-hop");
}
function setOpen(open) {
  clearInterval(typing); clearTimeout(hideT);
  panel.classList.toggle("is-open", open);
  panel.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  panel.style.width = "";
  if (open) { msg.textContent = tip[0]; if (Date.now() >= lockUntil) setMood("happy"); fit(); }
}
nav.addEventListener("mouseover", function (e) { if (e.target.closest("a")) flash("excited", 900); });
var fact = Math.floor(Math.random() * FACTS.length);
more.addEventListener("click", function () { fact = (fact + 1) % FACTS.length; msg.textContent = FACTS[fact]; flash("wink", 1200); hop(); });
var pokes = [];
btn.addEventListener("click", function () {
  wake(); freeze(); hop();
  var now = Date.now(); pokes = pokes.filter(function (t) { return now - t < 2500; }); pokes.push(now);
  if (pokes.length >= 8) { flash("dizzy", 2500); setOpen(true); msg.textContent = "Too... many... pokes..."; }
  else if (pokes.length >= 4) { flash("angry", 1800); setOpen(true); msg.textContent = "Okay okay, stop poking!"; }
  else { flash("joy", 700); setOpen(!panel.classList.contains("is-open")); }
});
document.addEventListener("keydown", function (e) { wake(); if (e.key === "Escape" && panel.classList.contains("is-open")) { setOpen(false); btn.focus(); } });
document.addEventListener("click", function (e) {
  if (panel.classList.contains("is-open") && !wrap.contains(e.target)) setOpen(false);
  if (e.target.closest("[data-slice-blade-open]")) { setOpen(false); flash("curious", 3000); say("Good luck! Have fun.", 4000); hop(); }
});

// Idle -> sleepy; any activity wakes it with a startled hop.
var idleT;
var boredT;
function wake() {
  clearTimeout(idleT);
  if (mood === "sleepy") { flash("surprised", 700); hop(); } else if (mood === "bored") setMood("happy");
  clearTimeout(boredT);
  boredT = setTimeout(function () { if (mood === "happy" && !panel.classList.contains("is-open")) setMood("bored"); }, 12000);
  idleT = setTimeout(function () { if (!panel.classList.contains("is-open")) { setMood("sleepy"); panel.hidden = true; } }, 25000);
}
wake();

if (!reduce) {
  // Eyes follow the mouse; near it Kiddo gets curious, on it Kiddo is happy to be petted.
  var lastP, petT = 0;
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    wake();
    var r = btn.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    var d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 200) * 3.5;
    eyes.style.transform = "translate(" + (dx / d * k) + "px," + (dy / d * k) + "px)";
    if (walking && d < 150) freeze();
    // A fast swipe at it startles it; lingering on it makes it shy.
    var now = Date.now(), speed = lastP ? Math.hypot(e.clientX - lastP.x, e.clientY - lastP.y) / Math.max(1, now - lastP.t) : 0;
    lastP = { x: e.clientX, y: e.clientY, t: now };
    if (speed > 2.5 && d < 160 && now > lockUntil) { quip("Eek!", "scared", 1300); return; }
    if (now < lockUntil) return;
    var near = d < r.width * 0.7;
    if (near && !petT) petT = setTimeout(function () { petT = 0; if (mood === "love") quip("Okay, that's enough!", "shy", 2000); }, 3000);
    if (!near && petT) { clearTimeout(petT); petT = 0; }
    setMood(near ? "love" : d < 220 ? "curious" : "happy");
  });
  // Scrolling makes it float with a lag; a fast scroll startles it.
  var lastY = {}, lagT, lastWarn = 0;
  document.addEventListener("scroll", function (e) {
    var t = e.target === document ? document.scrollingElement : e.target;
    var y = t.scrollTop, dy = y - (lastY[t.tagName] || y); lastY[t.tagName] = y;
    wake();
    wrap.style.setProperty("--lag", Math.max(-26, Math.min(26, dy * 0.25)) + "px");
    clearTimeout(lagT); lagT = setTimeout(function () { wrap.style.setProperty("--lag", "0px"); }, 90);
    var now = Date.now();
    if (Math.abs(dy) > 140 && now - lastWarn > 30000) { lastWarn = now; quip("Whoa, slow down!", "dizzy", 1400); }
    if (y + t.clientHeight >= t.scrollHeight - 4 && !wrap.dataset.end) { wrap.dataset.end = "1"; quip("That's the end. Say hello?", "love", 2500); }
  }, { capture: true, passive: true });
  // Now and then it glances around, winks or hops on its own.
  setInterval(function () {
    if (mood !== "happy" || panel.classList.contains("is-open") || walking) return;
    var r = Math.random();
    if (r < 0.2) flash("wink", 900);
    else { eyes.style.transform = "translate(" + (Math.random() * 6 - 3) + "px," + (Math.random() * 4 - 2) + "px)"; if (r < 0.4) hop(); }
  }, 6000);
  // Walks slowly along the bottom edge when nobody is interacting with it.
  setInterval(roam, 9000);
  document.addEventListener("mouseout", function (e) { if (!e.relatedTarget && e.clientY <= 0) quip("Leaving already?", "sad", 2200); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) quip("You're back!", "joy", 1500); });
}

var walking = false, curX = 0, walkT;
function maxX() {
  var w = btn.offsetWidth, m = Math.min(innerWidth * 0.4, innerWidth - w - 2 * 24);
  var cue = document.querySelector(".scroll-cue");
  if (cue && cue.offsetParent) m = Math.min(m, cue.getBoundingClientRect().left - 36 - w - curX + curX);
  return Math.max(0, m);
}
function walkTo(x, dur) {
  curX = x; wrap.style.setProperty("--walk", dur + "s"); wrap.style.setProperty("--x", x + "px");
}
function fit() {
  var over = wrap.getBoundingClientRect().left + panel.offsetWidth - (innerWidth - 12) + 0;
  var base = parseFloat(wrap.style.getPropertyValue("--x")) || 0;
  if (over > 0 && !walking) walkTo(Math.max(0, base - over - 0), 0.3);
}
function freeze() {
  if (!walking) return;
  walking = false; clearTimeout(walkT); btn.classList.remove("is-walking");
  var x = btn.getBoundingClientRect().left - parseFloat(getComputedStyle(wrap).left);
  walkTo(Math.max(0, x), 0);
}
function roam() {
  if (reduce || document.hidden || mood === "sleepy" || walking || panel.classList.contains("is-open") || !panel.hidden || wrap.matches(":hover, :focus-within") || document.querySelector("[data-slice-blade-modal]:not([hidden])")) return;
  var m = maxX(); if (m < 40) return;
  var x = Math.random() * m;
  if (Math.abs(x - curX) < 60) x = curX > m / 2 ? 0 : m;
  var dur = Math.abs(x - curX) / 45;
  eyes.style.transform = "translate(" + (x > curX ? 3 : -3) + "px,0)";
  walking = true; btn.classList.add("is-walking"); walkTo(x, dur);
  walkT = setTimeout(function () { walking = false; btn.classList.remove("is-walking"); hop(); }, dur * 1000);
}
addEventListener("resize", function () { if (curX > maxX()) walkTo(maxX(), 0.3); });

setTimeout(function () { quip("Hi! I'm " + NAME + ". Click me for a tour.", "excited"); setTimeout(function () { setMood("happy"); }, 2500); }, 4000);
setTimeout(function () { quip(FACTS[fact], "curious"); }, 40000);
