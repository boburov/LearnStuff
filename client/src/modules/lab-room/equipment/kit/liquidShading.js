import { Color, FrontSide, MeshPhysicalMaterial, MultiplyBlending, ShaderMaterial, Vector3 } from "three";
import { SHADER_RADII } from "./profileTable";

// One set of uniforms drives both passes of a container's fluid (liquid + headspace gas).
export const createFluidUniforms = (table) => ({
  uRadii: { value: table.shaderRadii },
  uFloor: { value: table.floor },
  uTop: { value: table.top },
  uMaxChord: { value: Math.hypot(table.maxRadius * 2, table.height) },
  uUp: { value: new Vector3(0, 1, 0) },
  uPlane: { value: table.floor },
  uLiquid: { value: 0 },
  uSolidFloor: { value: table.floor },
  uBlock: { value: new Vector3(1, 0, 0) },
  uSigmaT: { value: new Vector3() },
  uSurfaceLoss: { value: 0 },
  uSigmaS: { value: 0 },
  uCloudTop: { value: table.top },
  uTurbid: { value: new Color("#ffffff") },
  uSigmaG: { value: new Vector3() },
  uGasColor: { value: new Color("#ffffff") },
  uGasFade: { value: 1 },
  uMeniscus: { value: 0.0015 },
  uMeniscusWidth: { value: 0.0025 },
  uRipple: { value: 0 },
  uBoil: { value: 0 },
  uTime: { value: 0 },
  uPlume: { value: 0 },
  uPlumeSource: { value: new Vector3(0, table.floor, 0) },
  uSchlieren: { value: 0 },
  uWisps: { value: 0 },
});

