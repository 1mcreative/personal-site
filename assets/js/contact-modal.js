// Contact modal — shared across every page via footer.html, not scoped to
// one theme. The trigger is a real mailto: link in the markup; this just
// upgrades its click to open the modal instead, so no-JS visitors still
// have a working way to reach out.
//
// Submission PREFERS EmailJS (https://emailjs.com, loaded via CDN in
// footer.html) since this is a static GitHub Pages site with no backend of
// its own — sends straight from the browser via emailjs.sendForm(), no
// page reload, no email client switch. The three IDs below ship as
// placeholders until replaced with real ones:
//   1. Sign up free at emailjs.com, connect an email service (e.g. Gmail).
//   2. Create an email template. Its body can reference {{name}}, {{email}},
//      and {{message}} — sendForm() maps this form's own `name` attributes
//      to those template variables automatically, so the template's
//      variable names must match this form's field names exactly. Set the
//      template's "To email" to where you want messages delivered.
//   3. Paste the resulting Service ID, Template ID, and Public Key (Account
//      tab) into the three constants below.
// Until that's done — and as a fallback if a real send ever fails (network
// issue, misconfigured template, etc.) — this builds a mailto: link from
// the same address already on the page's trigger link and hands the
// filled-in message to the visitor's own email app to actually send. Real,
// working delivery either way; only the "how" changes.
(function () {
  var EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
  var EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";
  var EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";

  function emailjsReady() {
    return !!(window.emailjs
      && EMAILJS_SERVICE_ID.indexOf("YOUR_") !== 0
      && EMAILJS_TEMPLATE_ID.indexOf("YOUR_") !== 0
      && EMAILJS_PUBLIC_KEY.indexOf("YOUR_") !== 0);
  }

  if (emailjsReady()) {
    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

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

    if (!emailjsReady()) {
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

    window.emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form)
      .then(function () {
        setStatus("Thanks — got it. I'll get back to you soon.");
        form.reset();
        closeTimer = setTimeout(close, 1800);
      })
      .catch(function () {
        if (openMailtoFallback()) {
          setStatus("That didn't go through, so I opened your email app instead — hit send there and it'll still reach me.", "error");
        } else {
          setStatus("Something went wrong sending that. Try again in a moment.", "error");
        }
      })
      .then(function () {
        submitBtn.disabled = false;
      });
  });
})();
