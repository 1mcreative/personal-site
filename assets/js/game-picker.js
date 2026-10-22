(function () {
  var modal = document.querySelector("[data-game-picker]");
  if (!modal) return;
  var timer = 0, lastFocused = null;
  function onKey(e) {
    if (e.key === "Escape") { close(); if (lastFocused && lastFocused.focus) lastFocused.focus(); return; }
    if (e.key !== "Tab") return;
    var items = [].slice.call(modal.querySelectorAll("button"));
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function open(e) {
    if (e) e.preventDefault();
    lastFocused = window.gamePickerOrigin = document.activeElement;
    clearTimeout(timer);
    modal.hidden = false; void modal.offsetWidth;
    modal.classList.add("is-open");
    document.addEventListener("keydown", onKey);
    modal.querySelector(".game-card").focus();
  }
  // Closing before a game opens: the game's own handler (same click) then takes focus.
  function close() {
    modal.classList.remove("is-open");
    document.removeEventListener("keydown", onKey);
    timer = setTimeout(function () { modal.hidden = true; }, 200);
  }
  [].forEach.call(document.querySelectorAll("[data-game-picker-open]"), function (el) { el.addEventListener("click", open); });
  [].forEach.call(modal.querySelectorAll("[data-game-picker-close]"), function (el) {
    el.addEventListener("click", function () { close(); if (lastFocused && lastFocused.focus) lastFocused.focus(); });
  });
  [].forEach.call(modal.querySelectorAll(".game-card"), function (el) { el.addEventListener("click", close); });
})();
