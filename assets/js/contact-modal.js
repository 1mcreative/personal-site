// Contact modal — shared across every page via footer.html, not scoped to
// one theme. The trigger is a real mailto: link in the markup; this just
// upgrades its click to open the modal instead, so no-JS visitors still
// have a working way to reach out.
//
// Submission goes through Formspree (https://formspree.io) since this is a
// static GitHub Pages site with no backend of its own — the <form>'s
// action in footer.html ships with a placeholder ID. Until that's replaced
// with a real one (sign up free at formspree.io, create a form, paste the
// resulting https://formspree.io/f/xxxxxxxx URL into footer.html), submits
// fail fast with a clear on-page message instead of a silent/broken
// network request.
(function () {
  var PLACEHOLDER = "YOUR_FORM_ID";

  var modal = document.querySelector("[data-contact-modal]");
  if (!modal) return;
  var backdrop = modal.querySelector(".contact-modal-backdrop");
  var panel = modal.querySelector(".contact-modal-panel");
  var form = modal.querySelector("[data-contact-form]");
  var status = modal.querySelector("[data-contact-status]");
  var openers = document.querySelectorAll("[data-contact-open]");
  var closers = modal.querySelectorAll("[data-contact-close]");

  var lastFocused = null;
  var closeTimer = 0;

  function focusable() {
    return Array.prototype.slice.call(
      panel.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function open(event) {
    if (event) event.preventDefault();
    lastFocused = document.activeElement;
    clearTimeout(closeTimer);
    modal.hidden = false;
    // Force a reflow between removing [hidden] and adding .is-open so the
    // opacity transition actually plays instead of jumping straight in.
    void modal.offsetWidth;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeydown);
    // Prefer the first real form field over the close button, which sits
    // earlier in the DOM but isn't what someone opening a form wants to
    // land on first.
    var firstField = form.querySelector("input, textarea");
    var first = firstField || focusable()[0];
    if (first) first.focus();
  }

  function close() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    closeTimer = setTimeout(function () {
      modal.hidden = true;
    }, 200);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key !== "Tab") return;
    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setStatus(text, state) {
    status.textContent = text;
    if (state) {
      status.setAttribute("data-state", state);
    } else {
      status.removeAttribute("data-state");
    }
  }

  Array.prototype.forEach.call(openers, function (el) {
    el.addEventListener("click", open);
  });
  Array.prototype.forEach.call(closers, function (el) {
    el.addEventListener("click", close);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var action = form.getAttribute("action") || "";
    if (action.indexOf(PLACEHOLDER) !== -1) {
      setStatus("This form isn't connected to anything yet — the owner needs to add a real Formspree endpoint. Use the mailto link instead for now.", "error");
      return;
    }

    var submitBtn = form.querySelector(".contact-submit");
    submitBtn.disabled = true;
    setStatus("Sending…");

    fetch(action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        if (response.ok) {
          setStatus("Thanks — got it. I'll get back to you soon.");
          form.reset();
          closeTimer = setTimeout(close, 1800);
        } else {
          setStatus("Something went wrong sending that. Try again, or use the mailto link instead.", "error");
        }
      })
      .catch(function () {
        setStatus("Couldn't reach the server. Try again, or use the mailto link instead.", "error");
      })
      .then(function () {
        submitBtn.disabled = false;
      });
  });
})();
