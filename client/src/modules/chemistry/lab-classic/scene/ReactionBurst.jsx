// Visual burst when a reaction fires (keyed on reactionSeq). A normal reaction
// gives a small white pop; an EXPLOSION ("portlash"/"yonish") gives a big
// yellow→red fireball with an expanding shockwave shell, flying debris sparks
// and a bright warm flash that lights the whole bench.
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TUBE_X, TUBE_BASE_Y } from "./labGeometry";

const SPARKS = 20;
// Shared scratch object for composing instance matrices (single instance live).
const dummy = new THREE.Object3D();

const ReactionBurst = ({ reactionSeq, kind }) => {
  const light = useRef(null);
  const fire = useRef(null);
  const fireMat = useRef(null);
  const shock = useRef(null);
  const shockMat = useRef(null);
  const sparks = useRef(null);
  const energy = useRef(0);
  const big = useRef(false);
  const last = useRef(reactionSeq);
  const dirs = useRef([]);

  // Seed random spark directions once. Math.random must not run during render,
  // so the buffer is filled here (this repo's eslint forbids impure renders).
  useEffect(() => {
    const arr = [];
    for (let i = 0; i < SPARKS; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      arr.push({
        x: r * Math.cos(t),
        y: Math.abs(u) * 0.7 + 0.3, // bias the spread up and outward
        z: r * Math.sin(t),
        speed: 2.4 + Math.random() * 2.4,
        size: 0.05 + Math.random() * 0.07,
      });
    }
    dirs.current = arr;
  }, []);

  useFrame((_, delta) => {
    if (reactionSeq !== last.current) {
      last.current = reactionSeq;
      energy.current = 1;
      big.current = kind === "explosion";
    }
    const isBig = big.current;
    // Explosions linger a touch longer so the blast reads clearly.
    energy.current = Math.max(0, energy.current - delta * (isBig ? 1.1 : 1.8));
    const e = energy.current;
    const inv = 1 - e;

    // Warm flash: explosions are far brighter and reach across the bench.
    if (light.current) {
      light.current.intensity = e * (isBig ? 28 : 7);
      light.current.distance = isBig ? 15 : 6;
      light.current.color.set(isBig ? "#ffae42" : "#fff3d0");
    }

    // Fireball: a small white pop, or a large yellow→red expanding ball.
    if (fire.current && fireMat.current) {
      const max = isBig ? 2.8 : 1.1;
      const s = (0.25 + inv * max) * (e > 0 ? 1 : 0);
      fire.current.scale.setScalar(s);
      fire.current.visible = e > 0.01;
      fire.current.position.y = isBig ? inv * 0.6 : 0; // the blast rises
      if (isBig) fireMat.current.color.setRGB(1, 0.72 - inv * 0.6, 0.12 * e);
      else fireMat.current.color.set("#fff6e0");
      fireMat.current.opacity = e * (isBig ? 0.92 : 0.5);
    }

    // Shockwave shell - explosions only.
    if (shock.current && shockMat.current) {
      const on = isBig && e > 0.01;
      shock.current.visible = on;
      if (on) {
        shock.current.scale.setScalar(0.3 + inv * 4.6);
        shockMat.current.opacity = e * e * 0.42;
      }
    }

    // Flying debris sparks - explosions only.
    if (sparks.current) {
      const d = dirs.current;
      const on = isBig && e > 0.01 && d.length > 0;
      sparks.current.visible = on;
      if (on) {
        for (let i = 0; i < d.length; i++) {
          const p = d[i];
          const dist = inv * p.speed;
          dummy.position.set(p.x * dist, p.y * dist, p.z * dist);
          dummy.scale.setScalar(p.size * e * 3);
          dummy.updateMatrix();
          sparks.current.setMatrixAt(i, dummy.matrix);
        }
        sparks.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group position={[TUBE_X, TUBE_BASE_Y + 0.9, 0]}>
      <pointLight ref={light} color="#ffae42" distance={6} decay={2} intensity={0} />

      <mesh ref={fire} visible={false}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          ref={fireMat}
          color="#fff6e0"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={shock} visible={false}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          ref={shockMat}
          color="#ffd9a0"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      <instancedMesh ref={sparks} args={[null, null, SPARKS]} visible={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#ffcf6e" transparent opacity={0.95} depthWrite={false} />
      </instancedMesh>
    </group>
  );
};

export default ReactionBurst;
