// BodyParts3D tanasini chizadi: 2234 qism tizim bo'yicha bitta geometriyaga
// birlashtiriladi; har qismning siljishi/ko'rinishi/tanlanganligi GPU
// teksturasi orqali boshqariladi (minglab draw call o'rniga ~15 ta mesh).
// Tanlash uchun har qism alohida "picker" mesh sifatida (sahnaga qo'shilmay)
// nur bilan tekshiriladi. Sahna faqat o'zgarganda chiziladi (frameloop=demand).
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSceneControlOptional } from "@/shared/lab/sceneControl";
import { fetchChunk } from "./api/atlas.api";
import { createExplosionLayout } from "./explosionLayout";
import { SYSTEMS, SYSTEM_BY_ID } from "./data/systems";

// Tana 0..1.73 m oralig'ida turadi; markazi origin'da bo'lsin (OrbitControls target).
export const STAGE_OFFSET = 0.87;
const SELECT_COLOR = "vec3(0.13, 0.83, 0.93)";

// Bosish (tap) ni aylantirish (drag) dan ajratadi.
class PointerTap {
  active = new Map();
  blocked = false;
  down(id, x, y, threshold) {
    if (this.active.size === 0) this.blocked = false;
    this.active.set(id, { x, y, threshold });
    if (this.active.size > 1) this.blocked = true;
  }
  move(id, x, y) {
    const s = this.active.get(id);
    if (s && Math.hypot(x - s.x, y - s.y) > s.threshold) this.blocked = true;
  }
  up(id, x, y) {
    this.move(id, x, y);
    const tap = this.active.has(id) && this.active.size === 1 && !this.blocked;
    this.active.delete(id);
    return tap;
  }
  cancel(id) {
    this.active.delete(id);
    this.blocked = true;
  }
}

