import { Color, MeshStandardMaterial, Vector3 } from "three";
import { SHADER_RADII } from "./profileTable";

// Shared procedural texture helpers: value noise, cell noise and a derivative bump that needs no UVs.
const NOISE = /* glsl */ `
float sHash( vec3 p ) {
  p = fract( p * 0.3183099 + 0.1 );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}
vec3 sHash3( vec3 p ) {
  p = vec3( dot( p, vec3( 127.1, 311.7, 74.7 ) ), dot( p, vec3( 269.5, 183.3, 246.1 ) ), dot( p, vec3( 113.5, 271.9, 124.6 ) ) );
  return fract( sin( p ) * 43758.5453123 );
}
float sNoise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( mix( sHash( i ), sHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( sHash( i + vec3( 0, 1, 0 ) ), sHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
    mix( mix( sHash( i + vec3( 0, 0, 1 ) ), sHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( sHash( i + vec3( 0, 1, 1 ) ), sHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ),
    f.z
  );
}
float sFbm( vec3 p ) {
  return sNoise( p ) * 0.55 + sNoise( p * 2.03 + 17.1 ) * 0.3 + sNoise( p * 4.11 + 31.7 ) * 0.15;
}
vec2 sCells( vec3 p ) {
  vec3 i = floor( p );
  vec3 f = fract( p );
  float d1 = 8.0;
  float d2 = 8.0;
  for ( int z = -1; z <= 1; z ++ ) {
    for ( int y = -1; y <= 1; y ++ ) {
      for ( int x = -1; x <= 1; x ++ ) {
        vec3 g = vec3( float( x ), float( y ), float( z ) );
        vec3 r = g + sHash3( i + g ) - f;
        float d = dot( r, r );
        if ( d < d1 ) { d2 = d1; d1 = d; } else if ( d < d2 ) { d2 = d; }
      }
    }
  }
  return sqrt( vec2( d1, d2 ) );
}
`;

// Screen-space bump for procedural height, so no UVs or tangents are needed (fragment stage only).
const BUMP = /* glsl */ `
vec3 sBump( vec3 viewPos, vec3 n, float height, float facing ) {
  vec3 dpx = dFdx( viewPos );
  vec3 dpy = dFdy( viewPos );
  vec3 r1 = cross( dpy, n );
  vec3 r2 = cross( n, dpx );
  float det = dot( dpx, r1 ) * facing;
  vec3 grad = sign( det ) * ( dFdx( height ) * r1 + dFdy( height ) * r2 );
  return normalize( abs( det ) * n - grad );
}
`;

const LAYER_UNIFORMS = /* glsl */ `
uniform float uTopY;
uniform float uRadius;
uniform float uMound;
uniform float uRelief;
uniform float uBottomY;
uniform float uCoverage;
uniform vec3 uTint;
uniform float uGrain;
uniform float uLump;
uniform float uRough;
uniform float uSparkle;
uniform float uMetal;
uniform float uWet;
uniform vec3 uGlowColor;
uniform float uGlow;
uniform float uTime;
uniform vec3 uUp;
uniform float uPlane;
uniform float uMeniscus;
uniform float uMeniscusWidth;
uniform vec3 uSigmaT;
uniform float uTintDepth;
varying vec3 vLayerLocal;
varying float vLayerPart;
`;

// Solids are drawn after the fluid's absorption pass, so they carry the tint of the liquid standing over them.
const SUBMERGED = /* glsl */ `
vec3 submergedTint( vec3 p, vec3 up, float plane, vec3 sigma, float depthScale ) {
  return exp( - sigma * max( 0.0, plane - dot( p, up ) ) * depthScale );
}
`;

