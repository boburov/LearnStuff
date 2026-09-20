// Moddaning uch holatini ko'rsatadigan zarrachalar quticha:
//   - Qattiq: zarrachalar panjara (lattice) bo'lib qotadi va joyida tebranadi.
//   - Suyuq: zich, bir-biriga yopishgan, oqib turadigan suyuqlik.
//   - Gaz: tez uchadigan zarrachalar idish devorlaridan sakraydi.
// Bitta InstancedMesh + integrator; holat o'zgarganda zarrachalar yangi
// holatga silliq o'tadi (gaz -> qattiq da panjaraga "muzlaydi").
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { usePausableFrame } from "@/shared/lab/usePausableFrame";
import { getElementMeta } from "@/modules/chemistry/data/molecules";

const GRID = 4;
const N = GRID * GRID * GRID; // 64 zarracha
const SPACING = 0.64;
const BOX = 2.1; // gaz devori (yarim o'lcham)
const PARTICLE_R = 0.22;

// Moddaning rangi: eng ko'p uchraydigan (vodorod bo'lmagan) element rangi.
const representativeColor = (molecule) => {
  const count = {};
  for (const a of molecule.atoms) count[a.el] = (count[a.el] ?? 0) + 1;
  const syms = Object.keys(count).sort((a, b) => count[b] - count[a]);
  const main = syms.find((s) => s !== "H") ?? syms[0];
  return getElementMeta(main).color;
};

const MoleculeStates = ({ molecule, state }) => {
  const meshRef = useRef();
  const color = useMemo(() => representativeColor(molecule), [molecule]);

  // Idish konturi (zarrachalar shu hajm ichida harakatlanadi).
  const boxEdges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(BOX * 2, BOX * 2, BOX * 2)),
    [],
  );

  // O'zgaruvchan holat ref'da: panjara joyi, joriy pozitsiya, tezlik, faza +
  // matritsa hisoblash uchun yordamchi Object3D. Math.random pure emas, shuning
  // uchun bufer effekt ichida (renderdan keyin) bir marta quriladi.
  const simRef = useRef(null);
  useEffect(() => {
    const homes = new Float32Array(N * 3);
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const phase = new Float32Array(N);
    const c = (GRID - 1) / 2;
    let i = 0;
    for (let x = 0; x < GRID; x++)
      for (let y = 0; y < GRID; y++)
        for (let z = 0; z < GRID; z++) {
          const o = i * 3;
          homes[o] = pos[o] = (x - c) * SPACING;
          homes[o + 1] = pos[o + 1] = (y - c) * SPACING;
          homes[o + 2] = pos[o + 2] = (z - c) * SPACING;
          vel[o] = Math.random() - 0.5;
          vel[o + 1] = Math.random() - 0.5;
          vel[o + 2] = Math.random() - 0.5;
          phase[i] = Math.random() * Math.PI * 2;
          i++;
        }
    simRef.current = { homes, pos, vel, phase, dummy: new THREE.Object3D() };
  }, []);

  usePausableFrame((three, delta) => {
    const mesh = meshRef.current;
    const sim = simRef.current;
    if (!mesh || !sim) return;
    const dt = Math.min(delta, 0.05);
    const t = three.clock.elapsedTime;
    const { homes, pos, vel, phase, dummy } = sim;

    for (let i = 0; i < N; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2;

      if (state === "qattiq") {
        // Panjaraga tortilish + kichik tebranish.
        const tx = homes[ix] + Math.sin(t * 7 + phase[i]) * 0.05;
        const ty = homes[iy] + Math.cos(t * 6 + phase[i]) * 0.05;
        const tz = homes[iz] + Math.sin(t * 8 + phase[i] * 1.3) * 0.05;
        pos[ix] += (tx - pos[ix]) * 0.12;
        pos[iy] += (ty - pos[iy]) * 0.12;
        pos[iz] += (tz - pos[iz]) * 0.12;
      } else if (state === "suyuq") {
        // Pastki markazga yopishgan, sekin oqadigan tomchi.
        const cohesion = 2.4, jitter = 2.4;
        vel[ix] += ((0 - pos[ix]) * cohesion + (Math.random() - 0.5) * jitter) * dt;
        vel[iy] += ((-0.4 - pos[iy]) * cohesion + (Math.random() - 0.5) * jitter - 0.5) * dt;
        vel[iz] += ((0 - pos[iz]) * cohesion + (Math.random() - 0.5) * jitter) * dt;
        const damp = Math.exp(-2.8 * dt);
        vel[ix] *= damp; vel[iy] *= damp; vel[iz] *= damp;
        pos[ix] += vel[ix] * dt;
        pos[iy] += vel[iy] * dt;
        pos[iz] += vel[iz] * dt;
        if (pos[iy] < -1.5) { pos[iy] = -1.5; vel[iy] = Math.abs(vel[iy]) * 0.3; }
      } else {
        // Gaz: yo'nalishni biroz o'zgartirib, doimiy tezlikda uchadi + devordan sakraydi.
        let vx = vel[ix] + (Math.random() - 0.5) * 0.6;
        let vy = vel[iy] + (Math.random() - 0.5) * 0.6;
        let vz = vel[iz] + (Math.random() - 0.5) * 0.6;
        let len = Math.hypot(vx, vy, vz);
        if (len < 1e-3) { vx = Math.random() - 0.5; vy = Math.random() - 0.5; vz = Math.random() - 0.5; len = Math.hypot(vx, vy, vz) || 1; }
        vel[ix] = vx / len; vel[iy] = vy / len; vel[iz] = vz / len;
        const speed = 1.8;
        pos[ix] += vel[ix] * speed * dt;
        pos[iy] += vel[iy] * speed * dt;
        pos[iz] += vel[iz] * speed * dt;
        if (pos[ix] > BOX) { pos[ix] = BOX; vel[ix] = -Math.abs(vel[ix]); }
        else if (pos[ix] < -BOX) { pos[ix] = -BOX; vel[ix] = Math.abs(vel[ix]); }
        if (pos[iy] > BOX) { pos[iy] = BOX; vel[iy] = -Math.abs(vel[iy]); }
        else if (pos[iy] < -BOX) { pos[iy] = -BOX; vel[iy] = Math.abs(vel[iy]); }
        if (pos[iz] > BOX) { pos[iz] = BOX; vel[iz] = -Math.abs(vel[iz]); }
        else if (pos[iz] < -BOX) { pos[iz] = -BOX; vel[iz] = Math.abs(vel[iz]); }
      }

      dummy.position.set(pos[ix], pos[iy], pos[iz]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <lineSegments geometry={boxEdges}>
        <lineBasicMaterial color="#3a4a6a" transparent opacity={0.3} />
      </lineSegments>
      <instancedMesh ref={meshRef} args={[undefined, undefined, N]}>
        <sphereGeometry args={[PARTICLE_R, 18, 18]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.15}
          emissive={color}
          emissiveIntensity={0.12}
        />
      </instancedMesh>
    </group>
  );
};

export default MoleculeStates;