const AtlasBody = ({
  atlas,
  visible,
  selected,
  isolate,
  explode,
  onPick,
  onProgress,
  onError,
}) => {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const { controlsRef } = useSceneControlOptional();

  const groupRef = useRef(null);
  // useFrame / hodisalar eng so'nggi prop'larni ref orqali o'qiydi (qayta obuna bo'lmasdan).
  const latest = useRef({ visible, selected, isolate, explode });
  const cb = useRef({ onPick, onProgress, onError });
  useEffect(() => {
    latest.current = { visible, selected, isolate, explode };
    cb.current = { onPick, onProgress, onError };
    invalidate();
  });

  // Har qism uchun markaz va chegaralar (tana koordinatalarida).
  const geometryInfo = useMemo(() => {
    const centers = atlas.parts.map((p) =>
      new THREE.Vector3().fromArray(p.bounds[0]).add(new THREE.Vector3().fromArray(p.bounds[1])).multiplyScalar(0.5),
    );
    const bounds = atlas.parts.map(
      (p) => new THREE.Box3(new THREE.Vector3().fromArray(p.bounds[0]), new THREE.Vector3().fromArray(p.bounds[1])),
    );
    return { centers, bounds };
  }, [atlas]);

  // Render holati: tekstura, materiallar, pickerlar, animatsiya qiymatlari.
  const rt = useRef(null);

  // Studiya muhiti (RoomEnvironment) - anatomiya materiallari yumshoq yaltiraydi.
  const envMap = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => envMap.dispose(), [envMap]);

  // Geometriyani yuklash va tizim bo'yicha birlashtirish.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const parts = atlas.parts;
    const width = THREE.MathUtils.ceilPowerOfTwo(parts.length);
    const stateData = new Float32Array(width * 4);
    const stateTexture = new THREE.DataTexture(stateData, width, 1, THREE.RGBAFormat, THREE.FloatType);
    stateTexture.needsUpdate = true;
    const selectData = new Uint8Array(width * 4);
    const selectTexture = new THREE.DataTexture(selectData, width, 1);
    selectTexture.needsUpdate = true;

    const materials = [];
    const materialFor = (systemId) => {
      const skin = systemId === "integumentary";
      const m = new THREE.MeshStandardMaterial({
        color: SYSTEM_BY_ID[systemId]?.color || "#aebbb8",
        metalness: 0.08,
        roughness: 0.53,
        side: THREE.DoubleSide,
        transparent: skin,
        opacity: skin ? 0.12 : 1,
        depthWrite: !skin,
        envMapIntensity: 0.7,
      });
      m.onBeforeCompile = (shader) => {
        shader.uniforms.partState = { value: stateTexture };
        shader.uniforms.selectionState = { value: selectTexture };
        shader.uniforms.stateWidth = { value: width };
        shader.vertexShader =
          "attribute float partIndex; uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth; varying float partVisible; varying float partSelected;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w; partSelected = texture2D(selectionState, stateUv).r;",
          );
        shader.fragmentShader =
          "varying float partVisible; varying float partSelected;\n" +
          shader.fragmentShader
            .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (partVisible < 0.5) discard;")
            .replace("#include <color_fragment>", `#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, ${SELECT_COLOR}, partSelected * 0.7);`);
      };
      // Bir xil shader, turli material - three dasturni cache'lashi uchun kalit.
      m.customProgramCacheKey = () => `atlas-${skin ? "skin" : "solid"}`;
      materials.push(m);
      return m;
    };
    const mats = new Map(SYSTEMS.map((s) => [s.id, materialFor(s.id)]));

    const state = {
      width,
      stateData,
      stateTexture,
      selectData,
      selectTexture,
      pickers: new Array(parts.length),
      geometries: [],
      meshes: [],
      offsets: parts.map((_, i) => geometryInfo.centers[i].clone()),
      amount: 0,
      layoutKey: "",
      packing: { width: 1, height: 1 },
      lastKey: "",
      lastIsolateKey: "",
      lastFitMode: "",
      ready: false,
    };
    rt.current = state;

    const abort = new AbortController();
    let disposed = false;
    let loaded = 0;

    const loadChunk = async (ci) => {
      const buffer = await fetchChunk(atlas.chunks[ci], abort.signal);
      if (disposed) return;
      const groups = new Map();
      parts.forEach((p, i) => {
        if (p.chunk !== ci) return;
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(buffer, p.positions, p.vertexCount * 3), 3));
        // Normallar 16-bitli - butun atlas xotirada ixcham turadi.
        g.setAttribute("normal", new THREE.BufferAttribute(new Int16Array(buffer, p.normals, p.vertexCount * 3), 3, true));
        g.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, p.indices, p.indexCount), 1));
        g.setAttribute("partIndex", new THREE.BufferAttribute(new Float32Array(p.vertexCount).fill(i), 1));
        g.boundingBox = geometryInfo.bounds[i].clone();
        g.computeBoundingSphere();
        const picker = new THREE.Mesh(g);
        picker.matrixAutoUpdate = false;
        state.pickers[i] = picker;
        state.geometries.push(g);
        const list = groups.get(p.system) || [];
        list.push(g);
        groups.set(p.system, list);
      });
      groups.forEach((gs, systemId) => {
        const merged = mergeGeometries(gs, false);
        if (!merged) throw new Error("Anatomiya geometriyasi yig'ilmadi.");
        state.geometries.push(merged);
        const mesh = new THREE.Mesh(merged, mats.get(systemId));
        mesh.frustumCulled = false;
        group.add(mesh);
        state.meshes.push(mesh);
      });
      loaded += 1;
      state.lastKey = "";
      cb.current.onProgress?.(Math.round((loaded / atlas.chunks.length) * 100));
      invalidate();
    };

    (async () => {
      try {
        let cursor = 0;
        // 3 ta parallel oqim - tarmoqni to'ldiradi, lekin xotirani bosmaydi.
        await Promise.all(
          Array.from({ length: 3 }, async () => {
            while (cursor < atlas.chunks.length) {
              const i = cursor++;
              await loadChunk(i);
            }
          }),
        );
        if (!disposed) {
          state.ready = true;
          invalidate();
        }
      } catch (e) {
        if (!disposed && e?.name !== "AbortError")
          cb.current.onError?.(e instanceof Error ? e.message : "Anatomiya yuklanmadi.");
      }
    })();

    return () => {
      disposed = true;
      abort.abort();
      state.meshes.forEach((m) => group.remove(m));
      state.geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      stateTexture.dispose();
      selectTexture.dispose();
      rt.current = null;
    };
  }, [atlas, geometryInfo, invalidate]);

  // Kamerani holatga moslash: oddiy ko'rinish, portlatilgan inventar yoki ajratilgan qism.
  const fitCamera = (mode, box) => {
    const controls = controlsRef?.current;
    const fov = THREE.MathUtils.degToRad(camera.fov / 2);
    const target = new THREE.Vector3();
    let distance;
    let dir;
    if (mode === "isolate" && box) {
      const center = box.getCenter(new THREE.Vector3());
      const sz = box.getSize(new THREE.Vector3());
      target.set(center.x, center.y - STAGE_OFFSET, center.z);
      distance = Math.max(0.08, Math.max(sz.y, sz.x / camera.aspect, sz.z) / (2 * Math.tan(fov)) * 1.5);
      dir = new THREE.Vector3(0.2, 0.1, 1).normalize();
    } else if (mode === "explode") {
      const { width: w, height: h } = rt.current?.packing || { width: 1, height: 1 };
      distance = Math.max(0.3, Math.max(h, w / camera.aspect) / (2 * Math.tan(fov)) * 1.1);
      dir = new THREE.Vector3(0, 0.02, 1);
    } else {
      distance = 3;
      dir = new THREE.Vector3(0.35, 0.06, 1).normalize();
    }
    camera.position.copy(target).addScaledVector(dir, distance);
    if (controls) {
      controls.target.copy(target);
      controls.update();
    } else camera.lookAt(target);
    invalidate();
  };

  // Holat o'zgarishi -> tekstura yangilanadi; portlatish silliq animatsiya bilan.
  useFrame((_, delta) => {
    const st = rt.current;
    if (!st) return;
    const s = latest.current;
    const parts = atlas.parts;
    const { centers, bounds } = geometryInfo;
    // Sekin qurilmada ham animatsiya vaqt bo'yicha tugasin (kadr uzoq bo'lsa katta qadam).
    const dt = Math.min(delta, 0.25);
    const wasMoving = Math.abs(st.amount - s.explode) > 0.0005;
    if (wasMoving) {
      st.amount = THREE.MathUtils.damp(st.amount, s.explode, 8, dt);
      if (Math.abs(st.amount - s.explode) < 0.0005) st.amount = s.explode;
    }
    // Animatsiya tugagan kadrda ham (wasMoving=true, moving=false) ishlov davom etadi - kamera fit shu kadrda.
    const moving = Math.abs(st.amount - s.explode) > 0.0005;
    const key = `${s.visible.join(",")}|${s.selected.join(",")}|${s.isolate}|${st.amount.toFixed(4)}|${camera.aspect.toFixed(3)}`;
    if (key === st.lastKey && !wasMoving) return;

    const visibleSet = new Set(s.visible);
    const selection = new Set(s.selected);
    const isShown = (p) => (s.isolate ? selection.has(p.id) : visibleSet.has(p.system) || selection.has(p.id));

    // Portlatilgan joylashuv faqat ko'rinadigan qismlar to'plami o'zgarsa qayta hisoblanadi.
    const shown = parts.filter(isShown);
    const layoutKey = `${shown.map((p) => p.id).join(",")}:${camera.aspect.toFixed(3)}`;
    if (layoutKey !== st.layoutKey) {
      const layout = createExplosionLayout(shown, camera.aspect);
      st.packing = { width: layout.width, height: layout.height };
      parts.forEach((p, i) => {
        const cell = layout.cells.get(p.id);
        st.offsets[i] = cell ? new THREE.Vector3(cell.x, cell.y + STAGE_OFFSET, 0) : centers[i].clone();
      });
      st.layoutKey = layoutKey;
      if (st.amount > 0.5 && !s.isolate) fitCamera("explode");
    }

    const a = st.amount;
    const n = SYSTEMS.length;
    parts.forEach((p, i) => {
      const c = centers[i];
      const dest = st.offsets[i];
      const angle = (SYSTEMS.findIndex((sys) => sys.id === p.system) / n) * Math.PI * 2;
      let dx = 0, dy = 0, dz = 0;
      if (a <= 0.45) {
        // Birinchi bosqich: tizimlar aylana bo'ylab bir-biridan ajraladi.
        const t = a / 0.45;
        dx = Math.sin(angle) * t * 0.48;
        dy = (c.y - STAGE_OFFSET) * t * 0.28;
        dz = Math.cos(angle) * t * 0.48;
      } else {
        // Ikkinchi bosqich: har qism old tekislikdagi o'z katagiga uchadi.
        const t = (a - 0.45) / 0.55;
        dx = THREE.MathUtils.lerp(Math.sin(angle) * 0.48, dest.x - c.x, t);
        dy = THREE.MathUtils.lerp((c.y - STAGE_OFFSET) * 0.28, dest.y - c.y, t);
        dz = THREE.MathUtils.lerp(Math.cos(angle) * 0.48, -c.z, t);
      }
      const sel = selection.has(p.id);
      st.stateData.set([dx, dy, dz, isShown(p) ? 1 : 0], i * 4);
      // Ajratilganda faqat tanlangan qismlar ko'rinadi - tabiiy rangda qoldiramiz.
      st.selectData[i * 4] = sel && !s.isolate ? 255 : 0;
      const picker = st.pickers[i];
      if (picker) {
        picker.position.set(dx, dy, dz);
        picker.updateMatrix();
        picker.matrixWorld.copy(picker.matrix);
      }
    });
    st.stateTexture.needsUpdate = true;
    st.selectTexture.needsUpdate = true;
    st.lastKey = key;

    // Ajratilgan qismga kamerani yaqinlashtirish / oddiy ko'rinishga qaytish.
    const isolateKey = s.isolate ? s.selected.join(",") : "";
    if (isolateKey !== st.lastIsolateKey) {
      if (s.isolate) {
        const box = new THREE.Box3();
        parts.forEach((p, i) => {
          if (!selection.has(p.id)) return;
          box.union(bounds[i].clone().translate(new THREE.Vector3(st.stateData[i * 4], st.stateData[i * 4 + 1], st.stateData[i * 4 + 2])));
        });
        if (!box.isEmpty()) fitCamera("isolate", box);
      } else if (st.lastIsolateKey) fitCamera(a > 0.5 ? "explode" : "normal");
      st.lastIsolateKey = isolateKey;
    }
    // Portlatish tugaganda / yig'ilganda kamerani mos ko'rinishga o'tkazamiz.
    const fitMode = s.isolate ? "isolate" : a > 0.5 ? "explode" : "normal";
    if (!moving && fitMode !== st.lastFitMode && fitMode !== "isolate") {
      if (st.lastFitMode) fitCamera(fitMode);
      st.lastFitMode = fitMode;
    } else if (!moving && fitMode === "isolate") st.lastFitMode = fitMode;

    invalidate();
  });

  // Aylantirish emas, bosish bo'lsa - nur ostidagi eng yaqin ko'rinuvchi qismni tanlaymiz.
  useEffect(() => {
    const el = gl.domElement;
    const tap = new PointerTap();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const worldBox = new THREE.Box3();
    const hit = new THREE.Vector3();
    const inv = new THREE.Matrix4();

    const down = (e) => tap.down(e.pointerId, e.clientX, e.clientY, e.pointerType === "touch" ? 12 : 5);
    const move = (e) => tap.move(e.pointerId, e.clientX, e.clientY);
    const cancel = (e) => tap.cancel(e.pointerId);
    const up = (e) => {
      const isTap = tap.up(e.pointerId, e.clientX, e.clientY);
      const st = rt.current;
      const group = groupRef.current;
      if (!isTap || !st?.ready || !group) return;
      const rect = el.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      // Nurni guruhning lokal koordinatasiga o'tkazamiz (pickerlar sahnada emas).
      group.updateMatrixWorld(true);
      raycaster.ray.applyMatrix4(inv.copy(group.matrixWorld).invert());

      const parts = atlas.parts;
      const { bounds } = geometryInfo;
      const hasSolid = parts.some((p, i) => p.system !== "integumentary" && st.stateData[i * 4 + 3] > 0.5);
      let nearest = Infinity;
      let found = -1;
      st.pickers.forEach((mesh, i) => {
        if (!mesh || st.stateData[i * 4 + 3] < 0.5) return;
        // Teri ostidagi a'zolar ko'rinib turganda teri tanlovni to'smasin.
        if (hasSolid && parts[i].system === "integumentary") return;
        worldBox.copy(bounds[i]).translate(mesh.position);
        if (!raycaster.ray.intersectBox(worldBox, hit)) return;
        const hits = raycaster.intersectObject(mesh, false);
        if (hits[0] && hits[0].distance < nearest) {
          nearest = hits[0].distance;
          found = i;
        }
      });
      if (found >= 0) cb.current.onPick?.(parts[found].id);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
    };
  }, [gl, camera, atlas, geometryInfo]);

  // O'lcham o'zgarsa portlatilgan layout qayta hisoblanadi (useFrame kaliti aspect'ni o'z ichiga oladi).
  useEffect(() => {
    invalidate();
  }, [size, invalidate]);

  return (
    <group ref={groupRef} position={[0, -STAGE_OFFSET, 0]}>
      <Environment map={envMap} />
      {/* Studiya supasi - portlatilganda yashiriladi (useFrame emas, oddiy prop). */}
      {explode < 0.5 && !isolate && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.019, 0]}>
            <circleGeometry args={[30, 96]} />
            <meshStandardMaterial color="#e4e6ea" roughness={1} />
          </mesh>
          <mesh position={[0, -0.016, 0]}>
            <cylinderGeometry args={[0.68, 0.7, 0.028, 100]} />
            <meshStandardMaterial color="#f1f0f4" metalness={0.12} roughness={0.67} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <ringGeometry args={[0.63, 0.633, 128]} />
            <meshBasicMaterial color="#8b7bb8" transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export default AtlasBody;