// Height of the top surface over a point, in the vessel's local frame.
const LAYER_HEIGHT = /* glsl */ `
float layerHeight( vec2 xz ) {
  #if defined( LAYER_FLOAT )
    float y = ( uPlane - uUp.x * xz.x - uUp.z * xz.y ) / max( uUp.y, 0.3 );
    float wall = max( 0.0, uRadius - length( xz ) );
    return y + uMeniscus * exp( - wall / uMeniscusWidth ) + 0.00018 + uRelief * sNoise( vec3( xz * 520.0, 1.3 ) );
  #elif defined( LAYER_FOAM )
    float r = length( xz ) / max( uRadius, 1e-4 );
    float dome = uMound * max( 0.0, 1.0 - r * r );
    return uTopY + dome + uRelief * ( sNoise( vec3( xz * 430.0, uTime * 0.12 ) ) - 0.5 );
  #else
    float r = length( xz ) / max( uRadius, 1e-4 );
    float mound = uMound * max( 0.0, 1.0 - r * r );
    float bumps = ( sFbm( vec3( xz * 620.0, 3.1 ) ) - 0.5 ) * uRelief + ( sNoise( vec3( xz * 2300.0, 9.7 ) ) - 0.5 ) * uRelief * 0.4;
    return uTopY + mound + bumps;
  #endif
}
`;

const layerVertex = /* glsl */ `
vec3 layerPos = position;
vec3 objectNormal = vec3( normal );
vLayerPart = aPart;
if ( aPart > 0.5 ) {
  float rr = max( 0.0, min( uRadius - aEdge, uRadius * aFrac ) );
  vec2 xz = position.xz * rr;
  float e = 0.0003;
  float h = layerHeight( xz );
  layerPos = vec3( xz.x, h, xz.y );
  objectNormal = normalize( vec3( h - layerHeight( xz + vec2( e, 0.0 ) ), e, h - layerHeight( xz + vec2( 0.0, e ) ) ) );
}
vLayerLocal = layerPos;
`;

const layerClip = /* glsl */ `
#include <clipping_planes_fragment>
if ( vLayerPart < 0.5 && ( vLayerLocal.y > layerHeight( vLayerLocal.xz ) || vLayerLocal.y < uBottomY ) ) discard;
if ( uCoverage < 0.999 ) {
  float dust = sNoise( vec3( vLayerLocal.xz * 900.0, 4.0 ) ) * 0.55 + sNoise( vec3( vLayerLocal.xz * 3600.0, 9.0 ) ) * 0.45;
  if ( dust > sqrt( uCoverage ) ) discard;
}
`;

const LAYER_SURFACE = /* glsl */ `
vec3 lp = vLayerLocal;
#if defined( LAYER_FOAM )
  vec3 cp = lp * uGrain + vec3( 0.0, uTime * 0.08, 0.0 );
  #ifdef LAYER_HIGH
    vec2 c1 = sCells( cp );
    vec2 c2 = sCells( cp * 2.9 + 11.0 );
    vec2 c3 = sCells( cp * 7.3 + 5.0 );
    float bubble = sqrt( max( 0.0, 1.0 - c1.x * c1.x * 2.2 ) );
    float small = sqrt( max( 0.0, 1.0 - c2.x * c2.x * 2.4 ) );
    float fine = sqrt( max( 0.0, 1.0 - c3.x * c3.x * 2.6 ) );
    float rim = 1.0 - smoothstep( 0.0, 0.07, c1.y - c1.x );
    float seam = 1.0 - smoothstep( 0.0, 0.1, c2.y - c2.x );
    float layerHeightField = bubble * 0.00035 + small * 0.00016 + fine * 0.00006;
    float layerShade = ( 0.86 + 0.16 * bubble + 0.1 * fine ) * ( 1.0 - 0.22 * rim - 0.12 * seam );
  #else
    float bubble = sNoise( cp );
    float layerHeightField = bubble * 0.0004;
    float layerShade = 0.88 + 0.2 * bubble;
  #endif
  diffuseColor.rgb *= uTint * layerShade;
  // Wet froth keeps a sheen, and thin films near the rim let a little light through.
  float roughnessFactor = clamp( uRough * ( 0.8 + 0.5 * ( 1.0 - smoothstep( 0.0, 1.0, length( lp.xz ) / max( uRadius, 1e-4 ) ) ) ), 0.05, 1.0 );
#else
  float grain = sFbm( lp * uGrain );
  float lump = sNoise( lp * uGrain * 0.22 + 3.7 );
  float layerHeightField = ( grain * 0.00025 + lump * 0.0006 ) * uLump;
  diffuseColor.rgb *= uTint * ( 0.76 + 0.36 * grain ) * ( 0.88 + 0.24 * lump ) * ( 1.0 - 0.22 * uWet );
  float roughnessFactor = clamp( uRough * ( 0.85 + 0.3 * grain ) - 0.3 * uWet, 0.04, 1.0 );
#endif
float metalnessFactor = uMetal;
diffuseColor.rgb *= submergedTint( lp, uUp, uPlane, uSigmaT, uTintDepth );
`;

