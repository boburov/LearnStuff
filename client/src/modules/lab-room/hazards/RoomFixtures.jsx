import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Color } from "three";
import { ROOM_ASSETS } from "../labRoomAssets";

const STROBE_HZ = 1.4;
const ALARM_RED = new Color("#ff2b1d");
const HOOD_WHITE = new Color("#fff4dd");
const OFF = new Color("#000000");

const nodesOf = (scene) => ({
  extinguisher: scene.getObjectByName("extinguisher") ?? null,
  alarmLight: scene.getObjectByName("alarm_light") ?? null,
  bell: scene.getObjectByName("alarm_bell") ?? null,
  hoodLight: scene.getObjectByName("fumehood_light") ?? null,
  hoodRocker: scene.getObjectByName("fumehood_switch")?.children?.[1] ?? null,
  ventRocker: scene.getObjectByName("ventilation_switch")?.children?.[1] ?? null,
});

const glow = (mesh, color, strength) => {
  if (!mesh?.material) return;
  mesh.material.emissive.copy(strength > 0 ? color : OFF);
  mesh.material.emissiveIntensity = strength;
};

const restore = (nodes) => {
  if (nodes.extinguisher) nodes.extinguisher.visible = true;
  glow(nodes.alarmLight, OFF, 0);
  glow(nodes.hoodLight, OFF, 0);
  if (nodes.bell) nodes.bell.rotation.z = 0;
  if (nodes.hoodRocker) nodes.hoodRocker.rotation.z = 0;
  if (nodes.ventRocker) nodes.ventRocker.rotation.z = 0;
};

// The safety corner reacts to the room state: bracket, strobe, bell and the two fan switches.
const step = (nodes, lab, world, light, time) => {
  const { alarm, devices } = lab.hazards;
  const calm = lab.prefs.reduceMotion;
  if (nodes.extinguisher) {
    nodes.extinguisher.visible = !world.store.get().objects.some((o) => o.typeId === "extinguisher");
  }
  const beat = alarm.active ? (calm ? 0.75 : 0.5 + 0.5 * Math.sin(time * STROBE_HZ * Math.PI * 2)) : 0;
  glow(nodes.alarmLight, ALARM_RED, beat * 9);
  if (light) light.intensity = beat * 1.4;
  if (nodes.bell) nodes.bell.rotation.z = alarm.active && !calm ? Math.sin(time * 26) * 0.045 : 0;
  glow(nodes.hoodLight, HOOD_WHITE, devices.hoodFan ? 2.4 : 0);
  if (nodes.hoodRocker) nodes.hoodRocker.rotation.z = devices.hoodFan ? 0.12 : -0.12;
  if (nodes.ventRocker) nodes.ventRocker.rotation.z = devices.ventilation ? 0.12 : -0.12;
};

const Fixtures = ({ lab, world }) => {
  const { scene } = useGLTF(ROOM_ASSETS.glb);
  const nodes = useMemo(() => nodesOf(scene), [scene]);
  const lightRef = useRef(null);

  useEffect(() => () => restore(nodes), [nodes]);

  useFrame(({ clock }) => step(nodes, lab, world, lightRef.current, clock.elapsedTime));

  return <pointLight ref={lightRef} position={[-4.15, 2.42, 3.6]} color="#ff2b1d" intensity={0} distance={5} />;
};

// Only the baked room has these fittings; the placeholder room has none.
const RoomFixtures = ({ lab, world, enabled = true }) => (enabled ? <Fixtures lab={lab} world={world} /> : null);

export default RoomFixtures;
