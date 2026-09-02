// Globe — a rotating dot-sphere WebGL background, replacing Beyond Horizon
// per explicit request. Hand-rolled plain WebGL, not the React/Three.js
// component the user supplied: this site has been zero-dependency the whole
// way through (glitter.js, text-fall.js, dissolve.js, beyond-horizon.js are
// all hand-rolled canvas/shader code, no framework, no build step — the
// console easter egg literally brags about this), and loading Three.js plus
// fetching a third-party GeoJSON land dataset at runtime was the tradeoff
// the user chose against when asked directly. So this is a stylized dot-grid
// sphere in the *spirit* of the reference — no real continent shapes, no
// external data — not a literal port of it.
(function () {
  var COLOR = [0x1d / 0xff, 0x4e / 0xff, 0xd8 / 0xff]; // site's blue accent, #1d4ed8
  var SPEED = 0.15; // radians/sec, auto-rotate only — no drag interaction
  var TILT = (23 * Math.PI) / 180;

  var host = document.querySelector(".hero-globe");
  var canvas = document.querySelector(".hero-globe-canvas");
  if (!host || !canvas) return;

  var gl =
    canvas.getContext("webgl", { antialias: true, alpha: true }) ||
    canvas.getContext("experimental-webgl");
  if (!gl) return;

  var VERT = [
    "attribute vec3 aPos;",
    "uniform float uAngleY;",
    "uniform float uTiltX;",
    "uniform float uPointScale;",
    "varying float vDepth;",
    "void main() {",
    "  float ct = cos(uTiltX), st = sin(uTiltX);",
    "  vec3 p = vec3(aPos.x, aPos.y * ct - aPos.z * st, aPos.y * st + aPos.z * ct);",
    "  float cy = cos(uAngleY), sy = sin(uAngleY);",
    "  vec3 r = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);",
    "  float camDist = 3.0;",
    "  float focal = 2.4;",
    "  float z = r.z + camDist;",
    "  float persp = focal / z;",
    "  gl_Position = vec4(r.x * persp, r.y * persp, 0.0, 1.0);",
    "  vDepth = clamp((r.z + 1.0) / 2.0, 0.0, 1.0);",
    "  gl_PointSize = max(1.0, uPointScale * persp);",
    "}",
  ].join("\n");

  var FRAG = [
    "precision mediump float;",
    "varying float vDepth;",
    "uniform vec3 uColor;",
    "void main() {",
    "  vec2 c = gl_PointCoord - vec2(0.5);",
    "  float d = length(c);",
    "  if (d > 0.5) discard;",
    "  float edge = smoothstep(0.5, 0.35, d);",
    "  float alpha = 0.4 + vDepth * 0.6;",
    "  gl_FragColor = vec4(uColor, edge * alpha);",
    "}",
  ].join("\n");

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("globe shader:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("globe link:", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // Dot grid: latitude bands with a longitude step scaled by 1/cos(lat) so
  // points don't crowd together near the poles.
  var positions = [];
  var LAT_STEP = 12;
  for (var lat = -78; lat <= 78; lat += LAT_STEP) {
    var latRad = (lat * Math.PI) / 180;
    var cosLat = Math.cos(latRad);
    var lngStep = LAT_STEP / Math.max(0.35, cosLat);
    for (var lng = -180; lng < 180; lng += lngStep) {
      var lngRad = (lng * Math.PI) / 180;
      positions.push(
        cosLat * Math.sin(lngRad),
        Math.sin(latRad),
        cosLat * Math.cos(lngRad)
      );
    }
  }
  var pointCount = positions.length / 3;

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

  var uAngleY = gl.getUniformLocation(prog, "uAngleY");
  var uTiltX = gl.getUniformLocation(prog, "uTiltX");
  var uPointScale = gl.getUniformLocation(prog, "uPointScale");
  var uColor = gl.getUniformLocation(prog, "uColor");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform3f(uColor, COLOR[0], COLOR[1], COLOR[2]);
  gl.uniform1f(uTiltX, TILT);

  var w = 0, h = 0;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cssW = Math.max(1, host.clientWidth);
    var cssH = Math.max(1, host.clientHeight);
    var nw = Math.round(cssW * dpr);
    var nh = Math.round(cssH * dpr);
    if (nw === w && nh === h) return false;
    w = nw;
    h = nh;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    return true;
  }

  function draw() {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uPointScale, Math.max(3, w / 55));
    gl.drawArrays(gl.POINTS, 0, pointCount);
  }

  var angle = 0;
  gl.uniform1f(uAngleY, angle);
  resize();
  draw(); // paint before the first rAF frame so the canvas is never blank

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var onResize = function () {
    if (resize()) draw();
  };
  var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
  if (ro) ro.observe(host);
  window.addEventListener("resize", onResize);

  var raf = 0, lastT = 0;
  function loop(t) {
    var dt = lastT ? (t - lastT) / 1000 : 0;
    lastT = t;
    angle += SPEED * dt;
    gl.uniform1f(uAngleY, angle);
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
})();
