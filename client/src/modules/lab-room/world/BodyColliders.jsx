import { CuboidCollider, CylinderCollider } from "@react-three/rapier";
import { GROUPS } from "./groups";

// Sensors are slightly larger than the solid so thin tools are easy to aim at.
const SENSOR_PAD = 0.015;

const BodyColliders = ({ body }) => {
  if (body.shape === "cylinder") {
    const half = body.height / 2;
    return (
      <>
        <CylinderCollider
          args={[half, body.radius]}
          position={[0, half, 0]}
          collisionGroups={GROUPS.object}
          friction={0.8}
          restitution={0.05}
        />
        <CylinderCollider
          sensor
          args={[half + SENSOR_PAD, body.radius + SENSOR_PAD]}
          position={[0, half, 0]}
          collisionGroups={GROUPS.sensor}
        />
      </>
    );
  }
  const parts = body.shape === "box" ? [body] : body.parts;
  return parts.map((part, i) => {
    const half = part.size.map((s) => s / 2);
    return (
      <group key={i}>
        <CuboidCollider args={half} position={part.center} collisionGroups={GROUPS.object} friction={0.8} restitution={0.05} />
        <CuboidCollider
          sensor
          args={half.map((h) => h + SENSOR_PAD)}
          position={part.center}
          collisionGroups={GROUPS.sensor}
        />
      </group>
    );
  });
};

export default BodyColliders;
