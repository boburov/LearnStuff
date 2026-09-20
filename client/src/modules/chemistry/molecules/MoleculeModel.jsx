// Ball-and-stick molecule. Atoms are CPK-coloured spheres; bonds are two-tone
// cylinders (double/triple bonds drawn as parallel strands). The molecule is
// scaled to a consistent on-screen size and slowly auto-rotates (pausable).
import { useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { usePausableFrame } from "@/shared/lab/usePausableFrame";
import { getElementMeta } from "@/modules/chemistry/data/molecules";

const BOND_RADIUS = 0.09;
const MULTI_BOND_SEP = 0.16;
const TARGET_RADIUS = 2.3;

// Pre-compute the two-tone cylinder strands for every bond.
const buildBonds = (molecule) => {
  const out = [];
  for (const [i, j, order = 1] of molecule.bonds) {
    const a = molecule.atoms[i];
    const b = molecule.atoms[j];
    if (!a || !b) continue;

    const pa = new THREE.Vector3(...a.pos);
    const pb = new THREE.Vector3(...b.pos);
    const dir = new THREE.Vector3().subVectors(pb, pa).normalize();
    const ref =
      Math.abs(dir.y) < 0.95
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(dir, ref).normalize();

    const colorA = getElementMeta(a.el).color;
    const colorB = getElementMeta(b.el).color;

    const offsets =
      order === 2 ? [-MULTI_BOND_SEP, MULTI_BOND_SEP]
      : order === 3 ? [-MULTI_BOND_SEP, 0, MULTI_BOND_SEP]
      : [0];
    const radius = order >= 2 && order <= 3 ? BOND_RADIUS * 0.6 : BOND_RADIUS;

    for (const o of offsets) {
      const shift = perp.clone().multiplyScalar(o);
      const sA = pa.clone().add(shift);
      const sB = pb.clone().add(shift);
      const mid = new THREE.Vector3().addVectors(sA, sB).multiplyScalar(0.5);
      out.push({ start: sA, end: mid, color: colorA, radius });
      out.push({ start: mid, end: sB, color: colorB, radius });
    }
  }
  return out;
};

const Bond = ({ start, end, color, radius }) => {
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { position: mid, quaternion: quat, length: len };
  }, [start, end]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
    </mesh>
  );
};

const Atom = ({ el, pos }) => {
  const [hover, setHover] = useState(false);
  const meta = getElementMeta(el);

  return (
    <group position={pos}>
      <mesh
        scale={hover ? 1.22 : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <sphereGeometry args={[meta.radius, 32, 32]} />
        <meshStandardMaterial
          color={meta.color}
          roughness={0.35}
          metalness={0.15}
          emissive={meta.color}
          emissiveIntensity={hover ? 0.45 : 0.1}
        />
      </mesh>
      {hover && (
        <Html center distanceFactor={8} className="pointer-events-none">
          <div className="whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background">
            {meta.name} ({el})
          </div>
        </Html>
      )}
    </group>
  );
};

const MoleculeModel = ({ molecule }) => {
  const group = useRef();
  const bonds = useMemo(() => buildBonds(molecule), [molecule]);

  // Normalise on-screen size: scale so the farthest atom reaches TARGET_RADIUS.
  const scale = useMemo(() => {
    let r = 0;
    for (const a of molecule.atoms) r = Math.max(r, Math.hypot(...a.pos));
    // Lower floor lets large molecules (vitamins, sugars, B12) shrink to fit.
    return Math.max(0.12, Math.min(3.2, TARGET_RADIUS / (r || 1)));
  }, [molecule]);

  usePausableFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.25;
  });

  return (
    <group ref={group} scale={scale}>
      {bonds.map((b, idx) => (
        <Bond key={idx} {...b} />
      ))}
      {molecule.atoms.map((a, idx) => (
        <Atom key={idx} el={a.el} pos={a.pos} />
      ))}
    </group>
  );
};

export default MoleculeModel;
