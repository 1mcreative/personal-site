// Contact modal — shared across every page via footer.html, not scoped to
// one theme. The trigger is a real mailto: link in the markup; this just
// upgrades its click to open the modal instead, so no-JS visitors still
// have a working way to reach out.
//
// Submission PREFERS Formspree (https://formspree.io) since this is a
// static GitHub Pages site with no backend of its own — the <form>'s
// action in footer.html ships with a placeholder ID until it's replaced
// with a real one (sign up free at formspree.io, create a form, paste the
// resulting https://formspree.io/f/xxxxxxxx URL into footer.html). Until
// then — and as a fallback if a real endpoint is ever unreachable — this
// builds a mailto: link from the same address already on the page's
// trigger link and hands the filled-in message to the visitor's own email
// app to actually send. That's a real, working delivery path today with
// zero setup, just not a silent one-click send the way a configured
// Formspree endpoint is: the visitor still has to hit send in their own
// mail app, and it only works if they have one configured.
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

  // Builds a mailto: link from the same address already on the page's own
  // trigger (no email hardcoded twice) with the form's fields folded into
  // a subject/body, then hands off to the visitor's own mail app.
  function openMailtoFallback() {
    var opener = document.querySelector("[data-contact-open][href]");
    var mailtoBase = opener ? opener.getAttribute("href") : "";
    if (!mailtoBase) return false;

    var name = (form.querySelector('[name="name"]').value || "").trim();
    var email = (form.querySelector('[name="email"]').value || "").trim();
    var message = (form.querySelector('[name="message"]').value || "").trim();

    var subject = "Message from bhaveshnakum.com" + (name ? " — " + name : "");
    var bodyLines = [];
    if (name) bodyLines.push("Name: " + name);
    if (email) bodyLines.push("Email: " + email);
    if (name || email) bodyLines.push("");
    bodyLines.push(message);

    var url = mailtoBase + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(bodyLines.join("\n"));
    window.location.href = url;
    return true;
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
      if (openMailtoFallback()) {
        setStatus("Opening your email app with this message ready to go — hit send there and it'll reach me directly.");
      } else {
        setStatus("This form isn't connected to anything yet, and there's no email link on the page to fall back to either.", "error");
      }
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
        } else if (openMailtoFallback()) {
          setStatus("That didn't go through, so I opened your email app instead — hit send there and it'll still reach me.", "error");
        } else {
          setStatus("Something went wrong sending that. Try again in a moment.", "error");
        }
      })
      .catch(function () {
        if (openMailtoFallback()) {
          setStatus("Couldn't reach the server, so I opened your email app instead — hit send there and it'll still reach me.", "error");
        } else {
          setStatus("Couldn't reach the server. Try again in a moment.", "error");
        }
      })
      .then(function () {
        submitBtn.disabled = false;
      });
  });
})();
