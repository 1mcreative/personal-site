// Globe — a rotating dot-sphere WebGL background, replacing Beyond Horizon
// per explicit request. Hand-rolled plain WebGL, not the React/Three.js
// component the user supplied: this site has been zero-dependency the whole
// way through (glitter.js, text-fall.js, dissolve.js, beyond-horizon.js are
// all hand-rolled canvas/shader code, no framework, no build step — the
// console easter egg literally brags about this), and loading Three.js was
// the tradeoff the user chose against when asked directly. The dots DO trace
// real continent shapes, though — a first pass skipped that too (a uniform
// dot sphere, no map at all) and was correctly called out for missing the
// actual point of the reference. Fixed by baking real land-mask data in at
// build time instead of fetching it live: same Natural Earth land dataset
// the reference uses, rasterized once into a packed bitmask (see
// LAND_MASK_HEX below) with a plain Python ray-casting script, not shipped
// as a runtime dependency for site visitors. Drag-to-rotate added per
// explicit follow-up request — see the pointer handlers further down.
(function () {
  var COLOR = [0x1d / 0xff, 0x4e / 0xff, 0xd8 / 0xff]; // site's blue accent, #1d4ed8
  var SPEED = 0.15; // radians/sec — auto-rotate resumes once drag momentum settles
  var TILT = (23 * Math.PI) / 180; // initial tilt; draggable afterward

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

  // Real land shape, baked at build time — not a runtime fetch. The
  // reference rasterizes a live GeoJSON land dataset into a lat/lng lookup;
  // same idea, but resolved once (via curl + a small ray-casting script,
  // Natural Earth's 110m land dataset) into a packed bitmask embedded right
  // here, so there's no third-party network dependency for site visitors —
  // consistent with keeping this effect dependency-free. Grid: 3° steps,
  // -90..90 lat (61 rows) x -180..177 lng (120 cols), row-major, each row
  // hex-packed 4 bits at a time.
  var MASK_LAT_STEP = 3, MASK_LNG_STEP = 3, MASK_COLS = 120;
  var LAND_MASK_HEX =
    "ffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffff,103ffffffffffffffffffffffffffc,001ffffff8107fffffffffffffffc0,00fffffff0007fffffffffffffffe0,0003ff5ffe0001fffffffffffffff0,000000300f00007fffffeffffffffc,0000000002000000003ff1ffffff00,000000000100000000020000204000,000000000000000000000000000000,000000000000000000000000000000,000000000000000000000000000000,000000000c00000000000000000000,000000001800000000000000000000,000000001e00000000000000000000,000000000e0000000000000000000c,000000000e00000000000000000402,000000000f00000000000000000001,000000000f80000000000000001e02,0000000007e000001c0000001c7e00,0000000007f000003e0000001fff00,0000000007f000003e0000003fff00,0000000007f800007f1000003ffe00,0000000007fe00007f1800001ffc10,0000000007fe0000ff98000007f800,000000001fff00007fc8000003c800,000000001fff00007fc00000000000,000000003fff80007fc00000121400,000000007fff80007f800000001e00,000000003ffe0000ffc00003693000,000000003ff00000ffe00002780000,000000001ff00000fff00006300000,000000001f80007bfff80002100000,000000003f0000fffff80305020000,00000000880001ffffe40205800000,00000003800001ffffd80607800000,0000003e020001ffffbe070f000000,00000073200001ffffbf07df000000,00000070000001ffff7f1ffff00000,000002f0400000fffffbfffff80000,000001fe0000007ffffffffff80000,000007ffc000003f00fffffff80000,00000fffe0000007007ffffff92000,00001fffe000007017fbfffff21000,00001ffff800007ddc3bffffff1000,00001ffffd00000ffc73ffffffc000,00000ffffe60001fffffffffffe000,00003fffffc0001fffffffffffe000,0000ffffbf800041ffffffffffc0c0,0000fffe1f0000314fffffffffe060,03e7fff818000003ebffffffffff30,03fffffc060c0001efffffffffffff,f7ffffff0f1f03007f3fffffffffff,03fff98c9c1ff0003f805fffffffff,00001753f03ff80000021efffe1c00,0000019bc07ffc000001807fc03e00,00000100effffc0060000000000000,00000005fdffff0000000008000000,000000000000000000000000000000,000000000000000000000000000000,000000000000000000000000000000";
  var landRows = LAND_MASK_HEX.split(",").map(function (hexRow) {
    var bits = "";
    for (var i = 0; i < hexRow.length; i++) {
      bits += parseInt(hexRow[i], 16).toString(2).padStart(4, "0");
    }
    return bits;
  });
  function isOnLand(lat, lng) {
    var latIdx = Math.round((lat + 90) / MASK_LAT_STEP);
    var lngNorm = ((lng + 180) % 360 + 360) % 360;
    var lngIdx = Math.round(lngNorm / MASK_LNG_STEP);
    latIdx = Math.max(0, Math.min(landRows.length - 1, latIdx));
    lngIdx = Math.max(0, Math.min(MASK_COLS - 1, lngIdx));
    return landRows[latIdx][lngIdx] === "1";
  }

  // Dot grid: latitude bands with a longitude step scaled by 1/cos(lat) so
  // points don't crowd together near the poles, kept only where isOnLand —
  // a finer base grid than a uniform sphere would need, since ~2/3 of
  // candidates fall on ocean and get dropped.
  var positions = [];
  var LAT_STEP = 5;
  for (var lat = -88; lat <= 88; lat += LAT_STEP) {
    var latRad = (lat * Math.PI) / 180;
    var cosLat = Math.cos(latRad);
    var lngStep = LAT_STEP / Math.max(0.35, cosLat);
    for (var lng = -180; lng < 180; lng += lngStep) {
      if (!isOnLand(lat, lng)) continue;
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

  // One marker dot, Bangalore — where this site's owner actually is —
  // in an accent color (amber, reused from glitter.js's own palette rather
  // than inventing a new one) so it stands out from the plain land dots.
  // Same buffer/attribute setup as the main cloud, just one point and its
  // own draw call with a different color/size.
  function toXYZ(lat, lng) {
    var latRad = (lat * Math.PI) / 180;
    var lngRad = (lng * Math.PI) / 180;
    var cosLat = Math.cos(latRad);
    return [cosLat * Math.sin(lngRad), Math.sin(latRad), cosLat * Math.cos(lngRad)];
  }
  var MARKER_COLOR = [0xf5 / 0xff, 0x9e / 0xff, 0x0b / 0xff]; // #f59e0b
  var markerPos = toXYZ(12.9716, 77.5946); // Bengaluru
  var markerBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, markerBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(markerPos), gl.STATIC_DRAW);

  var uAngleY = gl.getUniformLocation(prog, "uAngleY");
  var uTiltX = gl.getUniformLocation(prog, "uTiltX");
  var uPointScale = gl.getUniformLocation(prog, "uPointScale");
  var uColor = gl.getUniformLocation(prog, "uColor");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.uniform3f(uColor, COLOR[0], COLOR[1], COLOR[2]);
    gl.uniform1f(uPointScale, Math.max(3, w / 55));
    gl.drawArrays(gl.POINTS, 0, pointCount);

    gl.bindBuffer(gl.ARRAY_BUFFER, markerBuf);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.uniform3f(uColor, MARKER_COLOR[0], MARKER_COLOR[1], MARKER_COLOR[2]);
    gl.uniform1f(uPointScale, Math.max(6, w / 26));
    gl.drawArrays(gl.POINTS, 0, 1);
  }

  var angleY = 0;
  var tiltX = TILT;
  gl.uniform1f(uAngleY, angleY);
  resize();
  draw(); // paint before the first rAF frame so the canvas is never blank

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var onResize = function () {
    if (resize()) draw();
  };
  var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
  if (ro) ro.observe(host);
  window.addEventListener("resize", onResize);

  // Drag-to-rotate, matching the reference's own mechanics: horizontal drag
  // spins it, vertical drag tilts it (clamped so it can't flip past the
  // poles), release keeps a decaying velocity going before auto-rotate
  // resumes — same shape as the reference's drag/velocity/lerp system, just
  // without a separate smoothing lerp on top (nothing here needs it at this
  // scale). Pointer Events cover touch too, not just mouse, at no extra
  // cost.
  var DRAG_SENS = 0.008;
  var VEL_DECAY = 0.92;
  var VEL_THRESHOLD = 0.0002;
  var isDragging = false;
  var lastX = 0, lastY = 0;
  var velY = 0, velX = 0;

  function onPointerDown(e) {
    isDragging = true;
    velY = 0;
    velX = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
  }
  function onPointerMove(e) {
    if (!isDragging) return;
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    angleY += dx * DRAG_SENS;
    tiltX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, tiltX + dy * DRAG_SENS));
    velY = dx * DRAG_SENS * 0.3;
    velX = dy * DRAG_SENS * 0.3;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onPointerUp() {
    isDragging = false;
  }
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  var raf = 0, lastT = 0;
  function loop(t) {
    var dt = lastT ? (t - lastT) / 1000 : 0;
    lastT = t;
    if (!isDragging) {
      var hasVelocity = Math.abs(velY) > VEL_THRESHOLD || Math.abs(velX) > VEL_THRESHOLD;
      if (hasVelocity) {
        angleY += velY;
        tiltX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, tiltX + velX));
        velY *= VEL_DECAY;
        velX *= VEL_DECAY;
      } else {
        velY = 0;
        velX = 0;
        angleY += SPEED * dt;
      }
    }
    gl.uniform1f(uAngleY, angleY);
    gl.uniform1f(uTiltX, tiltX);
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
})();
