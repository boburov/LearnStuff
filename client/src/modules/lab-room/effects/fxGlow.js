import { AdditiveBlending, Color, Mesh, PlaneGeometry, ShaderMaterial } from "three";

const VERTEX = /* glsl */ `
uniform float uSize;
uniform float uPull;
varying vec2 vUv;
void main() {
  vUv = position.xy * 2.0;
  vec4 mv = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  // Pulled toward the camera so nearby surfaces don't cut the halo with a hard line.
  mv.xyz += normalize( - mv.xyz ) * min( uSize * uPull, max( - mv.z - 0.12, 0.0 ) );
  mv.xy += position.xy * 2.0 * uSize;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uCore;
varying vec2 vUv;
void main() {
  float r = length( vUv );
  if ( r >= 1.0 ) discard;
  float halo = pow( 1.0 - r, 3.0 );
  float core = exp( - r * r * uCore );
  gl_FragColor = vec4( uColor * uIntensity * ( halo * 0.3 + core * 0.7 ), 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// Additive light halo: fakes bloom on Low and gives flashes a body on both tiers.
export const createGlow = ({ core = 30, pull = 0.7 } = {}) => {
  const geometry = new PlaneGeometry(1, 1);
  const material = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color("#ffffff") },
      uIntensity: { value: 0 },
      uSize: { value: 0.1 },
      uCore: { value: core },
      uPull: { value: pull },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.visible = false;

  return {
    object: mesh,
    set: (color, intensity, size) => {
      material.uniforms.uColor.value.copy(color);
      material.uniforms.uIntensity.value = intensity;
      material.uniforms.uSize.value = size;
      mesh.visible = intensity > 1e-3 && size > 1e-4;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
};