const LAYER_NORMAL = /* glsl */ `
#ifdef LAYER_HIGH
normal = sBump( - vViewPosition, normal, layerHeightField, faceDirection );
if ( uSparkle > 0.001 ) normal = normalize( normal + ( sHash3( floor( lp * uGrain * 0.7 ) ) - 0.5 ) * uSparkle );
#endif
`;

const LAYER_EMISSIVE = /* glsl */ `
if ( uGlow > 0.001 ) {
  float spread = sNoise( lp * 320.0 ) * 0.72 + sNoise( lp * 1500.0 + uTime * 0.7 ) * 0.28;
  float mask = smoothstep( 1.0 - uGlow - 0.12, 1.0 - uGlow + 0.06, spread );
  totalEmissiveRadiance += uGlowColor * mask * ( 1.6 + 0.7 * sin( uTime * 8.0 + spread * 25.0 ) );
}
`;

// Opaque contents render in the transparent phase, after the fluid tinted the background behind them.
export const afterAbsorption = (material) => {
  material.transparent = true;
  material.depthWrite = true;
  return material;
};

export const createLayerUniforms = () => ({
  uTopY: { value: 0 },
  uBottomY: { value: -1 },
  uRadius: { value: 0.01 },
  uMound: { value: 0 },
  uRelief: { value: 0.0004 },
  uCoverage: { value: 1 },
  uTint: { value: new Color("#ffffff") },
  uGrain: { value: 1600 },
  uLump: { value: 0.6 },
  uRough: { value: 0.9 },
  uSparkle: { value: 0 },
  uMetal: { value: 0 },
  uWet: { value: 0 },
  uGlowColor: { value: new Color("#ff5a1f") },
  uGlow: { value: 0 },
  uTime: { value: 0 },
  uUp: { value: new Vector3(0, 1, 0) },
  uPlane: { value: 0 },
  uMeniscus: { value: 0.0015 },
  uMeniscusWidth: { value: 0.0025 },
  uSigmaT: { value: new Vector3() },
  uTintDepth: { value: 0 },
});

