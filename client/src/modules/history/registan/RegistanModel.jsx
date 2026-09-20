// Accurate-ish procedural Registan (no GLB). Three DISTINCT madrasas around a
// square open to the south: Ulug'bek (left), Sher-Dor (right, twin ribbed domes
// + tiger/sun mosaic), Tilya-Kori (back, long facade + off-centre mosque dome).
// Signatures: fluted turquoise domes on tall drums, tall galleried minarets,
// girih tilework. A CameraRig eases the real OrbitControls to the active hotspot.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useSceneControlOptional } from "@/shared/lab/sceneControl";

const SAND = "#c9b189";
const SAND_DMG = "#9a8a6a";
const TURQ = "#2bb7c6";
const TURQ_DMG = "#5c7d7d";
const DRUM = "#127082";
const GOLD = "#d9b44a";
const COBALT = "#1c3f8f";

// --- canvas textures (created client-side in useMemo) ---
const girihTexture = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = COBALT;
  g.fillRect(0, 0, 128, 128);
  const star = (cx, cy, R, r) => {
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8 - Math.PI / 2;
      const rad = i % 2 ? r : R;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
    g.fillStyle = TURQ;
    g.fill();
    g.strokeStyle = GOLD;
    g.lineWidth = 2.5;
    g.stroke();
  };
  star(64, 64, 44, 18);
  [0, 128].forEach((x) => [0, 128].forEach((y) => star(x, y, 26, 10)));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

const lionTexture = () => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 150;
  const g = c.getContext("2d");
  g.fillStyle = COBALT;
  g.fillRect(0, 0, 256, 150);
  // rising sun with face
  g.fillStyle = GOLD;
  g.beginPath();
  g.arc(128, 60, 20, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = GOLD;
  g.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * 23, 60 + Math.sin(a) * 23);
    g.lineTo(128 + Math.cos(a) * 31, 60 + Math.sin(a) * 31);
    g.stroke();
  }
  // two mirrored tigers chasing deer
  const tiger = (dir) => {
    g.save();
    g.translate(128, 108);
    g.scale(dir, 1);
    g.fillStyle = "#d98a3d";
    g.beginPath();
    g.ellipse(42, 0, 34, 13, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(74, -6, 9, 0, Math.PI * 2);
    g.fill();
    g.fillRect(20, 10, 5, 16);
    g.fillRect(52, 10, 5, 16);
    // stripes
    g.strokeStyle = "#7a3d10";
    g.lineWidth = 2;
    for (let i = -1; i < 3; i++) {
      g.beginPath();
      g.moveTo(35 + i * 12, -10);
      g.lineTo(35 + i * 12, 10);
      g.stroke();
    }
    g.restore();
  };
  tiger(1);
  tiger(-1);
  return new THREE.CanvasTexture(c);
};

