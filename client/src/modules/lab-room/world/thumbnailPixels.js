import { Box3, DataUtils, Sphere, Vector3 } from "three";

const box = new Box3();
const sphere = new Sphere();
const VIEW_DIRECTION = new Vector3(0.42, 0.3, 1).normalize();

// Frames the model from the front-right, slightly above; returns null while nothing has loaded yet.
export const frameCamera = (camera, object) => {
  box.setFromObject(object);
  if (box.isEmpty()) return null;
  box.getBoundingSphere(sphere);
  const distance = (sphere.radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.02;
  camera.position.copy(sphere.center).addScaledVector(VIEW_DIRECTION, distance);
  camera.near = Math.max(0.001, distance - sphere.radius * 2);
  camera.far = distance + sphere.radius * 2;
  camera.lookAt(sphere.center);
  camera.updateProjectionMatrix();
  return `${sphere.radius.toFixed(4)}:${sphere.center.x.toFixed(4)}:${sphere.center.y.toFixed(4)}`;
};

// Khronos PBR Neutral, matching the lab's tone mapping.
const neutral = (r, g, b) => {
  const x = Math.min(r, g, b);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  r -= offset;
  g -= offset;
  b -= offset;
  const peak = Math.max(r, g, b);
  const start = 0.76;
  if (peak < start) return [r, g, b];
  const d = 1 - start;
  const newPeak = 1 - (d * d) / (peak + d - start);
  const k = newPeak / peak;
  const t = 1 - 1 / (0.15 * (peak - newPeak) + 1);
  return [r * k * (1 - t) + newPeak * t, g * k * (1 - t) + newPeak * t, b * k * (1 - t) + newPeak * t];
};

const srgb = (c) => {
  const v = Math.min(1, Math.max(0, c));
  return Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) * 255);
};

// Premultiplied half-float pixels (bottom-up) → straight-alpha sRGB PNG data URL.
export const pixelsToDataUrl = (halfFloats, size) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const src = ((size - 1 - y) * size + x) * 4;
      const dst = (y * size + x) * 4;
      const a = Math.min(1, DataUtils.fromHalfFloat(halfFloats[src + 3]));
      if (a <= 0.002) continue;
      const [r, g, b] = neutral(
        DataUtils.fromHalfFloat(halfFloats[src]) / a,
        DataUtils.fromHalfFloat(halfFloats[src + 1]) / a,
        DataUtils.fromHalfFloat(halfFloats[src + 2]) / a,
      );
      image.data[dst] = srgb(r);
      image.data[dst + 1] = srgb(g);
      image.data[dst + 2] = srgb(b);
      image.data[dst + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
};

export const renderStudio = (gl, studio, environment) => {
  studio.scene.environment = environment;
  const previousTarget = gl.getRenderTarget();
  gl.setRenderTarget(studio.target);
  gl.setClearColor(0x000000, 0);
  gl.clear();
  gl.render(studio.scene, studio.camera);
  gl.readRenderTargetPixels(studio.target, 0, 0, studio.size, studio.size, studio.pixels);
  gl.setRenderTarget(previousTarget);
  return pixelsToDataUrl(studio.pixels, studio.size);
};
