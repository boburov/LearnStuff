import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, DoubleSide, LatheGeometry, MeshBasicMaterial, PlaneGeometry } from "three";
import { useKit } from "../kit/kitContext";
import { toVectors } from "../kit/vessel";

// Ø6 × 200 mm glass rod; fire-polished ends swell slightly past the body radius.
const LENGTH = 0.2;
const RADIUS = 0.003;
const KNOB = 0.00332;
const DOME = KNOB * 0.92;
const NECK = 0.0055;
const CORE_WIDTH = 0.0025;

const endProfile = () => {
  const points = [];
  for (let i = 0; i <= 8; i += 1) {
    const a = (i / 8) * (Math.PI / 2);
    points.push([KNOB * Math.sin(a), DOME * (1 - Math.cos(a))]);
  }
  for (let i = 1; i <= 5; i += 1) {
    const t = i / 5;
    points.push([KNOB + (RADIUS - KNOB) * t * t * (3 - 2 * t), DOME + NECK * t]);
  }
  return points;
};

// Soft light band inside the rod (what a solid cylinder lens shows), faded toward the ends.
const buildCore = () => {
  const geometry = new PlaneGeometry(LENGTH - 0.004, CORE_WIDTH, 40, 6);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const across = 1 - Math.abs(pos.getY(i)) / (CORE_WIDTH / 2);
    const along = Math.max(0, Math.min(1, (LENGTH / 2 - 0.002 - Math.abs(pos.getX(i))) / 0.012));
    const c = across * across * (3 - 2 * across) * along;
    colors.set([c, c, c], i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.rotateX(-Math.PI / 4);
  geometry.translate(0, KNOB, 0);
  return geometry;
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const half = endProfile();
  const profile = [...half, ...[...half].reverse().map(([r, y]) => [r, LENGTH - y])];
  const rod = new LatheGeometry(toVectors(profile), 32, Math.PI, Math.PI * 2);
  rod.rotateZ(-Math.PI / 2);
  rod.translate(-LENGTH / 2, KNOB, 0);
  assets = { rod, core: buildCore() };
  return assets;
};

const createCoreMaterial = () =>
  new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.18,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });

const StirringRod = ({ ...props }) => {
  const kit = useKit();
  const { rod, core } = getAssets();
  const coreMaterial = useMemo(() => createCoreMaterial(), []);
  useEffect(() => () => coreMaterial.dispose(), [coreMaterial]);

  return (
    <group {...props}>
      <mesh geometry={core} material={coreMaterial} renderOrder={2} />
      <mesh geometry={rod} material={kit.glass} renderOrder={3} />
    </group>
  );
};

export default StirringRod;
