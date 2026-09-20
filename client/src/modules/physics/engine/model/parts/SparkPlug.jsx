import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GEOM, sparkIntensity } from "../../engineMath";
import { PART_BY_ID } from "../../engineParts";
import { usePartMaterial } from "../materials";

const SHELL = PART_BY_ID.sparkPlug.shell;
const BASE = GEOM.sparkPlugBaseY;
const TOP = GEOM.sparkPlugTopY;
const THREAD_Y0 = BASE + 0.05;
const THREAD_Y1 = BASE + 0.4;
const HEX_Y0 = THREAD_Y1 + 0.022;
const HEX_H = 0.115;
const INSULATOR_Y1 = TOP - 0.14;
const SPARK_Y = BASE + 0.017;
const SPARK_LIGHT = 3.5;

const lathe = (pts, segments = 40) =>
  new THREE.LatheGeometry(
    pts.flatMap(([x, y, hard]) =>
      hard ? [new THREE.Vector2(x, y), new THREE.Vector2(x, y)] : [new THREE.Vector2(x, y)],
    ),
    segments,
  );

const nonIndexed = (g) => {
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  return out;
};

const buildShell = () => {
  const pts = [
    [0.03, THREAD_Y0],
    [0.052, THREAD_Y0, true],
  ];
  const pitch = 0.02;
  const turns = Math.floor((THREAD_Y1 - THREAD_Y0 - 0.02) / pitch);
  for (let i = 0; i < turns; i++) {
    const y = THREAD_Y0 + 0.01 + i * pitch;
    pts.push([0.052, y, true], [0.061, y + pitch * 0.45, true], [0.061, y + pitch * 0.55, true]);
  }
  pts.push(
    [0.052, THREAD_Y0 + 0.01 + turns * pitch, true],
    [0.052, THREAD_Y1, true],
    [0.058, THREAD_Y1, true],
    [0.058, HEX_Y0, true],
    [0.045, HEX_Y0],
  );
  const shell = lathe(pts, 40);

  const crimp = lathe([
    [0.05, HEX_Y0 + HEX_H - 0.01],
    [0.072, HEX_Y0 + HEX_H - 0.01, true],
    [0.072, HEX_Y0 + HEX_H + 0.025, true],
    [0.062, HEX_Y0 + HEX_H + 0.055, true],
    [0.057, HEX_Y0 + HEX_H + 0.055],
  ], 40);

  const center = lathe([
    [0, BASE + 0.024],
    [0.007, BASE + 0.025, true],
    [0.009, BASE + 0.06],
  ], 16);

  const strapV = new THREE.BoxGeometry(0.014, THREAD_Y0 - BASE + 0.012, 0.028).translate(
    0.043,
    (BASE + THREAD_Y0 + 0.012) / 2,
    0,
  );
  const strapH = new THREE.BoxGeometry(0.058, 0.013, 0.028).translate(0.021, BASE + 0.0065, 0);

  const terminal = lathe([
    [0.016, INSULATOR_Y1 - 0.01],
    [0.016, TOP - 0.09, true],
    [0.034, TOP - 0.088, true],
    [0.034, TOP - 0.028],
    [0.03, TOP - 0.012],
    [0.018, TOP - 0.002],
    [0, TOP],
  ], 32);

  return mergeGeometries([shell, crimp, center, strapV, strapH, terminal].map(nonIndexed));
};

const buildHex = () => {
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    if (i === 0) s.moveTo(0.09 * Math.cos(a), 0.09 * Math.sin(a));
    else s.lineTo(0.09 * Math.cos(a), 0.09 * Math.sin(a));
  }
  const bevel = 0.008;
  const g = new THREE.ExtrudeGeometry(s, {
    depth: HEX_H - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
  });
  g.rotateX(-Math.PI / 2).translate(0, HEX_Y0 + bevel, 0);
  g.scale(100, 100, 100);
  const out = toCreasedNormals(g, Math.PI / 6);
  out.scale(0.01, 0.01, 0.01);
  return out;
};

const buildCeramic = () => {
  const y0 = HEX_Y0 + HEX_H + 0.03;
  const pts = [
    [0.02, BASE + 0.03],
    [0.03, BASE + 0.1],
    [0.036, THREAD_Y1],
    [0.052, y0, true],
    [0.057, y0 + 0.01, true],
    [0.057, y0 + 0.08],
  ];
  const ribs = 6;
  const ribY0 = y0 + 0.1;
  const ribStep = 0.085;
  for (let i = 0; i < ribs; i++) {
    const y = ribY0 + i * ribStep;
    pts.push([0.05, y], [0.063, y + 0.02], [0.063, y + 0.045], [0.05, y + 0.065]);
  }
  const yEnd = ribY0 + ribs * ribStep;
  pts.push([0.05, yEnd + 0.03], [0.042, INSULATOR_Y1 - 0.04], [0.03, INSULATOR_Y1, true], [0.016, INSULATOR_Y1]);
  return lathe(pts, 48);
};

const SparkPlug = ({ simRef, mode, selected }) => {
  const coreRef = useRef(null);
  const haloRef = useRef(null);
  const lightRef = useRef(null);
  const steelMat = usePartMaterial("steel", { mode, shell: SHELL, selected });
  const hexMat = usePartMaterial("darkSteel", { mode, shell: SHELL, selected });
  const ceramicMat = usePartMaterial("ceramic", { mode, shell: SHELL, selected });

  const fx = useMemo(
    () => ({
      core: new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      halo: new THREE.MeshBasicMaterial({
        color: "#7dd3fc",
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      sphere: new THREE.SphereGeometry(1, 20, 14),
    }),
    [],
  );
  const geos = useMemo(() => ({ shell: buildShell(), hex: buildHex(), ceramic: buildCeramic() }), []);
  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose());
      Object.values(fx).forEach((o) => o.dispose());
    },
    [geos, fx],
  );

  useFrame(() => {
    const s = sparkIntensity(simRef.current.theta);
    const on = s > 0.01;
    if (coreRef.current) {
      coreRef.current.visible = on;
      coreRef.current.scale.setScalar(0.012 + 0.014 * s);
    }
    if (haloRef.current) {
      haloRef.current.visible = on;
      haloRef.current.scale.setScalar(0.03 + 0.05 * s);
    }
    if (lightRef.current) lightRef.current.intensity = on ? SPARK_LIGHT * s : 0;
  });

  return (
    <group>
      <mesh geometry={geos.shell} material={steelMat} castShadow />
      <mesh geometry={geos.hex} material={hexMat} castShadow />
      <mesh geometry={geos.ceramic} material={ceramicMat} castShadow />
      <mesh ref={coreRef} geometry={fx.sphere} material={fx.core} position={[0, SPARK_Y, 0]} visible={false} raycast={() => null} />
      <mesh ref={haloRef} geometry={fx.sphere} material={fx.halo} position={[0, SPARK_Y, 0]} visible={false} raycast={() => null} />
      <pointLight ref={lightRef} position={[0, SPARK_Y, 0]} color="#cfe3ff" intensity={0} distance={1.4} decay={2} />
    </group>
  );
};

export default SparkPlug;