const PARS = /* glsl */ `
#define FLUID_RADII ${SHADER_RADII}
uniform float uRadii[ FLUID_RADII + 1 ];
uniform float uFloor;
uniform float uTop;
uniform float uMaxChord;
uniform vec3 uUp;
uniform float uPlane;
uniform float uLiquid;
uniform float uSolidFloor;
uniform vec3 uBlock;
uniform vec3 uSigmaT;
uniform float uSurfaceLoss;
uniform float uSigmaS;
uniform float uCloudTop;
uniform vec3 uSigmaG;
uniform float uGasFade;
uniform float uMeniscus;
uniform float uMeniscusWidth;
uniform float uTime;
uniform float uPlume;
uniform vec3 uPlumeSource;
uniform float uSchlieren;
uniform float uWisps;
varying vec3 vFluidLocal;
varying vec3 vFluidCamera;
varying float vFluidPart;

float fluidRadius( float y ) {
  float f = clamp( ( y - uFloor ) / ( uTop - uFloor ), 0.0, 1.0 ) * float( FLUID_RADII );
  int i = min( int( f ), FLUID_RADII - 1 );
  return mix( uRadii[ i ], uRadii[ i + 1 ], f - float( i ) );
}

bool fluidInside( vec3 p ) {
  if ( p.y > uTop + 0.0001 ) return false;
  float r = fluidRadius( p.y ) + 0.0003;
  return dot( p.xz, p.xz ) <= r * r;
}

float fluidHash( vec3 p ) {
  p = fract( p * 0.3183099 + 0.1 );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}

float fluidNoise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( mix( fluidHash( i ), fluidHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( fluidHash( i + vec3( 0, 1, 0 ) ), fluidHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
    mix( mix( fluidHash( i + vec3( 0, 0, 1 ) ), fluidHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( fluidHash( i + vec3( 0, 1, 1 ) ), fluidHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ),
    f.z
  );
}

struct FluidPath {
  vec3 dir;
  float end;
  float l0;
  float liquid;
  float gas;
  float below;
  float surface;
  float fromAbove;
  float film;
};

// Straight-ray segments through the vessel: liquid below the level plane, headspace gas above it.
FluidPath fluidTrace( vec3 e, vec3 d0 ) {
  FluidPath path;
  path.surface = -1.0;
  path.fromAbove = 0.0;
  path.film = 0.0;
  path.l0 = 0.0;
  vec3 d = d0;
  float s0 = uPlane - dot( e, uUp );
  bool wall = vFluidPart < 0.5;
  bool wet = uLiquid > 0.5 && s0 > - uMeniscus;
  if ( wall && wet && s0 > 0.0 ) {
    vec3 n = normalize( vec3( e.x, 0.0, e.z ) );
    vec3 bent = refract( d0, n, 0.75 );
    if ( dot( bent, bent ) > 0.0 ) d = normalize( bent );
  }
  path.dir = d;

  float stride = uMaxChord / float( FLUID_STEPS );
  float lo = 0.0;
  float hi = uMaxChord;
  for ( int k = 1; k <= FLUID_STEPS; k ++ ) {
    float tk = stride * float( k );
    if ( ! fluidInside( e + d * tk ) ) {
      hi = tk;
      break;
    }
    lo = tk;
  }
  for ( int k = 0; k < FLUID_REFINE; k ++ ) {
    float mid = 0.5 * ( lo + hi );
    if ( fluidInside( e + d * mid ) ) lo = mid;
    else hi = mid;
  }
  float end = 0.5 * ( lo + hi );

  if ( e.y < uSolidFloor ) end = 0.0;
  else if ( d.y < 0.0 ) end = min( end, ( uSolidFloor - e.y ) / d.y );
  if ( uBlock.x < uBlock.y ) {
    if ( abs( d.y ) < 1e-5 ) {
      if ( e.y > uBlock.x && e.y < uBlock.y ) end = 0.0;
    } else {
      float ta = ( uBlock.x - e.y ) / d.y;
      float tb = ( uBlock.y - e.y ) / d.y;
      float enter = min( ta, tb );
      float leave = max( ta, tb );
      if ( leave > 0.0 && enter < end ) end = max( 0.0, enter );
    }
  }
  end = max( end, 0.0 );
  path.end = end;

  float l0 = 0.0;
  float l1 = 0.0;
  if ( uLiquid > 0.5 ) {
    float k = dot( d, uUp );
    if ( abs( k ) < 1e-6 ) {
      if ( s0 >= 0.0 ) l1 = end;
    } else {
      float tCross = s0 / k;
      if ( k > 0.0 ) {
        l1 = clamp( tCross, 0.0, end );
      } else {
        l0 = clamp( tCross, 0.0, end );
        l1 = end;
      }
      // Tested against the profile, not the marched exit, so the far rim of the surface stays unbroken.
      if ( tCross > 0.0 && tCross < end + 0.002 && fluidInside( e + d * tCross ) ) {
        path.surface = tCross;
        path.fromAbove = k < 0.0 ? 1.0 : 0.0;
      }
    }
  }
  path.l0 = l0;
  path.liquid = max( 0.0, l1 - l0 );
  path.gas = max( 0.0, end - path.liquid );
  if ( wall && wet && s0 <= 0.0 ) path.film = 1.0 + s0 / uMeniscus;

  float below = path.liquid;
  if ( path.liquid > 0.0 && abs( d.y ) > 1e-5 ) {
    float tc = ( uCloudTop - e.y ) / d.y;
    below = d.y < 0.0 ? max( 0.0, l1 - max( l0, tc ) ) : max( 0.0, min( l1, tc ) - l0 );
  } else if ( e.y > uCloudTop ) {
    below = 0.0;
  }
  path.below = below;
  return path;
}

#ifdef FLUID_HIGH
// Dye leaving a dissolving crystal: a dense pool on the floor, a rising core and thin veils drifting off it.
float fluidPlume( vec3 p ) {
  float h = max( 0.0, p.y - uPlumeSource.y );
  float span = max( 0.006, uPlane - uPlumeSource.y );
  float rise = clamp( h / span, 0.0, 1.0 );
  vec2 d = p.xz - uPlumeSource.xz;
  float core = exp( - dot( d, d ) / ( 0.00012 + rise * 0.0016 ) ) * ( 1.0 - 0.5 * rise );
  float wisps = fluidNoise( vec3( p.x * 150.0, p.y * 42.0 - uTime * 0.22, p.z * 150.0 ) );
  float veil = pow( max( 0.0, wisps - 0.38 ) / 0.62, 2.0 ) * ( 1.0 - 0.45 * rise );
  float pool = exp( - h / 0.008 ) * 1.8;
  return pool + core * 3.0 + veil * 3.2;
}

float fluidSchlieren( vec3 p ) {
  float warp = fluidNoise( p * 120.0 + vec3( 0.0, uTime * 0.25, uTime * 0.08 ) );
  float wave = sin( p.y * 520.0 + p.x * 140.0 + warp * 11.0 );
  return pow( 1.0 - abs( wave ), 7.0 );
}
#endif
`;

