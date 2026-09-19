import { AdditiveBlending, Color, CylinderGeometry, FrontSide, Mesh, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";
import { acquireNoise, releaseNoise } from "./fxNoise";
import { approach, clamp } from "./fxCore";

// A tapered cylinder bounds the flame, so flames inside dishes and crucibles never shine through their walls.
const VERTEX = /* glsl */ `
uniform float uTaper;
varying vec3 vOrigin;
varying vec3 vDir;
void main() {
  vec3 p = position;
  p.xz *= mix( uTaper, 1.0, position.y );
  vOrigin = ( inverse( modelMatrix ) * vec4( cameraPosition, 1.0 ) ).xyz;
  vDir = p - vOrigin;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
}
`;

// Ray-marched emissive volume: blue reaction sheet, luminous soot body, white-hot core; all additive light.
const FRAGMENT = /* glsl */ `
uniform sampler3D uNoise;
uniform float uTime;
uniform vec3 uBox;
uniform vec4 uShape;
uniform vec4 uMotion;
uniform vec4 uLayers;
uniform vec3 uBlue;
uniform vec3 uBody;
uniform vec3 uTip;
uniform vec3 uCore;
uniform vec2 uLean;
uniform float uGain;
varying vec3 vOrigin;
varying vec3 vDir;

vec3 emission( vec3 pm ) {
  float R = uShape.x;
  float H = uShape.y;
  float t = pm.y / H;
  if ( t > 1.8 || t < - 0.05 ) return vec3( 0.0 );
  vec3 q = pm * uMotion.x + vec3( uMotion.z, uMotion.z * 0.37 - uTime * uMotion.y * uMotion.x, uMotion.z * 0.71 );
  vec4 n = texture( uNoise, q ) - 0.5;
  #ifdef DETAIL
  n += ( texture( uNoise, q * 2.37 + vec3( 0.21, - uTime * uMotion.y * uMotion.x * 1.3, 0.47 ) ) - 0.5 ) * 0.45;
  #endif
  float tc = clamp( t, 0.0, 1.4 );
  vec2 xz = pm.xz - uLean * tc * tc - n.xz * ( uShape.w * R * 2.4 * ( 0.12 + tc ) );
  float h = t + n.y * uShape.w * 0.9 * tc;
  float r = length( xz );

  // Laminar teardrop: attached at the base, widest near a third of its height, pointed tip.
  float hc = clamp( h, 0.0, 1.0 );
  float prof = pow( sin( 3.14159 * pow( mix( 0.04, 1.0, hc ), 0.62 ) ), 0.8 );
  float rt = r / max( R * prof, 1e-5 );
  float inside = ( 1.0 - smoothstep( 0.2, 1.0, rt ) ) * smoothstep( - 0.03, 0.06, h ) * ( 1.0 - smoothstep( 0.94, 1.0, h ) );
  float hh = h;

  // Pool fire: a blue sheet over the fuel surface and tongues that neck in, wander and break off as they rise.
  float sheet = 0.0;
  if ( uShape.z > 0.001 ) {
    vec4 m = texture( uNoise, vec3( pm.xz * uMotion.x * 0.35, uTime * 0.21 + uMotion.z ) );
    float hp = max( h, 0.0 ) / mix( 0.35, 1.5, m.a );
    float taper = 1.0 - 0.6 * clamp( hp, 0.0, 1.0 );
    float rp = r / R;
    float radial = 1.0 - smoothstep( 0.5 * taper, taper, rp );
    float ero = ( n.r * 0.5 + n.a ) * 0.9 + 0.5;
    float pool = radial * ( 1.0 - smoothstep( 0.55, 1.05, hp ) ) * smoothstep( 0.12 + hp * 0.5, 0.5 + hp * 0.5, ero ) * smoothstep( - 0.02, 0.03, h );
    sheet = ( 1.0 - smoothstep( 0.55, 1.0, rp ) ) * exp( - max( hp, 0.0 ) * 5.0 ) * smoothstep( - 0.02, 0.01, h ) * uShape.z;
    inside = mix( inside, pool, uShape.z );
    hh = mix( h, hp, uShape.z );
  }

  float bodyZone = smoothstep( 0.18, 0.55, hh );
  float shell = inside * ( 1.0 - inside ) * 4.0;
  float blueWeight = ( 0.2 + 0.8 * ( 1.0 - smoothstep( 0.05, 0.6, hh ) ) ) * ( 1.0 - 0.85 * bodyZone * step( 0.001, uLayers.z ) );
  vec3 col = uBlue * ( uLayers.y * ( shell * blueWeight + sheet * 0.8 ) );

  float cr = R * 0.48 * ( 1.0 - smoothstep( 0.0, 0.28, h ) );
  float cone = exp( - pow( ( r - cr ) / ( R * 0.12 ), 2.0 ) ) * smoothstep( - 0.02, 0.02, h ) * ( 1.0 - smoothstep( 0.18, 0.28, h ) );
  col += uBlue * ( uLayers.x * cone );

  // Sooty diffusion flames glow in a shell around a darker core; burning metals fill the whole volume.
  float soot = 0.7 + 0.6 * n.w;
  float filled = smoothstep( 0.08, 0.8, inside );
  float body = mix( filled, max( shell, filled * 0.3 ), uMotion.w ) * bodyZone * soot;
  col += mix( uBody, uTip, smoothstep( 0.5, 1.0, hh ) ) * ( uLayers.z * body );

  float core = pow( inside, 2.2 ) * ( 1.0 - smoothstep( 0.1, 0.7, hh ) );
  col += uCore * ( uLayers.w * core );
  return col;
}

void main() {
  vec3 rd = normalize( vDir );
  float near = length( vDir );
  vec3 inv = 1.0 / rd;
  vec3 t0 = ( vec3( - 1.0, 0.0, - 1.0 ) - vOrigin ) * inv;
  vec3 t1 = ( vec3( 1.0, 1.0, 1.0 ) - vOrigin ) * inv;
  vec3 tmax = max( t0, t1 );
  float far = min( min( tmax.x, tmax.y ), tmax.z );
  if ( far <= near ) discard;
  float stepLen = ( far - near ) / float( STEPS );
  float jitter = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
  vec3 p = vOrigin + rd * ( near + stepLen * jitter );
  vec3 dp = rd * stepLen;
  vec3 acc = vec3( 0.0 );
  for ( int i = 0; i < STEPS; i ++ ) {
    acc += emission( p * uBox );
    p += dp;
  }
  gl_FragColor = vec4( acc * ( length( dp * uBox ) * uGain ), 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const hdr = (hex, k) => new Color(hex).multiplyScalar(k);
const BLACK = new Color(0, 0, 0);

// size(r) → [radius, height] in metres, where r is the burning surface or mouth radius the caller passed.
export const FLAME_KINDS = {
  lamp: {
    size: () => [0.0076, 0.046],
    pool: 0, turb: 0.08, freq: 34, rise: 0.18, base: 0.75, hollow: 0.75,
    cone: 0.8, shell: 0.9, body: 1, core: 0,
    blue: hdr("#3558ff", 0.75), bodyColor: hdr("#ffb45a", 0.6), tipColor: hdr("#ffd89a", 0.9), coreColor: BLACK,
    flicker: 0.05, sway: 0.0008,
  },
  ethanol: {
    size: (r) => {
      const radius = clamp(r * 0.92, 0.012, 0.07);
      return [radius, clamp(radius * 1.9, 0.04, 0.11)];
    },
    pool: 1, turb: 0.35, freq: 24, rise: 0.34, base: 1, hollow: 0.0,
    cone: 0, shell: 1, body: 0.14, core: 0,
    blue: hdr("#7fb2ff", 0.8), bodyColor: hdr("#9cc2ff", 0.45), tipColor: hdr("#ffd58f", 0.5), coreColor: BLACK,
    flicker: 0.08, sway: 0.002,
    shimmer: 1,
  },
  // A burning pool of spirit on the bench or the floor: wide, lazy and smoky.
  puddle: {
    size: (r) => {
      const radius = Math.max(0.05, Math.min(0.34, r * 0.95));
      return [radius, Math.max(0.14, Math.min(0.5, radius * 1.5))];
    },
    pool: 1, turb: 0.42, freq: 15, rise: 0.5, base: 1, hollow: 0,
    cone: 0, shell: 1, body: 0.5, core: 0,
    blue: hdr("#79a8ff", 0.7), bodyColor: hdr("#ffb257", 0.75), tipColor: hdr("#ffd79a", 0.6), coreColor: BLACK,
    flicker: 0.12, sway: 0.004,
    shimmer: 1,
    light: { color: "#ff9a42", intensity: 0.08, distance: 4 },
    glow: { color: "#ff9440", intensity: [0.2, 0.8], size: 0.35 },
  },
  magnesium: {
    size: () => [0.0055, 0.016],
    pool: 0, turb: 0.5, freq: 60, rise: 0.35, base: 0.9, hollow: 0.1,
    cone: 0, shell: 0.5, body: 1, core: 1,
    blue: hdr("#e8eeff", 6), bodyColor: hdr("#f4f7ff", 22), tipColor: hdr("#fff8ee", 12), coreColor: hdr("#ffffff", 60),
    flicker: 0.12, sway: 0.0012,
    light: { color: "#eef2ff", intensity: 0.05, distance: 2.5 },
    glow: { color: "#f2f5ff", intensity: [0.3, 1.1], size: 0.1 },
    sparks: { rate: 30, forks: 0.35, speed: [0.35, 1.3], hot: "#ffffff", warm: "#fff0c8", cool: "#ff9a3a" },
    smoke: { rate: 1, color: "#f4f4f2", glow: "#fff6ea" },
  },
  sulfur: {
    size: (r) => {
      const radius = clamp(r * 0.62, 0.006, 0.014);
      return [radius, radius * 1.25];
    },
    pool: 1, turb: 0.4, freq: 48, rise: 0.22, base: 1, hollow: 0.0,
    cone: 0, shell: 1, body: 0.3, core: 0,
    blue: hdr("#4d6bff", 0.5), bodyColor: hdr("#4d6bff", 0.3), tipColor: hdr("#6f7dff", 0.18), coreColor: BLACK,
    flicker: 0.1, sway: 0.001,
  },
  "sulfur-oxygen": {
    size: (r) => {
      const radius = clamp(r * 0.9, 0.012, 0.03);
      return [radius, 0.042];
    },
    pool: 0.55, turb: 0.42, freq: 30, rise: 0.4, base: 0.9, hollow: 0.25,
    cone: 0, shell: 1, body: 1, core: 0.25,
    blue: hdr("#6a4dff", 2.0), bodyColor: hdr("#7458ff", 1.4), tipColor: hdr("#9c8cff", 0.8), coreColor: hdr("#d8ccff", 2.6),
    flicker: 0.1, sway: 0.0015,
    light: { color: "#7a5cff", intensity: 0.012, distance: 1.5 },
    glow: { color: "#6a4dff", intensity: [0.06, 0.3], size: 0.075 },
  },
  permanganate: {
    size: (r) => {
      const radius = clamp(r * 0.62, 0.012, 0.03);
      return [radius, radius * 4.2];
    },
    pool: 0.65, turb: 0.55, freq: 30, rise: 0.5, base: 1, hollow: 0.15,
    cone: 0, shell: 0.6, body: 1, core: 0.7,
    blue: hdr("#b77cff", 1.4), bodyColor: hdr("#dc92ff", 3.4), tipColor: hdr("#ffe0b8", 2.4), coreColor: hdr("#fff4ff", 10),
    flicker: 0.14, sway: 0.002,
    light: { color: "#e6b8ff", intensity: 0.022, distance: 2 },
    glow: { color: "#e2a8ff", intensity: [0.05, 0.4], size: 0.09 },
    sparks: { rate: 24, forks: 0.15, speed: [0.3, 1.1], hot: "#fff1ff", warm: "#ffb070", cool: "#b8402a" },
  },
  sodium: {
    size: () => [0.009, 0.034],
    pool: 0.25, turb: 0.5, freq: 40, rise: 0.42, base: 0.9, hollow: 0.3,
    cone: 0, shell: 0.3, body: 1, core: 0.8,
    blue: hdr("#ffb000", 1.2), bodyColor: hdr("#ffc400", 6), tipColor: hdr("#ff9a00", 2.6), coreColor: hdr("#fff1b0", 12),
    flicker: 0.1, sway: 0.0015,
    light: { color: "#ffc400", intensity: 0.02, distance: 2 },
    glow: { color: "#ffc400", intensity: [0.1, 0.55], size: 0.085 },
  },
  hydrogen: {
    size: (r) => [clamp(r * 1.1, 0.0022, 0.004), 0.017],
    pool: 0, turb: 0.06, freq: 60, rise: 0.3, base: 0.8, hollow: 0.8,
    cone: 0.35, shell: 1, body: 0.15, core: 0,
    blue: hdr("#bcd4ff", 0.3), bodyColor: hdr("#c8dcff", 0.08), tipColor: hdr("#e2eaff", 0.07), coreColor: BLACK,
    flicker: 0.03, sway: 0.0004,
  },
  "sodium-water": {
    size: () => [0.0045, 0.017],
    pool: 0, turb: 0.35, freq: 70, rise: 0.4, base: 0.9, hollow: 0.35,
    cone: 0, shell: 0.3, body: 1, core: 0.35,
    blue: hdr("#ff9f00", 0.8), bodyColor: hdr("#ffb300", 3), tipColor: hdr("#ff8a00", 1.6), coreColor: hdr("#fff0b0", 4),
    flicker: 0.16, sway: 0.0012,
    glow: { color: "#ffb300", intensity: [0.04, 0.22], size: 0.035 },
  },
};

const NUMERIC = ["pool", "turb", "freq", "rise", "base", "hollow", "cone", "shell", "body", "core", "flicker", "sway"];
const COLORS = ["blue", "bodyColor", "tipColor", "coreColor"];

// Continuous flicker from incommensurate sines: lively but never a strobe.
const flickerAt = (t, seed) =>
  Math.sin(t * 7.3 + seed) * 0.45 + Math.sin(t * 11.9 + seed * 2.1) * 0.3 + Math.sin(t * 3.1 + seed * 0.7) * 0.25;

export const createFlame = ({ quality }) => {
  const noise = acquireNoise();
  const geometry = new CylinderGeometry(1, 1, 1, quality === "low" ? 12 : 18, 1);
  geometry.translate(0, 0.5, 0);
  const uniforms = {
    uNoise: { value: noise },
    uTime: { value: 0 },
    uTaper: { value: 0.6 },
    uBox: { value: new Vector3(0.01, 0.05, 0.01) },
    uShape: { value: new Vector4(0.006, 0.04, 0, 0.1) },
    uMotion: { value: new Vector4(34, 0.2, 0, 0) },
    uLayers: { value: new Vector4(1, 1, 1, 0) },
    uBlue: { value: new Color() },
    uBody: { value: new Color() },
    uTip: { value: new Color() },
    uCore: { value: new Color() },
    uLean: { value: new Vector2() },
    uGain: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    defines: quality === "low" ? { STEPS: 12 } : { STEPS: 32, DETAIL: 1 },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: FrontSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = 4;
  mesh.visible = false;

  const seed = Math.random() * 100;
  const cur = { kind: null, radius: 0.006, height: 0.04, level: 0, flick: 1 };
  NUMERIC.forEach((key) => {
    cur[key] = 0;
  });
  const colors = Object.fromEntries(COLORS.map((key) => [key, new Color()]));
  let time = Math.random() * 50;
  let mouth = 0.02;

  // mods (optional): { heightScale, radiusScale, brightness, turbulence, lean: [x, z], rise }
  const update = (dt, kind, intensity, radius, reduceMotion, mods = null) => {
    const preset = FLAME_KINDS[kind] ?? null;
    const target = preset ? clamp(intensity ?? 1, 0, 1) : 0;
    cur.level = approach(cur.level, target, dt, target > cur.level ? 0.18 : 0.3);
    if (preset) {
      const first = cur.kind === null;
      cur.kind = kind;
      mouth = radius ?? 0.02;
      const [r, h] = preset.size(mouth);
      const tau = first ? 1e-4 : 0.35;
      cur.radius = approach(cur.radius, r * (mods?.radiusScale ?? 1), dt, tau);
      cur.height = approach(cur.height, h * (mods?.heightScale ?? 1), dt, tau);
      NUMERIC.forEach((key) => {
        cur[key] = approach(cur[key], preset[key], dt, tau);
      });
      COLORS.forEach((key) => colors[key].lerp(preset[key], first ? 1 : 1 - Math.exp(-dt / tau)));
    }
    if (cur.level < 0.004) {
      mesh.visible = false;
      if (!preset) cur.kind = null;
      return 0;
    }

    time += dt * (mods?.rise ?? 1);
    const size = 0.35 + 0.65 * cur.level;
    const R = cur.radius * size;
    const H = cur.height * size;
    cur.flick = 1 + cur.flicker * (reduceMotion ? 0.4 : 1) * flickerAt(time, seed);
    const turb = cur.turb + (mods?.turbulence ?? 0);
    const lean = Math.hypot(mods?.lean?.[0] ?? 0, mods?.lean?.[1] ?? 0) * H;
    const top = R * (cur.pool > 0.5 ? 1.25 + turb * 0.4 : 1.5 + turb * 1.6) + lean;
    const boxH = H * (1.5 + turb * 0.5);
    const baseWidth = Math.min(R * cur.base * (1 + turb * 0.3), mouth > 0 ? mouth * 0.97 : Infinity);
    mesh.scale.set(top, boxH, top);
    uniforms.uTaper.value = clamp(baseWidth / top, 0.15, 1);
    uniforms.uBox.value.set(top, boxH, top);
    uniforms.uShape.value.set(R, H * Math.sqrt(cur.flick), cur.pool, turb);
    uniforms.uMotion.value.set(cur.freq, cur.rise, seed, cur.hollow);
    uniforms.uLayers.value.set(cur.cone, cur.shell, cur.body, cur.core);
    uniforms.uBlue.value.copy(colors.blue);
    uniforms.uBody.value.copy(colors.bodyColor);
    uniforms.uTip.value.copy(colors.tipColor);
    uniforms.uCore.value.copy(colors.coreColor);
    const swayX = cur.sway * size * (Math.sin(time * 1.3 + seed) + Math.sin(time * 2.9 + seed * 0.3) * 0.5);
    const swayZ = cur.sway * size * (Math.sin(time * 1.7 + seed * 1.9) + Math.sin(time * 2.3) * 0.5);
    uniforms.uLean.value.set(swayX + (mods?.lean?.[0] ?? 0) * H, swayZ + (mods?.lean?.[1] ?? 0) * H);
    uniforms.uTime.value = time;
    uniforms.uGain.value = (cur.flick * cur.level * (mods?.brightness ?? 1)) / (R * 1.2);
    mesh.visible = true;
    return cur.level;
  };

  return {
    object: mesh,
    update,
    level: () => cur.level,
    kind: () => cur.kind,
    radius: () => cur.radius * (0.35 + 0.65 * cur.level),
    height: () => cur.height * (0.35 + 0.65 * cur.level),
    flick: () => cur.flick,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      releaseNoise();
    },
  };
};
