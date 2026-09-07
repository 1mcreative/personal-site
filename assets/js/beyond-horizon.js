// Beyond Horizon — a sunrise-over-a-planet-edge WebGL glow, the homepage's
// ambient background. Ported from a React/WebGL component the user supplied;
// its own comments note the GLSL is written from scratch (the reference
// engine's compiled shader carries a commercial licence, so none of it is
// transcribed — only the *composition*, which is a description of what's
// visible, plus constants the author measured off a reference capture).
//
// React scaffolding (props, refs, useEffect/useMemo) is dropped in favor of
// one hardcoded CONFIG object and plain DOM APIs, matching every other canvas
// effect on this page (glitter.js, text-fall.js) — this runs exactly once,
// so a reusable multi-instance component would be unused abstraction.
//
// LIGHT-THEME REMAP: the reference renders on a near-black canvas and works
// by ADDING light — brightness only ever goes up from a dark base, and the
// "glow" reads as a light source because everything around it stays near
// zero. That model breaks on a white canvas: white is already maximum
// brightness, so adding more light per the original math just clips to
// white everywhere and the glow disappears. Instead of re-deriving the
// physics, the shader's ORIGINAL dark-theme composite is still computed in
// full (noise, haze, horizon disc, rim — untouched), then its luminance is
// used as a mix factor between white (where the original render was near-
// black) and a chosen blue (where it was brightest) — see the FRAG tail.
// This keeps 100% of the shape/motion/parallax/hover behavior and only
// changes what color represents "more light" vs. "no light."
//
// Colors match the site's existing blue accent (Grind #1d4ed8) instead of
// an invented violet — one real fix, not a recolor for its own sake: dark
// text over the saturated "core" color only has ~2.5:1 contrast regardless
// of hue, and the hover state's haze amplification (see hazeGain below) was
// spreading that low-contrast zone up toward the hero text on any mouse
// move — tuned down so hovering brightens the scene without reaching that
// far into the text-occupied area above the horizon.
(function () {
  var CONFIG = {
    background: "#ffffff",
    coreColor: "#1d4ed8",
    midColor: "#93c5fd",
    deepColor: "#3A2A78",
    brightness: 1.4,
    coreSize: 0.02,
    coreHover: 0.028,
    haze: 1.6,
    speed: 1,
    parallax: 3,
    fit: 0.5, // 0 = width-locked, 1 = height-locked; 0.5 = geometric mean
    horizonY: 0.9,
    horizonRadius: 1.867,
    rimSpread: 0.035,
  };
  var REF_ASPECT = 0.459441; // 1314 / 2860, the aspect the constants above were measured at
  var MAX_DPR = 2;
  var RENDER_SCALE = 0.6; // everything here is a soft gradient — under-rendering costs nothing visible
  var PIXEL_BUDGET = 2200000;

  var host = document.querySelector(".hero-glow");
  var canvas = document.querySelector(".hero-glow-canvas");
  if (!host || !canvas) return;

  var gl =
    canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" }) ||
    canvas.getContext("experimental-webgl");
  if (!gl) return; // .hero-glow's own CSS background-color is the fallback

  var VERT = [
    "attribute vec2 aPos;",
    "varying vec2 vUv;",
    "void main() {",
    "  vUv = aPos * 0.5 + 0.5;",
    "  gl_Position = vec4(aPos, 0.0, 1.0);",
    "}",
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "varying vec2 vUv;",
    "uniform vec2  uRes;",
    "uniform float uTime;",
    "uniform vec2  uMouse;",
    "uniform float uHover;",
    "uniform float uBright;",
    "uniform float uHorizonY;",
    "uniform float uHorizonR;",
    "uniform float uHaze;",
    "uniform float uCoreSize;",
    "uniform float uCoreHover;",
    "uniform float uRimSpread;",
    "uniform float uParallax;",
    "uniform float uFit;",
    "uniform vec3  uBg;",
    "uniform vec3  uCore;",
    "uniform vec3  uMid;",
    "uniform vec3  uDeep;",
    "const int STEPS = 26;",
    "const float REF_ASPECT = 0.459441;",
    // The additive light physics below (col starts here and only ever gains
    // brightness) needs a dark baseline to mean anything — a light uBg would
    // make col start near-white and saturate almost everywhere once light is
    // added. uBg is reserved for the light-theme remap at the very end;
    // this constant is the physics-only "canvas" the reference was designed
    // against, independent of whatever final background color is configured.
    "const vec3 PHYS_BG = vec3(0.03, 0.03, 0.035);",
    "float hash31(vec3 p) {",
    "  p = fract(p * 0.1031);",
    "  p += dot(p, p.yzx + 33.33);",
    "  return fract((p.x + p.y) * p.z);",
    "}",
    "float vnoise(vec3 x) {",
    "  vec3 i = floor(x);",
    "  vec3 f = fract(x);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  float n000 = hash31(i);",
    "  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));",
    "  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));",
    "  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));",
    "  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));",
    "  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));",
    "  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));",
    "  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));",
    "  return mix(",
    "    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),",
    "    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),",
    "    f.z);",
    "}",
    "float fbm(vec3 p) {",
    "  float s = 0.0;",
    "  float a = 0.5;",
    "  for (int i = 0; i < 4; i++) {",
    "    s += a * vnoise(p);",
    "    p = p * 2.02;",
    "    p.xz = mat2(0.80, 0.60, -0.60, 0.80) * p.xz;",
    "    a *= 0.5;",
    "  }",
    "  return s;",
    "}",
    "float hash21(vec2 p) {",
    "  vec3 q = fract(vec3(p.xyx) * 0.1031);",
    "  q += dot(q, q.yzx + 33.33);",
    "  return fract((q.x + q.y) * q.z);",
    "}",
    "vec3 tonemapTanh(vec3 x) {",
    "  x = clamp(x, -12.0, 12.0);",
    "  vec3 e2 = exp(2.0 * x);",
    "  return (e2 - 1.0) / (e2 + 1.0);",
    "}",
    "void main() {",
    "  float aspect = uRes.y / uRes.x;",
    "  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);",
    "  float unit = clamp(pow(max(aspect, 0.0001) / REF_ASPECT, uFit), 0.45, 3.2);",
    "  float inv = 1.0 / unit;",
    "  vec2 P = vec2(uv.x - 0.5, (uv.y - uHorizonY) * aspect) * inv;",
    "  float pxUnit = inv / max(uRes.x, 1.0);",
    "  float hv = clamp(uHover, 0.0, 1.0);",
    "  vec2 m = uMouse * hv * uParallax * inv;",
    "  float coreSize  = mix(uCoreSize, uCoreHover, hv);",
    "  float rimSpread = mix(uRimSpread, 0.220, hv);",
    "  float rimGain   = mix(0.55, 1.3, hv);",
    "  float hazeGain  = mix(1.15, 3.00, hv);",
    "  float hazeK     = mix(20.0, 19.0, hv);",
    "  float hazeCut0  = mix(0.21, 0.40, hv);",
    "  float hazeCut1  = mix(0.13, 0.28, hv);",
    "  vec3 col = PHYS_BG;",
    "  vec2 corePos = vec2(m.x * 0.015, m.y * 0.007);",
    "  float d = length(P - corePos);",
    "  float g = coreSize / max(d, 0.0009);",
    "  g = mix(g, g * g, 0.55);",
    "  g *= mix(1.0, smoothstep(0.46, 0.28, d), hv);",
    "  g *= uBright;",
    "  vec3 glowCol = mix(uDeep, uMid, clamp(g * 2.4, 0.0, 1.0));",
    "  glowCol = mix(glowCol, uCore, clamp((g - 0.30) * 1.7, 0.0, 1.0));",
    "  col += glowCol * g;",
    "  vec3 ro = vec3(0.0, 0.0, -1.6);",
    "  vec3 rd = normalize(vec3(P - corePos, 1.2));",
    "  float t = 0.28;",
    "  float stepSize = 0.085;",
    "  float trans = 1.0;",
    "  vec3 haze = vec3(0.0);",
    "  vec2 drift = m * 0.16;",
    "  for (int i = 0; i < STEPS; i++) {",
    "    if (trans < 0.02) break;",
    "    vec3 pos = ro + rd * t;",
    "    vec3 q = pos * vec3(3.2, 1.75, 3.2);",
    "    q.y -= uTime * 0.10;",
    "    q.z += uTime * 0.035;",
    "    q.xy += drift;",
    "    float dens = fbm(q);",
    "    dens = smoothstep(0.47, 0.83, dens);",
    "    float dl = length(pos.xy * vec2(1.0, 0.72));",
    "    float li = 1.0 / (1.0 + dl * dl * 110.0);",
    "    vec3 lc = mix(uDeep, uMid, clamp(li * 1.6, 0.0, 1.0));",
    "    lc += vec3(0.16, 0.05, -0.04) * (1.0 - dens) * li * 0.5;",
    "    haze += dens * li * lc * trans * stepSize;",
    "    trans *= 1.0 - dens * 0.28;",
    "    t += stepSize;",
    "  }",
    "  float hazeEnv = exp(-d * hazeK) * smoothstep(hazeCut0, hazeCut1, d);",
    "  col += haze * uHaze * hazeEnv * hazeGain;",
    "  float discD = length(P - vec2(corePos.x, uHorizonR)) - uHorizonR;",
    "  float aa = 1.4 * pxUnit;",
    "  float above = smoothstep(-aa, aa, discD);",
    "  float rimDx = abs(P.x - corePos.x);",
    "  float rimBase = exp(-rimDx / max(rimSpread, 0.001));",
    "  rimBase *= mix(1.0, smoothstep(0.40, 0.26, rimDx), hv);",
    "  float rimFall = rimBase * mix(1.0, mix(0.22, 1.0, smoothstep(0.0, 0.18, rimDx)), hv);",
    "  float kMax = 0.7 / max(pxUnit, 1e-7);",
    "  float shade = exp(min(discD, 0.0) * min(340.0, kMax));",
    "  float bleed = exp(min(discD, 0.0) * min(95.0, kMax)) * rimBase * hv * 0.85;",
    "  vec3 ground = PHYS_BG * (1.0 - 0.85 * clamp(shade, 0.0, 1.0)) + uMid * bleed;",
    "  col = mix(ground, col, above);",
    "  float rimThin  = exp(-abs(discD) * min(mix(620.0, 150.0, hv), kMax));",
    "  float rimBroad = exp(-abs(discD) * min(mix(620.0, 22.0, hv), kMax));",
    "  float rimBand  = rimThin + mix(0.0, 0.26, hv) * rimBroad;",
    "  col += uMid * rimBand * rimFall * rimGain * above * uBright;",
    "  col = tonemapTanh(col);",
    "  float lum = clamp(dot(col, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);",
    "  vec3 light = mix(uBg, uMid, smoothstep(0.0, 0.55, lum));",
    "  light = mix(light, uCore, smoothstep(0.62, 1.0, lum));",
    "  light = mix(mix(uBg, uMid, 0.05), light, above);",
    "  light += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;",
    "  gl_FragColor = vec4(light, 1.0);",
    "}",
  ].join("\n");

  function hexToRgb(hex) {
    var body = hex.replace(/^#/, "");
    var n = parseInt(body, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("beyond-horizon shader:", gl.getShaderInfoLog(sh));
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
    console.error("beyond-horizon link:", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  function U(n) { return gl.getUniformLocation(prog, n); }
  var u = {
    res: U("uRes"), time: U("uTime"), mouse: U("uMouse"), hover: U("uHover"),
    bright: U("uBright"), horizonY: U("uHorizonY"), horizonR: U("uHorizonR"),
    haze: U("uHaze"), coreSize: U("uCoreSize"), coreHover: U("uCoreHover"),
    rimSpread: U("uRimSpread"), parallax: U("uParallax"), fit: U("uFit"),
    bg: U("uBg"), core: U("uCore"), mid: U("uMid"), deep: U("uDeep"),
  };

  var colors = {
    bg: hexToRgb(CONFIG.background),
    core: hexToRgb(CONFIG.coreColor),
    mid: hexToRgb(CONFIG.midColor),
    deep: hexToRgb(CONFIG.deepColor),
  };

  var w = 0, h = 0;
  function resize() {
    var cssW = Math.max(1, Math.round(host.offsetWidth || 1));
    var cssH = Math.max(1, Math.round(host.offsetHeight || 1));
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var scale = Math.min(Math.max(RENDER_SCALE * dpr, 1), MAX_DPR);
    var nw = Math.max(2, Math.round(cssW * scale));
    var nh = Math.max(2, Math.round(cssH * scale));
    var over = (nw * nh) / PIXEL_BUDGET;
    if (over > 1) {
      var s = Math.sqrt(1 / over);
      nw = Math.max(2, Math.round(nw * s));
      nh = Math.max(2, Math.round(nh * s));
    }
    if (nw === w && nh === h) return false;
    w = nw;
    h = nh;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    return true;
  }

  var pointer = { tx: 0, ty: 0, x: 0, y: 0, thover: 0, hover: 0 };

  function draw(tSec) {
    gl.uniform2f(u.res, w, h);
    gl.uniform1f(u.time, tSec * CONFIG.speed);
    gl.uniform2f(u.mouse, pointer.x, pointer.y);
    gl.uniform1f(u.hover, pointer.hover);
    gl.uniform1f(u.bright, CONFIG.brightness);
    gl.uniform1f(u.horizonY, CONFIG.horizonY);
    gl.uniform1f(u.horizonR, CONFIG.horizonRadius);
    gl.uniform1f(u.haze, CONFIG.haze);
    gl.uniform1f(u.coreSize, CONFIG.coreSize);
    gl.uniform1f(u.coreHover, CONFIG.coreHover);
    gl.uniform1f(u.rimSpread, CONFIG.rimSpread);
    gl.uniform1f(u.parallax, CONFIG.parallax);
    gl.uniform1f(u.fit, CONFIG.fit);
    gl.uniform3fv(u.bg, colors.bg);
    gl.uniform3fv(u.core, colors.core);
    gl.uniform3fv(u.mid, colors.mid);
    gl.uniform3fv(u.deep, colors.deep);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  draw(0); // paint before the first rAF frame so the canvas is never blank

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var lastT = 0;
  function onResize() { if (resize()) draw(lastT); }
  var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
  if (ro) ro.observe(host);
  window.addEventListener("resize", onResize);

  var raf = 0, start = 0;
  function loop(now) {
    if (!start) start = now;
    lastT = (now - start) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    pointer.hover += (pointer.thover - pointer.hover) * 0.05;
    draw(lastT);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  var touching = false;
  function onMove(e) {
    var coarse = e.pointerType === "touch" || e.pointerType === "pen";
    if (coarse) {
      if (e.type === "pointerdown") touching = true;
      else if (!touching) return;
    }
    var r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    pointer.tx = (e.clientX - r.left) / r.width - 0.5;
    pointer.ty = (e.clientY - r.top) / r.height - 0.5;
    pointer.thover = 1;
  }
  function onLeave(e) {
    if (touching && e.pointerType !== "mouse") return;
    pointer.tx = 0; pointer.ty = 0; pointer.thover = 0;
  }
  function onEnd() {
    if (!touching) return;
    touching = false;
    pointer.tx = 0; pointer.ty = 0; pointer.thover = 0;
  }
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerenter", onMove);
  host.addEventListener("pointerdown", onMove);
  host.addEventListener("pointerleave", onLeave);
  window.addEventListener("pointerup", onEnd);
  window.addEventListener("pointercancel", onEnd);
})();
