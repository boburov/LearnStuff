import { useEffect, useMemo } from "react";
import {
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Curve,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Path,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useKit } from "../kit/kitContext";
import BlobShadow from "../kit/BlobShadow";
import { arc, toVectors } from "../kit/vessel";

// Beech rack for Ø18 mm tubes: 200 × 70 × 110 mm, 6 holes Ø21 mm, 6 drying pegs, clothes-peg tube holder.
const L = 0.2;
const DEPTH = 0.07;
const H = 0.11;
const SIDE = 0.012;
const BOARD = 0.012;
const INNER = L - 2 * SIDE;
const TOP_Y = 0.064;
const HOLE_R = 0.0105;
const HOLE_Z = 0.012;
const RECESS_R = 0.0101;
const RECESS_DEPTH = 0.003;
const PEG_R = 0.004;
const PEG_Z = -0.019;
const PEG_TOP = 0.108;
const PITCH = 0.028;
const HOLES_X = Array.from({ length: 6 }, (_, i) => (i - 2.5) * PITCH);
const CHAMFER = 0.0008;
const GRAIN_REPEAT = [4, 16];
const HOLDER_L = 0.18;
const HOLDER_T = 0.009;
const HOLDER_W = 0.012;
const PIVOT_X = 0.073;
const SEAM = Math.PI;

