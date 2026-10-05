// Emotion-to-Emoji demo, inside the Projects entry on /resume/. A real,
// working camera demo (face-api.js's tiny face detector + expression model,
// weights self-hosted in assets/models/ so it never depends on a live
// external CDN for the actual inference, only for the ~660KB library file
// itself). The library and models load lazily on the first "Try it now"
// click, never on page load, so a visitor who never tries it pays nothing
// for it. Everything runs client-side; no frame is ever sent anywhere.
(function () {
  var FACE_API_SRC = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
  var MODELS_URL = "/assets/models";
  var DETECT_INTERVAL_MS = 500;
  var EXPRESSION_KEYS = ["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"];

  var EMOJI = {
    neutral: "\u{1F610}",
    happy: "\u{1F604}",
    sad: "\u{1F622}",
    angry: "\u{1F620}",
    fearful: "\u{1F628}",
    disgusted: "\u{1F922}",
    surprised: "\u{1F62E}"
  };

  var LABEL = {
    neutral: "neutral",
    happy: "happy",
    sad: "sad",
    angry: "a little annoyed",
    fearful: "a little worried",
    disgusted: "unimpressed",
    surprised: "surprised"
  };

  var scriptPromise = null;
  var modelsPromise = null;

  function loadScript() {
    if (window.faceapi) return Promise.resolve();
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise(function (resolve, reject) {
      var el = document.createElement("script");
      el.src = FACE_API_SRC;
      el.async = true;
      el.onload = function () {
        resolve();
      };
      el.onerror = function () {
        scriptPromise = null;
        reject(new Error("face-api.js failed to load"));
      };
      document.head.appendChild(el);
    });
    return scriptPromise;
  }

  function loadModels() {
    if (modelsPromise) return modelsPromise;
    modelsPromise = loadScript()
      .then(function () {
        return Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          window.faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL)
        ]);
      })
      .catch(function (err) {
        modelsPromise = null;
        throw err;
      });
    return modelsPromise;
  }

  function initDemo(root) {
    var video = root.querySelector(".emoji-demo-video");
    var emojiEl = root.querySelector(".emoji-demo-emoji");
    var statusEl = root.querySelector(".emoji-demo-status");
    var startBtn = root.querySelector(".emoji-demo-start");
    var startLabel = root.querySelector(".emoji-demo-start-label");
    var stopBtn = root.querySelector(".emoji-demo-stop");
    var detailsEl = root.closest(".entry-details");
    if (!video || !startBtn || !stopBtn) return;

    var stream = null;
    var timer = null;
    var detecting = false;

    function setStatus(text) {
      statusEl.textContent = text;
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (stream) {
        stream.getTracks().forEach(function (track) {
          track.stop();
        });
        stream = null;
      }
      video.pause();
      video.srcObject = null;
      emojiEl.textContent = "";
      startBtn.hidden = false;
      startBtn.disabled = false;
      if (startLabel) startLabel.textContent = "Try it now";
      stopBtn.hidden = true;
      root.setAttribute("data-state", "idle");
      setStatus("Turn your camera on and it'll guess how you're feeling.");
    }

    function tick() {
      if (detecting || !window.faceapi) return;
      detecting = true;
      window.faceapi
        .detectSingleFace(video, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions()
        .then(function (result) {
          detecting = false;
          if (!result) {
            emojiEl.textContent = "";
            setStatus("Can't find a face. Move into frame.");
            return;
          }
          var expressions = result.expressions;
          var top = EXPRESSION_KEYS[0];
          EXPRESSION_KEYS.forEach(function (key) {
            if (expressions[key] > expressions[top]) top = key;
          });
          emojiEl.textContent = EMOJI[top];
          setStatus("Looking " + LABEL[top] + ".");
        })
        .catch(function () {
          detecting = false;
        });
    }

    function fail(message) {
      if (stream) {
        stream.getTracks().forEach(function (track) {
          track.stop();
        });
        stream = null;
      }
      startBtn.hidden = false;
      startBtn.disabled = false;
      if (startLabel) startLabel.textContent = "Try again";
      stopBtn.hidden = true;
      root.setAttribute("data-state", "error");
      setStatus(message);
    }

    function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        root.setAttribute("data-state", "error");
        setStatus("This browser can't access a camera.");
        return;
      }

      startBtn.disabled = true;
      root.setAttribute("data-state", "loading");
      setStatus("Asking your browser for camera access...");

      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then(function (mediaStream) {
          stream = mediaStream;
          video.srcObject = stream;
          return video.play();
        })
        .then(function () {
          setStatus("Loading the expression model...");
          return loadModels();
        })
        .then(function () {
          startBtn.hidden = true;
          stopBtn.hidden = false;
          root.setAttribute("data-state", "running");
          setStatus("Looking for a face...");
          timer = setInterval(tick, DETECT_INTERVAL_MS);
          tick();
        })
        .catch(function (err) {
          if (err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
            fail("Camera access wasn't granted. No worries, the write-up above still explains how it works.");
          } else if (err && (err.name === "NotFoundError" || err.name === "OverconstrainedError")) {
            fail("No camera was found on this device.");
          } else {
            fail("Something went wrong starting the demo. Try again.");
          }
        });
    }

    startBtn.addEventListener("click", start);
    stopBtn.addEventListener("click", stop);

    // A resume page shouldn't keep a webcam running behind a panel the
    // visitor just collapsed — mirrors entry-toggle.js's own hidden-attribute
    // mechanic rather than adding a second, parallel collapse signal.
    if (detailsEl && "MutationObserver" in window) {
      var observer = new MutationObserver(function () {
        if (detailsEl.hidden && stream) stop();
      });
      observer.observe(detailsEl, { attributes: true, attributeFilter: ["hidden"] });
    }

    window.addEventListener("pagehide", function () {
      if (stream) {
        stream.getTracks().forEach(function (track) {
          track.stop();
        });
      }
    });
  }

  document.querySelectorAll(".emoji-demo").forEach(initDemo);
})();
