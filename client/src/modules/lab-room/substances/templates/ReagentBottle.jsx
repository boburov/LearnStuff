import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useKit } from "../../equipment/kit/kitContext";
import Contents from "../../equipment/kit/Contents";
import { DEVICE_PRIORITY, useDevice, useDeviceStep } from "../../equipment/kit/deviceState";
import BlobShadow from "../../equipment/kit/BlobShadow";
import { heightForVolume, volumeBelow } from "../../equipment/kit/vessel";
import { createSubstanceLabelTexture } from "../labels/substanceLabel";
import { CAP_DOME, MM, arc, bezier, buildScrewCap, buildWrapLabel, dedupe, faceted, fillet, inverted, lathe, merge } from "./shapeUtils";
import { createGlassTint, createGroundGlass, createHdpeMaterial, disposeMaterial } from "./containerMaterials";

// Amber absorbs through both walls; one multiply pass on the outer skin carries the squared transmittance.
const AMBER = "#93380a";
const LABEL_ARC = (140 * Math.PI) / 180;
const LABEL_GAP = 0.15 * MM;
const SEGMENTS = 56;

// DIN narrow-neck reagent bottle 250 ml: Ø70 × 134 mm, NS 19/26 ground socket, flat octagonal glass stopper.
const NARROW = {
  radius: 35 * MM,
  bodyTop: 82 * MM,
  neckRadius: 13.5 * MM,
  neckBase: 106 * MM,
  rim: 134 * MM,
  wall: 2.4 * MM,
  floor: 4.2 * MM,
  socketTop: 9.5 * MM,
  socketBottom: 8.2 * MM,
  socketY: 108 * MM,
  stopperTop: 143.8 * MM,
  label: { y0: 22 * MM, height: 50 * MM },
};

// Boston round dropper bottle 100 ml: Ø48 × 92 mm, DIN 18 neck, black cap with rubber teat and glass pipette.
const DROPPER = {
  radius: 24 * MM,
  bodyTop: 60 * MM,
  neckRadius: 9 * MM,
  neckBase: 77 * MM,
  rim: 92 * MM,
  wall: 1.6 * MM,
  floor: 3 * MM,
  bore: 6.9 * MM,
  cap: { radius: 11 * MM, y0: 82.5 * MM, height: 14 * MM },
  label: { y0: 12 * MM, height: 36 * MM },
};

// Natural HDPE narrow-mouth bottle 250 ml: Ø62 × 131 mm with a PP screw cap.
const HDPE = {
  radius: 31 * MM,
  bodyTop: 96 * MM,
  neckRadius: 12.6 * MM,
  neckBase: 116 * MM,
  rim: 131 * MM,
  wall: 1.3 * MM,
  floor: 1.8 * MM,
  cap: { radius: 14.6 * MM, y0: 121 * MM, height: 16 * MM },
  label: { y0: 26 * MM, height: 50 * MM },
};

const PIPETTE = [
  [0.55 * MM, 12.6 * MM],
  [1.1 * MM, 13.2 * MM],
  [1.4 * MM, 15 * MM],
  [2.6 * MM, 22 * MM],
  [3.3 * MM, 30 * MM],
  [3.3 * MM, 97 * MM],
];

const labelSpec = (radius, { y0, height }) => ({
  radius: radius + LABEL_GAP,
  width: (radius + LABEL_GAP) * LABEL_ARC,
  height,
  y0,
});

const socketRadius = (y) =>
  NARROW.socketBottom +
  ((y - NARROW.socketY) / (NARROW.rim - 1.1 * MM - NARROW.socketY)) * (NARROW.socketTop - NARROW.socketBottom);