// Normals smoothed only across edges flatter than `angle`, area weighted, hashed at 10 µm.
const creaseNormals = (geometry, angle) => {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position;
  const faces = pos.count / 3;
  const fn = new Float32Array(faces * 3);
  const buckets = new Map();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const key = (i) => `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
  for (let f = 0; f < faces; f += 1) {
    a.fromBufferAttribute(pos, f * 3);
    b.fromBufferAttribute(pos, f * 3 + 1);
    c.fromBufferAttribute(pos, f * 3 + 2);
    c.sub(b);
    a.sub(b);
    c.cross(a);
    fn.set([c.x, c.y, c.z], f * 3);
    for (let k = 0; k < 3; k += 1) {
      const id = key(f * 3 + k);
      if (!buckets.has(id)) buckets.set(id, []);
      buckets.get(id).push(f);
    }
  }
  const limit = Math.cos(angle);
  const normals = new Float32Array(pos.count * 3);
  const n = new Vector3();
  const m = new Vector3();
  const sum = new Vector3();
  for (let f = 0; f < faces; f += 1) {
    n.fromArray(fn, f * 3).normalize();
    for (let k = 0; k < 3; k += 1) {
      sum.set(0, 0, 0);
      buckets.get(key(f * 3 + k)).forEach((other) => {
        m.fromArray(fn, other * 3);
        const length = m.length();
        if (length > 0 && n.dot(m) / length > limit) sum.add(m);
      });
      if (sum.lengthSq() === 0) sum.copy(n);
      sum.normalize();
      normals.set([sum.x, sum.y, sum.z], (f * 3 + k) * 3);
    }
  }
  g.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  return g;
};

const roundedRect = (target, x, y, w, h, r) => {
  target.moveTo(x + r, y);
  target.lineTo(x + w - r, y);
  target.quadraticCurveTo(x + w, y, x + w, y + r);
  target.lineTo(x + w, y + h - r);
  target.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  target.lineTo(x + r, y + h);
  target.quadraticCurveTo(x, y + h, x, y + h - r);
  target.lineTo(x, y + r);
  target.quadraticCurveTo(x, y, x + r, y);
  return target;
};

const circle = (x, y, r) => {
  const path = new Path();
  path.absarc(x, y, r, 0, Math.PI * 2, true);
  return path;
};

// Extrudes a shape to `thickness` with a small chamfer and crisp flat faces.
const extrude = (shape, thickness, curveSegments = 12) => {
  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness - 2 * CHAMFER,
    bevelEnabled: true,
    bevelThickness: CHAMFER,
    bevelSize: CHAMFER,
    bevelOffset: -CHAMFER,
    bevelSegments: 1,
    curveSegments,
  });
  geometry.translate(0, 0, CHAMFER);
  return creaseNormals(geometry, 0.5);
};

// Shape plane (x, -z) extruded upward: board lies flat with grain along X.
const flatBoard = (shape, thickness, y) => {
  const geometry = extrude(shape, thickness);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
};

const buildTopBoard = () => {
  const shape = roundedRect(new Shape(), -INNER / 2, -DEPTH / 2, INNER, DEPTH, 0.0015);
  HOLES_X.forEach((x) => {
    shape.holes.push(circle(x, -HOLE_Z, HOLE_R));
    shape.holes.push(circle(x, -PEG_Z, PEG_R + 0.0002));
  });
  return flatBoard(shape, BOARD, TOP_Y);
};

const buildBaseBoard = () => {
  const shape = roundedRect(new Shape(), -INNER / 2, -DEPTH / 2, INNER, DEPTH, 0.0015);
  HOLES_X.forEach((x) => shape.holes.push(circle(x, -HOLE_Z, RECESS_R)));
  const board = flatBoard(shape, BOARD, 0);
  const floors = HOLES_X.map((x) => {
    const floor = new CircleGeometry(RECESS_R + 0.0003, 24);
    floor.rotateX(-Math.PI / 2);
    floor.translate(x, BOARD - RECESS_DEPTH, HOLE_Z);
    const pos = floor.attributes.position;
    const uv = floor.attributes.uv;
    for (let i = 0; i < pos.count; i += 1) uv.setXY(i, pos.getX(i), -pos.getZ(i));
    return floor.toNonIndexed();
  });
  return [board, ...floors];
};

// Uprights: profile in (height, z) mapped so the grain runs vertically.
const buildUprights = () => {
  const r = 0.014;
  const shape = new Shape();
  shape.moveTo(0, -DEPTH / 2);
  shape.lineTo(H - r, -DEPTH / 2);
  shape.quadraticCurveTo(H, -DEPTH / 2, H, -DEPTH / 2 + r);
  shape.lineTo(H, DEPTH / 2 - r);
  shape.quadraticCurveTo(H, DEPTH / 2, H - r, DEPTH / 2);
  shape.lineTo(0, DEPTH / 2);
  shape.lineTo(0, -DEPTH / 2);
  const toWorld = new Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  return [-1, 1].map((side) => {
    const upright = extrude(shape, SIDE, 12);
    upright.applyMatrix4(toWorld);
    upright.translate(side > 0 ? INNER / 2 : -L / 2, 0, 0);
    return upright;
  });
};

const buildPegs = () =>
  HOLES_X.map((x) => {
    const peg = new LatheGeometry(
      toVectors([
        [0, BOARD - 0.001],
        [PEG_R, BOARD - 0.001],
        [PEG_R, PEG_TOP - PEG_R * 0.8],
        ...arc(0, PEG_TOP - PEG_R * 0.8, PEG_R, 0, Math.PI / 2, 5)
          .slice(1)
          .map(([pr, py]) => [pr, PEG_TOP - PEG_R * 0.8 + (py - (PEG_TOP - PEG_R * 0.8)) * 0.8]),
      ]),
      12,
      SEAM,
      Math.PI * 2,
    );
    const pos = peg.attributes.position;
    const uv = peg.attributes.uv;
    for (let i = 0; i < pos.count; i += 1) uv.setXY(i, pos.getY(i), uv.getX(i) * Math.PI * 2 * PEG_R + x);
    peg.translate(x, 0, PEG_Z);
    return peg.toNonIndexed();
  });

// Holder jaw in its lying pose: inner face on z = 0, outer face toward +z; grain along the length.
const holderShape = (mirror) => {
  const points = [];
  const add = (x, z) => points.push([x, mirror * z]);
  add(0.0025, 0.0004);
  for (let i = 0; i <= 8; i += 1) {
    const x = 0.011 + (0.018 * i) / 8;
    add(x, 0.0042 * Math.sin((Math.PI * i) / 8));
  }
  for (let i = 0; i <= 8; i += 1) {
    const x = PIVOT_X - 0.0066 + (0.0132 * i) / 8;
    add(x, 0.0034 * Math.sin((Math.PI * i) / 8));
  }
  add(PIVOT_X + 0.012, 0.0004);
  add(HOLDER_L - 0.006, 0.0026);
  add(HOLDER_L - 0.0012, 0.0036);
  add(HOLDER_L, 0.0052);
  add(HOLDER_L - 0.0012, HOLDER_T - 0.0012);
  add(HOLDER_L - 0.005, HOLDER_T);
  add(0.03, HOLDER_T);
  add(0.004, HOLDER_T - 0.0022);
  add(0.0005, HOLDER_T - 0.0034);
  add(0, 0.003);
  const shape = new Shape();
  points.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
  shape.closePath();
  return shape;
};

class Helix extends Curve {
  getPoint(t, target = new Vector3()) {
    const angle = t * Math.PI * 2 * 3.5 + Math.PI * 0.5;
    return target.set(PIVOT_X + Math.cos(angle) * 0.0036, 0.0022 + t * 0.0076, Math.sin(angle) * 0.0036);
  }
}

const buildHolder = () => {
  const bars = [1, -1].map((mirror) => {
    const bar = extrude(holderShape(mirror), HOLDER_W, 12);
    bar.rotateX(-Math.PI / 2);
    return bar;
  });
  const coil = new TubeGeometry(new Helix(), 56, 0.0005, 5, false);
  const legs = [1, -1].map((side) => {
    const start = side > 0 ? [PIVOT_X, 0.0022 + 0.0076 * (3 / 3.5), 0.0036] : [PIVOT_X, 0.0098, -0.0036];
    const path = new CatmullRomCurve3(
      [
        start,
        [PIVOT_X - 0.0015, 0.0127, side * 0.0052],
        [PIVOT_X - 0.004, 0.0127, side * 0.0088],
        [PIVOT_X - 0.008, 0.0097, side * (HOLDER_T + 0.0005)],
        [0.04, 0.0092, side * (HOLDER_T + 0.0005)],
        [0.033, 0.0092, side * (HOLDER_T - 0.0006)],
      ].map((p) => new Vector3(...p)),
      false,
      "centripetal",
    );
    return new TubeGeometry(path, 24, 0.00055, 5, false);
  });
  return { wood: mergeGeometries(bars), wire: mergeGeometries([coil, ...legs]) };
};

let grainCanvas = null;
const getGrainCanvas = () => {
  if (grainCanvas) return grainCanvas;
  const w = 1024;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(w, h);
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const TAU = Math.PI * 2;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const u = x / w;
      const v = y / h;
      const t = v + 0.02 * Math.sin(TAU * (u * 2 + 0.3)) + 0.008 * Math.sin(TAU * (u * 5 + 0.7));
      const ring = Math.pow(0.5 + 0.5 * Math.sin(TAU * t * 9 + 1.6 * Math.sin(TAU * t * 2)), 8);
      const fine = 0.5 + 0.5 * Math.sin(TAU * t * 71 + 2.1 * Math.sin(TAU * u * 3));
      const k = 1 - 0.075 * ring - 0.03 * fine - 0.025 * rand();
      const i = (y * w + x) * 4;
      image.data[i] = 255 * k;
      image.data[i + 1] = 252 * k;
      image.data[i + 2] = 249 * k;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  for (let i = 0; i < 700; i += 1) {
    ctx.fillStyle = `rgba(130,80,50,${0.05 + rand() * 0.09})`;
    ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 9, 1 + rand() * 1.4);
  }
  grainCanvas = canvas;
  return canvas;
};

const createWoodMaterial = (base) => {
  const material = base.clone();
  material.color.set("#d8b891");
  const texture = new CanvasTexture(getGrainCanvas());
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(...GRAIN_REPEAT);
  texture.anisotropy = 8;
  material.map = texture;
  return material;
};

// Nail heads on the uprights' outer faces, one pair per board.
const buildNails = () =>
  mergeGeometries(
    [-1, 1].flatMap((side) =>
      [BOARD / 2, TOP_Y + BOARD / 2].flatMap((y) =>
        [-0.02, 0.02].map((z) => {
          const nail = new CylinderGeometry(0.0008, 0.0009, 0.0005, 8);
          nail.rotateZ(Math.PI / 2);
          nail.translate(side * (L / 2 + 0.00005), y, z);
          return nail;
        }),
      ),
    ),
  );

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  assets = {
    rack: mergeGeometries([buildTopBoard(), ...buildBaseBoard(), ...buildUprights(), ...buildPegs()]),
    nails: buildNails(),
    holder: buildHolder(),
  };
  return assets;
};

const HOLDER_POSITION = [-0.084, 0, 0.061];

const TestTubeRack = ({ withHolder = true, ...props }) => {
  const kit = useKit();
  const { rack, nails, holder } = getAssets();
  const wood = useMemo(() => createWoodMaterial(kit.woodLight), [kit]);
  useEffect(
    () => () => {
      wood.map.dispose();
      wood.dispose();
    },
    [wood],
  );

  return (
    <group {...props}>
      <mesh geometry={rack} material={wood} castShadow receiveShadow />
      <mesh geometry={nails} material={kit.steel} />
      {withHolder && (
        <group position={HOLDER_POSITION} rotation-y={0.05}>
          <mesh geometry={holder.wood} material={wood} castShadow receiveShadow />
          <mesh geometry={holder.wire} material={kit.steel} castShadow />
          <group position-x={HOLDER_L / 2} scale={[1, 1, 0.16]}>
            <BlobShadow radius={0.1} opacity={0.22} />
          </group>
        </group>
      )}
      <group scale={[1, 1, 0.42]}>
        <BlobShadow radius={0.13} opacity={0.3} />
      </group>
    </group>
  );
};

export default TestTubeRack;
