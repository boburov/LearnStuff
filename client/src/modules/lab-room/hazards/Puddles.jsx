import { useCallback, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, Mesh, ShaderMaterial } from "three";
import { useKit } from "../equipment/kit/kitContext";
import { FX_PRIORITY, createQuadInstances, markInstances, useFxSystem } from "../effects/fxCore";
import Flame from "../effects/Flame";

const MAX_PUDDLES = 24;
const MAX_FIRES = 4;
const LIFT = 0.0022;

const VERTEX = /* glsl */ `
attribute vec3 aCenter;
attribute vec3 aColor;
attribute vec4 aParams;
attribute vec2 aLook;
varying vec2 vUv;
varying vec3 vColor;
varying vec4 vParams;
varying vec2 vLook;
void main() {
  vUv = position.xy;
  vColor = aColor;
  vParams = aParams;
  vLook = aLook;
  vec3 world = aCenter + vec3(position.x * aParams.x, 0.0, position.y * aParams.x);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
}
`;

// aParams = [radius, opacity, scorch, wet], aLook = [seed, acid]. A wet film mostly shows as reflected light.
const FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying vec3 vColor;
varying vec4 vParams;
varying vec2 vLook;
uniform vec3 uCeiling;
void main() {
  float d = length(vUv);
  float a = atan(vUv.y, vUv.x);
  float seed = vLook.x;
  float edge = 0.8 + 0.1 * sin(a * 3.0 + seed * 6.28) + 0.05 * sin(a * 5.0 - seed * 11.0);
  float mask = smoothstep(edge, edge - 0.05, d);
  if (mask <= 0.003) discard;
  float wet = vParams.w;
  float rim = smoothstep(edge - 0.16, edge, d);
  // Ceiling panels reflected in the film: a stretched highlight plus a bright meniscus at the rim.
  float sheen = smoothstep(0.7, 0.05, length((vUv - vec2(-0.2, 0.3)) * vec2(1.3, 2.2)));
  float gloss = wet * (0.05 + 0.6 * sheen + 0.45 * rim * rim * rim);
  vec3 col = mix(vColor * 0.45, uCeiling, clamp(gloss, 0.0, 0.8));
  col = mix(col, vec3(0.085, 0.07, 0.06), vParams.z);
  // A dried acid spill leaves a pale etched ring.
  float etch = vLook.y * (1.0 - wet) * (0.25 + 0.6 * rim);
  col = mix(col, vec3(0.82, 0.8, 0.74), etch);
  float alpha = mask * clamp(max(max(vParams.y * (0.3 + 0.6 * rim), gloss), max(vParams.z * 0.85, etch)), 0.0, 0.95);
  gl_FragColor = vec4(col, alpha);
}
`;

const createDecals = () => {
  const geometry = createQuadInstances(MAX_PUDDLES, [
    ["aCenter", 3],
    ["aColor", 3],
    ["aParams", 4],
    ["aLook", 2],
  ]);
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uCeiling: { value: new Color("#cdd4dc") } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  const centers = geometry.getAttribute("aCenter");
  const colors = geometry.getAttribute("aColor");
  const params = geometry.getAttribute("aParams");
  const look = geometry.getAttribute("aLook");
  const tint = new Color();

  const update = (puddles) => {
    let n = 0;
    for (const puddle of puddles) {
      if (n >= MAX_PUDDLES || puddle.radius <= 0.005) continue;
      centers.array.set([puddle.position[0], puddle.position[1] + LIFT, puddle.position[2]], n * 3);
      tint.set(puddle.color);
      colors.array.set([tint.r, tint.g, tint.b], n * 3);
      const wet = Math.min(1, puddle.ml / 8);
      const seed = (Number.parseInt(puddle.id.slice(1), 10) % 17) / 17;
      params.array.set([Math.max(0.03, puddle.radius), Math.min(0.9, puddle.opacity * 0.7 + 0.2) * wet, puddle.scorch, wet], n * 4);
      look.array.set([seed, puddle.acidic ? 1 : 0], n * 2);
      n += 1;
    }
    geometry.instanceCount = n;
    markInstances(centers, n);
    markInstances(colors, n);
    markInstances(params, n);
    markInstances(look, n);
    mesh.visible = n > 0;
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

const sameFires = (a, b) =>
  a.length === b.length && a.every((fire, i) => fire.id === b[i].id && Math.abs(fire.radius - b[i].radius) < 0.06);

const burningNow = (puddles) => {
  const fires = [];
  for (const puddle of puddles) {
    if (!puddle.burning || fires.length >= MAX_FIRES) continue;
    fires.push({ id: puddle.id, position: [puddle.position[0], puddle.position[1] + 0.004, puddle.position[2]], radius: puddle.radius });
  }
  return fires;
};

const flameParams = (lab, id) => {
  const puddle = lab.hazards.puddles.find((p) => p.id === id);
  if (!puddle?.burning) return null;
  return { kind: "puddle", intensity: Math.min(1, 0.4 + puddle.flammableMl / 20) };
};

// Spilled liquid on the benches and the floor, with its flames and scorch marks.
const Puddles = ({ lab }) => {
  const { quality } = useKit();
  const create = useCallback(() => createDecals(), []);
  const decalsRef = useFxSystem(create, (system) => system.update(lab.hazards.puddles));
  const [fires, setFires] = useState([]);
  const known = useRef(fires);

  // The flame components are React children, so they are re-bound only when the burning set really changes.
  useFrame(() => {
    const next = burningNow(lab.hazards.puddles);
    if (sameFires(next, known.current)) return;
    known.current = next;
    setFires(next);
  }, FX_PRIORITY);

  return (
    <>
      <group ref={decalsRef} />
      {fires.map((fire) => (
        <Flame key={fire.id} origin={fire.position} radius={fire.radius} get={() => flameParams(lab, fire.id)} extras={quality !== "low"} />
      ))}
    </>
  );
};

export default Puddles;
