import { useEffect, useMemo } from "react";
import { useKit } from "../../equipment/kit/kitContext";
import { useDevice, useDeviceStep } from "../../equipment/kit/deviceState";
import Liquid from "../../equipment/kit/Liquid";
import BlobShadow from "../../equipment/kit/BlobShadow";
import { volumeBelow } from "../../equipment/kit/vessel";
import { createSubstanceLabelTexture } from "../labels/substanceLabel";
import { CAP_DOME, MM, buildScrewCap, buildWrapLabel, seedOf } from "./shapeUtils";
import { buildHeap, buildWideJar, jarLevel } from "./jarShapes";
import { buildChunkPile, buildGranuleLayer, buildRibbonRoll, buildWireHank } from "./solidPieces";
import { createHdpeMaterial, createPieceMaterial, disposeMaterial } from "./containerMaterials";

const LABEL_ARC = (130 * Math.PI) / 180;
const LABEL_GAP = 0.15 * MM;
const OIL = { color: "#5f5214", opacity: 0.15 };

// Wide-mouth jars, 250 ml: soda glass Ø70 × 86 mm (black PP cap) or HDPE Ø70 × 86 mm (white cap); 90 mm capped.
const SPECS = {
  glass: {
    jar: { radius: 35 * MM, bodyTop: 68 * MM, shoulder: 5 * MM, neckRadius: 29.5 * MM, neckTop: 86 * MM, wall: 2.2 * MM, floor: 3.5 * MM, bore: 27 * MM, baseFillet: 5 * MM, segments: 52 },
    cap: { radius: 32 * MM, y0: 74.5 * MM, height: 15.5 * MM, innerRadius: 30.1 * MM },
    label: { y0: 30 * MM, height: 36 * MM },
  },
  plastic: {
    jar: { radius: 35 * MM, bodyTop: 70 * MM, shoulder: 3 * MM, neckRadius: 31 * MM, neckTop: 86 * MM, wall: 1.5 * MM, floor: 2 * MM, bore: 29 * MM, baseFillet: 3.5 * MM, segments: 52 },
    cap: { radius: 33.2 * MM, y0: 74 * MM, height: 16 * MM, innerRadius: 31.6 * MM },
    label: { y0: 30 * MM, height: 36 * MM },
  },
};

const cache = {};
const assetsFor = (type) => {
  if (cache[type]) return cache[type];
  const { jar, cap, label } = SPECS[type];
  const labelRadius = jar.radius + LABEL_GAP;
  cache[type] = {
    ...buildWideJar(jar),
    cap: buildScrewCap({ ...cap, ribs: 90, segments: 48 }),
    label: buildWrapLabel({ radius: labelRadius, width: labelRadius * LABEL_ARC, height: label.height, y0: label.y0, back: type === "glass" }),
    labelSize: [labelRadius * LABEL_ARC, label.height],
  };
  return cache[type];
};

const netMass = ({ pieces, underOil }) => {
  if (pieces === "ribbon") return "25 g";
  if (underOil) return "50 g";
  if (pieces === "wire") return "100 g";
  return "250 g";
};

const withTop = (contents) => {
  contents.main?.computeBoundingBox();
  return { ...contents, top: contents.main?.boundingBox.max.y ?? 0 };
};

const buildContents = ({ pieces, metallic }, innerProfile, level, amount, seed) => {
  if (amount <= 0) return {};
  if (pieces === "granules") {
    const heap = buildHeap({ innerProfile, level: level - 1.2 * MM, seed, mound: 3 * MM, roughness: 1.2 * MM, scoop: false });
    return { main: heap, extra: buildGranuleLayer({ heap, innerProfile, seed, size: 2.3 * MM, count: 110 }) };
  }
  if (pieces === "ribbon") {
    const ribbon = buildRibbonRoll({ innerProfile, amount, seed });
    return { main: ribbon?.roll, extra: ribbon?.strip };
  }
  if (pieces === "wire") return { main: buildWireHank({ innerProfile, amount, seed }) };
  const metal = metallic > 0.3;
  return withTop({
    main: buildChunkPile(
      metal
        ? { innerProfile, level, seed, size: 11 * MM, cuts: 5, detail: 2, maxPieces: 12 }
        : { innerProfile, level, seed, size: 6 * MM, cuts: 4, detail: 1, facetedLook: true, maxPieces: 52 },
    ),
  });
};

const readRemaining = (device) => device.remaining ?? 1;

const SolidJar = ({ simId, substance, remaining = 1, capOn = true, ...props }) => {
  const kit = useKit();
  const { device } = useDevice(simId);
  const share = useDeviceStep(device, readRemaining, 0.025, remaining);
  const closed = device ? device.capOn !== false : capOn;
  const { jar = "glass", color, metallic = 0, pieces = "chunks", underOil = false, fill = 0.55 } = substance.container;
  const type = jar === "plastic" ? "plastic" : "glass";
  const spec = SPECS[type];
  const assets = assetsFor(type);
  const seed = seedOf(substance.id);
  const left = Math.max(0, Math.min(1, share));
  // Rolls and hanks scale by amount; a catalog fill of 0.6 counts as a full one.
  const amount = Math.round(Math.min(1, (fill * left) / 0.6) * 40) / 40;
  const level = jarLevel(assets.innerProfile, spec.jar.bodyTop, fill * left);

  const contents = useMemo(
    () => buildContents({ pieces, metallic }, assets.innerProfile, Math.round(level * 2000) / 2000, amount, seed),
    [pieces, metallic, assets, level, amount, seed],
  );
  useEffect(
    () => () => {
      contents.main?.dispose();
      contents.extra?.dispose();
    },
    [contents],
  );
  const material = useMemo(() => createPieceMaterial({ pieces, color, metallic, seed }), [pieces, color, metallic, seed]);
  useEffect(() => () => disposeMaterial(material), [material]);
  const hdpe = useMemo(
    () => (type === "plastic" ? createHdpeMaterial({ level: amount > 0 ? level : -1, content: color, strength: 0.18 }) : null),
    [type, level, amount, color],
  );
  useEffect(() => () => disposeMaterial(hdpe), [hdpe]);

  const oilLevel = Math.min(spec.jar.bodyTop - 2 * MM, Math.max(level, contents.top ?? 0) + 6 * MM);
  const oilVolume = underOil && amount > 0 ? volumeBelow(assets.innerProfile, oilLevel) * 1e6 : 0;
  const mass = netMass(substance.container);
  const [labelW, labelH] = assets.labelSize;
  const labelMaterial = kit.print(`substance-label-${substance.id}-${mass}`, () =>
    createSubstanceLabelTexture(substance, { widthMm: labelW / MM, heightMm: labelH / MM, amount: mass, scale: kit.printScale }),
  );
  const cap = <mesh geometry={assets.cap} material={type === "plastic" ? kit.plasticWhite : kit.plasticDark} castShadow />;
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
          {oilVolume > 0 && (
            <Liquid innerProfile={assets.innerProfile} volumeMl={oilVolume} color={OIL.color} opacity={OIL.opacity} />
          )}
          <mesh geometry={assets.outer} material={kit.glass} renderOrder={3} />
        </>
      )}
      {contents.main && <mesh geometry={contents.main} material={material} castShadow />}
      {contents.extra && <mesh geometry={contents.extra} material={material} castShadow />}
      {closed ? (
        cap
      ) : (
        <group position={[spec.jar.radius + spec.cap.radius + 0.008, capTop, 0.016]} rotation-x={Math.PI}>
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

export default SolidJar;
