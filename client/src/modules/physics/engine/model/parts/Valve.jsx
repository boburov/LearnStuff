import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GEOM, VALVES, valveLift } from "../../engineMath";
import { PART_BY_ID } from "../../engineParts";
import { usePartMaterial } from "../materials";

const HEAD_R = GEOM.valveHeadRadius;
const STEM_R = 0.028;
const STEM_TOP = GEOM.valveStemLength;
const SEAT_Y = 0.45;
const RETAINER_Y = 0.82;
const SPRING_LEN = RETAINER_Y - SEAT_Y;
// Roller follower: a flat bucket cannot follow this lift curve without the lobe cutting into it.
const ROLLER_R = 0.035;
const CONTACT_Y = STEM_TOP + GEOM.camGap;
const BUCKET_TOP = CONTACT_Y - ROLLER_R - 0.045;

const PART_ID = { intake: "valveIntake", exhaust: "valveExhaust" };
const HEAD_KIND = { intake: "steel", exhaust: "heatSteel" };
const HEAD_TINT = { intake: "#7f97b8", exhaust: "#7a5a45" };

const lathe = (pts, segments = 48) =>
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

class Helix extends THREE.Curve {
  constructor(radius, height, turns, wire) {
    super();
    this.radius = radius;
    this.height = height;
    this.turns = turns;
    this.wire = wire;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const u = t * this.turns;
    const dead = 0.85;
    const pad = this.wire * 1.1;
    let y;
    if (u < dead) y = pad * (u / dead);
    else if (u > this.turns - dead) y = this.height - pad * ((this.turns - u) / dead);
    else y = pad + ((u - dead) / (this.turns - 2 * dead)) * (this.height - 2 * pad);
    const a = u * Math.PI * 2;
    return target.set(this.radius * Math.cos(a), y, this.radius * Math.sin(a));
  }
}

const buildGeos = () => {
  const head = lathe([
    [0, 0.004],
    [0.09, 0.001],
    [HEAD_R - 0.012, 0, true],
    [HEAD_R, 0.01, true],
    [HEAD_R, 0.022, true],
    [HEAD_R - 0.024, 0.046, true],
    [0.1, 0.058],
    [0.076, 0.074],
    [0.056, 0.097],
    [0.043, 0.128],
    [0.035, 0.168],
    [0.03, 0.21],
    [STEM_R, 0.26],
  ], 56);

  const stem = lathe([
    [STEM_R, 0.25],
    [STEM_R, 0.858, true],
    [0.022, 0.864],
    [0.022, 0.882],
    [STEM_R, 0.888, true],
    [STEM_R, STEM_TOP - 0.006, true],
    [0.02, STEM_TOP, true],
    [0, STEM_TOP],
  ], 24);

  const retainer = lathe([
    [STEM_R, 0.79],
    [0.05, 0.79, true],
    [0.058, RETAINER_Y, true],
    [0.092, RETAINER_Y, true],
    [0.092, 0.848, true],
    [0.084, 0.856, true],
    [0.04, 0.856, true],
    [0.034, 0.87, true],
    [STEM_R, 0.87],
  ], 40);

  const bucket = lathe([
    [0, STEM_TOP],
    [0.086, STEM_TOP, true],
    [0.086, 0.87, true],
    [0.1, 0.87, true],
    [0.1, BUCKET_TOP - 0.008, true],
    [0.092, BUCKET_TOP, true],
    [0, BUCKET_TOP],
  ], 48);

  const rollerY = CONTACT_Y - ROLLER_R;
  const roller = lathe([
    [0, -0.08],
    [ROLLER_R - 0.005, -0.08, true],
    [ROLLER_R, -0.075, true],
    [ROLLER_R, 0.075, true],
    [ROLLER_R - 0.005, 0.08, true],
    [0, 0.08],
  ], 32)
    .rotateX(Math.PI / 2)
    .translate(0, rollerY, 0);

  const cheekH = rollerY + 0.018 - BUCKET_TOP;
  const cheeks = [1, -1].map((s) =>
    nonIndexed(new THREE.BoxGeometry(0.06, cheekH, 0.014).translate(0, BUCKET_TOP + cheekH / 2, s * 0.089)),
  );
  const axle = new THREE.CylinderGeometry(0.012, 0.012, 0.21, 16)
    .rotateX(Math.PI / 2)
    .translate(0, rollerY, 0);

  const seat = lathe([
    [0.04, SEAT_Y],
    [0.04, SEAT_Y - 0.02, true],
    [0.1, SEAT_Y - 0.02, true],
    [0.1, SEAT_Y, true],
    [0.04, SEAT_Y],
  ], 40);

  const spring = new THREE.TubeGeometry(new Helix(0.072, SPRING_LEN, 6.5, 0.012), 260, 0.012, 8, false);

  return {
    head,
    stem: mergeGeometries([stem, retainer, bucket, roller].map(nonIndexed)),
    fork: mergeGeometries([...cheeks, nonIndexed(axle)]),
    seat,
    spring,
  };
};

const Valve = ({ simRef, mode, selected, which = "intake" }) => {
  const def = VALVES[which];
  const shell = PART_BY_ID[PART_ID[which]].shell;
  const movingRef = useRef(null);
  const springRef = useRef(null);

  const headMat = usePartMaterial(HEAD_KIND[which], { mode, shell, selected });
  const steelMat = usePartMaterial("steel", { mode, shell, selected });
  const darkMat = usePartMaterial("darkSteel", { mode, shell, selected });

  useEffect(() => {
    headMat.color.set(HEAD_TINT[which]);
  }, [headMat, which]);

  const geos = useMemo(() => buildGeos(), []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  useFrame(() => {
    const lift = valveLift(simRef.current.theta, which);
    if (movingRef.current) movingRef.current.position.y = -lift;
    if (springRef.current) springRef.current.scale.y = (SPRING_LEN - lift) / SPRING_LEN;
  });

  return (
    <group position={[def.headClosed.x, def.headClosed.y, 0]} rotation={[0, 0, def.tiltZ]}>
      <mesh geometry={geos.seat} material={steelMat} />
      <mesh ref={springRef} geometry={geos.spring} material={darkMat} position={[0, SEAT_Y, 0]} />
      <group ref={movingRef}>
        <mesh geometry={geos.head} material={headMat} castShadow />
        <mesh geometry={geos.stem} material={steelMat} castShadow />
        <mesh geometry={geos.fork} material={darkMat} />
      </group>
    </group>
  );
};

export default Valve;
