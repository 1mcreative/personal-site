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
  // same idea, but resolved once (via curl + a small ray-casting script)
  // into a packed bitmask embedded right here, so there's no third-party
  // network dependency for site visitors. Upgraded from the 110m dataset at
  // 3° resolution to the 50m dataset (the reference's own source) at 1.5° —
  // the coarser version blurred India's coastline into an undifferentiated
  // blob merging with the rest of Asia; more dots on the *same* blocky
  // shape wasn't going to fix that, only finer underlying data could.
  // Verified by rendering the India region back out as ASCII art before
  // trusting it — the peninsula's actual triangular taper is visible in the
  // raw mask, not just hoped-for from extra dots. Grid: 1.5° steps,
  // -90..90 lat (121 rows) x -180..178.5 lng (240 cols), row-major, each
  // row hex-packed 4 bits at a time.
  var MASK_LAT_STEP = 1.5, MASK_LNG_STEP = 1.5, MASK_COLS = 240;
  var LAND_MASK_HEX =
    "000000000000000000000000000000000000000000000000000000000000,ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,001ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc,00003ffffffffffffffe1ffffffffffffffffffffffffffffffffffffe00,00000fffffffffffffe00002fffffffffffffffffffffffffffffffff000,000c0ffffffffffffc4001f00fffffffffffffffffffffffffffffffe000,0001ffffffffffffe60000e07ffffffffffffffffffffffffffffffffc00,000001ffffffffffffc0000007fffffffffffffffffffffffffffffff800,00000003fffc03fffffc0000000ffffffffffffffffffffffffffffff800,00000000080003ff32ff00000003fffffffffffffffffffffffffffffd00,0000000000000f00006e000000007ffffffffffff9ffffffffffffffffc0,0000000000000000007e000000000a26708ffffffefffffffffffffff000,000000000000000000cc00000000000000021ffffe0fffffffffffff0000,000000000000000000380000000000000000017f8000ffffffffff800000,00000000000000000006000000000000000000180000000c100000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000f00001000000000000000000000000000000000000,000000000000000001c00000000000000000000000000000000000000000,000000000000000001c00000000000000000000000000000000000000000,000000000000000003e00000000000000000000002000000000000000000,000000000000000003f80000000000000000000000000000000000000000,000000000000000003f00000000000000000000000000000000000000040,000000000000000000f000000000000000000000000000000000000000e0,000000000000000000f80000000000000000000000000000000000000030,000000000000000000f80000000000000000000000000000000000600018,000000000000000001fe0000000000000000000000000000000000000004,000000000000000000fe0000000000000000000000000000000000000006,000000000000000001ffc000000000000000000000000000000003f00004,000000000000000000ffc000000000000000000000000000000007f80008,000000000000000000fff800000000000400000000000000030007f80000,0000000000000000007ff800000000000fe000000000000003e03ffc0000,0000000000000000007ffc000000000007f000000000000003fffffc0000,0000000000000000007ffe00000000000ff800000000000007fffffe0000,0000000000000000007fff00000000001ffc00000000000007fffffe0000,0000000000000000007fff00000000001ffc0000000000000ffffffe0000,0000000000000000007fff00000000003ffc0000000000000ffffffe0000,0000000000000000007fffc0000000003fff0300000000000ffffff80000,0000000000000000003ffff8000000003fff0700000000000ffffff80000,0000000000000000003ffff8000000003fff03840000000003fffff00200,0000000000000000003ffffc000000007fff038000000000007fffe00000,0000000000000000007ffffc00000000ffff838000000000003fffc00001,000000000000000000fffffc00000000ffffe3c000000000001ff5800000,000000000000000003fffffc000000007ffff0c000000000000fe1800000,040000000000000003fffffc000000007ffff040000000000001e1000000,000000000000000007fffffe000000003ffff00000000000000051000000,000000000000000007ffffff000000003fffe00000000000000000080800,00000000000000000fffffff800000007fffe00000000000020803300000,00000000000000001fffffff800000007fffe00000000000f00007e00000,00000000000000003fffffff800000007fffc00000000000000007e80000,00000000000000003ffffffe00000000ffffe0000000000600a01f820000,00000000000000001ffffffc00000001ffffe0000000000fbcc25e040000,00000000000000001ffffbc000000001fffff0000000002c3cc4c0000000,00000000000000101ffffd0000000001fffff8000000001c7e8000000000,00000000000000000ffffe0000000001fffffc00000000345e0000000000,000000000000000007fffe0000000001ffffff00000000681e0000000000,000000000000000007fffc000000100bffffff00000000c80f0000000000,000000000000000007ffc00000003f8fffffff8000000018020000000000,00000000000000000fff80000000ffffffffffc000020000001800000000,00000000000000005bff00000000ffffffffffc000080022000800000000,000000000000000183f200000001fffffffffde0001c0023002000000000,0000000000000001808000000003fffffffff800001c0227800000000000,0000000000000007800000000007ffffffffff00003c022f800000000000,000000000000001f800000000007ffffffffe7c0003c003f804000000000,00000000000001fc000000000003ffffffffe7f0007e01bf004000000000,0000000000000ffc040800000003ffffffffcffc007f01fe004000000000,0000000000003f0c00c000000003ffffffff8ffe007f81fe400000000000,0000000000003f0e0d0000000007ffffffff9fff017fc3ff000000000000,0000000000003e00b00000000003ffffffff9fff01fffffff00000000000,0000000000007e00000000000003ffffffff3ffe07fffffffe4000000000,000000000000ff00200000000001ffffffff7fe0ffffffffff0000000000,00000000000dfe00200000000000fffffffeffcfffffffffff8000000000,00000000000bff006000000000007ffffffdff9fffffffffffc000000000,000000000017fff94000000000003fffffffff3fffffffffffc000000000,000000000017ffffc000000000003fffe3c1ffffffffffffff8100000000,00000000003fffffe000000000001fff0000ffffffffffffff8100000000,0000000000fffffff800000000000ffe0000ffffffffffffff00d0000000,0000000001fffffff80000000000007f0000ffffffffffffff861c000000,0000000001fffffffc00000000001f00611fff8fffffffffff4606000000,0000000003fffffff800000000003f40113fff8ffffffffffe4c02000000,0000000003fffffffe00000000001f823f0fffcfffffffffffbe02000000,0000000003ffffffff80000000001fe2e7e00f9ffffffffffffe00000000,0000000003ffffffffc00000000019f9cff01f1fffffffffffffe1800000,0000000003fffffffff60000000000ffbff17f1ffffffffffffff1000000,0000000003fffffffff80000000001fffffb3f8ffffffffffffff8000000,0000000007fffffffff47800000007fffffffffffffffffffffffd000000,000000000bfffffffff220000000017ffffffffffffffffffffffd800000,000000000fffffffffffa000000003bffffffffffffffffffffffd000000,000000003fffffffcfffe000000033cfffffffffffffffffffffff004000,00000000ffffffffcfffc00000003103fffffffffffffffffffff400e000,000800017ffffffe07ff000000000603c1ffffffffffffffffffe000f000,00010003fffffff807ff00000000160061fffffffffffffffffff8007800,0002c005ffffffc00fe400000000040cf1fffffffffffffffffffe001800,005ffc2fffffff80078400100000000ff807ffffffffffffffffffff0f00,003fffffffffffc0078000f00000000ff1ffffffffffffffffffffff9bf0,001ffffffffffff0006001f800000007f9ffffffffffffffffffffffffff,0c27fffffffffffdcef803fc003e0000fe7f7ffffffffffffffffffffffe,fe7ffffffffffffe81f607ff000e00007fff0fffffffffffffffffffffff,f01fffffffffff7dc4fc07ffc00000003ffff0ffffbfffffffffffffffff,001ffffbffc7bfb4c7e003fffe0000000fff80407b8fffffffffffffffbf,0003e0000003f0e7ffe00ffff80000000038000007bfffffffffffffe000,00000000077f6307fe000fffff8000000000001803b5fffffffc03f00000,0000000003f0667258001fffff600000000000060013ffff3f1c03000000,00000000000380dfe0003fffffe000000000000380001ffff0000f180000,00000000008114fb703fffffffc00000000000000c00002ff00000000000,0000000000020480fcffffffffc000003900000000000000000000000000,000000000000007fff07fffffff00000b3c00000000001e0000000000000,0000000000000060fff7ffffffbe00000000000510000180000000000000,00000000000000003ffc005fffc000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000000000000000";
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
  var LAT_STEP = 1.5; // matches the land mask's own resolution — denser, so
                       // smaller landmasses (India's peninsula, for one) hold
                       // enough dots to actually read as a shape
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
    gl.uniform1f(uPointScale, Math.max(2, w / 105));
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