const buildNarrow = () => {
  const { radius: R, bodyTop, neckRadius: N, neckBase, rim, wall, floor } = NARROW;
  const lip = 10.6 * MM;
  const outer = dedupe([
    ...fillet(
      [[0, 1.6 * MM], [19 * MM, 1.3 * MM], [26 * MM, 0], [R, 0], [R, bodyTop]],
      [0, 3 * MM, 2.5 * MM, 5.5 * MM, 0],
      [0, 2, 2, 6, 0],
    ),
    ...bezier([R, bodyTop], [R, bodyTop + 15 * MM], [N, neckBase - 9 * MM], [N, neckBase], 12).slice(1),
    [N, rim - 1.2 * MM],
    ...arc(N - 1.2 * MM, rim - 1.2 * MM, 1.2 * MM, 0, Math.PI / 2, 3).slice(1),
    [lip, rim],
  ]);
  const inner = dedupe([
    [lip, rim],
    [NARROW.socketTop, rim - 1.1 * MM],
    [NARROW.socketBottom, NARROW.socketY],
    ...bezier(
      [NARROW.socketBottom, NARROW.socketY],
      [NARROW.socketBottom, 100 * MM],
      [R - wall, bodyTop + 13 * MM],
      [R - wall, bodyTop],
      10,
    ).slice(1),
    ...fillet([[R - wall, bodyTop], [R - wall, floor], [0, floor]], [0, 4 * MM, 0], 5).slice(1),
  ]);

  const coneTop = rim - 0.3 * MM;
  const cone = [
    [0, 109.6 * MM],
    [socketRadius(110 * MM) - 0.9 * MM, 109.8 * MM],
    [socketRadius(110.8 * MM) - 0.12 * MM, 110.8 * MM],
    [socketRadius(coneTop) - 0.12 * MM, coneTop],
  ];
  const stem = [
    [socketRadius(coneTop) - 0.12 * MM, coneTop],
    [socketRadius(coneTop) - 0.05 * MM, rim + 0.5 * MM],
    [8.9 * MM, rim + 1.2 * MM],
    [8.9 * MM, rim + 1.7 * MM],
    [13.4 * MM, rim + 2.4 * MM],
  ];
  const head = [
    [13.4 * MM, rim + 2.4 * MM],
    [15.1 * MM, rim + 3.1 * MM],
    [15.7 * MM, rim + 4.2 * MM],
    [15.7 * MM, rim + 8.2 * MM],
    [14.9 * MM, rim + 9.3 * MM],
    [12.5 * MM, NARROW.stopperTop],
    [0, NARROW.stopperTop],
  ];
  const innerProfile = [...inner].reverse();
  return {
    outer: lathe(outer, SEGMENTS),
    inner: lathe(inner, SEGMENTS),
    innerProfile,
    mouth: { innerProfile, mouthY: rim, mouthR: lip },
    brimMl: volumeBelow(innerProfile, neckBase) * 1e6,
    cone: lathe(cone, 40),
    stopper: (() => {
      const solid = merge([lathe(stem, 40), faceted(lathe(head, 8, { phiStart: Math.PI + Math.PI / 8 }))]);
      return { front: solid, back: inverted(solid) };
    })(),
    label: buildWrapLabel(labelSpec(R, NARROW.label)),
  };
};

