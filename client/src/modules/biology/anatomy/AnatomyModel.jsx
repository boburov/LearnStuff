// Shared loader for human anatomy (Z-Anatomy) GLB models.
// Parts are named only by material (Bone, Muscles, Eye...) and many ship without
// color, so we tint each mesh by its material and, on click, surface its Uzbek
// detail to the parent (corner modal).
//
// VR box: a Bluetooth remote rotates the model (joystick) and selects the part
// under the center gaze reticle (button), so it works with a phone-in-a-headset.
//
// Perf: the models are heavy (millions of triangles). The scene renders on demand
// (no idle spin), so a static view costs nothing. Raycasting uses a BVH built
// *after* first paint so picking is cheap without blocking the initial load.
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useGLTF, Center, Bounds } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";
import * as THREE from "three";
import { resolveMaterial } from "@/modules/biology/data/anatomyMaterials";
import { useSceneControlOptional } from "@/shared/lab/sceneControl";
import useVrController from "@/shared/lab/useVrController";

const HOVER_COLOR = new THREE.Color("#22d3ee");
const GAZE = new THREE.Vector2(0, 0); // ekran markazi (nishon)
const ROT_SPEED = 1.6; // rad/soniya (joystik to'liq egilganda)
const ZOOM_STEP = 0.85;

// Faqat mesh parametrini ishlatadi - modul darajasida turishi bemalol.
const restore = (mesh) => {
  if (!mesh?.userData.baseColor) return;
  mesh.material.color.copy(mesh.userData.baseColor);
  mesh.material.emissive.set("#000000");
};

const AnatomyModel = ({ url, onPick, frozen = false, keepMaterial = false }) => {
  const { scene } = useGLTF(url);
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const raycaster = useThree((s) => s.raycaster);
  const selected = useRef(null);
  const rotRef = useRef();

  // VR box: kontroller bilan aylantirish + nishon orqali tanlash.
  const { vrBox } = useSceneControlOptional();
  const {
    axes: ctrlAxes,
    on: onController,
    poll: pollController,
  } = useVrController({ enabled: !!vrBox });

  // Clone so the cached source scene is never mutated.
  const model = useMemo(() => scene.clone(true), [scene]);

  // Tint every mesh by its material name; store the resolved detail per mesh.
  // Models that ship their own colours (skeleton, skull...) keep them as-is.
  useEffect(() => {
    if (keepMaterial) {
      invalidate();
      return;
    }
    model.traverse((child) => {
      if (!child.isMesh) return;
      const matName = Array.isArray(child.material)
        ? child.material[0]?.name
        : child.material?.name;
      const resolved = resolveMaterial(matName);
      child.userData.detail = resolved;
      child.material = new THREE.MeshStandardMaterial({
        color: resolved?.color || "#cfd8dc",
        roughness: 0.7,
        metalness: 0.05,
      });
      child.userData.baseColor = child.material.color.clone();
    });
    invalidate();
  }, [model, invalidate, keepMaterial]);

  // Build the raycast BVH off the critical path so first paint isn't blocked.
  useEffect(() => {
    const build = () => {
      model.traverse((child) => {
        if (child.isMesh && !child.geometry.boundsTree) {
          child.geometry.boundsTree = new MeshBVH(child.geometry);
          child.raycast = acceleratedRaycast;
        }
      });
    };
    const ric = window.requestIdleCallback;
    const id = ric ? ric(build) : setTimeout(build, 200);
    return () => (ric ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, [model]);

  // Bosish (click) va nishon (gaze) tanlashining umumiy yadrosi.
  const selectMesh = useCallback(
    (mesh) => {
      const detail = mesh?.userData?.detail;
      if (!detail) return;
      restore(selected.current);
      selected.current = mesh;
      mesh.material.color.lerp(HOVER_COLOR, 0.45);
      mesh.material.emissive.copy(HOVER_COLOR).multiplyScalar(0.25);
      onPick?.(detail);
      invalidate();
    },
    [onPick, invalidate],
  );

  const clearSelection = useCallback(() => {
    restore(selected.current);
    selected.current = null;
    onPick?.(null);
    invalidate();
  }, [onPick, invalidate]);

  // Ekran markazidan nur otib, qaralayotgan qismni tanlaymiz.
  const gazePick = useCallback(() => {
    if (!rotRef.current) return;
    raycaster.setFromCamera(GAZE, camera);
    const hits = raycaster.intersectObject(rotRef.current, true);
    for (const h of hits) {
      if (h.object?.userData?.detail) {
        selectMesh(h.object);
        return;
      }
    }
  }, [raycaster, camera, selectMesh]);

  // Model markazi ~ origin (Center + Bounds), shuning uchun kamerani origin
  // atrofida yaqin/uzoq suramiz.
  const dolly = useCallback(
    (factor) => {
      const p = camera.position;
      const d = p.length() || 1;
      const next = Math.min(40, Math.max(1, d * factor));
      p.multiplyScalar(next / d);
      invalidate();
    },
    [camera, invalidate],
  );

  // Clear the highlight when the detail modal is closed.
  useEffect(() => {
    if (!frozen && selected.current) {
      restore(selected.current);
      selected.current = null;
      invalidate();
    }
  }, [frozen, invalidate]);

  // Kontroller tugmalari: A - tanlash, B - orqaga, X/Y - kattalash/kichiklash.
  useEffect(() => {
    if (!vrBox) return;
    const offs = [
      onController("select", gazePick),
      onController("back", clearSelection),
      onController("zoomIn", () => dolly(ZOOM_STEP)),
      onController("zoomOut", () => dolly(1 / ZOOM_STEP)),
    ];
    return () => offs.forEach((off) => off && off());
  }, [vrBox, onController, gazePick, clearSelection, dolly]);

  // Kontrollerni yagona R3F siklida o'qiymiz + joystik bilan aylantirish.
  useFrame((_, delta) => {
    if (!vrBox) return;
    pollController();
    if (!rotRef.current) return;
    const { x, y } = ctrlAxes.current;
    if (!x && !y) return;
    const dt = Math.min(delta, 0.05);
    rotRef.current.rotation.y += x * ROT_SPEED * dt;
    rotRef.current.rotation.x += y * ROT_SPEED * dt;
  });

  const handleClick = (e) => {
    e.stopPropagation();
    selectMesh(e.object);
  };

  return (
    <Bounds fit observe margin={1.1}>
      {/* Aylantirish guruhi: joystik shuni buraydi, kamera/gyro alohida qoladi. */}
      <group ref={rotRef}>
        <Center>
          <primitive
            object={model}
            onClick={handleClick}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = e.object.userData.detail
                ? "pointer"
                : "default";
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "default";
            }}
          />
        </Center>
      </group>
    </Bounds>
  );
};

export default AnatomyModel;