const VERTEX_BODY = /* glsl */ `
vFluidLocal = position;
vFluidPart = aPart;
vFluidCamera = ( inverse( modelMatrix ) * vec4( cameraPosition, 1.0 ) ).xyz;
`;

const defines = (quality) =>
  quality === "low" ? { FLUID_STEPS: 10, FLUID_REFINE: 3 } : { FLUID_STEPS: 22, FLUID_REFINE: 5, FLUID_HIGH: "" };

// Samples of the liquid segment used for plumes and streaks (High only).
const DETAIL = /* glsl */ `
float tintScale = 1.0;
float streaks = 0.0;
#ifdef FLUID_HIGH
if ( fp.liquid > 0.0 && ( uPlume > 0.001 || uSchlieren > 0.001 ) ) {
  float acc = 0.0;
  float lines = 0.0;
  for ( int k = 0; k < 6; k ++ ) {
    vec3 pk = fe + fp.dir * ( fp.l0 + fp.liquid * ( float( k ) + 0.5 ) / 6.0 );
    if ( uPlume > 0.001 ) acc += fluidPlume( pk );
    if ( uSchlieren > 0.001 ) lines += fluidSchlieren( pk );
  }
  tintScale = mix( 1.0, acc / 6.0, uPlume );
  streaks = uSchlieren * lines / 6.0;
}
#endif
`;

const ABSORB_FRAGMENT = /* glsl */ `
${PARS}
void main() {
  vec3 fe = vFluidLocal;
  FluidPath fp = fluidTrace( fe, normalize( fe - vFluidCamera ) );
  ${DETAIL}
  float h = clamp( ( fe.y + fp.dir.y * ( fp.l0 + fp.end ) * 0.5 - uPlane ) / max( 0.004, uTop - uPlane ), 0.0, 1.0 );
  float gasDensity = 1.0 + uGasFade * ( 0.45 - h ) * 1.1;
  vec3 tau = uSigmaT * fp.liquid * tintScale + uSigmaG * fp.gas * gasDensity;
  vec3 transmit = exp( - tau ) * exp( - uSurfaceLoss * min( 1.0, fp.liquid / 0.002 ) );
  transmit *= 1.0 - 0.28 * fp.film * ( 1.0 - fp.film );
  transmit *= 1.0 - streaks * 0.4;
  gl_FragColor = vec4( transmit, 1.0 );
}
`;

