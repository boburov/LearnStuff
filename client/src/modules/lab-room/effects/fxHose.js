import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Mesh, MeshStandardMaterial, Vector3 } from "three";

const _from = new Vector3();
const _to = new Vector3();

// Translucent silicone: light travels further through the tube at grazing angles, so the edges darken and warm.
const createHoseMaterial = () => {
  const material = new MeshStandardMaterial({ color: "#cdc0ad", roughness: 0.34, metalness: 0 });
  const uniforms = { uCore: { value: new Color("#ded3c2") }, uEdge: { value: new Color("#9d8b73") } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uCore;\nuniform vec3 uEdge;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
float hoseFacing = saturate( dot( normal, normalize( vViewPosition ) ) );
diffuseColor.rgb = mix( uEdge, uCore, pow( hoseFacing, 0.7 ) );
totalEmissiveRadiance += uCore * 0.04 * ( 1.0 - hoseFacing );`,
      );
  };
  material.customProgramCacheKey = () => "fx-hose";
  return material;
};

const buildTube = (along, around) => {
  const geometry = new BufferGeometry();
  const vertices = (along + 1) * (around + 1);
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(vertices * 3), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(vertices * 3), 3));
  const index = [];
  for (let i = 0; i < along; i += 1) {
    for (let j = 0; j < around; j += 1) {
      const a = i * (around + 1) + j;
      const b = a + around + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  geometry.setIndex(index);
  geometry.attributes.position.setUsage(DynamicDrawUsage);
  geometry.attributes.normal.setUsage(DynamicDrawUsage);
  geometry.boundingSphere = null;
  return geometry;
};

// A sagging rubber hose between two world points; positions are rewritten in place every frame.
export const createHose = ({ quality, radius = 0.005 }) => {
  const low = quality === "low";
  const along = low ? 22 : 40;
  const around = low ? 7 : 10;
  const geometry = buildTube(along, around);
  const material = createHoseMaterial();
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.castShadow = !low;
  mesh.visible = false;

  const position = geometry.attributes.position.array;
  const normal = geometry.attributes.normal.array;
  const points = new Float32Array((along + 1) * 3);
  let time = 0;
  let twitch = 0;

  const update = (frame, params) => {
    const { dt } = frame;
    time += dt;
    if (!params) {
      mesh.visible = false;
      return;
    }
    _from.copy(params.from);
    _to.copy(params.to);
    mesh.position.copy(_to);

    const dx = _from.x - _to.x;
    const dy = _from.y - _to.y;
    const dz = _from.z - _to.z;
    const chord = Math.hypot(dx, dy, dz);
    const rest = Math.max(chord * 1.22, chord + 0.1);
    const sag = Math.min(0.28, 0.45 * Math.sqrt(Math.max(0, rest * rest - chord * chord)));
    // Gas leaving the far end kicks the hose in short pulses.
    twitch += ((params.bubbling ? 1 : 0) - twitch) * (1 - Math.exp(-dt / 0.25));
    const kick = twitch * 0.0016 * (Math.sin(time * 27) + 0.6 * Math.sin(time * 41.3));

    for (let i = 0; i <= along; i += 1) {
      const u = i / along;
      points[i * 3] = dx * (1 - u) + kick * u * u;
      points[i * 3 + 1] = dy * (1 - u) - sag * 4 * u * (1 - u);
      points[i * 3 + 2] = dz * (1 - u) + kick * 0.6 * u * u;
    }

    // Parallel transport keeps the ring orientation from twisting along the curve.
    let nx = 0;
    let ny = 1;
    let nz = 0;
    for (let i = 0; i <= along; i += 1) {
      const a = Math.max(0, i - 1) * 3;
      const b = Math.min(along, i + 1) * 3;
      let tx = points[b] - points[a];
      let ty = points[b + 1] - points[a + 1];
      let tz = points[b + 2] - points[a + 2];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl;
      ty /= tl;
      tz /= tl;
      const dot = nx * tx + ny * ty + nz * tz;
      nx -= tx * dot;
      ny -= ty * dot;
      nz -= tz * dot;
      let nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-4) {
        nx = 1;
        ny = 0;
        nz = 0;
        nl = 1;
      }
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const bx = ty * nz - tz * ny;
      const by = tz * nx - tx * nz;
      const bz = tx * ny - ty * nx;
      for (let j = 0; j <= around; j += 1) {
        const ang = (j / around) * Math.PI * 2;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const ox = nx * ca + bx * sa;
        const oy = ny * ca + by * sa;
        const oz = nz * ca + bz * sa;
        const k = (i * (around + 1) + j) * 3;
        position[k] = points[i * 3] + ox * radius;
        position[k + 1] = points[i * 3 + 1] + oy * radius;
        position[k + 2] = points[i * 3 + 2] + oz * radius;
        normal[k] = ox;
        normal[k + 1] = oy;
        normal[k + 2] = oz;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    mesh.visible = true;
  };

  return {
    object: mesh,
    update,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
};
