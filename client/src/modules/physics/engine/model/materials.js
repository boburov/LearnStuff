import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

export const MATERIAL_SPECS = {
  aluminum: { color: "#b9c0c9", metalness: 0.85, roughness: 0.32 },
  castAluminum: { color: "#9aa1ab", metalness: 0.75, roughness: 0.55 },
  steel: { color: "#8d949e", metalness: 0.95, roughness: 0.22 },
  darkSteel: { color: "#4a5059", metalness: 0.9, roughness: 0.35 },
  paint: { color: "#6d28d9", metalness: 0.35, roughness: 0.38 },
  rubber: { color: "#1b1d22", metalness: 0.0, roughness: 0.85 },
  ceramic: { color: "#eef0f3", metalness: 0.0, roughness: 0.25 },
  copper: { color: "#c9733f", metalness: 0.9, roughness: 0.3 },
  brass: { color: "#c8a24a", metalness: 0.9, roughness: 0.3 },
  heatSteel: { color: "#6f5a4a", metalness: 0.8, roughness: 0.45 },
};

export const XRAY_OPACITY = 0.1;
export const SELECT_COLOR = new THREE.Color("#8b5cf6");
const NO_EMISSIVE = new THREE.Color("#000000");

const applyState = (material, seeThrough, selected) => {
  material.transparent = seeThrough;
  material.opacity = seeThrough ? XRAY_OPACITY : 1;
  material.depthWrite = !seeThrough;
  material.side = seeThrough ? THREE.DoubleSide : THREE.FrontSide;
  // At 10% opacity the back/front sort pass is invisible but doubles draw calls.
  material.forceSinglePass = seeThrough;
  material.emissive.copy(selected ? SELECT_COLOR : NO_EMISSIVE);
  material.emissiveIntensity = selected ? 0.45 : 0;
  material.needsUpdate = true;
};

export const usePartMaterial = (kind, { mode, shell = false, selected = false } = {}) => {
  const material = useMemo(() => {
    const spec = MATERIAL_SPECS[kind] ?? MATERIAL_SPECS.steel;
    return new THREE.MeshStandardMaterial({ ...spec, envMapIntensity: 1.1 });
  }, [kind]);

  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    applyState(material, shell && mode === "xray", selected);
  }, [material, mode, shell, selected]);

  return material;
};
