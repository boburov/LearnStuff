import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  CYCLE,
  EXHAUST_PATH,
  EXHAUST_PIPE_RADIUS,
  GAS_COLORS,
  GEOM,
  INTAKE_PATH,
  INTAKE_PIPE_RADIUS,
  valveLift,
} from "../../engineMath";

const COUNT = 28;
const RADIUS = 0.035;
const LUT_SIZE = 200;
const HIDE_AFTER = 0.6;
const GOLDEN = 2.399963;
const _m = new THREE.Matrix4();
const noRaycast = () => null;

const frac = (x) => x - Math.floor(x);

const STREAMS = [
  { which: "intake", path: INTAKE_PATH, pipe: INTAKE_PIPE_RADIUS, color: GAS_COLORS.mixture, speed: 1.6, seed: 0.13 },
  { which: "exhaust", path: EXHAUST_PATH, pipe: EXHAUST_PIPE_RADIUS, color: GAS_COLORS.exhaust, speed: 2.4, seed: 0.57 },
];

// Arc-length table so the frame loop never touches the curve API (which allocates).
const buildTrack = (stream) => {
  const curve = new THREE.CatmullRomCurve3(stream.path.map((p) => new THREE.Vector3(...p)));
  const pts = curve.getSpacedPoints(LUT_SIZE - 1);
  const pos = new Float32Array(LUT_SIZE * 3);
  const nrm = new Float32Array(LUT_SIZE * 2);
  for (let i = 0; i < LUT_SIZE; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(LUT_SIZE - 1, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    pos.set([pts[i].x, pts[i].y, pts[i].z], i * 3);
    nrm.set([-ty / tl, tx / tl], i * 2);
  }
  const offsets = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const r = Math.sqrt(frac(i * 0.618034 + stream.seed)) * stream.pipe * 0.6;
    const a = i * GOLDEN;
    offsets[i * 4] = r * Math.cos(a);
    offsets[i * 4 + 1] = r * Math.sin(a);
    offsets[i * 4 + 2] = (frac(i * 0.754878 + stream.seed) - 0.5) * (0.7 / COUNT);
    offsets[i * 4 + 3] = 0.75 + 0.5 * frac(i * 0.319 + stream.seed);
  }
  return { pos, nrm, offsets, length: curve.getLength() };
};

const Stream = ({ simRef, stream }) => {
  const meshRef = useRef(null);
  const st = useRef({ last: null, phase: 0, closedFor: 99, vis: 0 });

  const assets = useMemo(() => {
    const track = buildTrack(stream);
    const geometry = new THREE.SphereGeometry(RADIUS, 12, 8);
    const material = new THREE.MeshStandardMaterial({
      color: stream.color,
      emissive: stream.color,
      emissiveIntensity: 0.35,
      roughness: 0.55,
      metalness: 0,
    });
    return { track, geometry, material };
  }, [stream]);
  useEffect(
    () => () => {
      assets.geometry.dispose();
      assets.material.dispose();
    },
    [assets],
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const s = st.current;
    const theta = simRef.current.theta;
    let d = s.last == null ? 0 : theta - s.last;
    if (d > CYCLE / 2) d -= CYCLE;
    else if (d < -CYCLE / 2) d += CYCLE;
    s.last = theta;

    const open = valveLift(theta, stream.which) / GEOM.valveMaxLift;
    if (open > 0) s.closedFor = 0;
    else s.closedFor += Math.abs(d);
    s.phase = frac(s.phase + (stream.speed * open * d) / assets.track.length);
    const target = s.closedFor < HIDE_AFTER ? 1 : 0;
    s.vis += (target - s.vis) * Math.min(1, delta * 5);
    if (s.vis < 0.002 && target === 0) {
      if (mesh.visible) mesh.visible = false;
      return;
    }
    mesh.visible = true;

    const { pos, nrm, offsets } = assets.track;
    for (let i = 0; i < COUNT; i++) {
      const u = frac(i / COUNT + s.phase + offsets[i * 4 + 2]);
      const f = u * (LUT_SIZE - 1);
      const j = Math.min(LUT_SIZE - 2, Math.floor(f));
      const t = f - j;
      const px = pos[j * 3] + (pos[j * 3 + 3] - pos[j * 3]) * t;
      const py = pos[j * 3 + 1] + (pos[j * 3 + 4] - pos[j * 3 + 1]) * t;
      const pz = pos[j * 3 + 2] + (pos[j * 3 + 5] - pos[j * 3 + 2]) * t;
      const nx = nrm[j * 2];
      const ny = nrm[j * 2 + 1];
      const a = offsets[i * 4];
      const b = offsets[i * 4 + 1];
      const ends = Math.min(1, u / 0.06, (1 - u) / 0.06);
      const scale = s.vis * ends * offsets[i * 4 + 3];
      _m.makeScale(scale, scale, scale).setPosition(px + nx * a, py + ny * a, pz + b);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[assets.geometry, assets.material, COUNT]}
      frustumCulled={false}
      raycast={noRaycast}
      visible={false}
    />
  );
};

const GasFlow = ({ simRef }) => (
  <group>
    {STREAMS.map((stream) => (
      <Stream key={stream.which} simRef={simRef} stream={stream} />
    ))}
  </group>
);

export default GasFlow;
