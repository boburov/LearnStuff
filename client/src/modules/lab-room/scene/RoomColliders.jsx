import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { GROUPS } from "../world/groups";

// `debug` draws the boxes as wireframes to check them against the room model (?debug=colliders).
const RoomColliders = ({ boxes, debug = false }) => (
  <>
    <RigidBody type="fixed" colliders={false}>
      {boxes.map((b) => (
        <CuboidCollider key={b.name} args={b.half} position={b.center} collisionGroups={GROUPS.blocker} />
      ))}
    </RigidBody>
    {debug &&
      boxes.map((b) => (
        <mesh key={b.name} position={b.center}>
          <boxGeometry args={b.half.map((h) => h * 2)} />
          <meshBasicMaterial color="#ff2d55" wireframe depthTest={false} transparent opacity={0.8} />
        </mesh>
      ))}
  </>
);

export default RoomColliders;
