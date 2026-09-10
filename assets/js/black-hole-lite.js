// Black Hole (lite) — replaces black-hole.js (now DEPRECATED, see CLAUDE.md
// tooling log) per explicit feedback that the raymarched version was heavy
// and slow to respond. Same visual family, completely different pipeline:
// the old version re-traced a 256-step geodesic integral through curved
// spacetime for every pixel on EVERY frame. This one traces once (a "bake"
// pass, only re-run on load/resize) into a small G-buffer of disk-crossing
// points, then every real frame just cheaply re-shades that cached buffer —
// the expensive part isn't repeated 60 times a second anymore. Also renders
// at 1 CSS pixel per device pixel rather than up to 1.6x DPR (a real
// resolution cut, softer on retina screens, meaningfully fewer pixels to
// shade either way), and pauses entirely via IntersectionObserver/
// visibilitychange when off-screen or the tab is hidden, instead of relying
// on the browser to throttle rAF on its own.
//
// Ported from a pasted React/WebGPU reference (index.tsx, renderer.ts,
// pipeline.ts, settings.ts, noise-volume.mjs, and eight .wgsl files built on
// the same internal "vgpu" wrapper the previous black hole used). Same
// treatment every reference on this site gets: dropped React/TypeScript and
// vgpu's device/target/effect plumbing, rewritten directly against raw
// WebGPU. The reference's own module system (`import {...} from "./x.wgsl"`)
// isn't real WGSL — it's their build tool's preprocessing — so every shared
// chunk (the geodesic integrator, the G-buffer decode helpers, the disk and
// star shading, a PCG3D hash) is inlined by hand into whichever shader
// module actually uses it, same as black-hole.js already did for its own
// (much smaller) shader set.
//
// RECOLORED, same rule as every visual element on this site: the reference's
// disk is copper/orange: recolored to dark navy -> Grind's #1d4ed8 -> an
// icy near-white-blue crest, with the receding (redshifted) side warmed
// toward the site's amber accent (#f59e0b, reused from the homepage globe/
// glitter) — the same redshift trick black-hole.js's own volumeSample()
// used, ported here since this shader already computes the same Doppler
// `beaming` factor it needs. Starfield narrowed from warm-to-cool to a
// blue-white-only range for the same "doesn't blend in" reason as before.
//
// Camera framing and composition match the reference's own
// defaultHeroSettings exactly, on every breakpoint — distance 13.5, fov 3,
// diskRadius 9, the off-center/tilted layout (centerX 0.8, centerY 0.3,
// roll -0.27) — confirmed against a reference screenshot of the source. An
// earlier pass gave mobile its own centered, upright framing instead
// (reasoning it as a legibility fix — the shared composition read fainter
// on a narrow viewport), but that read as a flat, static "horizon" view
// rather than the same effect desktop gets, which isn't what was wanted —
// removed per direct feedback ("i want same effect as desktop in mobile as
// well"); `centerFade` stays 0 everywhere since this page's text
// legibility is solved independently (a top-aligned position plus backdrop
// pills, see personal.css) rather than via the shader's own center-dimming
// knob. One real capability loss from the architecture change, unrelated to
// composition:
// the old version's hover-follow moved the camera on both axes (full
// re-trace every frame made that cheap); this one only makes horizontal
// parallax free, by rotating the cached disk/star directions around Y after
// the bake instead of re-baking — vertical mouse-follow would need a full
// re-bake per frame, exactly the cost this rewrite exists to avoid.
// Touch/no-hover visitors get a fixed camera, same `matchMedia('(hover:
// hover)')` gate as every other pointer-reactive effect on this site.
(function () {
  var canvas = document.querySelector(".life-hero-canvas");
  if (!canvas || !navigator.gpu) return;

  // ---------------------------------------------------------------------
  // Settings — the reference's own defaultHeroSettings() values, verbatim,
  // applied on every breakpoint (see file header for why this isn't
  // responsive anymore), except centerFade (see file header).
  // ---------------------------------------------------------------------
  var settings = {
    cameraY: 0.16,
    distance: 13.5,
    diskRadius: 9,
    fov: 3,
    centerX: 0.8,
    centerY: 0.3,
    cameraRoll: -0.27,
    mouseYaw: 0.15,
    centerFade: 0,
    bloom: { strength: 1, threshold: 0, knee: 0.18, radius: 1.5 },
    disk: {
      brightness: 0.75, speed: 0.75, stretch: 5.75, detail: 3.44,
      turbulence: 4.46, density: 1.38, doppler: 1.21, cloudScale: 20,
      cloudSpeed: 0.3, cloudStrength: 0.2,
      spare0: 0.43, spare1: -0.25, spare2: -0.67, spare3: 0.69,
    },
    stars: { brightness: 1, density: 1, contrast: 13, warmth: 0.5, twinkle: 0 },
  };
  var bloomScale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2) / 2;
  settings.bloom.radius *= bloomScale;
  settings.bloom.strength *= bloomScale;

  var HOVER = !!(window.matchMedia && window.matchMedia("(hover: hover)").matches);

  // ---------------------------------------------------------------------
  // Shared WGSL fragments — concatenated by hand into whichever shader
  // module actually needs them, since raw WGSL has no module system.
  // ---------------------------------------------------------------------
  var FULLSCREEN_VERT =
    "struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f }\n" +
    "@vertex fn vs_main(@builtin(vertex_index) i: u32) -> VSOut {\n" +
    "  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));\n" +
    "  var t = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));\n" +
    "  var out: VSOut;\n" +
    "  out.pos = vec4f(p[i], 0.0, 1.0);\n" +
    "  out.uv = t[i];\n" +
    "  return out;\n" +
    "}\n";

  var GEODESIC_WGSL = `
const HORIZON: f32 = 1.0;
const ISCO: f32 = 3.0;
const MAX_STEPS: i32 = 768;

struct TraceResult {
  hit1Plane: vec2f,
  hit1Direction: vec2f,
  hit2Plane: vec2f,
  hit2Direction: vec2f,
  hitCount: i32,
  swallowed: f32,
  escaped: f32,
  finalVelocity: vec3f,
}

struct CameraRay {
  position: vec3f,
  velocity: vec3f,
}

fn escapeRadiusFor(orbitRadius: f32) -> f32 {
  return max(120.0, orbitRadius + 8.0);
}

fn encodeDirection(direction: vec3f) -> vec2f {
  return vec2f(direction.y, atan2(direction.z, direction.x));
}

fn geodesicAcceleration(position: vec3f, velocity: vec3f) -> vec3f {
  let r2 = max(dot(position, position), 0.0001);
  let angularMomentum = cross(position, velocity);
  let h2 = dot(angularMomentum, angularMomentum);
  return -1.5 * h2 * position / (r2 * r2 * sqrt(r2));
}

fn cameraRay(
  uv: vec2f, resolution: vec2f, yaw: f32, pitch: f32, orbitRadius: f32,
  fov: f32, centerX: f32, centerY: f32, roll: f32,
) -> CameraRay {
  let aspect = resolution.x / max(resolution.y, 1.0);
  let ndc = vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
  let screenPlane = (ndc - vec2f(centerX, centerY)) * vec2f(aspect, 1.0);
  let cosine = cos(roll);
  let sine = sin(roll);
  let screen = vec2f(
    screenPlane.x * cosine - screenPlane.y * sine,
    screenPlane.x * sine + screenPlane.y * cosine,
  );
  let clampedPitch = clamp(pitch, -1.319, 1.319);
  let cameraPosition = vec3f(
    sin(yaw) * cos(clampedPitch) * orbitRadius,
    sin(clampedPitch) * orbitRadius,
    cos(yaw) * cos(clampedPitch) * orbitRadius,
  );
  let forward = normalize(vec3f(0.0) - cameraPosition);
  let right = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
  let up = cross(right, forward);
  var ray: CameraRay;
  ray.position = cameraPosition;
  ray.velocity = normalize(forward * fov + right * screen.x + up * screen.y);
  return ray;
}

fn traceRay(cameraPosition: vec3f, initialVelocity: vec3f, diskOuter: f32, escapeRadius: f32) -> TraceResult {
  var position = cameraPosition;
  var velocity = initialVelocity;
  var result: TraceResult;
  result.hit1Plane = vec2f(0.0);
  result.hit1Direction = vec2f(0.0);
  result.hit2Plane = vec2f(0.0);
  result.hit2Direction = vec2f(0.0);
  result.hitCount = 0;
  result.swallowed = 0.0;
  result.escaped = 0.0;
  for (var stepIndex = 0; stepIndex < MAX_STEPS; stepIndex++) {
    let radius = length(position);
    if (radius < HORIZON * 1.004) { result.swallowed = 1.0; break; }
    if (radius > escapeRadius && dot(position, velocity) > 0.0) { result.escaped = 1.0; break; }
    let stepSize = clamp((radius - HORIZON) * 0.035, 0.0045, 0.075 * max(1.0, radius / 6.0));
    let previousPosition = position;
    let previousVelocity = velocity;
    let acceleration0 = geodesicAcceleration(position, velocity);
    velocity += acceleration0 * (0.5 * stepSize);
    position += velocity * stepSize;
    let acceleration1 = geodesicAcceleration(position, velocity);
    velocity += acceleration1 * (0.5 * stepSize);
    velocity = normalize(velocity);
    if (result.hitCount < 2) {
      let previousSide = select(-1.0, 1.0, previousPosition.y >= 0.0);
      let currentSide = select(-1.0, 1.0, position.y >= 0.0);
      if (previousSide != currentSide) {
        let t = clamp(previousPosition.y / (previousPosition.y - position.y), 0.0, 1.0);
        let crossing = mix(previousPosition, position, t);
        let planeRadius = length(crossing.xz);
        if (planeRadius >= ISCO && planeRadius <= diskOuter) {
          let direction = encodeDirection(normalize(mix(previousVelocity, velocity, t)));
          if (result.hitCount == 0) {
            result.hit1Plane = crossing.xz;
            result.hit1Direction = direction;
          } else {
            result.hit2Plane = crossing.xz;
            result.hit2Direction = direction;
          }
          result.hitCount += 1;
        }
      }
    }
  }
  result.finalVelocity = velocity;
  return result;
}
`;

  var BAKE_FRAG = GEODESIC_WGSL + `
struct Bake {
  resolution: vec2f, yaw: f32, pitch: f32, orbitRadius: f32,
  diskOuter: f32, fov: f32, centerX: f32, centerY: f32, roll: f32,
}
@group(0) @binding(0) var<uniform> bake: Bake;

struct GBufferOut {
  @location(0) hit1: vec2f,
  @location(1) hit2: vec2f,
  @location(2) sky: vec4f,
  @location(3) view: vec4f,
}

@fragment fn fs_main(@location(0) uv: vec2f) -> GBufferOut {
  let ray = cameraRay(uv, bake.resolution, bake.yaw, bake.pitch, bake.orbitRadius, bake.fov, bake.centerX, bake.centerY, bake.roll);
  var traced = traceRay(ray.position, ray.velocity, bake.diskOuter, escapeRadiusFor(bake.orbitRadius));
  if (traced.swallowed < 0.5 && traced.escaped < 0.5) { traced.swallowed = 1.0; }
  return GBufferOut(
    traced.hit1Plane, traced.hit2Plane,
    vec4f(traced.finalVelocity, traced.swallowed * 1.0 + traced.escaped * 2.0),
    vec4f(traced.hit1Direction, traced.hit2Direction),
  );
}
`;

  var REFINE_FRAG = GEODESIC_WGSL + `
struct Refine {
  resolution: vec2f, yaw: f32, pitch: f32, orbitRadius: f32,
  diskOuter: f32, fov: f32, centerX: f32, centerY: f32, roll: f32,
}
@group(0) @binding(0) var<uniform> refine: Refine;
@group(0) @binding(1) var gHit1: texture_2d<f32>;
@group(0) @binding(2) var gSky: texture_2d<f32>;

const SUB_STEPS: i32 = 4;
const MASK_RADIUS: i32 = 2;
const GRADIENT_LIMIT: f32 = 0.12;
const B_CRIT: f32 = 2.59807621;
const CRITICAL_BAND: f32 = 0.06;

fn isHitAt(plane: vec2f) -> bool {
  return length(plane) > ISCO * 0.5;
}

struct RefineOut {
  @location(0) coverage: vec2f,
  @location(1) geometry: vec4f,
}

@fragment fn fs_main(@location(0) uv: vec2f) -> RefineOut {
  let dimensions = vec2i(textureDimensions(gHit1, 0));
  let texel = vec2i(clamp(uv * refine.resolution, vec2f(0.0), refine.resolution - vec2f(1.0)));
  let annulus = max(refine.diskOuter - ISCO, 0.001);

  let centerPlane = textureLoad(gHit1, texel, 0).xy;
  let centerHit = isHitAt(centerPlane);
  let centerHole = (i32(textureLoad(gSky, texel, 0).w + 0.5) & 1) != 0;
  let centerRadiusNorm = clamp((length(centerPlane) - ISCO) / annulus, 0.0, 1.0);

  let centerRay = cameraRay(
    uv, refine.resolution, refine.yaw, refine.pitch, refine.orbitRadius,
    refine.fov, refine.centerX, refine.centerY, refine.roll,
  );
  let impactParameter = length(cross(centerRay.position, centerRay.velocity));

  var boundary = abs(impactParameter - B_CRIT) < CRITICAL_BAND * HORIZON;
  for (var dy = -MASK_RADIUS; dy <= MASK_RADIUS; dy++) {
    for (var dx = -MASK_RADIUS; dx <= MASK_RADIUS; dx++) {
      let neighbor = clamp(texel + vec2i(dx, dy), vec2i(0), dimensions - vec2i(1));
      let plane = textureLoad(gHit1, neighbor, 0).xy;
      let hit = isHitAt(plane);
      let hole = (i32(textureLoad(gSky, neighbor, 0).w + 0.5) & 1) != 0;
      if (hit != centerHit || hole != centerHole) { boundary = true; }
      if (hit && centerHit) {
        let radiusNorm = clamp((length(plane) - ISCO) / annulus, 0.0, 1.0);
        if (abs(radiusNorm - centerRadiusNorm) > GRADIENT_LIMIT) { boundary = true; }
      }
    }
  }

  if (!boundary) {
    return RefineOut(vec2f(select(0.0, 1.0, centerHit), 0.0), vec4f(0.0));
  }

  let escapeRadius = escapeRadiusFor(refine.orbitRadius);
  var hits = 0.0;
  var minRadius = 1e9;
  var maxRadius = -1e9;
  var bestPlane = vec2f(0.0);
  var bestDirection = vec2f(0.0);
  var bestRadius = 0.0;
  var bestDistance = 1e9;
  for (var sy = 0; sy < SUB_STEPS; sy++) {
    for (var sx = 0; sx < SUB_STEPS; sx++) {
      let offset = (vec2f(f32(sx), f32(sy)) + vec2f(0.5)) / f32(SUB_STEPS);
      let subUv = (vec2f(texel) + offset) / refine.resolution;
      let ray = cameraRay(
        subUv, refine.resolution, refine.yaw, refine.pitch, refine.orbitRadius,
        refine.fov, refine.centerX, refine.centerY, refine.roll,
      );
      let traced = traceRay(ray.position, ray.velocity, refine.diskOuter, escapeRadius);
      if (traced.hitCount > 0) {
        let radius = length(traced.hit1Plane);
        hits += 1.0;
        minRadius = min(minRadius, radius);
        maxRadius = max(maxRadius, radius);
        let distance = length(offset - vec2f(0.5));
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPlane = traced.hit1Plane;
          bestDirection = traced.hit1Direction;
          bestRadius = radius;
        }
      }
    }
  }

  let coverage = hits / f32(SUB_STEPS * SUB_STEPS);
  if (hits < 0.5) {
    return RefineOut(vec2f(0.0, 0.0), vec4f(0.0));
  }

  var r0 = length(centerPlane);
  var span = 0.0;
  var geometry = vec4f(0.0);
  if (centerHit) {
    span = 2.0 * max(abs(maxRadius - r0), abs(r0 - minRadius));
  } else {
    r0 = 0.5 * (minRadius + maxRadius);
    span = maxRadius - minRadius;
    geometry = vec4f(bestPlane * (r0 / max(bestRadius, ISCO)), bestDirection);
  }
  return RefineOut(vec2f(coverage, clamp(span / annulus, 0.0, 1.0)), geometry);
}
`;

  var GBUFFER_WGSL = `
const G_HORIZON: f32 = 1.0;
const G_ISCO: f32 = 3.0;
const G_TAU: f32 = 6.28318530718;
const G_PI: f32 = 3.14159265359;

struct GBufferSample {
  position: vec3f,
  normal: vec3f,
  diskUv: vec2f,
  diskPolar: vec2f,
  rayDirection: vec3f,
  viewDirection: vec3f,
  side: f32,
  coverage: f32,
  span: f32,
  isHit: bool,
  synthesized: bool,
  isBlackHole: bool,
  escaped: bool,
}

struct GBufferLayers {
  front: GBufferSample,
  back: GBufferSample,
}

fn decodeDirection(encoded: vec2f) -> vec3f {
  let horizontal = sqrt(max(1.0 - encoded.x * encoded.x, 0.0));
  return vec3f(cos(encoded.y) * horizontal, encoded.x, sin(encoded.y) * horizontal);
}

fn decodeLayer(
  plane: vec2f, encodedDirection: vec2f, sky: vec4f, flags: i32,
  diskOuter: f32, aa: vec2f, synthesized: bool,
) -> GBufferSample {
  var sample: GBufferSample;
  let planeRadius = length(plane);
  let isHit = planeRadius > G_ISCO * 0.5;
  let radius = max(planeRadius, G_ISCO);
  let azimuth = atan2(plane.y, plane.x);
  let direction = decodeDirection(encodedDirection);
  let side = select(1.0, -1.0, direction.y > 0.0);

  sample.position = select(vec3f(0.0), vec3f(plane.x, 0.0, plane.y), isHit);
  sample.normal = select(vec3f(0.0), vec3f(0.0, side, 0.0), isHit);
  sample.diskUv = vec2f(
    clamp((radius - G_ISCO) / max(diskOuter - G_ISCO, 0.001), 0.0, 1.0),
    (azimuth + G_PI) / G_TAU,
  );
  sample.diskPolar = vec2f(radius, azimuth);
  sample.rayDirection = sky.xyz;
  sample.viewDirection = direction;
  sample.side = select(0.0, side, isHit);
  sample.coverage = clamp(aa.x, 0.0, 1.0);
  sample.span = clamp(aa.y, 0.0, 1.0);
  sample.isHit = isHit;
  sample.synthesized = synthesized && isHit;
  sample.isBlackHole = (flags & 1) != 0;
  sample.escaped = (flags & 2) != 0;
  return sample;
}

fn decodeGBuffer(
  hit1: vec2f, hit2: vec2f, sky: vec4f, view: vec4f,
  diskOuter: f32, aa: vec2f, aaGeom: vec4f,
) -> GBufferLayers {
  let flags = i32(sky.w + 0.5);
  let substitute = length(hit1) <= G_ISCO * 0.5 && length(aaGeom.xy) > G_ISCO * 0.5;
  let frontPlane = select(hit1, aaGeom.xy, substitute);
  let frontDirection = select(view.xy, aaGeom.zw, substitute);
  var layers: GBufferLayers;
  layers.front = decodeLayer(frontPlane, frontDirection, sky, flags, diskOuter, aa, substitute);
  layers.back = decodeLayer(hit2, view.zw, sky, flags, diskOuter, vec2f(1.0, 0.0), false);
  if (!layers.front.isHit) {
    layers.back.isHit = false;
    layers.back.side = 0.0;
    layers.back.normal = vec3f(0.0);
  }
  return layers;
}

fn sampleAtRadius(g: GBufferSample, radius: f32, diskOuter: f32) -> GBufferSample {
  var moved = g;
  let clamped = clamp(radius, G_ISCO, max(diskOuter, G_ISCO));
  let azimuth = g.diskPolar.y;
  moved.position = vec3f(cos(azimuth) * clamped, 0.0, sin(azimuth) * clamped);
  moved.diskPolar = vec2f(clamped, azimuth);
  moved.diskUv = vec2f(
    clamp((clamped - G_ISCO) / max(diskOuter - G_ISCO, 0.001), 0.0, 1.0),
    g.diskUv.y,
  );
  return moved;
}
`;

  // Recolored from the reference's copper/orange — see file header. The
  // receding (redshifted) side warms toward the site's amber accent
  // (#f59e0b), same trick black-hole.js's volumeSample() already used.
  var DISK_WGSL = `
struct DiskLook {
  brightness: f32, speed: f32, stretch: f32, detail: f32,
  turbulence: f32, density: f32, doppler: f32, cloudScale: f32,
  cloudSpeed: f32, cloudStrength: f32,
  spare0: f32, spare1: f32, spare2: f32, spare3: f32,
}

struct DiskSample {
  color: vec3f,
  alpha: f32,
}

struct NoiseLattice {
  invSize: f32,
}

fn noise3(tex: texture_3d<f32>, samp: sampler, lattice: NoiseLattice, p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let u = f * f * (3.0 - 2.0 * f);
  return textureSampleLevel(tex, samp, (i + u + vec3f(0.5)) * lattice.invSize, 0.0).r;
}

fn streakFbm(
  tex: texture_3d<f32>, samp: sampler, lattice: NoiseLattice,
  angle: f32, radius: f32, angScale: f32, radScale: f32, octaves: i32,
  dAngle: f32, dRadius: f32, lacAng: f32, lacRad: f32, seed: f32,
) -> f32 {
  var value: f32 = 0.0;
  var total: f32 = 0.0;
  var amplitude: f32 = 0.5;
  var a = angScale;
  var r = radScale;
  var offset = seed;
  for (var i = 0; i < octaves; i++) {
    let visible = clamp(1.0 - 1.7 * max(dAngle * a, dRadius * r), 0.0, 1.0);
    var sampleValue: f32 = 0.5;
    if (visible > 0.004) {
      sampleValue = mix(0.5, noise3(tex, samp, lattice, vec3f(cos(angle) * a, sin(angle) * a, radius * r + offset)), visible);
    }
    value += amplitude * sampleValue;
    total += amplitude;
    a *= lacAng;
    r *= lacRad;
    offset += 23.7;
    amplitude *= 0.55;
  }
  return value / max(total, 0.0001);
}

fn ridgeFbm(
  tex: texture_3d<f32>, samp: sampler, lattice: NoiseLattice,
  angle: f32, radius: f32, angScale: f32, radScale: f32, octaves: i32,
  dAngle: f32, dRadius: f32, lacAng: f32, lacRad: f32, seed: f32,
) -> f32 {
  var value: f32 = 0.0;
  var total: f32 = 0.0;
  var amplitude: f32 = 0.5;
  var a = angScale;
  var r = radScale;
  var offset = seed;
  for (var i = 0; i < octaves; i++) {
    let visible = clamp(1.0 - 1.7 * max(dAngle * a, dRadius * r), 0.0, 1.0);
    var crest: f32 = 0.42;
    if (visible > 0.004) {
      let n = noise3(tex, samp, lattice, vec3f(cos(angle) * a, sin(angle) * a, radius * r + offset));
      crest = mix(0.42, pow(1.0 - abs(n * 2.0 - 1.0), 1.35), visible);
    }
    value += amplitude * crest;
    total += amplitude;
    a *= lacAng;
    r *= lacRad;
    offset += 41.9;
    amplitude *= 0.62;
  }
  return value / max(total, 0.0001);
}

struct FieldParams {
  angBase: f32, radBase: f32, flowRad: f32, chaos: f32,
  outward: f32, dAngle: f32, dRadius: f32,
}

fn smokeField(
  tex: texture_3d<f32>, samp: sampler, lattice: NoiseLattice,
  angle: f32, radius: f32, p: FieldParams,
) -> vec2f {
  let warpA = (streakFbm(tex, samp, lattice, angle, radius, p.angBase * 0.55, p.flowRad * 1.6, 2, p.dAngle, p.dRadius, 1.6, 2.0, 3.7)) - 0.5;
  let warpB = (streakFbm(tex, samp, lattice, angle + 2.4, radius * 1.13, p.angBase * 2.8, p.radBase * 0.45, 3, p.dAngle, p.dRadius, 1.7, 2.0, 61.3)) - 0.5;
  let radiusW = radius + (warpA * 1.9 + warpB * 1.25 * p.outward) * p.chaos;
  let angleW = angle + (warpB * 0.9 - warpA * 0.35) * p.chaos * 0.55 / max(radius * 0.22, 0.35);

  let flow = streakFbm(tex, samp, lattice, angleW, radiusW, p.angBase, p.flowRad, 3, p.dAngle, p.dRadius, 2.0, 1.12, 131.7);
  let threads = ridgeFbm(tex, samp, lattice, angleW, radiusW, p.angBase * 0.85, p.radBase, 5, p.dAngle, p.dRadius, 1.26, 2.05, 0.0);

  let fineVis = clamp(1.0 - 1.7 * max(p.dAngle * p.angBase * 0.85, p.dRadius * p.radBase), 0.0, 1.0);
  let field = mix(flow, flow * 0.22 + threads * 1.05, fineVis);
  let rim = (warpA + warpB * 0.5) * 0.9;
  return vec2f(f32(field), rim);
}

const FIELD_MEAN = 0.52;
const SHEAR_REF_RADIUS = 6.5;
const SHEAR_PERIOD: f32 = 10.0;
const TWO_PI = 6.283185307;

fn shadeDisk(
  g: GBufferSample, look: DiskLook, time: f32, footprint: f32,
  noiseTex: texture_3d<f32>, noiseSampler: sampler,
) -> DiskSample {
  var lattice: NoiseLattice;
  lattice.invSize = 1.0 / f32(textureDimensions(noiseTex).x);

  let plane = vec2f(g.position.x, g.position.z);
  let radius = g.diskPolar.x;
  let azimuth = g.diskPolar.y;
  let radiusNorm = clamp(g.diskUv.x, 0.0, 1.0);
  let viewDirection = g.viewDirection;

  let slant = max(abs(viewDirection.y), 0.022);
  let grazing = min(1.0 / slant, 34.0);

  let viewPlane = normalize(vec2f(viewDirection.x, viewDirection.z) + vec2f(1e-6, 0.0));
  let radialDir = normalize(plane + vec2f(1e-6, 0.0));
  let alignR = clamp(abs(dot(radialDir, viewPlane)), 0.0, 1.0);
  let alignT = sqrt(max(1.0 - alignR * alignR, 0.0));
  let stretchSq = grazing * grazing - 1.0;
  let kR = sqrt(1.0 + stretchSq * alignR * alignR);
  let kT = sqrt(1.0 + stretchSq * alignT * alignT);
  let baseScaleR = max(look.detail, 0.05);
  let baseScaleA = max(look.stretch, 0.05);
  let pixelWorld = footprint / max(baseScaleR * kR, baseScaleA * kT / max(radius, G_ISCO));
  let dRadius = pixelWorld * kR;
  let dAngle = pixelWorld * kT / max(radius, G_ISCO);

  let omega = look.speed * 0.55 / pow(radius, 1.5);
  let omegaRef = look.speed * 0.55 / pow(SHEAR_REF_RADIUS, 1.5);
  let dOmega = omega - omegaRef;
  let rigid = fract(time * omegaRef / TWO_PI) * TWO_PI;
  let swirl = max(0.0, 0.85 + look.spare1);
  let flowBase = azimuth - rigid + swirl * log(radius / G_ISCO);

  let cycle = time / SHEAR_PERIOD;
  let u0 = fract(cycle);
  let u1 = fract(cycle + 0.5);
  let shear0 = (u0 - 0.5) * SHEAR_PERIOD;
  let shear1 = (u1 - 0.5) * SHEAR_PERIOD;
  let w0 = 1.0 - abs(2.0 * u0 - 1.0);
  let w1 = 1.0 - w0;
  let angle0 = flowBase - dOmega * shear0;
  let angle1 = flowBase - dOmega * shear1;

  let outward = smoothstep(0.0, 0.92, radiusNorm);
  let fray = max(0.0, 1.0 + look.spare3);
  let chaos = look.turbulence * (0.08 + 2.10 * outward * outward) * fray;

  let angBase = max(look.stretch, 0.05) * 0.45 * (0.80 + 1.45 * outward * fray);
  let radBase = max(look.detail, 0.05) * 2.35;
  let flowRad = max(look.detail, 0.05) * 0.105;

  var params: FieldParams;
  params.angBase = angBase;
  params.radBase = radBase;
  params.flowRad = flowRad;
  params.chaos = chaos;
  params.outward = outward;
  params.dAngle = dAngle;
  params.dRadius = dRadius;
  let lobeShift = abs(dOmega) * SHEAR_PERIOD * 0.5 * angBase * 0.85;
  let rho = 1.0 - smoothstep(0.12, 1.1, lobeShift);

  var blended: vec2f;
  var lobeVariance = 1.0;
  if (rho > 0.98) {
    let angleMerged = mix(angle1, angle0, w0);
    blended = smokeField(noiseTex, noiseSampler, lattice, angleMerged, radius, params);
  } else {
    let lobe0 = smokeField(noiseTex, noiseSampler, lattice, angle0, radius, params);
    let lobe1 = smokeField(noiseTex, noiseSampler, lattice, angle1, radius, params);
    blended = mix(lobe1, lobe0, w0);
    lobeVariance = sqrt(max(w0 * w0 + w1 * w1 + 2.0 * rho * w0 * w1, 0.25));
  }
  var field = FIELD_MEAN + (blended.x - FIELD_MEAN) / lobeVariance;

  let cloudRate = omegaRef * look.cloudSpeed;
  let cloudRigid = fract(time * cloudRate / TWO_PI) * TWO_PI;
  let cloudAngle = azimuth - cloudRigid + 0.32 * log(radius / G_ISCO);
  let cloudScale = max(look.cloudScale, 0.05);
  let cloudRaw = streakFbm(noiseTex, noiseSampler, lattice, cloudAngle, radius, cloudScale, cloudScale * 0.34, 2, dAngle, dRadius, 1.72, 1.86, 211.7);
  let cloud = smoothstep(0.28, 0.72, cloudRaw);
  let cloudStrength = clamp(look.cloudStrength, 0.0, 0.95);
  let cloudMultiplier = mix(1.0 - cloudStrength, 1.0 + cloudStrength, cloud);
  field *= cloudMultiplier;

  let rimNoise = blended.y;
  let innerEdge = smoothstep(0.0, 0.055, radiusNorm);
  let outerEdge = 1.0 - smoothstep(0.42 + rimNoise * 0.30 * fray, 1.0, radiusNorm);
  let envelope = innerEdge * outerEdge * mix(1.0, 0.62, outward);

  let contrast = max(0.2, 1.0 + look.spare2);
  let lo = 0.50 - 0.16 / contrast;
  let hi = 0.50 + 0.21 / contrast;
  var smoke = clamp(pow(smoothstep(lo, hi, field), 1.0 + 0.9 * contrast) * envelope, 0.0, 1.0);

  let fieldN = clamp((field - (lo - 0.10)) / max(hi - lo + 0.26, 0.02), 0.0, 1.0);
  let emissivity = (mix(0.05, 1.0, pow(fieldN, 1.35)) + 2.2 * pow(fieldN, 5.0)) * envelope;

  let path = pow(grazing, 0.62);
  let thickness = mix(0.30, 0.85, radiusNorm);
  let opticalDepth = smoke * thickness * path * look.density * 0.95;
  let coverage = 1.0 - exp(-opticalDepth);

  // Site palette (dark navy -> Grind #1d4ed8 -> icy near-white-blue), not
  // the reference's copper/orange. See file header.
  let heat = pow(1.0 - radiusNorm, 1.25);
  var thermal = mix(vec3f(0.05, 0.11, 0.32), vec3f(0.114, 0.306, 0.847), smoothstep(0.03, 0.5, heat));

  let tangent = normalize(vec3f(-plane.y, 0.0, plane.x));
  let orbitalSpeed = min(0.64, 0.94 / sqrt(max(radius - G_HORIZON, 0.25)));
  let towardObserver = dot(tangent, -normalize(viewDirection));
  let beaming = pow(clamp(1.0 / (1.0 - orbitalSpeed * towardObserver), 0.72, 1.55), 1.5 * look.doppler);
  // Receding (redshifted) side warms toward the site's amber accent
  // instead of stopping at the crest's blue-white — see file header.
  let recede = smoothstep(1.0, 0.62, beaming);
  thermal = mix(thermal, vec3f(0.961, 0.620, 0.043), recede * 0.6);
  thermal = mix(thermal, vec3f(0.85, 0.93, 1.0), pow(heat, 2.2));

  let redshift = sqrt(max(1.0 - G_HORIZON / radius, 0.025));
  let facing = mix(0.82, 1.0, step(0.0, g.side));

  let flux = pow(clamp(G_ISCO / radius, 0.0, 1.0), 1.7);
  let core = 1.0 + 2.6 * pow(1.0 - radiusNorm, 5.0);

  let arcLift = max(0.0, 1.0 + look.spare0);
  let faceOn = smoothstep(0.16, 0.75, abs(viewDirection.y));
  let lift = 1.0 + 1.55 * arcLift * faceOn;
  let edgeGlow = 1.0 + 0.55 * smoothstep(6.0, 26.0, grazing);

  let source = thermal * beaming * redshift * facing * flux * lift * edgeGlow * core * emissivity;
  let emission = source * look.brightness * 1.35;

  var sample: DiskSample;
  sample.color = vec3f(emission);
  sample.alpha = coverage;
  return sample;
}
`;

  var HASH_WGSL = `
fn pcg3d(vIn: vec3u) -> vec3u {
  var v = vIn * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v = v ^ (v >> vec3u(16u));
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return v;
}

fn unitFloat(x: u32) -> f32 {
  return f32(x) * (1.0 / 4294967296.0);
}
`;

  // Recolored from warm-to-cool (blue-to-orange) to blue-white-only — same
  // "no orange in the sky next to a blue disk" rule as black-hole.js.
  var STARS_WGSL = HASH_WGSL + `
const STAR_INTENSITY: f32 = 1.9;
const ANCHOR_CELLS: f32 = 36.0;
const ANCHOR_FILL: f32 = 0.75;
const ANCHOR_RADIUS: f32 = 0.00110;
const ANCHOR_PEAK: f32 = 1.0;
const FIELD_CELLS: f32 = 93.0;
const FIELD_FILL: f32 = 0.75;
const FIELD_RADIUS: f32 = 0.00070;
const FIELD_PEAK: f32 = 0.45;
const DUST_CELLS: f32 = 151.0;
const DUST_FILL: f32 = 0.75;
const DUST_RADIUS: f32 = 0.00040;
const DUST_PEAK: f32 = 0.22;
const COUNT_SLOPE: f32 = 2.0;
const STAR_FLUX_AREA: f32 = 0.5385;
const MAX_PREFILTER_PIXELS: f32 = 4.0;
const STAR_WARM: vec3f = vec3f(0.95, 0.97, 1.0);
const STAR_COOL: vec3f = vec3f(0.85, 0.93, 1.05);

struct StarLook {
  brightness: f32, density: f32, contrast: f32, warmth: f32, twinkle: f32,
}

fn faceCoords(direction: vec3f) -> vec3f {
  let magnitude = abs(direction);
  if (magnitude.x >= magnitude.y && magnitude.x >= magnitude.z) {
    return vec3f(direction.yz / magnitude.x, select(1.0, 0.0, direction.x > 0.0));
  }
  if (magnitude.y >= magnitude.z) {
    return vec3f(direction.xz / magnitude.y, select(3.0, 2.0, direction.y > 0.0));
  }
  return vec3f(direction.xy / magnitude.z, select(5.0, 4.0, direction.z > 0.0));
}

fn faceProject(direction: vec3f, axis: i32) -> vec2f {
  if (axis == 0) { return direction.yz / abs(direction.x); }
  if (axis == 1) { return direction.xz / abs(direction.y); }
  return direction.xy / abs(direction.z);
}

struct SkyFilter {
  inverseJacobian: mat2x2f,
  pixelsPerFace: f32,
  faceMajor: f32,
}

fn skyFilter(direction: vec3f, axis: i32, ddx: vec3f, ddy: vec3f) -> SkyFilter {
  let base = faceProject(direction, axis);
  let jx = faceProject(direction + ddx, axis) - base;
  let jy = faceProject(direction + ddy, axis) - base;
  let determinant = jx.x * jy.y - jx.y * jy.x;
  let safeDeterminant = select(determinant, 1.0e-24, abs(determinant) < 1.0e-24);
  let inverse = mat2x2f(vec2f(jy.y, -jx.y), vec2f(-jy.x, jx.x)) * (1.0 / safeDeterminant);
  var prefilter: SkyFilter;
  prefilter.inverseJacobian = inverse;
  prefilter.pixelsPerFace = 1.0 / sqrt(max(abs(determinant), 1.0e-24));
  prefilter.faceMajor = max(length(jx), length(jy));
  return prefilter;
}

struct SkyState {
  brightness: f32, rangePower: f32, meanFlux: f32, warmth: f32,
  twinkle: f32, time: f32, fillScale: f32, radiusScale: f32,
}

fn resolveSky(look: StarLook, face: vec2f, time: f32) -> SkyState {
  let range = clamp(look.contrast, 1.0, 512.0);
  let rangePower = range * range;
  let compression = 1.0 + dot(face, face);
  let root = sqrt(compression);
  var sky: SkyState;
  sky.brightness = max(0.0, look.brightness) * STAR_INTENSITY;
  sky.rangePower = rangePower;
  sky.meanFlux = COUNT_SLOPE / (range + COUNT_SLOPE - 1.0);
  sky.warmth = clamp(look.warmth, 0.0, 1.0);
  sky.twinkle = clamp(look.twinkle, 0.0, 1.0);
  sky.time = time;
  sky.fillScale = max(0.0, look.density) / (compression * root);
  sky.radiusScale = sqrt(compression * root);
  return sky;
}

struct Species {
  cells: f32, fill: f32, peak: f32, faceRadius: f32, radiusPixels: f32, gain: f32,
}

fn resolveSpecies(cells: f32, fill: f32, peak: f32, angularRadius: f32, sky: SkyState, prefilter: SkyFilter) -> Species {
  let faceRadius = angularRadius * sky.radiusScale;
  let starPixels = faceRadius * prefilter.pixelsPerFace;
  var species: Species;
  species.cells = cells;
  species.fill = clamp(fill * sky.fillScale, 0.0, 1.0);
  species.peak = peak * sky.brightness;
  species.faceRadius = faceRadius;
  species.radiusPixels = clamp(starPixels, 1.0, MAX_PREFILTER_PIXELS);
  species.gain = min(1.0, starPixels * starPixels);
  return species;
}

fn starPoint(cell: vec2f, grid: vec2f, faceIndex: i32, seed: i32, species: Species, sky: SkyState, prefilter: SkyFilter) -> vec3f {
  let hashed = pcg3d(bitcast<vec3u>(vec3i(vec2i(cell), faceIndex * 131 + seed)));
  let presence = unitFloat(hashed.x);
  if (presence > species.fill) { return vec3f(0.0); }
  let jitter = vec2f(unitFloat(hashed.y), unitFloat(hashed.z)) - vec2f(0.5);
  let center = cell + vec2f(0.5) + jitter * 0.8;
  let offsetPixels = prefilter.inverseJacobian * ((grid - center) / species.cells);
  let falloff = 1.0 - smoothstep(0.0, species.radiusPixels, length(offsetPixels));
  let uniform01 = presence / max(species.fill, 1.0e-6);
  let flux = inverseSqrt(1.0 + uniform01 * (sky.rangePower - 1.0));
  let tint = mix(vec3f(1.0), mix(STAR_WARM, STAR_COOL, unitFloat(hashed.y ^ hashed.z)), sky.warmth);
  let phase = unitFloat(hashed.y) * 6.2831853;
  let shimmer = 1.0 + sky.twinkle * 0.06 * sin(sky.time * (0.35 + unitFloat(hashed.z) * 0.4) + phase);
  return tint * (falloff * falloff * species.peak * flux * shimmer * species.gain);
}

fn starSpecies(face: vec3f, seed: i32, species: Species, sky: SkyState, prefilter: SkyFilter) -> vec3f {
  let faceIndex = i32(face.z);
  let grid = face.xy * species.cells;
  let total = starPoint(floor(grid), grid, faceIndex, seed, species, sky, prefilter);
  let extent = species.faceRadius * species.cells;
  let mean = species.peak * sky.meanFlux * species.fill * STAR_FLUX_AREA * extent * extent;
  let meanTint = mix(vec3f(1.0), 0.5 * (STAR_WARM + STAR_COOL), sky.warmth);
  let cellsPerPixel = species.cells * prefilter.faceMajor;
  return mix(total, meanTint * mean, smoothstep(1.0, 3.0, cellsPerPixel));
}

fn shadeStars(direction: vec3f, look: StarLook, time: f32, ddx: vec3f, ddy: vec3f) -> vec3f {
  let d = normalize(direction);
  let face = faceCoords(d);
  let prefilter = skyFilter(d, i32(face.z) / 2, ddx, ddy);
  let sky = resolveSky(look, face.xy, time);
  return starSpecies(face, 17, resolveSpecies(ANCHOR_CELLS, ANCHOR_FILL, ANCHOR_PEAK, ANCHOR_RADIUS, sky, prefilter), sky, prefilter)
       + starSpecies(face, 71, resolveSpecies(FIELD_CELLS, FIELD_FILL, FIELD_PEAK, FIELD_RADIUS, sky, prefilter), sky, prefilter)
       + starSpecies(face, 149, resolveSpecies(DUST_CELLS, DUST_FILL, DUST_PEAK, DUST_RADIUS, sky, prefilter), sky, prefilter);
}
`;

  var SHADE_FRAG = GBUFFER_WGSL + DISK_WGSL + STARS_WGSL + `
struct Shade {
  resolution: vec2f, time: f32, diskOuter: f32, sceneYaw: f32, centerFade: f32,
}

const DISK_GAIN: f32 = 1.35;

fn centeredCopyFade(uvY: f32) -> f32 {
  let distanceFromCenter = abs(uvY - 0.5);
  return pow(smoothstep(0.08, 0.38, distanceFromCenter), 2.2);
}

@group(0) @binding(0) var<uniform> shade: Shade;
@group(0) @binding(1) var gHit1: texture_2d<f32>;
@group(0) @binding(2) var gHit2: texture_2d<f32>;
@group(0) @binding(3) var gSky: texture_2d<f32>;
@group(0) @binding(4) var gView: texture_2d<f32>;
@group(0) @binding(5) var<uniform> disk: DiskLook;
@group(0) @binding(6) var<uniform> stars: StarLook;
@group(0) @binding(7) var noiseVolume: texture_3d<f32>;
@group(0) @binding(8) var noiseSampler: sampler;
@group(0) @binding(9) var gAa: texture_2d<f32>;
@group(0) @binding(10) var gAaGeom: texture_2d<f32>;

fn diskFootprintAxes(g: GBufferSample) -> vec2f {
  let angular = max(disk.stretch, 0.05);
  let noiseAngle = g.diskPolar.y - min(shade.time, SHEAR_PERIOD * 0.5) * (disk.speed * 0.55 / pow(g.diskPolar.x, 1.5));
  let noiseCoords = vec3f(cos(noiseAngle) * angular, sin(noiseAngle) * angular, g.diskPolar.x * disk.detail);
  return vec2f(max(fwidth(noiseCoords.x), fwidth(noiseCoords.y)), fwidth(noiseCoords.z));
}

fn diskFootprint(axes: vec2f) -> f32 {
  return min(max(axes.x, axes.y), 4.0);
}

fn rotateY(v: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
}

fn wrapAngle(angle: f32) -> f32 {
  return angle - G_TAU * floor((angle + G_PI) / G_TAU);
}

fn rotateSample(g: GBufferSample, angle: f32) -> GBufferSample {
  var rotated = g;
  rotated.position = rotateY(g.position, angle);
  rotated.viewDirection = rotateY(g.viewDirection, angle);
  rotated.rayDirection = rotateY(g.rayDirection, angle);
  let azimuth = wrapAngle(g.diskPolar.y - angle);
  rotated.diskPolar = vec2f(g.diskPolar.x, azimuth);
  rotated.diskUv = vec2f(g.diskUv.x, (azimuth + G_PI) / G_TAU);
  return rotated;
}

fn rotateLayers(layers: GBufferLayers, angle: f32) -> GBufferLayers {
  var rotated: GBufferLayers;
  rotated.front = rotateSample(layers.front, angle);
  rotated.back = rotateSample(layers.back, angle);
  return rotated;
}

const AA_TAPS: i32 = 6;
const AA_SPAN_MIN: f32 = 0.15;

fn shadeFront(g: GBufferSample, footprint: f32, angularFootprint: f32) -> DiskSample {
  let annulus = max(shade.diskOuter - G_ISCO, 0.001);
  let spanWorld = g.span * annulus;
  if (g.span <= AA_SPAN_MIN) {
    return shadeDisk(g, disk, shade.time, footprint, noiseVolume, noiseSampler);
  }
  let tapFootprint = min(max(angularFootprint, max(disk.detail, 0.05) * (spanWorld / f32(AA_TAPS))), 4.0);
  let step = spanWorld / f32(AA_TAPS);
  let start = g.diskPolar.x - spanWorld * 0.5;
  var sumEmission = vec3f(0.0);
  var sumAlpha = 0.0;
  var taps = 0.0;
  for (var i = 0; i < AA_TAPS; i++) {
    let radius = start + (f32(i) + 0.5) * step;
    if (radius < G_ISCO || radius > shade.diskOuter) { continue; }
    let tap = shadeDisk(sampleAtRadius(g, radius, shade.diskOuter), disk, shade.time, tapFootprint, noiseVolume, noiseSampler);
    sumEmission += tap.color * tap.alpha;
    sumAlpha += tap.alpha;
    taps += 1.0;
  }
  if (taps < 0.5) {
    return shadeDisk(g, disk, shade.time, footprint, noiseVolume, noiseSampler);
  }
  var sample: DiskSample;
  let meanAlpha = sumAlpha / taps;
  sample.alpha = meanAlpha;
  sample.color = select(vec3f(0.0), (sumEmission / taps) / max(meanAlpha, 1e-6), meanAlpha > 1e-6);
  return sample;
}

fn emptyDiskSample() -> DiskSample {
  var sample: DiskSample;
  sample.color = vec3f(0.0);
  sample.alpha = 0.0;
  return sample;
}

fn compositeDisk(under: vec3f, sample: DiskSample) -> vec3f {
  return sample.color * sample.alpha * DISK_GAIN + under * (1.0 - sample.alpha);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let dimensions = vec2f(textureDimensions(gHit1, 0));
  let texel = vec2i(clamp(uv * dimensions, vec2f(0.0), dimensions - vec2f(1.0)));

  let aa = textureLoad(gAa, texel, 0).xy;
  let aaGeom = textureLoad(gAaGeom, texel, 0);

  let baked = decodeGBuffer(
    textureLoad(gHit1, texel, 0).xy, textureLoad(gHit2, texel, 0).xy,
    textureLoad(gSky, texel, 0), textureLoad(gView, texel, 0),
    shade.diskOuter, aa, aaGeom,
  );

  let frontAxes = diskFootprintAxes(baked.front);
  let backAxes = diskFootprintAxes(baked.back);
  let frontFootprint = diskFootprint(frontAxes);
  let backFootprint = diskFootprint(backAxes);

  let bakedRayDirection = baked.front.rayDirection;
  let skyDdx = dpdx(bakedRayDirection);
  let skyDdy = dpdy(bakedRayDirection);

  let layers = rotateLayers(baked, -shade.sceneYaw);
  let g = layers.front;
  let skyDdxRotated = rotateY(skyDdx, -shade.sceneYaw);
  let skyDdyRotated = rotateY(skyDdy, -shade.sceneYaw);

  var background = vec3f(0.0);
  if (!g.isBlackHole && g.escaped) {
    background = shadeStars(g.rayDirection, stars, shade.time, skyDdxRotated, skyDdyRotated);
  }

  var backSample = emptyDiskSample();
  var frontSample = emptyDiskSample();
  if (layers.back.isHit) {
    backSample = shadeDisk(layers.back, disk, shade.time, backFootprint, noiseVolume, noiseSampler);
  }
  if (layers.front.isHit) {
    frontSample = shadeFront(layers.front, frontFootprint, frontAxes.x);
    frontSample.alpha *= layers.front.coverage;
  }

  var color = background;
  color = compositeDisk(color, backSample);
  color = compositeDisk(color, frontSample);

  let centerMask = mix(1.0, centeredCopyFade(uv.y), clamp(shade.centerFade, 0.0, 1.0));
  color *= centerMask;

  return vec4f(color, 1.0);
}
`;

  var BLOOM_FRAG = `
struct Bloom {
  sourceSize: vec2f, direction: vec2f, params: vec4f,
}
@group(0) @binding(0) var<uniform> bloom: Bloom;
@group(0) @binding(1) var source: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;

fn softThreshold(color: vec3f) -> vec3f {
  let threshold = bloom.params.x;
  if (threshold <= 0.0) { return color; }
  let brightness = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  let knee = max(min(bloom.params.y, threshold), 0.000001);
  let soft = clamp(brightness - threshold + knee, 0.0, 2.0 * knee);
  let softContribution = soft * soft / (4.0 * knee + 0.0001);
  let contribution = max(brightness - threshold, softContribution) / max(brightness, 0.0001);
  return color * contribution;
}

fn downsample(uv: vec2f) -> vec3f {
  let texel = 1.0 / bloom.sourceSize;
  let offset = texel * 0.5;
  let color = (
    textureSample(source, linearSampler, uv + vec2f(-offset.x, -offset.y)).rgb +
    textureSample(source, linearSampler, uv + vec2f( offset.x, -offset.y)).rgb +
    textureSample(source, linearSampler, uv + vec2f(-offset.x,  offset.y)).rgb +
    textureSample(source, linearSampler, uv + vec2f( offset.x,  offset.y)).rgb
  ) * 0.25;
  return softThreshold(color);
}

fn gaussianBlur(uv: vec2f) -> vec3f {
  let sigma = max(bloom.params.z, 0.5);
  let inverseTwoSigmaSquared = 0.5 / (sigma * sigma);
  let w0 = 1.0;
  let w1 = exp(-1.0 * inverseTwoSigmaSquared);
  let w2 = exp(-4.0 * inverseTwoSigmaSquared);
  let w3 = exp(-9.0 * inverseTwoSigmaSquared);
  let w4 = exp(-16.0 * inverseTwoSigmaSquared);
  let pair12 = w1 + w2;
  let pair34 = w3 + w4;
  let offset12 = (w1 + 2.0 * w2) / max(pair12, 0.000001);
  let offset34 = (3.0 * w3 + 4.0 * w4) / max(pair34, 0.000001);
  let normalization = w0 + 2.0 * (pair12 + pair34);
  let texel = bloom.direction / bloom.sourceSize;
  var color = textureSample(source, linearSampler, uv).rgb * w0;
  color += textureSample(source, linearSampler, uv + texel * offset12).rgb * pair12;
  color += textureSample(source, linearSampler, uv - texel * offset12).rgb * pair12;
  color += textureSample(source, linearSampler, uv + texel * offset34).rgb * pair34;
  color += textureSample(source, linearSampler, uv - texel * offset34).rgb * pair34;
  return color / normalization;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  var color: vec3f;
  if (bloom.params.w > 0.5) { color = gaussianBlur(uv); } else { color = downsample(uv); }
  return vec4f(color, 1.0);
}
`;

  var COMPOSITE_FRAG = `
struct Composite {
  params: vec4f,
}
@group(0) @binding(0) var<uniform> composite: Composite;
@group(0) @binding(1) var scene: texture_2d<f32>;
@group(0) @binding(2) var bloomNear: texture_2d<f32>;
@group(0) @binding(3) var bloomMedium: texture_2d<f32>;
@group(0) @binding(4) var bloomFar: texture_2d<f32>;
@group(0) @binding(5) var linearSampler: sampler;

const EXPOSURE: f32 = 1.15;

fn aces(x: vec3f) -> vec3f {
  let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
  return clamp((x * (a * x + vec3f(b))) / (x * (c * x + vec3f(d)) + vec3f(e)), vec3f(0.0), vec3f(1.0));
}

fn tonemap(linearColor: vec3f, uv: vec2f) -> vec3f {
  var color = aces(linearColor * EXPOSURE);
  let centered = uv - vec2f(0.5);
  let vignette = 1.0 - smoothstep(0.55, 1.15, length(centered) * 1.6);
  color *= mix(0.72, 1.0, vignette);
  color = pow(color, vec3f(1.0 / 2.2));
  return color;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let sceneColor = textureSample(scene, linearSampler, uv).rgb;
  let bloom =
    textureSample(bloomNear, linearSampler, uv).rgb * 0.50 +
    textureSample(bloomMedium, linearSampler, uv).rgb * 0.32 +
    textureSample(bloomFar, linearSampler, uv).rgb * 0.18;
  let hdr = sceneColor + bloom * composite.params.x;
  return vec4f(tonemap(hdr, uv), 1.0);
}
`;

  // ---------------------------------------------------------------------
  // CPU-side deterministic noise lattice (feeds the 3D noise texture the
  // disk shader samples) — same hash as the reference's noise-volume.mjs,
  // built once at init, not per frame.
  // ---------------------------------------------------------------------
  var NOISE_SIZE = 64;
  var fr = Math.fround;
  function fract(v) { return fr(v - Math.floor(v)); }
  function hash31(x, y, z) {
    var K0 = fr(0.1031), K1 = fr(0.103), K2 = fr(0.0973), K3 = fr(33.33);
    var qx = fract(fr(x * K0));
    var qy = fract(fr(y * K1));
    var qz = fract(fr(z * K2));
    var d = fr(fr(fr(qx * fr(qy + K3)) + fr(qy * fr(qz + K3))) + fr(qz * fr(qx + K3)));
    qx = fr(qx + d); qy = fr(qy + d); qz = fr(qz + d);
    return fract(fr(fr(qx + qy) * qz));
  }
  function latticeCoord(index, size) {
    return index < size / 2 ? index : index - size;
  }
  function buildNoiseVolume(size, seed) {
    var data = new Uint8Array(size * size * size);
    var offset = seed * 1024;
    var cursor = 0;
    for (var z = 0; z < size; z++) {
      var pz = latticeCoord(z, size) + offset;
      for (var y = 0; y < size; y++) {
        var py = latticeCoord(y, size);
        for (var x = 0; x < size; x++) {
          data[cursor++] = Math.min(255, Math.round(hash31(latticeCoord(x, size), py, pz) * 255));
        }
      }
    }
    return data;
  }

  // ---------------------------------------------------------------------
  // Raw WebGPU host layer — replaces the reference's "vgpu" wrapper.
  // ---------------------------------------------------------------------
  var device, context, canvasFormat, linearSampler, noiseSampler, noiseVolumeView;
  var pipelines = {};
  var geometryBuf, shadeBuf, diskBuf, starsBuf, compositeBuf;
  var bakeBindGroup, refineBindGroup, shadeBindGroup, compositeBindGroup;
  var bloomStages = [];
  var targets = {};
  var disposed = false;
  var forceBake = true;
  var canvasVisible = true;
  var documentVisible = !document.hidden;
  var rafHandle = 0;
  var startTime = 0;
  var lastFrameAt;
  var pointerXNormalized = 0;
  var currentSceneYaw = 0;
  var lastYawAt;
  var resizeFrame = 0;
  var pendingSize = null;

  var BLOOM_STAGES = [
    { source: "scene", target: "bloom0", dir: [0, 0], threshold: true },
    { source: "bloom0", target: "bloomPing0", dir: [1, 0], threshold: false },
    { source: "bloomPing0", target: "bloom0", dir: [0, 1], threshold: false },
    { source: "bloom0", target: "bloom1", dir: [0, 0], threshold: false },
    { source: "bloom1", target: "bloomPing1", dir: [1, 0], threshold: false },
    { source: "bloomPing1", target: "bloom1", dir: [0, 1], threshold: false },
    { source: "bloom1", target: "bloom2", dir: [0, 0], threshold: false },
    { source: "bloom2", target: "bloomPing2", dir: [1, 0], threshold: false },
    { source: "bloomPing2", target: "bloom2", dir: [0, 1], threshold: false },
  ];

  function fail(error) {
    if (error) console.error("black-hole-lite:", error);
    disposed = true;
  }

  function makeModule(fragSource) {
    return device.createShaderModule({ code: FULLSCREEN_VERT + fragSource });
  }

  function makePipeline(fragSource, formats) {
    var module = makeModule(fragSource);
    return device.createRenderPipeline({
      layout: "auto",
      vertex: { module: module, entryPoint: "vs_main" },
      fragment: { module: module, entryPoint: "fs_main", targets: formats.map(function (f) { return { format: f }; }) },
      primitive: { topology: "triangle-list" },
    });
  }

  function makeTexture(w, h, format, dim) {
    var width = Math.max(1, Math.round(w));
    var height = Math.max(1, Math.round(h));
    var texture = device.createTexture({
      size: [width, height],
      format: format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    return { texture: texture, view: texture.createView(), width: width, height: height, format: format };
  }

  function destroyTex(t) {
    if (t) t.texture.destroy();
  }

  function runPass(encoder, colorTargets, pipeline, bindGroup) {
    var pass = encoder.beginRenderPass({
      colorAttachments: colorTargets.map(function (t) {
        return { view: t.view, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" };
      }),
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
  }

  function rebuildTargets(w, h) {
    var old = targets;
    var full = [Math.max(1, Math.round(w)), Math.max(1, Math.round(h))];
    var half = [Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2))];
    var quarter = [Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 4))];
    var eighth = [Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 8))];

    var next = {
      hit1: makeTexture(full[0], full[1], "rg32float"),
      hit2: makeTexture(full[0], full[1], "rg32float"),
      sky: makeTexture(full[0], full[1], "rgba16float"),
      view: makeTexture(full[0], full[1], "rgba16float"),
      aaCoverage: makeTexture(full[0], full[1], "rg8unorm"),
      aaGeometry: makeTexture(full[0], full[1], "rgba16float"),
      scene: makeTexture(full[0], full[1], "rgba16float"),
      bloom0: makeTexture(half[0], half[1], "rgba16float"),
      bloomPing0: makeTexture(half[0], half[1], "rgba16float"),
      bloom1: makeTexture(quarter[0], quarter[1], "rgba16float"),
      bloomPing1: makeTexture(quarter[0], quarter[1], "rgba16float"),
      bloom2: makeTexture(eighth[0], eighth[1], "rgba16float"),
      bloomPing2: makeTexture(eighth[0], eighth[1], "rgba16float"),
    };
    targets = next;

    refineBindGroup = device.createBindGroup({
      layout: pipelines.refine.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: geometryBuf } },
        { binding: 1, resource: targets.hit1.view },
        { binding: 2, resource: targets.sky.view },
      ],
    });

    shadeBindGroup = device.createBindGroup({
      layout: pipelines.shade.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: shadeBuf } },
        { binding: 1, resource: targets.hit1.view },
        { binding: 2, resource: targets.hit2.view },
        { binding: 3, resource: targets.sky.view },
        { binding: 4, resource: targets.view.view },
        { binding: 5, resource: { buffer: diskBuf } },
        { binding: 6, resource: { buffer: starsBuf } },
        { binding: 7, resource: noiseVolumeView },
        { binding: 8, resource: noiseSampler },
        { binding: 9, resource: targets.aaCoverage.view },
        { binding: 10, resource: targets.aaGeometry.view },
      ],
    });

    bloomStages = BLOOM_STAGES.map(function (stage) {
      var buf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      var sourceTarget = targets[stage.source];
      var group = device.createBindGroup({
        layout: pipelines.bloom.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: buf } },
          { binding: 1, resource: sourceTarget.view },
          { binding: 2, resource: linearSampler },
        ],
      });
      var isBlur = stage.dir[0] !== 0 || stage.dir[1] !== 0;
      var thresholdValue = stage.threshold ? Math.max(0, settings.bloom.threshold) : -1;
      device.queue.writeBuffer(buf, 0, new Float32Array([
        sourceTarget.width, sourceTarget.height,
        stage.dir[0], stage.dir[1],
        thresholdValue, Math.max(0.0001, settings.bloom.knee), Math.max(0.1, settings.bloom.radius), isBlur ? 1 : 0,
      ]));
      return { buffer: buf, bindGroup: group, target: targets[stage.target] };
    });

    compositeBindGroup = device.createBindGroup({
      layout: pipelines.composite.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: compositeBuf } },
        { binding: 1, resource: targets.scene.view },
        { binding: 2, resource: targets.bloom0.view },
        { binding: 3, resource: targets.bloom1.view },
        { binding: 4, resource: targets.bloom2.view },
        { binding: 5, resource: linearSampler },
      ],
    });
    device.queue.writeBuffer(compositeBuf, 0, new Float32Array([Math.max(0, settings.bloom.strength), 0, 0, 0]));

    if (old.hit1) {
      ["hit1", "hit2", "sky", "view", "aaCoverage", "aaGeometry", "scene", "bloom0", "bloomPing0", "bloom1", "bloomPing1", "bloom2", "bloomPing2"].forEach(function (key) {
        destroyTex(old[key]);
      });
    }
    forceBake = true;
  }

  function writeGeometry(w, h) {
    device.queue.writeBuffer(geometryBuf, 0, new Float32Array([
      w, h, 0 /* yaw baked at 0, rotated per-frame in shade */, settings.cameraY,
      settings.distance, settings.diskRadius, settings.fov, settings.centerX, settings.centerY, settings.cameraRoll,
    ]));
  }

  function applyResize() {
    resizeFrame = 0;
    if (disposed || !pendingSize) return;
    var size = pendingSize;
    pendingSize = null;
    canvas.width = size.width;
    canvas.height = size.height;
    rebuildTargets(size.width, size.height);
    writeGeometry(size.width, size.height);
  }

  function scheduleResize(w, h) {
    if (w <= 0 || h <= 0) return;
    pendingSize = { width: w, height: h };
    if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize);
  }

  function measure() {
    // Render at 1 CSS pixel per device pixel (not devicePixelRatio) — a
    // real resolution cut, softer on retina screens, meaningfully cheaper
    // to shade every frame. See file header.
    scheduleResize(canvas.clientWidth, canvas.clientHeight);
  }

  function advanceSceneYaw(now) {
    if (settings.mouseYaw <= 0 || !HOVER) { currentSceneYaw = 0; lastYawAt = now; return 0; }
    var dt = lastYawAt === undefined ? 0 : Math.min(Math.max((now - lastYawAt) / 1000, 0), 0.1);
    lastYawAt = now;
    var target = pointerXNormalized * settings.mouseYaw;
    currentSceneYaw += (target - currentSceneYaw) * (1 - Math.exp(-dt / 0.325));
    return currentSceneYaw;
  }

  function drawFrame(now) {
    var runBake = forceBake;
    forceBake = false;
    var t = startTime === 0 ? 0 : (now - startTime) / 1000;
    var sceneYaw = advanceSceneYaw(now);
    device.queue.writeBuffer(shadeBuf, 0, new Float32Array([canvas.width, canvas.height, t, settings.diskRadius, sceneYaw, settings.centerFade]));

    var encoder = device.createCommandEncoder();
    if (runBake) {
      runPass(encoder, [targets.hit1, targets.hit2, targets.sky, targets.view], pipelines.bake, bakeBindGroup);
      runPass(encoder, [targets.aaCoverage, targets.aaGeometry], pipelines.refine, refineBindGroup);
    }
    runPass(encoder, [targets.scene], pipelines.shade, shadeBindGroup);
    bloomStages.forEach(function (stage) {
      runPass(encoder, [stage.target], pipelines.bloom, stage.bindGroup);
    });
    runPass(encoder, [{ view: context.getCurrentTexture().createView() }], pipelines.composite, compositeBindGroup);
    device.queue.submit([encoder.finish()]);
  }

  function reconcileLoop() {
    var shouldRun = !disposed && documentVisible && canvasVisible;
    if (shouldRun === !!rafHandle) return;
    if (shouldRun) {
      lastFrameAt = undefined;
      lastYawAt = undefined;
      rafHandle = requestAnimationFrame(tick);
    } else if (rafHandle) {
      cancelAnimationFrame(rafHandle);
      rafHandle = 0;
    }
  }

  function tick(now) {
    if (disposed) return;
    rafHandle = requestAnimationFrame(tick);
    if (!targets.scene) return;
    try {
      drawFrame(now);
    } catch (error) {
      fail(error);
    }
  }

  function toTarget(clientX) {
    var width = Math.max(window.innerWidth, 1);
    pointerXNormalized = Math.min(1, Math.max(-1, (clientX / width) * 2 - 1));
  }

  function recenterPointer() {
    pointerXNormalized = 0;
  }

  function installPointer() {
    if (!HOVER) return;
    window.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse") return;
      toTarget(event.clientX);
    }, { passive: true });
    window.addEventListener("pointerout", function (event) {
      if (event.relatedTarget === null) recenterPointer();
    }, { passive: true });
    window.addEventListener("blur", recenterPointer);
  }

  async function init() {
    var adapter = await navigator.gpu.requestAdapter();
    if (!adapter || disposed) return fail();
    device = await adapter.requestDevice();
    if (disposed) return;
    device.addEventListener("uncapturederror", function (event) {
      console.error("black-hole-lite device error:", event.error.message);
    });

    context = canvas.getContext("webgpu");
    if (!context) return fail();
    canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device: device, format: canvasFormat, alphaMode: "opaque" });

    linearSampler = device.createSampler({ minFilter: "linear", magFilter: "linear" });
    noiseSampler = device.createSampler({
      minFilter: "linear", magFilter: "linear",
      addressModeU: "repeat", addressModeV: "repeat", addressModeW: "repeat",
    });

    var noiseTexture = device.createTexture({
      size: [NOISE_SIZE, NOISE_SIZE, NOISE_SIZE],
      dimension: "3d",
      format: "r8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture: noiseTexture },
      buildNoiseVolume(NOISE_SIZE, 13),
      { bytesPerRow: NOISE_SIZE, rowsPerImage: NOISE_SIZE },
      { width: NOISE_SIZE, height: NOISE_SIZE, depthOrArrayLayers: NOISE_SIZE },
    );
    noiseVolumeView = noiseTexture.createView({ dimension: "3d" });

    pipelines.bake = makePipeline(BAKE_FRAG, ["rg32float", "rg32float", "rgba16float", "rgba16float"]);
    pipelines.refine = makePipeline(REFINE_FRAG, ["rg8unorm", "rgba16float"]);
    pipelines.shade = makePipeline(SHADE_FRAG, ["rgba16float"]);
    pipelines.bloom = makePipeline(BLOOM_FRAG, ["rgba16float"]);
    pipelines.composite = makePipeline(COMPOSITE_FRAG, [canvasFormat]);

    geometryBuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    shadeBuf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    diskBuf = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    starsBuf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    compositeBuf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    device.queue.writeBuffer(diskBuf, 0, new Float32Array([
      settings.disk.brightness, settings.disk.speed, settings.disk.stretch, settings.disk.detail,
      settings.disk.turbulence, settings.disk.density, settings.disk.doppler, settings.disk.cloudScale,
      settings.disk.cloudSpeed, settings.disk.cloudStrength,
      settings.disk.spare0, settings.disk.spare1, settings.disk.spare2, settings.disk.spare3,
    ]));
    device.queue.writeBuffer(starsBuf, 0, new Float32Array([
      settings.stars.brightness, settings.stars.density, settings.stars.contrast, settings.stars.warmth, settings.stars.twinkle,
    ]));

    bakeBindGroup = device.createBindGroup({
      layout: pipelines.bake.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: geometryBuf } }],
    });

    installPointer();

    var ro = new ResizeObserver(measure);
    ro.observe(canvas);

    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function (entries) {
        var last = entries[entries.length - 1];
        canvasVisible = last ? last.isIntersecting : canvasVisible;
        reconcileLoop();
      }, { threshold: 0 });
      io.observe(canvas);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) recenterPointer();
      documentVisible = !document.hidden;
      reconcileLoop();
    });

    measure();
    startTime = performance.now();
    reconcileLoop();
    requestAnimationFrame(function () {
      canvas.style.opacity = "1";
    });
  }

  canvas.style.opacity = "0";
  canvas.style.transition = "opacity 500ms ease";

  init().catch(fail);
})();
