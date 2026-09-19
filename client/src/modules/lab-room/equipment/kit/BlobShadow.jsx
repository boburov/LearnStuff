import { useKit } from "./kitContext";
import { useBlobVisible } from "./blobContext";

// Soft contact darkening under an object's base; works on both tiers (High adds real shadows on top).
const BlobShadow = ({ radius, opacity = 0.35, y = 0.0006 }) => {
  const { blobTexture } = useKit();
  const visible = useBlobVisible();
  if (!visible) return null;
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} renderOrder={0}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial
        color="#000000"
        alphaMap={blobTexture}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
};

export default BlobShadow;
