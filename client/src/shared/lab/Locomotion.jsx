// Headsetsiz birinchi shaxs harakatlanish (kompyuter + telefon):
//   - Kompyuter "walk" rejimi: sahnada sudrab qarash + WASD/strelkalar bilan
//     yurish. Kursor ko'rinib turadi, shuning uchun 3D tugmalar bosilaveradi.
//   - Telefon cardboard: giroskop qaraydi (CardboardView), ekranni bosib turib
//     qaragan tomonga oldinga yuriladi.
// XR (Quest) stik bilan harakat alohida <XRLocomotion> da.
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneControlOptional } from "./sceneControl";

const MOVE_SPEED = 3.2; // birlik/sekund
const LOOK_SENS = 0.0026; // radian/piksel
const MAX_PITCH = Math.PI / 2 - 0.12;
const BOUND = 14; // o'yinchini oqilona quti ichida ushlab turish

const clampXZ = (p) => {
  p.x = Math.max(-BOUND, Math.min(BOUND, p.x));
  p.z = Math.max(-BOUND, Math.min(BOUND, p.z));
};

const Locomotion = () => {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const { walk, cardboard, inVR } = useSceneControlOptional();

  const keys = useRef({});
  const drag = useRef({ active: false, x: 0, y: 0 });
  const look = useRef({ yaw: 0, pitch: 0 });
  const holding = useRef(false);

  const fwd = useRef(new THREE.Vector3()).current;
  const right = useRef(new THREE.Vector3()).current;
  const move = useRef(new THREE.Vector3()).current;
  const euler = useRef(new THREE.Euler()).current;

  // Kompyuter: sudrab qarash + klaviatura. Faqat walk rejimida.
  useEffect(() => {
    if (!walk || inVR) return;
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    look.current.yaw = e.y;
    look.current.pitch = e.x;

    const el = gl.domElement;
    const onDown = (ev) => {
      drag.current.active = true;
      drag.current.x = ev.clientX;
      drag.current.y = ev.clientY;
    };
    const onMove = (ev) => {
      if (!drag.current.active) return;
      const dx = ev.clientX - drag.current.x;
      const dy = ev.clientY - drag.current.y;
      drag.current.x = ev.clientX;
      drag.current.y = ev.clientY;
      look.current.yaw -= dx * LOOK_SENS;
      look.current.pitch = Math.max(
        -MAX_PITCH,
        Math.min(MAX_PITCH, look.current.pitch - dy * LOOK_SENS),
      );
    };
    const onUp = () => {
      drag.current.active = false;
    };
    const setKey = (down) => (ev) => {
      const t = ev.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || ev.target.isContentEditable) return;
      keys.current[ev.code] = down;
    };
    const onKeyDown = setKey(true);
    const onKeyUp = setKey(false);

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      keys.current = {};
    };
  }, [walk, inVR, gl, camera]);

  // Telefon cardboard: ekranni bosib turib oldinga yurish.
  useEffect(() => {
    if (!cardboard || inVR) return;
    const onDown = (ev) => {
      // Overlay tugmalariga (masalan "Chiqish") bosish kamerani surmasin.
      if (ev.target?.closest?.("button")) return;
      holding.current = true;
    };
    const onUp = () => {
      holding.current = false;
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    // Telefon ko'zoynakdan olinsa yoki fokus yo'qolsa - yurish tiqilib qolmasin.
    window.addEventListener("blur", onUp);
    document.addEventListener("visibilitychange", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
      document.removeEventListener("visibilitychange", onUp);
      holding.current = false;
    };
  }, [cardboard, inVR]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    if (walk && !inVR) {
      // qarashni qo'llash (to'g'ridan rotation o'rniga quaternion metodi)
      euler.set(look.current.pitch, look.current.yaw, 0, "YXZ");
      camera.quaternion.setFromEuler(euler);

      camera.getWorldDirection(fwd);
      fwd.y = 0;
      if (fwd.lengthSq() < 1e-6) return;
      fwd.normalize();
      right.crossVectors(fwd, camera.up).normalize();

      move.set(0, 0, 0);
      const k = keys.current;
      if (k.KeyW || k.ArrowUp) move.add(fwd);
      if (k.KeyS || k.ArrowDown) move.sub(fwd);
      if (k.KeyD || k.ArrowRight) move.add(right);
      if (k.KeyA || k.ArrowLeft) move.sub(right);
      if (move.lengthSq() > 0) {
        move.normalize();
        camera.position.addScaledVector(move, MOVE_SPEED * dt);
        clampXZ(camera.position);
      }
    } else if (cardboard && !inVR && holding.current) {
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      if (fwd.lengthSq() < 1e-6) return;
      fwd.normalize();
      camera.position.addScaledVector(fwd, MOVE_SPEED * 0.8 * dt);
      clampXZ(camera.position);
    }
  });

  return null;
};

export default Locomotion;