const buildDropper = () => {
  const { radius: R, bodyTop, neckRadius: N, neckBase, rim, wall, floor, bore } = DROPPER;
  const outer = dedupe([
    ...fillet(
      [[0, 1 * MM], [15 * MM, 0.7 * MM], [19 * MM, 0], [R, 0], [R, bodyTop]],
      [0, 2 * MM, 1.5 * MM, 4 * MM, 0],
      [0, 2, 2, 5, 0],
    ),
    ...bezier([R, bodyTop], [R, bodyTop + 13 * MM], [N + 1.5 * MM, neckBase - 5 * MM], [N, neckBase], 10).slice(1),
    [N, 78 * MM],
    [10.5 * MM, 78.6 * MM],
    [10.8 * MM, 79.6 * MM],
    [10.5 * MM, 80.6 * MM],
    [N, 81.2 * MM],
    [N, rim - 0.8 * MM],
    ...arc(N - 0.8 * MM, rim - 0.8 * MM, 0.8 * MM, 0, Math.PI / 2, 3).slice(1),
    [bore + 0.6 * MM, rim],
  ]);
  const inner = dedupe([
    [bore + 0.6 * MM, rim],
    [bore, rim - 0.7 * MM],
    [bore, neckBase - 1 * MM],
    ...bezier([bore, neckBase - 1 * MM], [bore, neckBase - 7 * MM], [R - wall, bodyTop + 11 * MM], [R - wall, bodyTop], 9).slice(1),
    ...fillet([[R - wall, bodyTop], [R - wall, floor], [0, floor]], [0, 3.5 * MM, 0], 5).slice(1),
  ]);
  const teat = dedupe([
    [0, 96.4 * MM],
    [6.5 * MM, 96.4 * MM],
    ...arc(6.5 * MM, 97.2 * MM, 0.8 * MM, -Math.PI / 2, Math.PI / 2, 3).slice(1),
    [5.6 * MM, 98.4 * MM],
    [5.3 * MM, 99.6 * MM],
    [5.3 * MM, 101.8 * MM],
    ...bezier([5.3 * MM, 101.8 * MM], [5.3 * MM, 104 * MM], [7.1 * MM, 104 * MM], [7.1 * MM, 107 * MM], 4).slice(1),
    [7.1 * MM, 116.4 * MM],
    ...arc(0, 116.4 * MM, 7.1 * MM, 0, Math.PI / 2, 7).slice(1),
  ]);
  const pipetteBore = [
    [2.3 * MM, 97 * MM],
    [2.3 * MM, 30 * MM],
    [1.7 * MM, 22 * MM],
    [0.5 * MM, 14.5 * MM],
    [0.4 * MM, 12.9 * MM],
  ];
  const cap = DROPPER.cap;
  const innerProfile = [...inner].reverse();
  return {
    outer: lathe(outer, SEGMENTS),
    inner: lathe(inner, SEGMENTS),
    innerProfile,
    mouth: { innerProfile, mouthY: rim, mouthR: bore },
    brimMl: volumeBelow(innerProfile, neckBase) * 1e6,
    cap: buildScrewCap({ ...cap, innerRadius: 9.5 * MM, ribs: 40, segments: 32, edge: 1.2 * MM }),
    teat: lathe(teat, 28),
    pipetteOuter: lathe(PIPETTE, 20),
    pipetteBore: lathe(pipetteBore, 20),
    label: buildWrapLabel(labelSpec(R, DROPPER.label)),
  };
};

const buildHdpe = () => {
  const { radius: R, bodyTop, neckRadius: N, neckBase, rim, wall, floor } = HDPE;
  const lip = N - 1.8 * MM;
  const outer = dedupe([
    ...fillet(
      [[0, 2 * MM], [21 * MM, 1.6 * MM], [26 * MM, 0], [R, 0], [R, bodyTop]],
      [0, 2 * MM, 1.5 * MM, 4.5 * MM, 0],
      [0, 2, 2, 6, 0],
    ),
    ...bezier([R, bodyTop], [R, bodyTop + 13 * MM], [N + 2.5 * MM, neckBase - 7 * MM], [N, neckBase], 12).slice(1),
    [N, 117 * MM],
    [15 * MM, 117.4 * MM],
    [15.3 * MM, 118.2 * MM],
    [15 * MM, 119 * MM],
    [N, 119.4 * MM],
    [N, rim - 0.8 * MM],
    ...arc(N - 0.8 * MM, rim - 0.8 * MM, 0.8 * MM, 0, Math.PI / 2, 3).slice(1),
    [lip + 0.4 * MM, rim],
    [lip, rim - 0.5 * MM],
    [lip, rim - 13 * MM],
  ]);
  const shell = fillet(
    [[lip, rim - 13 * MM], [lip, neckBase], [R - wall, bodyTop], [R - wall, floor], [0, floor]],
    [0, 3 * MM, 10 * MM, 3 * MM, 0],
    [0, 3, 6, 4, 0],
  );
  const cap = HDPE.cap;
  const innerProfile = [...shell].reverse();
  return {
    body: merge([lathe(outer, SEGMENTS), lathe(shell, SEGMENTS)]),
    innerProfile,
    mouth: { innerProfile, mouthY: rim - 13 * MM, mouthR: lip },
    brimMl: volumeBelow(innerProfile, neckBase) * 1e6,
    cap: buildScrewCap({ ...cap, innerRadius: 13.3 * MM, ribs: 60, segments: 44 }),
    label: buildWrapLabel({ ...labelSpec(R, HDPE.label), back: false }),
  };
};

const cache = {};
const assetsFor = (kind) => {
  if (!cache[kind]) cache[kind] = { narrow: buildNarrow, dropper: buildDropper, hdpe: buildHdpe }[kind]();
  return cache[kind];
};

