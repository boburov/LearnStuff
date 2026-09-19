import { MeshStandardMaterial, SRGBColorSpace, ShaderChunk } from "three";
import { capTexture } from "../textureCap";
import {
  createDynamicTexture,
  createExitSignTexture,
  createPeriodicTableTexture,
  createWhiteboardTexture,
  drawClock,
  drawMonitor,
} from "./surfaceTextures";

// One knob for overall brightness so High (post-processing) and Low (renderer) tone map the same scene.
export const EXPOSURE = 1;

// Baked surfaces already hold bounce light, so drop the environment's diffuse part (keep its reflections).
const LIGHTMAP_FRAGMENT = ShaderChunk.lights_fragment_maps.replace(
  "iblIrradiance += getIBLIrradiance( geometryNormal );",
  "",
);

// Real-time lights exist only for the equipment; baked surfaces already contain the room's lighting.
const NO_DIRECT_LIGHTS = ShaderChunk.lights_fragment_begin
  .replaceAll(
    "RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );",
    "",
  )
  .replace("irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );", "");

// The environment BRDF fit dips below zero at grazing angles; negative HDR pixels turn into black blobs after FXAA.
const CLAMPED_OUTPUT = "#include <opaque_fragment>\ngl_FragColor.rgb = max( gl_FragColor.rgb, vec3( 0.0 ) );";

const patchLightmapped = (material) => {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <lights_fragment_begin>", NO_DIRECT_LIGHTS)
      .replace("#include <lights_fragment_maps>", LIGHTMAP_FRAGMENT)
      .replace("#include <opaque_fragment>", CLAMPED_OUTPUT);
  };
  material.customProgramCacheKey = () => "lab-room-lightmapped";
};

const SURFACE_NAMES = ["whiteboard_surface", "poster_periodic_table", "monitor_screen", "clock_face", "sign_exit"];

// Specular reflections of the captured room on baked surfaces; glass keeps full reflections.
const SURFACE_ENV_INTENSITY = 0.45;
const GLASS_ENV_INTENSITY = 1;

const firstMesh = (object) => {
  let found = null;
  object?.traverse((o) => {
    if (!found && o.isMesh) found = o;
  });
  return found;
};

const isGlass = (object) => object.name.startsWith("glass_") || object.parent?.name?.startsWith("glass_");

// Runs once per loaded GLB scene (cached by drei), so it must be idempotent.
export const prepareRoom = (root) => {
  if (root.userData.labRoom) return root.userData.labRoom;

  const lightmapped = new Set();
  root.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (isGlass(object)) {
      for (const material of materials) {
        material.depthWrite = false;
        material.envMapIntensity = GLASS_ENV_INTENSITY;
      }
      object.renderOrder = 2;
      return;
    }
    // Every baked primitive carries lightmap UVs as TEXCOORD_1 (three: uv1).
    if (!object.geometry.attributes.uv1) return;
    for (const material of materials) {
      if (lightmapped.has(material)) continue;
      patchLightmapped(material);
      material.envMapIntensity = SURFACE_ENV_INTENSITY;
      lightmapped.add(material);
    }
  });

  const surfaces = {};
  for (const name of SURFACE_NAMES) {
    const mesh = firstMesh(root.getObjectByName(name));
    if (mesh) surfaces[name] = { mesh, original: mesh.material };
  }

  const room = { root, lightmapped: [...lightmapped], surfaces };
  root.userData.labRoom = room;
  return room;
};

export const setupLightmap = (texture) => {
  texture.flipY = false;
  texture.channel = 1;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
};

export const applyLightmap = (room, texture, scale) => {
  for (const material of room.lightmapped) {
    material.lightMap = texture;
    material.lightMapIntensity = scale * Math.PI * EXPOSURE;
    material.needsUpdate = true;
  }
};

const litSurface = (params, lightmap, scale) => {
  const material = new MeshStandardMaterial({ envMapIntensity: SURFACE_ENV_INTENSITY, ...params });
  if (lightmap) {
    material.lightMap = lightmap;
    material.lightMapIntensity = scale * Math.PI * EXPOSURE;
    patchLightmapped(material);
  }
  return material;
};

const clockTime = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

// Canvas-textured surfaces (whiteboard, poster, screen, clock, exit sign). Returns tick + dispose.
export const dressSurfaces = (room, lightmap, scale, textureCap = 2048) => {
  const created = [];
  // Printed surfaces are canvases; the clock and the monitor are repainted, so only static ones shrink.
  const swap = (name, material, texture, fixed = true) => {
    if (fixed && texture) capTexture(texture, textureCap);
    const surface = room.surfaces[name];
    if (!surface) {
      material.dispose();
      texture?.dispose();
      return;
    }
    surface.mesh.material = material;
    created.push({ surface, material, texture });
  };

  const whiteboard = createWhiteboardTexture();
  swap("whiteboard_surface", litSurface({ map: whiteboard, roughness: 0.22 }, lightmap, scale), whiteboard);

  const poster = createPeriodicTableTexture();
  swap("poster_periodic_table", litSurface({ map: poster, roughness: 0.75 }, lightmap, scale), poster);

  const exit = createExitSignTexture();
  swap(
    "sign_exit",
    litSurface({ map: exit, emissive: "#ffffff", emissiveMap: exit, emissiveIntensity: 0.9, roughness: 0.4 }, lightmap, scale),
    exit,
  );

  const clock = createDynamicTexture(512, 512, drawClock);
  swap("clock_face", litSurface({ map: clock.texture, roughness: 0.35 }, lightmap, scale), clock.texture, false);

  const monitor = createDynamicTexture(1024, 576, drawMonitor);
  swap(
    "monitor_screen",
    new MeshStandardMaterial({
      color: "#000000",
      emissive: "#ffffff",
      emissiveMap: monitor.texture,
      emissiveIntensity: 1.1,
      roughness: 0.15,
    }),
    monitor.texture,
    false,
  );

  const tick = () => {
    const now = new Date();
    clock.redraw(512, now);
    monitor.redraw(1024, 576, clockTime(now));
  };
  tick();

  const dispose = () => {
    for (const { surface, material, texture } of created) {
      surface.mesh.material = surface.original;
      material.dispose();
      texture?.dispose();
    }
  };

  return { tick, dispose };
};