// Fluted (melon-ribbed) dome cap: a sphere top whose radius ripples with azimuth.
const flutedDomeGeometry = (radius, flutes, ampl) => {
  const geo = new THREE.SphereGeometry(radius, flutes * 2, 28, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const az = Math.atan2(v.z, v.x);
    const s = 1 + ampl * Math.cos(flutes * az);
    v.x *= s;
    v.z *= s;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  geo.scale(1, 1.28, 1); // slightly pointed Timurid profile
  return geo;
};

const FlutedDome = ({ position, radius = 2.4, color = TURQ, drumH = 3.4 }) => {
  const geo = useMemo(() => flutedDomeGeometry(radius, 24, 0.05), [radius]);
  return (
    <group position={position}>
      <mesh position={[0, drumH / 2, 0]}>
        <cylinderGeometry args={[radius * 0.78, radius * 0.82, drumH, 40]} />
        <meshStandardMaterial color={DRUM} roughness={0.5} />
      </mesh>
      {/* tile band on the drum */}
      <mesh position={[0, drumH - 0.5, 0]}>
        <cylinderGeometry args={[radius * 0.8, radius * 0.8, 0.7, 40]} />
        <meshStandardMaterial color={COBALT} roughness={0.45} />
      </mesh>
      <mesh geometry={geo} position={[0, drumH, 0]}>
        <meshStandardMaterial color={color} roughness={0.32} metalness={0.18} />
      </mesh>
      <mesh position={[0, drumH + radius * 1.4, 0]}>
        <coneGeometry args={[0.18, 0.7, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
};

// Tall tapering minaret with a muqarnas gallery + lantern cap.
const Minaret = ({ position, height = 17, color = SAND, tilt = 0 }) => (
  <group position={position} rotation={[0, 0, tilt]}>
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[0.42, 0.72, height, 22]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
    {[0.25, 0.5, 0.72].map((f) => (
      <mesh key={f} position={[0, height * f, 0]}>
        <cylinderGeometry args={[0.56, 0.56, 0.35, 22]} />
        <meshStandardMaterial color={TURQ} roughness={0.4} metalness={0.1} />
      </mesh>
    ))}
    {/* gallery balcony */}
    <mesh position={[0, height * 0.84, 0]}>
      <cylinderGeometry args={[0.7, 0.55, 0.6, 22]} />
      <meshStandardMaterial color={GOLD} roughness={0.5} metalness={0.3} />
    </mesh>
    {/* lantern + cap */}
    <mesh position={[0, height * 0.84 + 1, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 1.4, 16]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <mesh position={[0, height * 0.84 + 2, 0]}>
      <coneGeometry args={[0.55, 1.1, 18]} />
      <meshStandardMaterial color={TURQ} roughness={0.35} metalness={0.15} />
    </mesh>
  </group>
);

// Pointed-arch pishtaq wall with an arch opening.
const makePishtaq = (w, h, aw, aBase, aTop) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h);
  s.lineTo(w / 2, h);
  s.lineTo(w / 2, 0);
  s.closePath();
  const hw = aw / 2;
  const hole = new THREE.Path();
  hole.moveTo(-hw, 0.4);
  hole.lineTo(-hw, aBase);
  hole.quadraticCurveTo(-hw, aTop, 0, aTop);
  hole.quadraticCurveTo(hw, aTop, hw, aBase);
  hole.lineTo(hw, 0.4);
  hole.closePath();
  s.holes.push(hole);
  return s;
};

// Two-story arcade of small pointed niches (the hujra facade wings).
const Arcade = ({ width, height = 8, x, tile }) => {
  const cols = Math.max(2, Math.round(width / 2));
  const cw = width / cols;
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, 1]} />
        <meshStandardMaterial color={tile} roughness={0.85} />
      </mesh>
      {[2, height / 2 + 1].map((y, row) =>
        Array.from({ length: cols }).map((_, i) => (
          <mesh key={`${row}-${i}`} position={[-width / 2 + cw / 2 + i * cw, y + 0.4, 0.55]}>
            <boxGeometry args={[cw * 0.55, height / 2 - 1.4, 0.2]} />
            <meshStandardMaterial color="#14201f" roughness={1} />
          </mesh>
        )),
      )}
    </group>
  );
};

// One madrasa, driven by config.
const Madrasa = ({
  position, rotation = [0, 0, 0], scale = 1,
  pishtaqH = 13, pishtaqW = 7, wingW = 5,
  minarets = [], domes = [], mosaic = "girih", damaged = false,
}) => {
  const shape = useMemo(() => makePishtaq(pishtaqW, pishtaqH, pishtaqW * 0.55, pishtaqH * 0.45, pishtaqH * 0.88), [pishtaqW, pishtaqH]);
  const girih = useMemo(() => girihTexture(), []);
  const lion = useMemo(() => lionTexture(), []);
  const sand = damaged ? SAND_DMG : SAND;
  const half = pishtaqW / 2;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* arcade wings */}
      <Arcade width={wingW} height={pishtaqH * 0.62} x={-half - wingW / 2} tile={sand} />
      <Arcade width={wingW} height={pishtaqH * 0.62} x={half + wingW / 2} tile={sand} />

      {/* central pishtaq */}
      <mesh>
        <extrudeGeometry args={[shape, { depth: 1.4, bevelEnabled: false }]} />
        <meshStandardMaterial color={sand} roughness={0.85} />
      </mesh>
      {/* dark iwan interior */}
      <mesh position={[0, pishtaqH * 0.42, -0.9]}>
        <planeGeometry args={[pishtaqW * 0.55, pishtaqH * 0.8]} />
        <meshStandardMaterial color="#161d2b" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* tile border frame */}
      {!damaged && (
        <>
          <mesh position={[0, pishtaqH - 0.5, 1.45]}>
            <boxGeometry args={[pishtaqW, 1, 0.15]} />
            <meshStandardMaterial map={girih} roughness={0.5} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (half - 0.5), pishtaqH / 2, 1.45]}>
              <boxGeometry args={[1, pishtaqH, 0.15]} />
              <meshStandardMaterial map={girih} roughness={0.5} />
            </mesh>
          ))}
          {/* tympanum mosaic (girih or Sher-Dor tiger/sun) */}
          <mesh position={[0, pishtaqH * 0.8, 1.5]}>
            <planeGeometry args={[pishtaqW * 0.62, pishtaqH * 0.16]} />
            <meshStandardMaterial map={mosaic === "lion" ? lion : girih} roughness={0.5} />
          </mesh>
        </>
      )}
      {/* door */}
      <mesh position={[0, 1.7, 1.2]}>
        <boxGeometry args={[pishtaqW * 0.34, 3.4, 0.3]} />
        <meshStandardMaterial color="#6b4f2a" roughness={0.8} />
      </mesh>

      {domes.map((d, i) => (
        <FlutedDome key={i} position={[d[0], d[1], d[2]]} radius={d[3] ?? 2.4} color={damaged ? TURQ_DMG : TURQ} />
      ))}
      {minarets.map((m, i) => (
        <Minaret key={i} position={[m[0], 0, m[1]]} height={m[2] ?? 17} color={sand} tilt={damaged ? (i % 2 ? 0.07 : -0.05) : 0} />
      ))}
      {/* base plinth */}
      <mesh position={[0, -0.3, 0.5]}>
        <boxGeometry args={[pishtaqW + wingW * 2 + 1, 0.8, 3]} />
        <meshStandardMaterial color={damaged ? "#6a5c44" : "#a98d5f"} roughness={1} />
      </mesh>
    </group>
  );
};

