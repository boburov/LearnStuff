import { useEffect, useMemo } from "react";
import { useKit } from "../../equipment/kit/kitContext";
import { useDevice, useDeviceStep } from "../../equipment/kit/deviceState";
import BlobShadow from "../../equipment/kit/BlobShadow";
import { createSubstanceLabelTexture } from "../labels/substanceLabel";
import { CAP_DOME, MM, buildScrewCap, buildWrapLabel, seedOf } from "./shapeUtils";
import { buildHeap, buildWideJar, jarLevel } from "./jarShapes";
import { createGlassTint, createGrainMaterial, createHdpeMaterial, disposeMaterial } from "./containerMaterials";

// Amber absorbs through both walls; one multiply pass on the outer skin carries the squared transmittance.
const AMBER = "#93380a";
const LABEL_ARC = (140 * Math.PI) / 180;
const LABEL_GAP = 0.15 * MM;

// Wide-mouth powder jars, 100 ml: soda glass Ø55 × 76 mm (black PP cap) or HDPE Ø55 × 75 mm (white cap); ~79 mm capped.
const SPECS = {
  glass: {
    jar: { radius: 27.5 * MM, bodyTop: 58 * MM, shoulder: 5 * MM, neckRadius: 22 * MM, neckTop: 76 * MM, wall: 2 * MM, floor: 3 * MM, bore: 19.6 * MM, baseFillet: 4 * MM },
    cap: { radius: 24.5 * MM, y0: 64.5 * MM, height: 14.5 * MM, innerRadius: 22.6 * MM },
    label: { y0: 14 * MM, height: 36 * MM },
  },
  plastic: {
    jar: { radius: 27.5 * MM, bodyTop: 60 * MM, shoulder: 3 * MM, neckRadius: 23.5 * MM, neckTop: 75 * MM, wall: 1.4 * MM, floor: 1.8 * MM, bore: 21.6 * MM, baseFillet: 3 * MM },
    cap: { radius: 25.6 * MM, y0: 64 * MM, height: 15 * MM, innerRadius: 24.1 * MM },
    label: { y0: 14 * MM, height: 36 * MM },
  },
};

const cache = {};
const assetsFor = (type) => {
  if (cache[type]) return cache[type];
  const { jar, cap, label } = SPECS[type];
  const labelRadius = jar.radius + LABEL_GAP;
  cache[type] = {
    ...buildWideJar(jar),
    cap: buildScrewCap({ ...cap, ribs: 72, segments: 44 }),
    label: buildWrapLabel({ radius: labelRadius, width: labelRadius * LABEL_ARC, height: label.height, y0: label.y0, back: type === "glass" }),
    labelSize: [labelRadius * LABEL_ARC, label.height],
  };
  return cache[type];
};

const readRemaining = (device) => device.remaining ?? 1;

const PowderJar = ({ simId, substance, remaining = 1, capOn = true, ...props }) => {
  const kit = useKit();
  const { device } = useDevice(simId);
  const share = useDeviceStep(device, readRemaining, 0.02, remaining);
  const closed = device ? device.capOn !== false : capOn;
  const { jar = "plastic", color, grain = "fine", fill = 0.7 } = substance.container;
  const type = jar === "plastic" ? "plastic" : "glass";
  const spec = SPECS[type];
  const assets = assetsFor(type);
  const seed = seedOf(substance.id);
  const amount = Math.max(0, Math.min(1, share)) * fill;
  const level = Math.round(jarLevel(assets.innerProfile, spec.jar.bodyTop, amount) * 4000) / 4000;

  const heap = useMemo(
    () => (amount > 0 ? buildHeap({ innerProfile: assets.innerProfile, level, seed }) : null),
    [assets, level, seed, amount],
  );
  useEffect(() => () => heap?.dispose(), [heap]);
  const powder = useMemo(() => createGrainMaterial({ color, grain, seed }), [color, grain, seed]);
  useEffect(() => () => disposeMaterial(powder), [powder]);
  const tint = useMemo(() => (jar === "amber" ? createGlassTint(AMBER) : null), [jar]);
  useEffect(() => () => disposeMaterial(tint), [tint]);
  const hdpe = useMemo(
    () => (type === "plastic" ? createHdpeMaterial({ level: amount > 0 ? level : -1, content: color, strength: 0.22 }) : null),
    [type, level, amount, color],
  );
  useEffect(() => () => disposeMaterial(hdpe), [hdpe]);

  const [labelW, labelH] = assets.labelSize;
  const labelMaterial = kit.print(`substance-label-${substance.id}-100 g`, () =>
    createSubstanceLabelTexture(substance, { widthMm: labelW / MM, heightMm: labelH / MM, amount: "100 g", scale: kit.printScale }),
  );
  const capMaterial = type === "plastic" ? kit.plasticWhite : kit.plasticDark;
  const cap = <mesh geometry={assets.cap} material={capMaterial} castShadow />;
  const capTop = spec.cap.y0 + spec.cap.height + CAP_DOME;

  return (
    <group {...props}>
      {type === "plastic" ? (
        <>
          <mesh geometry={assets.outer} material={hdpe} castShadow />
          <mesh geometry={assets.inner} material={hdpe} />
        </>
      ) : (
        <>
          <mesh geometry={assets.inner} material={kit.glass} renderOrder={1} />
          {tint && <mesh geometry={assets.outer} material={tint} renderOrder={2.98} />}
          <mesh geometry={assets.outer} material={kit.glass} renderOrder={3} />
        </>
      )}
      {heap && <mesh geometry={heap} material={powder} castShadow />}
      {closed ? (
        cap
      ) : (
        <group position={[spec.jar.radius + spec.cap.radius + 0.008, capTop, 0.014]} rotation-x={Math.PI}>
          {cap}
          <group position-y={capTop} rotation-x={Math.PI}>
            <BlobShadow radius={spec.cap.radius * 1.35} opacity={0.2} />
          </group>
        </group>
      )}
      <mesh geometry={assets.label.front} material={labelMaterial} castShadow />
      <mesh geometry={assets.label.paper} material={kit.paper} />
      <BlobShadow radius={spec.jar.radius * 1.45} opacity={0.3} />
    </group>
  );
};

export default PowderJar;