const Label = ({ geometry, substance, spec, amount }) => {
  const kit = useKit();
  const material = kit.print(`substance-label-${substance.id}-${amount}`, () =>
    createSubstanceLabelTexture(substance, { widthMm: spec.width / MM, heightMm: spec.height / MM, amount, scale: kit.printScale }),
  );
  return (
    <>
      <mesh geometry={geometry.front} material={material} castShadow />
      <mesh geometry={geometry.paper} material={kit.paper} />
    </>
  );
};

// Coloured glass adds a multiply pass right before the outer kit glass pass.
const GlassBody = ({ assets, tint, children }) => {
  const { glass } = useKit();
  return (
    <>
      <mesh geometry={assets.inner} material={glass} renderOrder={1} />
      {children}
      {tint && <mesh geometry={assets.outer} material={tint} renderOrder={2.98} />}
      <mesh geometry={assets.outer} material={glass} renderOrder={3} />
    </>
  );
};

const bottleVessel = (assets, container) => ({ ...assets.mouth, meniscus: container.viscous ? 2.6 * MM : 0.0015 });
const bottleFill = (container, volumeMl) => ({ volumeMl, color: container.color, opacity: container.opacity });

const NarrowBottle = ({ simId, substance, volumeMl, amber, capOn }) => {
  const kit = useKit();
  const assets = assetsFor("narrow");
  const tint = useMemo(() => (amber ? createGlassTint(AMBER) : null), [amber]);
  const ground = useMemo(() => createGroundGlass(amber ? "#b48a5c" : "#cfd8d5", amber ? 0.34 : 0.24), [amber]);
  useEffect(() => () => disposeMaterial(tint), [tint]);
  useEffect(() => () => disposeMaterial(ground), [ground]);
  const { container } = substance;
  const spec = labelSpec(NARROW.radius, NARROW.label);
  const liquidVolume = Math.min(volumeMl, assets.brimMl);

  const stopper = (
    <>
      <mesh geometry={assets.cone} material={ground} renderOrder={2.5} />
      <mesh geometry={assets.stopper.back} material={kit.glass} renderOrder={3.4} />
      {tint && <mesh geometry={assets.stopper.front} material={tint} renderOrder={3.45} />}
      <mesh geometry={assets.stopper.front} material={kit.glass} renderOrder={3.5} />
    </>
  );

  return (
    <>
      <GlassBody assets={assets} tint={tint}>
        <Contents simId={simId} vessel={bottleVessel(assets, container)} fallback={bottleFill(container, liquidVolume)} />
      </GlassBody>
      {capOn ? (
        stopper
      ) : (
        <group position={[NARROW.radius + 0.03, NARROW.stopperTop, 0.012]} rotation-z={Math.PI}>
          {stopper}
        </group>
      )}
      {!capOn && (
        <group position={[NARROW.radius + 0.03, 0, 0.012]}>
          <BlobShadow radius={0.021} opacity={0.18} />
        </group>
      )}
      <Label geometry={assets.label} substance={substance} spec={spec} amount={`${container.sizeMl} ml`} />
      <BlobShadow radius={NARROW.radius * 1.45} opacity={0.3} />
    </>
  );
};

// Pipette assembly lying on the bench: tilt about the cap rim until the pipette touches the bench too.
const DROPPER_REST = (() => {
  const { radius, y0 } = DROPPER.cap;
  const [r, y] = PIPETTE.filter((p) => p[1] < y0).reduce((best, p) =>
    (radius - p[0]) / (y0 - p[1]) < (radius - best[0]) / (y0 - best[1]) ? p : best,
  );
  const tilt = Math.atan2(radius - r, y0 - y);
  return { tilt, drop: y * Math.sin(tilt) - r * Math.cos(tilt) };
})();

