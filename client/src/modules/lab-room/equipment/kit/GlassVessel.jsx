import { useKit } from "./kitContext";

// Draw order for a convex vessel seen from outside: far inner wall → contents → near outer wall.
const GlassVessel = ({ vessel, print, children }) => {
  const { glass } = useKit();
  return (
    <group>
      <mesh geometry={vessel.inner} material={glass} renderOrder={1} />
      {children}
      <mesh geometry={vessel.outer} material={glass} renderOrder={3} />
      {print && <mesh geometry={print.geometry} material={print.material} />}
    </group>
  );
};

export default GlassVessel;