// Multiply pass: what is behind the fluid is tinted by Beer–Lambert absorption along the view ray.
export const createFluidAbsorbMaterial = (uniforms, quality) =>
  new ShaderMaterial({
    uniforms,
    defines: defines(quality),
    vertexShader: /* glsl */ `
      attribute float aPart;
      varying vec3 vFluidLocal;
      varying vec3 vFluidCamera;
      varying float vFluidPart;
      void main() {
        ${VERTEX_BODY}
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: ABSORB_FRAGMENT,
    blending: MultiplyBlending,
    premultipliedAlpha: true,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
  });

const SCATTER_OUTPUT = /* glsl */ `
vec3 fe = vFluidLocal;
vec3 fd0 = normalize( fe - vFluidCamera );
FluidPath fp = fluidTrace( fe, fd0 );
${DETAIL}
float fh = clamp( ( fe.y + fp.dir.y * fp.end * 0.5 - uPlane ) / max( 0.004, uTop - uPlane ), 0.0, 1.0 );
vec3 liquidT = exp( - uSigmaT * fp.liquid * tintScale );
vec3 fluidT = liquidT * exp( - uSigmaG * fp.gas * ( 1.0 + uGasFade * ( 0.45 - fh ) * 1.1 ) );

vec3 upView = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
vec3 fluidIrr = vec3( 0.9 );
#ifdef USE_ENVMAP
  fluidIrr = getIBLIrradiance( upView ) * 0.65 + getIBLIrradiance( geometryViewDir ) * 0.35;
#endif
#if NUM_DIR_LIGHTS > 0
  fluidIrr += directionalLights[ 0 ].color * ( 0.45 + 0.35 * max( 0.0, dot( upView, directionalLights[ 0 ].direction ) ) );
#endif

float cloudTau = uSigmaS * ( fp.below + 0.06 * max( 0.0, fp.liquid - fp.below ) );
float cloudA = 1.0 - exp( - cloudTau );
float cloudShade = 1.0;
#ifdef FLUID_HIGH
if ( cloudA > 0.002 ) {
  vec3 mid = fe + fp.dir * ( fp.l0 + fp.liquid * 0.5 );
  float flocs = fluidNoise( mid * 380.0 + vec3( 0.0, uTime * 0.02, 0.0 ) ) * 0.62 + fluidNoise( mid * 1200.0 ) * 0.38;
  cloudA = 1.0 - exp( - cloudTau * ( 0.5 + flocs * 1.0 ) );
  cloudShade = 0.82 + 0.34 * flocs;
}
#endif
float lightHeight = clamp( ( fe.y - uFloor ) / max( 0.01, uPlane - uFloor ), 0.0, 1.2 );
vec3 fluidRgb = uTurbid * fluidIrr * RECIPROCAL_PI * cloudA * cloudShade * sqrt( fluidT ) * ( 0.72 + 0.28 * lightHeight );
float fluidA = cloudA;
// Light entering through the top and walls reaches the eye tinted by the liquid, so deep colours never go flat black.
float absorbed = 1.0 - dot( liquidT, vec3( 0.2126, 0.7152, 0.0722 ) );
fluidRgb += fluidIrr * RECIPROCAL_PI * pow( liquidT, vec3( 0.35 ) ) * absorbed * 0.09 * ( 1.0 - cloudA );

vec3 gasRgb = uGasColor * fluidIrr * RECIPROCAL_PI * ( 1.0 - exp( - dot( uSigmaG, vec3( 0.333 ) ) * fp.gas ) ) * 0.4;
#ifdef FLUID_HIGH
if ( uWisps > 0.001 && fp.gas > 0.0 ) {
  // Two samples across the segment keep the haze from breaking into noise cells.
  vec3 g1 = fe + fp.dir * ( fp.end - fp.gas * 0.75 );
  vec3 g2 = fe + fp.dir * ( fp.end - fp.gas * 0.25 );
  vec3 drift = vec3( uTime * 0.004, - uTime * 0.006, uTime * 0.003 );
  float swirl = 0.5 * ( fluidNoise( g1 * 90.0 + drift ) + fluidNoise( g2 * 90.0 + drift ) );
  gasRgb *= 0.82 + 0.36 * swirl;
}
#endif
fluidRgb += gasRgb * ( 1.0 - fluidA );
fluidRgb += fluidIrr * streaks * 0.055;

if ( fp.surface >= 0.0 ) {
  vec3 q = fe + fp.dir * fp.surface;
  float qr = length( q.xz );
  vec2 radial = q.xz / max( qr, 1e-5 );
  float wallDist = max( 0.0, fluidRadius( q.y ) - qr );
  float slope = uMeniscus / uMeniscusWidth * exp( - wallDist / uMeniscusWidth );
  vec3 nLocal = normalize( uUp - vec3( radial.x, 0.0, radial.y ) * min( slope, 3.0 ) );
  #ifdef FLUID_HIGH
  if ( uRipple > 0.001 || uBoil > 0.001 ) {
    vec3 rp = vec3( q.x * 900.0, uTime * ( 1.5 + uBoil * 5.0 ), q.z * 900.0 );
    float amp = uRipple * 0.25 + uBoil * 0.9;
    nLocal = normalize( nLocal + vec3( fluidNoise( rp ) - 0.5, 0.0, fluidNoise( rp + 19.1 ) - 0.5 ) * amp );
  }
  #endif
  vec3 nView = normalize( vFluidNormalMatrix * nLocal );
  if ( fp.fromAbove < 0.5 ) nView = - nView;
  float dotNV = clamp( dot( nView, geometryViewDir ), 0.0, 1.0 );
  float fresnel = 0.02 + 0.98 * pow( 1.0 - dotNV, 5.0 );
  if ( fp.fromAbove < 0.5 && dotNV < 0.66 ) fresnel = 1.0;
  vec3 spec = vec3( 0.0 );
  #ifdef USE_ENVMAP
    spec = getIBLRadiance( geometryViewDir, nView, 0.035 + uBoil * 0.08 );
  #endif
  #if NUM_DIR_LIGHTS > 0
    vec3 halfDir = normalize( directionalLights[ 0 ].direction + geometryViewDir );
    spec += directionalLights[ 0 ].color * pow( max( 0.0, dot( nView, halfDir ) ), 600.0 ) * 6.0;
  #endif
  vec3 before = exp( - ( uSigmaG * fp.surface ) );
  if ( fp.fromAbove < 0.5 ) before = exp( - ( uSigmaT + uSigmaS ) * fp.surface );
  float edge = exp( - wallDist / ( uMeniscusWidth * 0.6 ) );
  float mirror = fresnel * ( 1.0 + edge * 0.6 );
  fluidRgb = spec * mirror * before + fluidRgb * ( 1.0 - min( 1.0, mirror ) );
  fluidA = min( 1.0, mirror * 0.85 ) + fluidA * ( 1.0 - min( 1.0, mirror * 0.85 ) );
}

if ( fp.film > 0.0 ) {
  vec3 filmNormal = normalize( vFluidNormalMatrix * normalize( vec3( fe.x, - length( fe.xz ) * 0.9, fe.z ) ) );
  vec3 filmSpec = vec3( 0.3 );
  #ifdef USE_ENVMAP
    filmSpec = getIBLRadiance( geometryViewDir, filmNormal, 0.05 );
  #endif
  float filmA = fp.film * fp.film * 0.35;
  fluidRgb += filmSpec * filmA;
  fluidA = min( 1.0, fluidA + filmA * 0.4 );
}

gl_FragColor = vec4( fluidRgb, fluidA );
`;

// Premultiplied pass: suspension glow, gas haze and the liquid surface reflections; clear areas stay transparent.
export const createFluidScatterMaterial = (uniforms, quality) => {
  const material = new MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, metalness: 0, ior: 1.33, side: FrontSide });
  material.transparent = true;
  material.premultipliedAlpha = true;
  material.depthWrite = false;
  material.defines = { ...defines(quality) };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aPart;\nvarying vec3 vFluidLocal;\nvarying vec3 vFluidCamera;\nvarying float vFluidPart;\nvarying mat3 vFluidNormalMatrix;",
      )
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERTEX_BODY}\nvFluidNormalMatrix = normalMatrix;`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nuniform vec3 uTurbid;\nuniform vec3 uGasColor;\nuniform float uRipple;\nuniform float uBoil;\nvarying mat3 vFluidNormalMatrix;`,
      )
      .replace("#include <clipping_planes_pars_fragment>", `#include <clipping_planes_pars_fragment>\n${PARS}`)
      .replace("#include <opaque_fragment>", SCATTER_OUTPUT)
      .replace("#include <premultiplied_alpha_fragment>", "");
  };
  material.customProgramCacheKey = () => `kit-fluid-scatter-${quality}`;
  return material;
};
