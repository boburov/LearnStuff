import { useEffect, useMemo } from "react";
import { CylinderGeometry, LatheGeometry, TorusGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useKit } from "../kit/kitContext";
import BlobShadow from "../kit/BlobShadow";

// 5 kg school CO₂ extinguisher: Ø156 mm red cylinder, brass valve with a squeeze lever, black horn on a hose.
const R = 0.078;
const SHOULDER = 0.4;
const NECK = 0.455;
const VALVE_TOP = 0.5;
const HORN_R = 0.055;

const BODY = [
  [0, 0.006],
  [R - 0.02, 0],
  [R - 0.004, 0.012],
  [R, 0.03],
  [R, SHOULDER - 0.06],
  [R - 0.012, SHOULDER],
  [R * 0.55, SHOULDER + 0.038],
  [0.026, NECK],
  [0.026, NECK + 0.012],
];

const VALVE = [
  [0.0255, 0],
  [0.03, 0.006],
  [0.03, 0.022],
  [0.024, 0.028],
  [0.024, 0.04],
  [0.017, 0.045],
  [0, 0.045],
];

// Cone of the horn, from the hose socket out to the rim.
const HORN = [
  [0.0095, 0],
  [0.013, 0.018],
  [HORN_R * 0.45, 0.055],
  [HORN_R, 0.1],
  [HORN_R, 0.108],
  [HORN_R - 0.004, 0.108],
  [HORN_R - 0.004, 0.1],
];

const lathe = (outline, segments) => new LatheGeometry(outline.map(([x, y]) => new Vector2(x, y)), segments);

const Extinguisher = (props) => {
  const { rubberRed, rubberBlack, chrome, plasticWhite } = useKit();
  const parts = useMemo(() => {
    const body = lathe(BODY, 34);
    const foot = new TorusGeometry(R - 0.008, 0.008, 8, 30).rotateX(Math.PI / 2).translate(0, 0.012, 0);
    const valve = lathe(VALVE, 18).translate(0, NECK + 0.01, 0);
    const lever = new CylinderGeometry(0.0055, 0.0055, 0.085, 8).rotateZ(Math.PI / 2 - 0.12).translate(0.034, VALVE_TOP - 0.004, 0);
    const pin = new TorusGeometry(0.011, 0.0022, 6, 14).rotateY(Math.PI / 2).translate(-0.03, NECK + 0.03, 0);
    const gauge = new CylinderGeometry(0.013, 0.013, 0.007, 14).rotateZ(Math.PI / 2).translate(-0.036, NECK + 0.016, 0);
    // Hose: three short segments make the curve from the valve down to the horn.
    const hose1 = new CylinderGeometry(0.0085, 0.0085, 0.1, 10).rotateZ(-1.1).translate(0.062, VALVE_TOP - 0.035, 0.012);
    const hose2 = new CylinderGeometry(0.0085, 0.0085, 0.12, 10).rotateZ(-2.1).translate(0.1, VALVE_TOP - 0.115, 0.028);
    const horn = lathe(HORN, 22).rotateZ(-2.4).translate(0.128, VALVE_TOP - 0.175, 0.036);
    const label = new CylinderGeometry(R + 0.0008, R + 0.0008, 0.12, 30, 1, true).translate(0, 0.19, 0);
    return {
      red: mergeGeometries([body, foot]),
      steel: mergeGeometries([valve, lever, pin, gauge]),
      black: mergeGeometries([hose1, hose2, horn]),
      label,
    };
  }, []);

  useEffect(() => () => Object.values(parts).forEach((geometry) => geometry.dispose()), [parts]);

  return (
    <group {...props}>
      <mesh geometry={parts.red} material={rubberRed} castShadow />
      <mesh geometry={parts.label} material={plasticWhite} />
      <mesh geometry={parts.steel} material={chrome} castShadow />
      <mesh geometry={parts.black} material={rubberBlack} castShadow />
      <BlobShadow radius={R * 1.2} opacity={0.3} />
    </group>
  );
};

export default Extinguisher;
