// Contact modal — shared across every page via footer.html, not scoped to
// one theme. The trigger is a real mailto: link in the markup; this just
// upgrades its click to open the modal instead, so no-JS visitors still
// have a working way to reach out.
//
// Submission goes to Web3Forms (https://web3forms.com): free, no backend,
// 250 messages/month, emailed to the address registered with the key. The
// key is public by design (it can only send to that inbox). If a send
// fails, the filled-in message is handed to the visitor's own email app
// via mailto: so nothing is lost.
(function () {
  var WEB3FORMS_KEY = "7450d3b1-2f61-458c-ac9e-257e1cade3c7";

  var modal = document.querySelector("[data-contact-modal]");
  if (!modal) return;
  var backdrop = modal.querySelector(".contact-modal-backdrop");
  var panel = modal.querySelector(".contact-modal-panel");
  var form = modal.querySelector("[data-contact-form]");
  var status = modal.querySelector("[data-contact-status]");
  var openers = document.querySelectorAll("[data-contact-open]");
  var closers = modal.querySelectorAll("[data-contact-close]");

  var starters = modal.querySelector("[data-contact-starters]");
  var counter = modal.querySelector("[data-contact-count]");
  var done = modal.querySelector("[data-contact-done]");
  var message = form.elements.message;

  // Per-topic prompts: the placeholder shows what a good message looks like,
  // the chips drop a ready opening line into the box.
  var PROMPTS = {
    "Work / hiring": {
      hint: "Tell me about the role, the team and the timeline.",
      starters: ["I'm hiring for ", "A contract project: ", "A quick call about "]
    },
    "Creative project": {
      hint: "Describe the video, edit or shoot, and when you need it.",
      starters: ["I need a video edited: ", "A shoot on ", "I loved "]
    },
    "Feedback": {
      hint: "What worked, what didn't, what would you change?",
      starters: ["I really liked ", "One thing that confused me was ", "A suggestion: "]
    },
    "Problem report": {
      hint: "What happened, on which page, and on what device?",
      starters: ["Broken page: ", "On my phone, ", "Broken link: "]
    },
    "Hello": {
      hint: "Say anything. I read everything.",
      starters: ["Hi! ", "Found you via ", "Your work made me think of "]
    }
  };

  function updateCount() {
    counter.textContent = message.value.length + " / " + message.maxLength;
  }

  function showStarters(topic) {
    var p = PROMPTS[topic];
    message.placeholder = p.hint;
    starters.innerHTML = "";
    p.starters.forEach(function (text) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = text.trim();
      b.addEventListener("click", function () {
        message.value = text + message.value;
        message.focus();
        message.setSelectionRange(message.value.length, message.value.length);
        updateCount();
      });
      starters.appendChild(b);
    });
    starters.hidden = false;
  }

  function fieldError(name, show) {
    modal.querySelector('[data-error-for="' + name + '"]').hidden = !show;
  }

  // Inline errors next to the field (native validation bubbles anchor to the
  // visually hidden radios), checked in page order so focus goes to the first.
  function validate() {
    var bad = null;
    var topicOk = !!form.elements.topic.value;
    var emailVal = form.elements.email.value.trim();
    var emailOk = !emailVal || form.elements.email.checkValidity();
    var msgOk = !!message.value.trim();
    fieldError("topic", !topicOk);
    fieldError("email", !emailOk);
    fieldError("message", !msgOk);
    if (!topicOk) bad = form.querySelector('input[name="topic"]');
    else if (!emailOk) bad = form.elements.email;
    else if (!msgOk) bad = message;
    if (bad) bad.focus();
    return !bad;
  }

  form.addEventListener("change", function (e) {
    if (e.target.name === "topic") fieldError("topic", false);
    if (e.target.name === "topic") showStarters(e.target.value);
  });
  message.addEventListener("input", function () { updateCount(); fieldError("message", false); });
  form.elements.email.addEventListener("input", function () { fieldError("email", false); });

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

    var topic = form.elements.topic.value;
    var name = (form.querySelector('[name="name"]').value || "").trim();
    var email = (form.querySelector('[name="email"]').value || "").trim();
    var message = (form.querySelector('[name="message"]').value || "").trim();

    var subject = "[" + topic + "] Message from bhaveshnakum.com" + (name ? " - " + name : "");
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
    if (!validate()) return;

    var submitBtn = form.querySelector(".contact-submit");
    submitBtn.disabled = true;
    setStatus("Sending…");

    var data = {
      access_key: WEB3FORMS_KEY,
      subject: "[" + form.elements.topic.value + "] Message from bhaveshnakum.com",
      topic: form.elements.topic.value,
      from_name: "bhaveshnakum.com",
      name: form.elements.name.value,
      email: form.elements.email.value,
      message: form.elements.message.value,
      botcheck: form.elements.botcheck.checked
    };
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) { if (!res.success) throw new Error(res.message); })
      .then(function () {
        setStatus("");
        if (typeof gtag === "function") gtag("event", "contact_form_submit");
        form.reset();
        updateCount();
        starters.hidden = true;
        form.hidden = true;
        done.hidden = false;
        closeTimer = setTimeout(function () {
          close();
          setTimeout(function () { form.hidden = false; done.hidden = true; }, 300);
        }, 2200);
      })
      .catch(function () {
        if (openMailtoFallback()) {
          setStatus("That didn't go through, so I opened your email app instead. Hit send there and it'll still reach me.", "error");
        } else {
          setStatus("Something went wrong sending that. Try again in a moment.", "error");
        }
      })
      .then(function () {
        submitBtn.disabled = false;
      });
  });
})();
