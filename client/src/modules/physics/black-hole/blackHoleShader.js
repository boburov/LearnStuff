// Schwarzschild black hole, ray traced per pixel.
//
// Units are geometric with M = 1, so the event horizon sits at r = 2 (the
// Schwarzschild radius), the photon sphere at r = 3 and the innermost stable
// circular orbit at r = 6. Light is integrated backwards from the eye: for a
// null geodesic the bending reduces to a = -3/2 · h² · r̂ / r⁵ where h is the
// conserved angular momentum of the ray, which is cheap enough to run per
// pixel and still reproduces lensing, the photon ring and the Einstein ring.

export const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform vec3 uCamPos;
uniform mat3 uCamBasis;   // right, up, forward
uniform float uTanHalfFov;
uniform float uTime;

uniform float uDiskInner;
uniform float uDiskOuter;
uniform float uDiskBrightness;
uniform float uDiskOpacity;
uniform float uTurbulence;
uniform float uDiskSpeed;
uniform float uExposure;
uniform float uStarBrightness;
uniform float uLensing;   // 1 = real geodesics, 0 = straight lines
uniform float uDoppler;   // 1 = beaming and colour shift on
uniform float uMarkers;   // 1 = draw the photon sphere and ISCO rings
uniform int   uSteps;

const float RS = 2.0;        // event horizon, M = 1
const float PHOTON_R = 3.0;  // photon sphere
const float ISCO_R = 6.0;    // innermost stable circular orbit
const float SKY_R = 90.0;    // far enough away to count as escaped

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise2(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

// Rough blackbody ramp: the inner disk runs hotter, so it reads blue-white,
// and the outer edge cools through orange into deep red.
vec3 temperatureColor(float t) {
  vec3 cold = vec3(1.0, 0.22, 0.05);
  vec3 warm = vec3(1.0, 0.62, 0.18);
  vec3 hot = vec3(1.0, 0.94, 0.72);
  vec3 blue = vec3(0.78, 0.89, 1.0);
  vec3 c = mix(cold, warm, smoothstep(0.0, 0.45, t));
  c = mix(c, hot, smoothstep(0.4, 0.8, t));
  return mix(c, blue, smoothstep(0.82, 1.0, t));
}

vec3 starField(vec3 dir) {
  vec3 color = vec3(0.0);

  // Three cell sizes so the sky has a few bright stars over many faint ones.
  for (int layer = 0; layer < 3; layer++) {
    float scale = 90.0 + float(layer) * 110.0;
    vec3 p = dir * scale;
    vec3 cell = floor(p);
    vec3 f = fract(p) - 0.5;
    float seed = hash31(cell + float(layer) * 37.0);
    if (seed > 0.94) {
      vec3 offset = vec3(hash31(cell + 3.1), hash31(cell + 7.7), hash31(cell + 11.3)) - 0.5;
      float d = length(f - offset * 0.7);
      float star = smoothstep(0.16, 0.0, d);
      float mag = pow(fract(seed * 91.7), 6.0);
      vec3 tint = mix(vec3(0.75, 0.84, 1.0), vec3(1.0, 0.86, 0.68), fract(seed * 13.3));
      color += tint * star * (0.35 + mag * 3.0);
    }
  }

  // A faint band of unresolved stars, so the sky is not a flat black.
  float band = exp(-abs(dir.y * 2.6));
  color += vec3(0.022, 0.026, 0.045) * band;
  color += vec3(0.005, 0.006, 0.010);
  return color * uStarBrightness;
}

// One crossing of the equatorial plane inside the disk annulus.
vec3 diskSample(vec3 hit, vec3 rayDir, out float alpha) {
  float r = length(hit.xz);
  alpha = 0.0;

  // The marker rings sit at fixed radii, so they are drawn whether or not the
  // disk reaches that far in - the photon sphere is inside most disks.
  vec3 marks = vec3(0.0);
  float markAlpha = 0.0;
  if (uMarkers > 0.5) {
    float photon = smoothstep(0.07, 0.0, abs(r - PHOTON_R));
    float isco = smoothstep(0.07, 0.0, abs(r - ISCO_R));
    // Kept dim on purpose: bright enough to trace, dark enough to stay green
    // and blue instead of clipping to white.
    marks = vec3(0.16, 0.85, 0.38) * photon * 0.65 + vec3(0.32, 0.55, 1.0) * isco * 0.65;
    markAlpha = max(photon, isco) * 0.85;
  }

  if (r < uDiskInner || r > uDiskOuter) {
    alpha = markAlpha;
    return marks;
  }

  float span = max(uDiskOuter - uDiskInner, 0.001);
  float t = clamp((r - uDiskInner) / span, 0.0, 1.0);
  float heat = 1.0 - t;

  // Keplerian shear: inner rings sweep round faster than outer ones.
  float phi = atan(hit.z, hit.x);
  float omega = uDiskSpeed * pow(max(r, 0.6), -1.5);
  float swirl = phi + omega * uTime * 6.0;
  vec2 q = vec2(swirl * 2.4, r * 1.35 - omega * uTime * 1.2);
  float turb = fbm(q * 1.6) * 0.65 + fbm(q * 4.4) * 0.35;
  float density = mix(1.0, 0.35 + turb * 1.3, clamp(uTurbulence, 0.0, 1.0));

  // Fade both edges so the annulus has no hard rim.
  float edge = smoothstep(0.0, 0.12, t) * smoothstep(1.0, 0.86, t);
  float fall = pow(heat, 2.3) + 0.06;

  vec3 color = temperatureColor(heat) * (uDiskBrightness * fall * density);

  if (uDoppler > 0.5) {
    // Prograde orbital motion, Keplerian speed v = 1/sqrt(r) in units of c.
    vec3 vel = normalize(cross(vec3(0.0, 1.0, 0.0), hit)) / sqrt(max(r, 1.0));
    float beta = length(vel);
    float gamma = 1.0 / sqrt(max(1.0 - beta * beta, 0.02));
    // The ray runs eye -> disk, so -rayDir points back at the observer.
    float mu = dot(normalize(vel), -normalize(rayDir));
    float g = 1.0 / (gamma * (1.0 - beta * mu));
    // Gravitational redshift on top of the motion.
    g *= sqrt(max(1.0 - RS / max(r, RS + 0.01), 0.02));
    // Relativistic beaming: the side turning towards us brightens sharply.
    // The 1.4 only restores the average level the redshift factor removes, so
    // the toggle reads as asymmetry rather than as a dimmer switch.
    float boost = clamp(pow(g, 3.6), 0.04, 16.0);
    color *= boost * 1.4;
    // Approaching side shifts blue, receding side red.
    float shift = clamp((g - 1.0) * 1.8, -0.9, 0.9);
    color *= vec3(1.0 - shift * 0.5, 1.0 + shift * 0.04, 1.0 + shift * 0.62);
  }

  alpha = clamp(uDiskOpacity * edge * density * (0.35 + fall), 0.0, 1.0);

  color += marks;
  alpha = max(alpha, markAlpha);

  return color;
}

vec3 tonemap(vec3 c) {
  c *= uExposure;
  // ACES-ish filmic curve; keeps the hot inner disk from clipping to flat white.
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}

void main() {
  vec2 ndc = (vUv * 2.0 - 1.0);
  ndc.x *= uResolution.x / uResolution.y;

  vec3 dir = normalize(uCamBasis * vec3(ndc * uTanHalfFov, -1.0));
  vec3 pos = uCamPos;

  // Conserved angular momentum of this ray; it sets how hard the path bends.
  float h2 = dot(cross(pos, dir), cross(pos, dir)) * uLensing;

  vec3 color = vec3(0.0);
  float alpha = 0.0;
  bool captured = false;
  bool escaped = false;

  for (int i = 0; i < 512; i++) {
    if (i >= uSteps || captured || escaped || alpha > 0.995) break;

    float r = length(pos);
    // Small steps near the hole where the path curves, long ones far away.
    float ds = clamp(0.055 * (r - RS) + 0.03, 0.02, 1.6);
    // Never step so far that a thin disk crossing is missed.
    ds = min(ds, max(abs(pos.y) * 0.55 + 0.02, 0.04));

    vec3 prev = pos;
    vec3 acc = -1.5 * h2 * pos / pow(r, 5.0);
    vec3 midVel = dir + acc * (ds * 0.5);
    pos += midVel * ds;
    float r2 = length(pos);
    vec3 acc2 = -1.5 * h2 * pos / pow(r2, 5.0);
    dir = normalize(midVel + acc2 * (ds * 0.5));

    // Equatorial crossing: interpolate the exact hit point.
    if (prev.y * pos.y < 0.0) {
      float f = prev.y / (prev.y - pos.y);
      vec3 hit = mix(prev, pos, f);
      float da;
      vec3 dc = diskSample(hit, normalize(pos - prev), da);
      color += (1.0 - alpha) * da * dc;
      alpha += (1.0 - alpha) * da;
    }

    if (r2 <= RS * 1.001) captured = true;
    if (r2 > SKY_R) escaped = true;
  }

  if (!captured) {
    color += (1.0 - alpha) * starField(normalize(dir));
  }

  gl_FragColor = vec4(tonemap(color), 1.0);
}
`;
