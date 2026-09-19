import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { ROOM_ASSETS } from "../labRoomAssets";
import { capMaterialTextures } from "../textureCap";
import { applyLightmap, dressSurfaces, prepareRoom, setupLightmap } from "./roomMaterials";

const CLOCK_TICK_MS = 20000;

// Shrinking is one-way: the GLB is cached, so raising quality mid-session keeps the smaller room
// textures until the page reloads. Only Low shrinks anything.
const capRoomTextures = (root, max) => {
  const seen = new Set();
  root.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      capMaterialTextures(material, max, seen);
    }
  });
};

const RoomModel = ({ lightmapKey, lightmapScale, textureCap = 2048 }) => {
  const gltf = useGLTF(ROOM_ASSETS.glb);
  const lightmap = useTexture(ROOM_ASSETS.lightmap[lightmapKey]);
  const invalidate = useThree((s) => s.invalidate);
  const surfaces = useRef(null);
  const room = useMemo(() => prepareRoom(gltf.scene), [gltf.scene]);

  // Layout effect: materials must be final before the environment capture and the first frame.
  useLayoutEffect(() => {
    capRoomTextures(gltf.scene, textureCap);
    setupLightmap(lightmap);
    applyLightmap(room, lightmap, lightmapScale);
    const dressed = dressSurfaces(room, lightmap, lightmapScale, textureCap);
    surfaces.current = dressed;
    return () => {
      dressed.dispose();
      surfaces.current = null;
    };
  }, [gltf.scene, room, lightmap, lightmapScale, textureCap]);

  useEffect(() => {
    const timer = setInterval(() => {
      surfaces.current?.tick();
      invalidate();
    }, CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, [invalidate]);

  return <primitive object={gltf.scene} />;
};

export default RoomModel;