const Hotspot = ({ spot, active, onSelect }) => {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.12;
      ref.current.scale.setScalar(active ? s * 1.3 : s);
    }
  });
  return (
    <group position={spot.marker}>
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(spot.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <sphereGeometry args={[0.34, 20, 20]} />
        <meshStandardMaterial color={active ? "#f59e0b" : "#22d3ee"} emissive={active ? "#f59e0b" : "#22d3ee"} emissiveIntensity={active ? 1 : 0.5} />
      </mesh>
      {active && (
        <Html center distanceFactor={30} className="pointer-events-none">
          <div className="whitespace-nowrap rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">
            {spot.name}
          </div>
        </Html>
      )}
    </group>
  );
};

const CameraRig = ({ focus, onArrive }) => {
  const { controlsRef } = useSceneControlOptional();
  const posV = useRef(new THREE.Vector3());
  const tgtV = useRef(new THREE.Vector3());
  const arrivedFor = useRef(null);
  useFrame(() => {
    const c = controlsRef.current;
    if (!c || !focus) return;
    posV.current.set(...focus.pos);
    tgtV.current.set(...focus.look);
    c.object.position.lerp(posV.current, 0.06);
    c.target.lerp(tgtV.current, 0.06);
    c.update();
    if (
      arrivedFor.current !== focus.key &&
      c.object.position.distanceTo(posV.current) < 0.4 &&
      c.target.distanceTo(tgtV.current) < 0.4
    ) {
      arrivedFor.current = focus.key;
      onArrive?.();
    }
  });
  return null;
};

const RegistanModel = ({ spots, activeId, onSelect, focus, onArrive, visible, damaged }) => {
  const show = (key) => !visible || visible.includes(key);
  return (
    <group>
      <pointLight position={[0, 26, 16]} intensity={1.3} distance={120} />
      {/* plaza floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]}>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#b89a6b" roughness={1} />
      </mesh>

      {/* Tilya-Kori — back/centre: long low facade + off-centre mosque dome */}
      {show("tillakori") && (
        <Madrasa
          position={[0, 0, -14]}
          pishtaqH={12} pishtaqW={6} wingW={7}
          mosaic="girih"
          domes={[[-6.5, 8.6, -1.5, 2.6]]}
          minarets={[[-9.8, 0.4, 15], [9.8, 0.4, 13]]}
          damaged={damaged}
        />
      )}
      {/* Ulug'bek — left/west, faces the square */}
      {show("ulugbek") && (
        <Madrasa
          position={[-17, 0, -3]} rotation={[0, Math.PI / 2, 0]}
          pishtaqH={14} pishtaqW={7} wingW={5}
          mosaic="girih"
          domes={[[-4, 8, -3, 1.9], [4, 8, -3, 1.9]]}
          minarets={[[-8.5, 0.4, 18], [8.5, 0.4, 18]]}
          damaged={damaged}
        />
      )}
      {/* Sher-Dor — right/east: twin ribbed domes + tiger/sun mosaic */}
      {show("sherdor") && (
        <Madrasa
          position={[17, 0, -3]} rotation={[0, -Math.PI / 2, 0]}
          pishtaqH={14} pishtaqW={7} wingW={5}
          mosaic="lion"
          domes={[[-4.6, 8.2, -2, 2.5], [4.6, 8.2, -2, 2.5]]}
          minarets={[[-8.5, 0.4, 17.5], [8.5, 0.4, 17.5]]}
          damaged={damaged}
        />
      )}

      {spots.map((s) => (
        <Hotspot key={s.id} spot={s} active={activeId === s.id} onSelect={onSelect} />
      ))}
      <CameraRig focus={focus} onArrive={onArrive} />
    </group>
  );
};

export default RegistanModel;