const DropperBottle = ({ simId, substance, volumeMl, amber, capOn }) => {
  const kit = useKit();
  const assets = assetsFor("dropper");
  const tint = useMemo(() => (amber ? createGlassTint(AMBER) : null), [amber]);
  useEffect(() => () => disposeMaterial(tint), [tint]);
  const { container } = substance;
  const spec = labelSpec(DROPPER.radius, DROPPER.label);
  const liquidVolume = Math.min(volumeMl, assets.brimMl);

  const assembly = (
    <>
      <mesh geometry={assets.cap} material={kit.plasticDark} castShadow />
      <mesh geometry={assets.teat} material={kit.rubberBlack} castShadow />
      <mesh geometry={assets.pipetteBore} material={kit.glass} renderOrder={2.4} />
      <mesh geometry={assets.pipetteOuter} material={kit.glass} renderOrder={2.6} />
    </>
  );

  return (
    <>
      <GlassBody assets={assets} tint={tint}>
        <Contents simId={simId} vessel={bottleVessel(assets, container)} fallback={bottleFill(container, liquidVolume)} />
      </GlassBody>
      {capOn ? (
        assembly
      ) : (
        <group position={[-0.04, -DROPPER_REST.drop, 0.05]} rotation-y={-0.3}>
          <group rotation-z={DROPPER_REST.tilt - Math.PI / 2}>{assembly}</group>
          <group position={[0.088, DROPPER_REST.drop, 0]} scale-x={2.1}>
            <BlobShadow radius={0.013} opacity={0.22} />
          </group>
        </group>
      )}
      <Label geometry={assets.label} substance={substance} spec={spec} amount={`${container.sizeMl} ml`} />
      <BlobShadow radius={DROPPER.radius * 1.45} opacity={0.3} />
    </>
  );
};

const setFillLine = (material, level) => {
  material.userData.hdpeLevel.value = level;
};

const HdpeBottle = ({ simId, substance, volumeMl, capOn }) => {
  const kit = useKit();
  const assets = assetsFor("hdpe");
  const { container } = substance;
  const level = volumeMl > 0 ? heightForVolume(assets.innerProfile, volumeMl) : -1;
  const clear = (container.opacity ?? 0.1) < 0.3;
  const content = clear ? "#a9b4bb" : container.color;
  const strength = clear ? 0.22 : 0.35;
  const body = useMemo(() => createHdpeMaterial({ level: -1, content, strength }), [content, strength]);
  useEffect(() => () => disposeMaterial(body), [body]);
  useFrame(() => setFillLine(body, level), DEVICE_PRIORITY);
  const spec = labelSpec(HDPE.radius, HDPE.label);
  const cap = <mesh geometry={assets.cap} material={kit.plasticWhite} castShadow />;

  return (
    <>
      <mesh geometry={assets.body} material={body} castShadow />
      <Contents simId={simId} vessel={bottleVessel(assets, container)} fallback={bottleFill(container, Math.min(volumeMl, assets.brimMl))} />
      {capOn ? (
        cap
      ) : (
        <group position={[HDPE.radius + 0.024, HDPE.cap.y0 + HDPE.cap.height + CAP_DOME, 0.012]} rotation-x={Math.PI}>
          {cap}
          <group position-y={HDPE.cap.y0 + HDPE.cap.height + CAP_DOME} rotation-x={Math.PI}>
            <BlobShadow radius={HDPE.cap.radius * 1.35} opacity={0.2} />
          </group>
        </group>
      )}
      <Label geometry={assets.label} substance={substance} spec={spec} amount={`${container.sizeMl} ml`} />
      <BlobShadow radius={HDPE.radius * 1.45} opacity={0.3} />
    </>
  );
};

const NOMINAL = { narrow: 250, dropper: 100, hdpe: 250 };

const readRemaining = (device) => device.remaining ?? 1;

const ReagentBottle = ({ simId, substance, remaining = 1, capOn = true, ...props }) => {
  const { bottle = "clear", sizeMl = 250, fillMl = 0 } = substance.container;
  const kind = bottle === "plastic" ? "hdpe" : sizeMl <= 100 ? "dropper" : "narrow";
  const scale = Math.cbrt(sizeMl / NOMINAL[kind]);
  const { device } = useDevice(simId);
  const share = useDeviceStep(device, readRemaining, 0.01, remaining);
  const volumeMl = (Math.max(0, Math.min(1, share)) * fillMl) / scale ** 3;
  const shared = { simId, substance, volumeMl, capOn: device ? device.capOn !== false : capOn, amber: bottle === "amber" };

  return (
    <group {...props}>
      <group scale={scale}>
        {kind === "narrow" && <NarrowBottle {...shared} />}
        {kind === "dropper" && <DropperBottle {...shared} />}
        {kind === "hdpe" && <HdpeBottle {...shared} />}
      </group>
    </group>
  );
};

export default ReagentBottle;
