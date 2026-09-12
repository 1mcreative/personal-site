// Accretion Disc — /life/'s hero background. Ported from a pasted Originkit
// React/WebGL "black hole" component: a shaded core sphere, an orbiting
// particle disc with real Keplerian-density spiral arms, and polar jets
// (dialed to 0% here — see CONFIG). All the 3D math (orbit, spiral banding,
// camera, projection, depth of field, analytic occlusion, additive color
// pileup) lives in the vertex/fragment shaders below, transcribed close to
// verbatim from the reference — GLSL doesn't depend on React, so this is the
// one effect on this site where "port" mostly means deleting the component
// shell around already-portable code, not rewriting the mechanic.
//
// Dropped: the props/hooks/TypeScript scaffolding, the live control-panel
// wiring (Group/Props/merge/defaults — this site has no dev panel, so it's
// one fixed CONFIG instead, same pattern as beyond-horizon.js/globe.js), and
// parseColor's var()/rgb()/hsl() parsing (CONFIG only ever holds plain hex).
//
// RECOLORED, not just ported: the reference ships copper/orange
// (baseColor #FF5F00, accentColor #ffd9a0). This site's rule is new visual
// elements draw from the *existing* palette, so CONFIG uses the two blues
// already established elsewhere on the site instead — Grind's #1d4ed8 as the
// dim/dominant color, Chaos's own #6ec1ff as the hot-crest highlight — not a
// third invented hue. The additive pileup that clamps to white at the crest
// (see the frag shader's comment) still works the same with blue channels;
// it just clamps to icy white-blue instead of white-orange.
//
// Density is 50, not the reference's 100 (-> 200,000 points instead of
// 380,000): the doc comment above the reference component itself says
// "200k points free at the default Density," which only matches at 50 — the
// 100 in the function signature is a fallback default, not the shipped one.
// 200k is also a kinder default for a page every visitor's GPU has to run,
// not just a demo.
(function () {
  var TAU = Math.PI * 2;
  var DPR_CAP = 2;

  var ROUT = 100;
  var FOV_DEG = 34;
  var FOCAL = 1 / Math.tan(((FOV_DEG * Math.PI) / 180) / 2);
  var RIN_OF_CORE = 1.32;
  var RIN_FLOOR = 6;
  var THICKNESS = 2.4;
  var WIND = 3.4;
  var ARM_SHARPNESS = 2.6;
  var ARM_PULL = 0.45;
  var ARM_SPIN = 0.06;
  var JET_FLOW = 0.09;
  var JET_HELIX = 0.0055;
  var JET_SHARE = 0.32;
  var FOCUS_MULT = 1.75;
  var HALO = 1.7;
  var ORBIT_REF = 0.449;
  var DOT_REF = 0.16;
  var BLUR_REF = 0.64;
  var COUNT_BASE = 20000;
  var COUNT_PER = 3600;
  var TIME_WRAP = 1e5;

  var CONFIG = {
    baseColor: "#1d4ed8", // site's existing Grind blue — dim/dominant
    accentColor: "#6ec1ff", // site's existing Chaos blue — hot-crest highlight
    density: 50, // -> 200,000 points
    dotSize: 214,
    speed: 100,
    distance: 220,
    scatter: 44,
    blur: 0,
    tilt: 44,
    core: 6,
    arms: 8,
    jetAmount: 0,
    jetLen: 300,
    jetSpread: 34,
  };

  var host = document.querySelector(".life-hero");
  var canvas = document.querySelector(".life-hero-canvas");
  if (!host || !canvas) return;

  var gl =
    canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    }) || canvas.getContext("experimental-webgl");
  if (!gl) return;

  function hexToRgb(hex) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) {
      h = h
        .split("")
        .map(function (c) {
          return c + c;
        })
        .join("");
    }
    var n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  var PARTICLE_VERT = [
    "precision highp float;",
    "attribute vec4 aSeed;",
    "attribute float aKind;",
    "uniform float uTime;",
    "uniform float uTilt;",
    "uniform float uDist;",
    "uniform float uAspect;",
    "uniform float uHalfH;",
    "uniform float uDotSize;",
    "uniform float uBlur;",
    "uniform float uScatter;",
    "uniform float uCore;",
    "uniform float uArms;",
    "uniform float uJetAmount;",
    "uniform float uJetLen;",
    "uniform float uJetSpread;",
    "varying float vAlpha;",
    "varying float vRamp;",
    "const float FOCAL = " + FOCAL.toFixed(6) + ";",
    "const float ROUT = " + ROUT.toFixed(1) + ";",
    "const float WIND = " + WIND.toFixed(3) + ";",
    "const float THICKNESS = " + THICKNESS.toFixed(2) + ";",
    "const float ORBIT = " + ORBIT_REF.toFixed(4) + ";",
    "void kill() {",
    "  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);",
    "  gl_PointSize = 0.0;",
    "  vAlpha = 0.0;",
    "  vRamp = 0.0;",
    "}",
    "void main() {",
    "  float rIn = max(uCore * " + RIN_OF_CORE.toFixed(2) + ", " + RIN_FLOOR.toFixed(1) + ");",
    "  vec3 p;",
    "  float bright;",
    "  float ramp;",
    "  if (aKind == 0.0) {",
    "    float r = sqrt(mix(rIn * rIn, ROUT * ROUT, aSeed.x));",
    "    float f = clamp((r - rIn) / max(ROUT - rIn, 1e-3), 0.0, 1.0);",
    "    float th = aSeed.y + ORBIT * pow(rIn / r, 1.5) * uTime;",
    "    float armAngle = uArms * (th - WIND * log(r / rIn))",
    "                   - " + ARM_SPIN.toFixed(3) + " * uTime * min(uArms, 1.0);",
    "    th -= " + ARM_PULL.toFixed(2) + " * sin(armAngle) / max(uArms, 1.0);",
    "    float arm = pow(0.5 + 0.5 * cos(armAngle), " + ARM_SHARPNESS.toFixed(1) + ");",
    "    float flare = 0.30 + 0.70 * pow(f, 1.2);",
    "    float y = aSeed.z * THICKNESS * uScatter * flare;",
    "    p = vec3(r * cos(th), y, r * sin(th));",
    "    float radial = smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(0.45, 1.0, f));",
    "    radial *= 1.0 + 1.4 * exp(-pow((f - 0.32) / 0.20, 2.0));",
    "    float farSide = 0.5 - 0.5 * (p.z / max(r, 1e-3));",
    "    bright = radial * (0.34 + 0.75 * arm) * mix(0.62, 1.0, farSide) * 1.45;",
    "    ramp = clamp((1.0 - f) * 0.55 + arm * 0.55, 0.0, 1.0);",
    "  } else {",
    "    if (aSeed.w > uJetAmount) { kill(); return; }",
    "    float u = fract(aSeed.x + " + JET_FLOW.toFixed(3) + " * uTime);",
    "    float climb = pow(u, 1.35) * uJetLen;",
    "    float cone = tan(uJetSpread) * climb * (0.30 + 0.70 * u) + uCore * 0.35;",
    "    float rr = aSeed.z * cone;",
    "    float az = aSeed.y + climb * " + JET_HELIX.toFixed(4) + ";",
    "    p = vec3(rr * cos(az), aKind * climb, rr * sin(az));",
    "    bright = mix(1.0, 0.20, smoothstep(0.0, 1.0, u)) * (0.28 + 0.72 * (1.0 - aSeed.z)) * 1.75;",
    "    ramp = 0.30 + 0.40 * (1.0 - u);",
    "  }",
    "  float c = cos(uTilt);",
    "  float s = sin(uTilt);",
    "  vec3 camPos = vec3(0.0, uDist * s, uDist * c);",
    "  vec3 rel = p - camPos;",
    "  vec3 q = vec3(rel.x, c * rel.y - s * rel.z, s * rel.y + c * rel.z);",
    "  float depth = -q.z;",
    "  if (depth < 1.0) { kill(); return; }",
    "  float len = length(q);",
    "  vec3 dir = q / max(len, 1e-4);",
    "  float tca = -uDist * dir.z;",
    "  float perp2 = uDist * uDist - tca * tca;",
    "  float core2 = uCore * uCore;",
    "  if (perp2 < core2) {",
    "    float tEnter = tca - sqrt(core2 - perp2);",
    "    if (tEnter > 0.0 && len > tEnter) { kill(); return; }",
    "  }",
    "  gl_Position = vec4(q.x * FOCAL / (depth * uAspect), q.y * FOCAL / depth, 0.0, 1.0);",
    "  float ppw = FOCAL * uHalfH / depth;",
    "  float focusD = uDist * " + FOCUS_MULT.toFixed(2) + ";",
    "  float coc = uBlur * max(0.0, focusD - depth) / focusD;",
    "  float px = (uDotSize + coc) * ppw * " + HALO.toFixed(2) + ";",
    "  vAlpha = bright * pow(uDotSize / max(uDotSize + coc, 1e-5), 1.6);",
    "  float optical = px / " + HALO.toFixed(2) + ";",
    "  if (optical < 1.0) vAlpha *= optical * optical;",
    "  vRamp = ramp;",
    "  gl_PointSize = clamp(px, 1.0, 96.0);",
    "}",
  ].join("\n");

  var PARTICLE_FRAG = [
    "precision highp float;",
    "uniform vec3 uBase;",
    "uniform vec3 uAccent;",
    "varying float vAlpha;",
    "varying float vRamp;",
    "void main() {",
    "  vec2 d = gl_PointCoord - 0.5;",
    "  float r2 = dot(d, d) * 4.0;",
    "  if (r2 > 1.0) discard;",
    "  float core = max(0.0, exp(-r2 * 9.25) - 0.0000961);",
    "  float skirt = max(0.0, exp(-r2 * 1.80) - 0.165299);",
    "  float g = core + 0.30 * skirt;",
    "  float e = g * vAlpha;",
    "  vec3 col = mix(uBase, uAccent, vRamp);",
    "  gl_FragColor = vec4(col * e, e);",
    "}",
  ].join("\n");

  var CORE_VERT = [
    "precision highp float;",
    "attribute vec2 aQuad;",
    "uniform float uDist;",
    "uniform float uCore;",
    "uniform float uAspect;",
    "uniform float uHalfH;",
    "varying vec2 vUV;",
    "varying float vPxR;",
    "const float FOCAL = " + FOCAL.toFixed(6) + ";",
    "void main() {",
    "  float tanR = uCore / sqrt(max(uDist * uDist - uCore * uCore, 1.0));",
    "  float ndcR = tanR * FOCAL;",
    "  vUV = aQuad;",
    "  vPxR = ndcR * uHalfH;",
    "  gl_Position = vec4(aQuad.x * ndcR / uAspect, aQuad.y * ndcR, 0.0, 1.0);",
    "}",
  ].join("\n");

  var CORE_FRAG = [
    "precision highp float;",
    "uniform vec3 uBase;",
    "uniform vec3 uAccent;",
    "uniform float uTilt;",
    "varying vec2 vUV;",
    "varying float vPxR;",
    "void main() {",
    "  float rr = length(vUV);",
    "  float aa = 1.0 / max(vPxR, 1.0);",
    "  float m = 1.0 - smoothstep(1.0 - aa, 1.0, rr);",
    "  if (m <= 0.0) discard;",
    "  float st = sin(uTilt) * 0.55;",
    "  float dTop = vUV.y - st;",
    "  float dBot = vUV.y + st;",
    "  float ring = 0.40 * exp(-dTop * dTop * 9.0) + 1.0 * exp(-dBot * dBot * 9.0);",
    "  float rim = pow(smoothstep(0.78, 1.0, rr), 1.6);",
    "  float lit = rim * (0.05 + 0.95 * ring * (0.30 + 0.70 * abs(vUV.x)));",
    "  vec3 col = uBase * 0.012 + uAccent * lit * 0.42;",
    "  gl_FragColor = vec4(col * m, m);",
    "}",
  ].join("\n");

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("accretion-disc shader:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function link(vert, frag) {
    var vs = compile(gl.VERTEX_SHADER, vert);
    var fs = compile(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("accretion-disc link:", gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  var particleProg = link(PARTICLE_VERT, PARTICLE_FRAG);
  var coreProg = link(CORE_VERT, CORE_FRAG);
  if (!particleProg || !coreProg) return;

  var pu = {
    uTime: gl.getUniformLocation(particleProg, "uTime"),
    uTilt: gl.getUniformLocation(particleProg, "uTilt"),
    uDist: gl.getUniformLocation(particleProg, "uDist"),
    uAspect: gl.getUniformLocation(particleProg, "uAspect"),
    uHalfH: gl.getUniformLocation(particleProg, "uHalfH"),
    uDotSize: gl.getUniformLocation(particleProg, "uDotSize"),
    uBlur: gl.getUniformLocation(particleProg, "uBlur"),
    uScatter: gl.getUniformLocation(particleProg, "uScatter"),
    uCore: gl.getUniformLocation(particleProg, "uCore"),
    uArms: gl.getUniformLocation(particleProg, "uArms"),
    uJetAmount: gl.getUniformLocation(particleProg, "uJetAmount"),
    uJetLen: gl.getUniformLocation(particleProg, "uJetLen"),
    uJetSpread: gl.getUniformLocation(particleProg, "uJetSpread"),
    uBase: gl.getUniformLocation(particleProg, "uBase"),
    uAccent: gl.getUniformLocation(particleProg, "uAccent"),
  };
  var cu = {
    uDist: gl.getUniformLocation(coreProg, "uDist"),
    uCore: gl.getUniformLocation(coreProg, "uCore"),
    uAspect: gl.getUniformLocation(coreProg, "uAspect"),
    uHalfH: gl.getUniformLocation(coreProg, "uHalfH"),
    uBase: gl.getUniformLocation(coreProg, "uBase"),
    uAccent: gl.getUniformLocation(coreProg, "uAccent"),
    uTilt: gl.getUniformLocation(coreProg, "uTilt"),
  };
  var aSeed = gl.getAttribLocation(particleProg, "aSeed");
  var aKind = gl.getAttribLocation(particleProg, "aKind");
  var aQuad = gl.getAttribLocation(coreProg, "aQuad");

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gauss(rnd) {
    var u1 = Math.max(1e-9, rnd());
    var u2 = rnd();
    var g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
    return Math.max(-3, Math.min(3, g));
  }

  function buildCloud(count) {
    var seed = new Float32Array(count * 4);
    var kind = new Float32Array(count);
    var rnd = mulberry32(0x9e3779b9);
    for (var i = 0; i < count; i++) {
      var o = i * 4;
      if (rnd() >= JET_SHARE) {
        seed[o] = rnd();
        seed[o + 1] = rnd() * TAU;
        seed[o + 2] = gauss(rnd);
        seed[o + 3] = rnd();
        kind[i] = 0;
      } else {
        seed[o] = rnd();
        seed[o + 1] = rnd() * TAU;
        seed[o + 2] = Math.sqrt(rnd());
        seed[o + 3] = rnd();
        kind[i] = rnd() < 0.5 ? 1 : -1;
      }
    }
    return { seed: seed, kind: kind };
  }

  var seedBuf = gl.createBuffer();
  var kindBuf = gl.createBuffer();
  var quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  var particleCount = Math.round(COUNT_BASE + CONFIG.density * COUNT_PER);
  var cloud = buildCloud(particleCount);
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
  gl.bufferData(gl.ARRAY_BUFFER, cloud.seed, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, kindBuf);
  gl.bufferData(gl.ARRAY_BUFFER, cloud.kind, gl.STATIC_DRAW);

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);

  var base = hexToRgb(CONFIG.baseColor);
  var accent = hexToRgb(CONFIG.accentColor);
  var tiltRad = (CONFIG.tilt * Math.PI) / 180;
  var coreWorld = (CONFIG.core / 100) * ROUT;
  var dotSizeWorld = (DOT_REF * CONFIG.dotSize) / 100;
  var blurWorld = (BLUR_REF * CONFIG.blur) / 100;
  var scatterFrac = CONFIG.scatter / 100;
  var jetAmountFrac = CONFIG.jetAmount / 100;
  var jetLenWorld = (CONFIG.jetLen / 100) * ROUT;
  var jetSpreadRad = (CONFIG.jetSpread * Math.PI) / 180;

  var bw = 1;
  var bh = 1;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    var cw = canvas.clientWidth || host.clientWidth || 0;
    var ch = canvas.clientHeight || host.clientHeight || 0;
    var w = Math.max(1, Math.round(cw * dpr));
    var h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    bw = w;
    bh = h;
    gl.viewport(0, 0, w, h);
  }
  resize();
  var ro = new ResizeObserver(resize);
  ro.observe(canvas);

  var last = 0;
  var t = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = last === 0 ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    t = (t + dt * (CONFIG.speed / 50)) % TIME_WRAP;

    var aspect = bw / Math.max(bh, 1);
    var halfH = bh * 0.5;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(coreProg);
    gl.uniform1f(cu.uDist, CONFIG.distance);
    gl.uniform1f(cu.uCore, coreWorld);
    gl.uniform1f(cu.uAspect, aspect);
    gl.uniform1f(cu.uHalfH, halfH);
    gl.uniform1f(cu.uTilt, tiltRad);
    gl.uniform3fv(cu.uBase, base);
    gl.uniform3fv(cu.uAccent, accent);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(aQuad);
    gl.vertexAttribPointer(aQuad, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(aQuad);

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(particleProg);
    gl.uniform1f(pu.uTime, t);
    gl.uniform1f(pu.uTilt, tiltRad);
    gl.uniform1f(pu.uDist, CONFIG.distance);
    gl.uniform1f(pu.uAspect, aspect);
    gl.uniform1f(pu.uHalfH, halfH);
    gl.uniform1f(pu.uDotSize, dotSizeWorld);
    gl.uniform1f(pu.uBlur, blurWorld);
    gl.uniform1f(pu.uScatter, scatterFrac);
    gl.uniform1f(pu.uCore, coreWorld);
    gl.uniform1f(pu.uArms, CONFIG.arms);
    gl.uniform1f(pu.uJetAmount, jetAmountFrac);
    gl.uniform1f(pu.uJetLen, jetLenWorld);
    gl.uniform1f(pu.uJetSpread, jetSpreadRad);
    gl.uniform3fv(pu.uBase, base);
    gl.uniform3fv(pu.uAccent, accent);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, kindBuf);
    gl.enableVertexAttribArray(aKind);
    gl.vertexAttribPointer(aKind, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, particleCount);
  }
  requestAnimationFrame(frame);
})();
