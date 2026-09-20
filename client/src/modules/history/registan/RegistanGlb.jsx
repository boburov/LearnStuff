// Loads the real (Draco-compressed) Registan GLB, auto-fits it, and overlays
// clickable part anchors. Clicking the model selects the nearest labelled part.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { PARTS } from "./registan";

const URL = "/models/registan.glb";
const DRACO = "/draco/";
const TARGET = 60; // fit the longest dimension to ~60 units

const Dot = ({ pos, name, active, onClick }) => {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      const k = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      ref.current.scale.setScalar(active ? k * 1.5 : k);
    }
  });
  return (
    <group position={pos}>
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <sphereGeometry args={[0.7, 20, 20]} />
        <meshBasicMaterial color={active ? "#f59e0b" : "#22d3ee"} transparent opacity={0.95} />
      </mesh>
      {active && (
        <Html center distanceFactor={42} className="pointer-events-none">
          <div className="whitespace-nowrap rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">
            {name}
          </div>
        </Html>
      )}
    </group>
  );
};

const RegistanGlb = ({ selectedId, onSelect }) => {
  const { scene } = useGLTF(URL, DRACO);

  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = TARGET / maxDim;
    const hsY = (size.y * scale) / 2;
    // Position so the model is x/z-centred and its base sits at y = 0.
    const offset = [-center.x * scale, -center.y * scale + hsY, -center.z * scale];
    const anchors = {};
    PARTS.forEach((p) => {
      anchors[p.id] = [
        (p.frac[0] - 0.5) * size.x * scale,
        (p.frac[1] - 0.5) * size.y * scale + hsY,
        (p.frac[2] - 0.5) * size.z * scale,
      ];
    });
    return { scale, offset, anchors };
  }, [scene]);

  const onModelClick = (e) => {
    e.stopPropagation();
    const p = e.point;
    let best = null;
    let bd = Infinity;
    PARTS.forEach((part) => {
      const a = fit.anchors[part.id];
      const d = (p.x - a[0]) ** 2 + (p.y - a[1]) ** 2 + (p.z - a[2]) ** 2;
      if (d < bd) {
        bd = d;
        best = part;
      }
    });
    if (best) onSelect(best.id);
  };

  return (
    <group>
      <hemisphereLight args={["#fff6e0", "#5a4a35", 0.9]} />
      <group position={fit.offset} scale={fit.scale}>
        <primitive object={scene} onClick={onModelClick} />
      </group>
      {PARTS.map((p) => (
        <Dot
          key={p.id}
          pos={fit.anchors[p.id]}
          name={p.name}
          active={selectedId === p.id}
          onClick={() => onSelect(p.id)}
        />
      ))}
    </group>
  );
};

useGLTF.preload(URL, DRACO);
export default RegistanGlb;
