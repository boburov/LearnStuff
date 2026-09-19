import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { attachTarget, catcherSurfaces } from "./lightRig";

const LIGHT_POSITION = [1.1, 4.2, 0.9];
const LIGHT_TARGET = [0.3, 0.9, 0.1];
const SHADOW_EXTENT = 4.2;

// A soft overhead key light for movable equipment only (baked room surfaces ignore it).
const EquipmentLights = ({ anchors, shadows, intensity = 1.1 }) => {
  const lightRef = useRef(null);
  const scene = useThree((s) => s.scene);
  const catchers = useMemo(() => catcherSurfaces(anchors), [anchors]);

  useLayoutEffect(() => attachTarget(scene, lightRef.current, LIGHT_TARGET), [scene]);

  return (
    <>
      <directionalLight
        ref={lightRef}
        position={LIGHT_POSITION}
        intensity={intensity}
        color="#fff5e8"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.015}
        shadow-radius={4}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={8}
      />
      {shadows &&
        catchers.map((c) => (
          <mesh key={c.position.join(",")} position={c.position} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={c.size} />
            <shadowMaterial transparent opacity={0.32} depthWrite={false} />
          </mesh>
        ))}
    </>
  );
};

export default EquipmentLights;
