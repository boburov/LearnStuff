import { DoubleSide, Mesh, MeshPhysicalMaterial, PlaneGeometry, Vector3 } from "three";
import { acquireNoise, releaseNoise } from "./fxNoise";

const _camera = new Vector3();

// Hot air above a flame bends what is behind it; a thin transmissive sheet with animated normals does the same.
const PATCH = /* glsl */ `
#include <normal_fragment_maps>
vec3 shimmerN = texture( uNoise, vec3( vShimmerUv * uShimmer.x + vec2( 0.0, - uTime * uShimmer.z ), uTime * 0.2 ) ).rgb - 0.5;
shimmerN += texture( uNoise, vec3( vShimmerUv * uShimmer.x * 2.3 + vec2( 0.0, - uTime * uShimmer.z * 1.7 ), uTime * 0.3 ) ).rgb - 0.5;
float shimmerEdge = smoothstep( 0.0, 0.3, vShimmerUv.x ) * smoothstep( 1.0, 0.7, vShimmerUv.x )
  * smoothstep( 0.0, 0.25, vShimmerUv.y ) * smoothstep( 1.0, 0.55, vShimmerUv.y );
normal = normalize( normal + vec3( shimmerN.xy * 1.2 * shimmerEdge, 0.0 ) );
`;

// three's volume refraction also pushes the sample deeper, which shows up as a zoomed rectangle; sampling
// with a purely sideways offset keeps the sheet invisible except for the wobble itself.
const TRANSMISSION = /* glsl */ `
#ifdef USE_TRANSMISSION
  vec3 shimmerPos = vWorldPosition;
  vec3 shimmerView = normalize( cameraPosition - shimmerPos );
  vec3 shimmerWorldN = inverseTransformDirection( normal, viewMatrix );
  vec3 shimmerOffset = ( shimmerWorldN - dot( shimmerWorldN, shimmerView ) * shimmerView ) * uShimmer.y * shimmerEdge;
  vec4 shimmerNdc = projectionMatrix * viewMatrix * vec4( shimmerPos + shimmerOffset, 1.0 );
  vec2 shimmerUv = shimmerNdc.xy / shimmerNdc.w * 0.5 + 0.5;
  totalDiffuse = texture2D( transmissionSamplerMap, shimmerUv ).rgb;
  totalSpecular = vec3( 0.0 );
  material.transmissionAlpha = 1.0;
#endif
`;

export const createShimmer = ({ quality }) => {
  if (quality === "low") return null;
  const noise = acquireNoise();
  const geometry = new PlaneGeometry(1, 1);
  geometry.translate(0, 0.5, 0);
  const material = new MeshPhysicalMaterial({
    transmission: 1,
    roughness: 0,
    metalness: 0,
    thickness: 0.03,
    ior: 1.12,
    specularIntensity: 0,
    side: DoubleSide,
    depthWrite: false,
  });
  const uniforms = {
    uNoise: { value: noise },
    uTime: { value: 0 },
    uShimmer: { value: new Vector3(2.5, 0.004, 0.35) },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vShimmerUv;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvShimmerUv = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler3D uNoise;\nuniform float uTime;\nuniform vec3 uShimmer;\nvarying vec2 vShimmerUv;")
      .replace("#include <normal_fragment_maps>", PATCH)
      .replace("#include <transmission_fragment>", TRANSMISSION);
  };
  material.customProgramCacheKey = () => "fx-shimmer";
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  let time = 0;

  const update = (dt, params, camera) => {
    time += dt;
    if (!params || params.strength <= 0.01) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.scale.set(params.width, params.height, 1);
    mesh.position.set(0, params.y, 0);
    // Cylindrical billboard: the sheet turns to face the player but stays upright.
    mesh.getWorldPosition(_camera);
    mesh.rotation.y = Math.atan2(camera.position.x - _camera.x, camera.position.z - _camera.z);
    uniforms.uTime.value = time;
    uniforms.uShimmer.value.set(2.2 / Math.max(0.02, params.width), 0.005 * params.strength, 0.4);
  };

  return {
    object: mesh,
    update,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      releaseNoise();
    },
  };
};
