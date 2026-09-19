// Translucent cell membrane with organelles inside. Click an organelle to select it.
import { useRef, useState } from "react";
import { usePausableFrame } from "@/shared/lab/usePausableFrame";
import { Html } from "@react-three/drei";
import { ORGANELLES } from "@/modules/biology/data/cell";

const Organelle = ({ organelle, selected, onSelect }) => {
  const [hover, setHover] = useState(false);
  return (
    <group position={organelle.pos}>
      <mesh
        scale={hover || selected ? 1.2 : 1}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(organelle.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <sphereGeometry args={[organelle.size, 32, 32]} />
        <meshStandardMaterial
          color={organelle.color}
          roughness={0.35}
          emissive={selected ? organelle.color : "#000000"}
          emissiveIntensity={selected ? 0.4 : 0}
        />
      </mesh>
      {(hover || selected) && (
        <Html center distanceFactor={9} className="pointer-events-none">
          <div className="whitespace-nowrap rounded bg-foreground px-2 py-0.5 text-xs text-background">
            {organelle.name}
          </div>
        </Html>
      )}
    </group>
  );
};

const CellModel = ({ activeId, onSelect }) => {
  const group = useRef();
  usePausableFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.15;
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[3, 48, 48]} />
        <meshStandardMaterial
          color="#bae6fd"
          transparent
          opacity={0.16}
          roughness={0.1}
        />
      </mesh>
      {ORGANELLES.map((o) => (
        <Organelle
          key={o.id}
          organelle={o}
          selected={activeId === o.id}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
};

export default CellModel;
