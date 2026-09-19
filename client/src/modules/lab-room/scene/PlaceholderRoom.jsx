import { PLACEHOLDER_BLOCKS, PLACEHOLDER_WINDOWS } from "./placeholderLayout";

const ROOM = { width: 10, depth: 8, height: 3.2 };

const PlaceholderRoom = () => {
  return (
    <group>
      <hemisphereLight args={["#f4f6ff", "#8a8f99", 1.4]} />
      <directionalLight position={[6, 5, 1]} intensity={1.6} />

      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#c9ccd1" roughness={0.8} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-y={ROOM.height}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#f1f2f4" roughness={1} />
      </mesh>
      <mesh position={[0, ROOM.height / 2, -ROOM.depth / 2]}>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial color="#ece8e1" />
      </mesh>
      <mesh position={[0, ROOM.height / 2, ROOM.depth / 2]} rotation-y={Math.PI}>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial color="#ece8e1" />
      </mesh>
      <mesh position={[-ROOM.width / 2, ROOM.height / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color="#e6e2da" />
      </mesh>
      <mesh position={[ROOM.width / 2, ROOM.height / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color="#e6e2da" />
      </mesh>

      {PLACEHOLDER_BLOCKS.map((b, i) => (
        <mesh key={i} position={b.center}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} roughness={0.6} />
        </mesh>
      ))}

      {PLACEHOLDER_WINDOWS.map((w, i) => (
        <mesh key={i} position={w.center} rotation-y={-Math.PI / 2}>
          <planeGeometry args={w.size} />
          <meshBasicMaterial color="#cfe6ff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

export default PlaceholderRoom;
