// Component Lab orchestration — copy buttons, stock/ours tabs, lazy-loading
// each demo's real script only once its card is actually on screen, and a
// generic "Replay" control that works uniformly across every demo (canvas,
// WebGL, or pure CSS/DOM) without needing per-effect reset logic.
//
// Deliberately does NOT load hero.js anywhere on this page: hero.js wires a
// page-wide wheel/touch listener that navigates to /resume/, which would
// hijack scrolling this whole documentation page. Every demo that needs a
// piece of hero.js's behavior (blob parallax, spotlight cursor-tracking)
// gets a tiny, safe, scoped-to-its-own-card reimplementation instead — see
// initBlobParallax/initSpotlight below.
(function () {
  "use strict";

  function flash(btn, text, ms) {
    var original = btn.textContent;
    btn.textContent = text;
    btn.classList.add("lab-copy-btn-done");
    setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove("lab-copy-btn-done");
    }, ms || 1400);
  }

  function copyText(btn, text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { flash(btn, "Copied!"); },
        function () { flash(btn, "Couldn't copy"); }
      );
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        flash(btn, "Copied!");
      } catch (e) {
        flash(btn, "Couldn't copy");
      }
      document.body.removeChild(ta);
    }
  }

  // ---- Copy buttons ---------------------------------------------------
  function initCopyButtons() {
    document.querySelectorAll("[data-copy-target]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var src = document.getElementById(btn.getAttribute("data-copy-target"));
        if (!src) return;
        copyText(btn, src.textContent.replace(/^\n/, "").replace(/\s+$/, "\n"));
      });
    });

    document.querySelectorAll("[data-copy-url]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var url = btn.getAttribute("data-copy-url");
        var original = btn.textContent;
        btn.textContent = "Fetching…";
        fetch(url)
          .then(function (r) { return r.text(); })
          .then(function (text) {
            btn.textContent = original;
            copyText(btn, text);
          })
          .catch(function () {
            btn.textContent = original;
            flash(btn, "Couldn't fetch");
          });
      });
    });
  }

  // ---- Stock / Ours tabs ------------------------------------------------
  // Each tabbed card's own .lab-card is the group boundary — there's no
  // separate .lab-tabs wrapper around the nav + panels in the markup, and
  // a card is already a safe, unambiguous scope since .lab-tab-btn/
  // .lab-tab-panel only ever appear inside a card that actually uses them.
  function initTabs() {
    document.querySelectorAll(".lab-card").forEach(function (group) {
      var buttons = group.querySelectorAll(".lab-tab-btn");
      var panels = group.querySelectorAll(".lab-tab-panel");
      if (!buttons.length) return;
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var target = btn.getAttribute("data-tab");
          buttons.forEach(function (b) {
            b.classList.toggle("lab-tab-btn-active", b === btn);
          });
          panels.forEach(function (p) {
            p.hidden = p.getAttribute("data-tab-panel") !== target;
          });
        });
      });
    });
  }

  // ---- Lazy-load each demo's real script only once it's on screen -----
  var loadedScripts = {};

  function loadDemoScript(stage) {
    var src = stage.getAttribute("data-lazy-src");
    if (!src) return;
    var s = document.createElement("script");
    s.src = src;
    stage.appendChild(s);
  }

  function initLazyDemos() {
    var stages = document.querySelectorAll("[data-lazy-src]");
    if (!("IntersectionObserver" in window)) {
      stages.forEach(loadDemoScript);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var stage = entry.target;
          var id = stage.getAttribute("data-demo-id");
          if (loadedScripts[id]) return;
          loadedScripts[id] = true;
          loadDemoScript(stage);
        });
      },
      { threshold: 0.2 }
    );
    stages.forEach(function (stage) { io.observe(stage); });
  }

  // ---- Replay: restore a demo's original markup, then re-run its script -
  function initReplay() {
    document.querySelectorAll("[data-replay]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-replay");
        var demo = document.querySelector('[data-demo-id="' + id + '"]');
        var tpl = document.querySelector('[data-demo-template="' + id + '"]');
        if (!demo) return;
        if (tpl) {
          demo.innerHTML = tpl.innerHTML;
        }
        loadedScripts[id] = true;
        loadDemoScript(demo);
      });
    });
  }

  // ---- Tiny, scoped reimplementations of hero.js bits used in demos -----
  // Each is a handful of lines and only ever touches its own card, so none
  // of hero.js's page-wide navigation logic needs to load here at all.
  function initBlobParallax() {
    document.querySelectorAll("[data-blob-parallax]").forEach(function (host) {
      host.addEventListener("pointermove", function (e) {
        var r = host.getBoundingClientRect();
        var mx = ((e.clientX - r.left) / r.width - 0.5) * 24;
        var my = ((e.clientY - r.top) / r.height - 0.5) * 24;
        host.style.setProperty("--mx", mx.toFixed(1) + "px");
        host.style.setProperty("--my", my.toFixed(1) + "px");
      });
    });
  }

  function initSpotlight() {
    if (!window.matchMedia("(hover: hover)").matches) return;
    document.querySelectorAll("[data-spotlight]").forEach(function (el) {
      el.classList.add("spotlight-ready");
      el.addEventListener("pointermove", function (e) {
        var rect = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", (e.clientX - rect.left) + "px");
        el.style.setProperty("--spot-y", (e.clientY - rect.top) + "px");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initCopyButtons();
    initTabs();
    initLazyDemos();
    initReplay();
    initBlobParallax();
    initSpotlight();
  });
})();