// mode: "bed" (settled solids), "float" (unwetted powder on the surface) or "foam".
export const createLayerMaterial = (uniforms, mode, quality) => {
  const material = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, metalness: 0 });
  afterAbsorption(material);
  material.defines = { [`LAYER_${mode.toUpperCase()}`]: "" };
  if (quality !== "low") material.defines.LAYER_HIGH = "";
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nattribute float aPart;\nattribute float aEdge;\nattribute float aFrac;\n${LAYER_UNIFORMS}\n${NOISE}\n${LAYER_HEIGHT}`)
      .replace("#include <beginnormal_vertex>", layerVertex)
      .replace("#include <begin_vertex>", "vec3 transformed = layerPos;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${LAYER_UNIFORMS}\n${NOISE}\n${BUMP}\n${SUBMERGED}\n${LAYER_HEIGHT}`)
      .replace("#include <clipping_planes_fragment>", layerClip)
      .replace("#include <map_fragment>", `#include <map_fragment>\n${LAYER_SURFACE}`)
      .replace("#include <roughnessmap_fragment>", "")
      .replace("#include <metalnessmap_fragment>", "")
      .replace("#include <normal_fragment_maps>", LAYER_NORMAL)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${LAYER_EMISSIVE}`);
  };
  material.customProgramCacheKey = () => `kit-layer-${mode}-${quality}`;
  return material;
};

const COLUMN_UNIFORMS = /* glsl */ `
#define COLUMN_RADII ${SHADER_RADII}
uniform float uRadii[ COLUMN_RADII + 1 ];
uniform float uFloor;
uniform float uTop;
uniform float uColumnTop;
uniform float uMouthR;
uniform float uSeed;
varying vec3 vColumnLocal;
`;

const COLUMN_SHAPE = /* glsl */ `
float columnProfile( float y ) {
  float f = clamp( ( y - uFloor ) / ( uTop - uFloor ), 0.0, 1.0 ) * float( COLUMN_RADII );
  int i = min( int( f ), COLUMN_RADII - 1 );
  return mix( uRadii[ i ], uRadii[ i + 1 ], f - float( i ) );
}
vec3 columnPoint( float v, float angle, float capT ) {
  float y = mix( uFloor, uColumnTop, v );
  float s = uColumnTop - y;
  float wobble = ( sFbm( vec3( sin( angle ) * 2.2, cos( angle ) * 2.2, s * 130.0 + uSeed ) ) - 0.5 );
  float inside = max( 0.0005, columnProfile( min( y, uTop ) ) - 0.0006 ) * ( 1.0 + wobble * 0.12 );
  float above = uMouthR * ( 0.92 + wobble * 0.5 );
  float r = mix( inside, above, smoothstep( uTop - 0.004, uTop + 0.008, y ) );
  float dome = capT * 1.5707963;
  r *= cos( dome );
  y += sin( dome ) * uMouthR * ( 0.5 + wobble * 0.4 );
  float lift = max( 0.0, y - uTop );
  return vec3( sin( angle ) * r + lift * 0.18, y, cos( angle ) * r + lift * 0.07 );
}
`;

// Sugar + concentrated sulfuric acid: a porous carbon column extruded up out of the beaker.
export const createColumnMaterial = (uniforms, quality) => {
  const material = new MeshStandardMaterial({ color: "#100d0b", roughness: 0.85, metalness: 0 });
  afterAbsorption(material);
  material.defines = quality === "low" ? {} : { COLUMN_HIGH: "" };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nattribute float aV;\nattribute float aAngle;\nattribute float aCap;\n${COLUMN_UNIFORMS}\n${NOISE}\n${COLUMN_SHAPE}`)
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        vec3 columnPos = columnPoint( aV, aAngle, aCap );
        vec3 columnA = columnPoint( aV, aAngle + 0.05, aCap );
        vec3 columnB = aCap > 0.0 ? columnPoint( aV, aAngle, min( 1.0, aCap + 0.05 ) ) : columnPoint( min( 1.0, aV + 0.01 ), aAngle, aCap );
        vec3 objectNormal = normalize( cross( columnA - columnPos, columnB - columnPos ) );
        vColumnLocal = columnPos;
      `,
      )
      .replace("#include <begin_vertex>", "vec3 transformed = columnPos;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${COLUMN_UNIFORMS}\n${NOISE}\n${BUMP}`)
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        vec3 cp = vec3( vColumnLocal.x, uColumnTop - vColumnLocal.y, vColumnLocal.z ) * 520.0;
        float crumbs = sFbm( cp * 1.7 );
        #ifdef COLUMN_HIGH
          vec2 cells = sCells( cp );
          float pore = 1.0 - smoothstep( 0.16, 0.44, cells.x );
          float columnHeight = crumbs * 0.0004 - pore * 0.0011;
        #else
          float pore = smoothstep( 0.62, 0.9, sNoise( cp ) );
          float columnHeight = crumbs * 0.0004 - pore * 0.0008;
        #endif
        diffuseColor.rgb *= ( 0.5 + 1.5 * crumbs ) * ( 1.0 - 0.8 * pore ) + vec3( 0.06, 0.03, 0.01 ) * crumbs;
        float roughnessFactor = clamp( 0.92 - 0.35 * crumbs + 0.2 * pore, 0.2, 1.0 );
      `,
      )
      .replace("#include <roughnessmap_fragment>", "")
      .replace("#include <normal_fragment_maps>", "normal = sBump( - vViewPosition, normal, columnHeight, faceDirection );");
  };
  material.customProgramCacheKey = () => `kit-column-${quality}`;
  return material;
};

// Silver needles that extend from their roots as the tree grows.
export const createCrystalMaterial = (uniforms) => {
  const material = new MeshStandardMaterial({ color: "#c9ccce", roughness: 0.3, metalness: 1 });
  afterAbsorption(material);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 aRoot;\nattribute float aBirth;\nuniform float uGrowth;")
      .replace(
        "#include <begin_vertex>",
        "vec3 transformed = aRoot + ( position - aRoot ) * clamp( ( uGrowth - aBirth ) / 0.35, 0.0, 1.0 );",
      );
  };
  material.customProgramCacheKey = () => "kit-crystals";
  return material;
};

export const createPieceUniforms = () => ({
  uSigmaT: { value: new Vector3() },
  uUp: { value: new Vector3(0, 1, 0) },
  uPlane: { value: 0 },
  uTintDepth: { value: 0 },
  uCoatColor: { value: new Color("#b5552b") },
  uCoat: { value: 0 },
  uCoatRough: { value: 0.75 },
  uCoatMetal: { value: 0.2 },
  uGlowColor: { value: new Color("#ff5a1f") },
  uGlow: { value: 0 },
  uMolten: { value: 0 },
  uTime: { value: 0 },
});

// Deposits, glow and melting on a piece of metal; the base material still supplies the metal itself.
export const patchPieceMaterial = (material, uniforms, quality) => {
  afterAbsorption(material);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uMolten;\nvarying vec3 vPieceLocal;\nvarying vec3 vPieceVessel;")
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = normalize( mix( normal, normalize( position ), uMolten ) );")
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = mix( position, normalize( position ) * 0.92, uMolten );
        vPieceLocal = position;
        #ifdef USE_INSTANCING
          vPieceVessel = ( instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
        #else
          vPieceVessel = transformed;
        #endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nuniform vec3 uCoatColor;\nuniform float uCoat;\nuniform float uCoatRough;\nuniform float uCoatMetal;\nuniform vec3 uGlowColor;\nuniform float uGlow;\nuniform float uMolten;\nuniform float uTime;\nuniform vec3 uSigmaT;\nuniform vec3 uUp;\nuniform float uPlane;\nuniform float uTintDepth;\nvarying vec3 vPieceLocal;\nvarying vec3 vPieceVessel;\n${NOISE}\n${SUBMERGED}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `
        #include <roughnessmap_fragment>
        float coat = 0.0;
        if ( uCoat > 0.001 ) {
          float grown = sNoise( vPieceLocal * 5.5 + 1.7 ) * 0.62 + sNoise( vPieceLocal * 17.0 ) * 0.38;
          coat = smoothstep( 1.0 - uCoat - 0.14, 1.0 - uCoat + 0.1, grown );
          diffuseColor.rgb = mix( diffuseColor.rgb, uCoatColor * ( 0.7 + 0.6 * sNoise( vPieceLocal * 42.0 ) ), coat );
        }
        roughnessFactor = mix( mix( roughnessFactor, uCoatRough, coat ), 0.07, uMolten );
        diffuseColor.rgb *= submergedTint( vPieceVessel, uUp, uPlane, uSigmaT, uTintDepth );
      `,
      )
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix( metalnessFactor, uCoatMetal, coat );")
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlowColor * uGlow * ( 0.85 + 0.15 * sin( uTime * 11.0 + vPieceLocal.y * 30.0 ) );",
      );
  };
  material.customProgramCacheKey = () => `kit-piece-${quality}`;
  return material;
};
