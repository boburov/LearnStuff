// Dissection viewer: overlays several Z-Anatomy GLB layers (muscle, vessels,
// organs) in the SAME coordinate space, so peeling (opacity) and a scalpel
// (clipping plane) reveal the organs inside. Each layer reuses the anatomy
// material tint + click-to-detail; picking is disabled on faded outer layers
// so clicks pass through to the organs.
import { useEffect, useMemo, useRef, useState } from "react";
import { Bounds, Center, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";
import * as THREE from "three";
import { resolveMaterial } from "@/modules/biology/data/anatomyMaterials";
import { SURGERY_LAYERS } from "@/modules/biology/data/surgery";

const HOVER_COLOR = new THREE.Color("#22d3ee");
const NOOP_RAYCAST = () => {};
const EMPTY = [];
const PICK_MIN_OPACITY = 0.35; // faded layers let clicks reach deeper organs
const AXIS = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const SurgeryLayer = ({ url, opacity, clippingPlanes, onPick, frozen, flatColor, detail, scale = 1 }) => {
  const { scene } = useGLTF(url);
  const invalidate = useThree((s) => s.invalidate);
  const selected = useRef(null);
  const model = useMemo(() => scene.clone(true), [scene]);

  // Tint each mesh: a flat layer (skin) paints one tone + one shared detail;
  // otherwise colour per material name (Z-Anatomy names parts by material).
  useEffect(() => {
    model.traverse((child) => {
      if (!child.isMesh) return;
      let resolved = detail;
      if (!flatColor) {
        const matName = Array.isArray(child.material)
          ? child.material[0]?.name
          : child.material?.name;
        resolved = resolveMaterial(matName);
      }
      child.userData.detail = resolved;
      child.material = new THREE.MeshStandardMaterial({
        color: flatColor || resolved?.color || "#cfd8dc",
        roughness: flatColor ? 0.85 : 0.7,
        metalness: 0.05,
      });
      child.userData.baseColor = child.material.color.clone();
    });
    invalidate();
  }, [model, invalidate, flatColor, detail]);

  // Build the raycast BVH off the critical path so first paint isn't blocked.
  useEffect(() => {
    const build = () => {
      model.traverse((c) => {
        if (c.isMesh && !c.geometry.boundsTree) {
          c.geometry.boundsTree = new MeshBVH(c.geometry);
        }
      });
    };
    const ric = window.requestIdleCallback;
    const id = ric ? ric(build) : setTimeout(build, 200);
    return () => (ric ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, [model]);

  // Apply opacity, clipping and pickability whenever they change.
  useEffect(() => {
    const pickable = opacity >= PICK_MIN_OPACITY;
    const clipped = clippingPlanes.length > 0;
    model.traverse((c) => {
      if (!c.isMesh) return;
      const m = c.material;
      m.transparent = opacity < 1;
      m.opacity = opacity;
      m.depthWrite = opacity >= 1;
      m.clippingPlanes = clippingPlanes;
      m.clipShadows = true;
      // DoubleSide so the scalpel's cut surface isn't see-through.
      m.side = clipped ? THREE.DoubleSide : THREE.FrontSide;
      m.needsUpdate = true;
      c.raycast = pickable ? acceleratedRaycast : NOOP_RAYCAST;
    });
    invalidate();
  }, [model, opacity, clippingPlanes, invalidate]);

  const restore = (mesh) => {
    if (!mesh?.userData.baseColor) return;
    mesh.material.color.copy(mesh.userData.baseColor);
    mesh.material.emissive.set("#000000");
  };

  // Clear the highlight when the detail panel closes.
  useEffect(() => {
    if (!frozen && selected.current) {
      restore(selected.current);
      selected.current = null;
      invalidate();
    }
  }, [frozen, invalidate]);

  const handleClick = (e) => {
    const detail = e.object.userData.detail;
    if (!detail) return;
    e.stopPropagation();
    restore(selected.current);
    selected.current = e.object;
    e.object.material.color.lerp(HOVER_COLOR, 0.45);
    e.object.material.emissive.copy(HOVER_COLOR).multiplyScalar(0.25);
    onPick?.(detail);
    invalidate();
  };

  return (
    <primitive
      object={model}
      scale={scale}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = e.object.userData.detail ? "pointer" : "default";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "default";
      }}
    />
  );
};

const SurgeryModel = ({ layerOpacity, clip, onPick, frozen }) => {
  const invalidate = useThree((s) => s.invalidate);
  const groupRef = useRef(null);
  const bboxRef = useRef(new THREE.Box3());
  // Stable plane instance in a ref so we can mutate it in place across renders;
  // the array we hand to materials lives in state (kept out of render reads).
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, -1), 0));
  const [planes, setPlanes] = useState(EMPTY);

  // Measure the assembled body once so the scalpel maps to real coordinates.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (groupRef.current) bboxRef.current.setFromObject(groupRef.current);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Recompute the cut plane from axis/position/flip; mutate in place + redraw.
  useEffect(() => {
    const box = bboxRef.current;
    if (!box.isEmpty()) {
      const key = clip.axis;
      const at = box.min[key] + (box.max[key] - box.min[key]) * clip.position;
      const u = AXIS[key] || AXIS.z;
      const p = planeRef.current;
      p.normal.copy(u).multiplyScalar(clip.flip ? 1 : -1);
      p.constant = clip.flip ? -at : at;
    }
    invalidate();
  }, [clip.axis, clip.position, clip.flip, invalidate]);

  // Swap the material clipping array only when the scalpel is toggled on/off.
  useEffect(() => {
    setPlanes(clip.enabled ? [planeRef.current] : EMPTY);
  }, [clip.enabled]);

  return (
    <Bounds fit margin={1.15}>
      <Center>
        <group ref={groupRef}>
          {SURGERY_LAYERS.map((l) => (
            <SurgeryLayer
              key={l.slug}
              url={l.url}
              opacity={layerOpacity[l.slug] ?? 0}
              clippingPlanes={l.clippable ? planes : EMPTY}
              onPick={onPick}
              frozen={frozen}
              flatColor={l.flatColor}
              detail={l.detail}
              scale={l.scale}
            />
          ))}
        </group>
      </Center>
    </Bounds>
  );
};

export default SurgeryModel;
