// School machines share their memory with the GPU, so every texture is capped per quality tier.
// Canvases are redrawn into themselves; image textures get a canvas copy. Mipmaps make each one cost
// about 1.33 × width × height × 4 bytes.
const capOf = (image) => Math.max(image?.width ?? 0, image?.height ?? 0);

export const capTexture = (texture, max) => {
  const image = texture?.image;
  if (!image?.width || capOf(image) <= max) return texture;
  const scale = max / capOf(image);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const small = document.createElement("canvas");
  small.width = width;
  small.height = height;
  small.getContext("2d").drawImage(image, 0, 0, width, height);
  if (image instanceof HTMLCanvasElement) {
    // Resizing the canvas the texture already points at keeps the texture's own settings.
    image.width = width;
    image.height = height;
    image.getContext("2d").drawImage(small, 0, 0);
  } else {
    texture.image = small;
  }
  texture.needsUpdate = true;
  return texture;
};

// Every texture a material uses, capped once.
export const capMaterialTextures = (material, max, seen) => {
  for (const key of Object.keys(material)) {
    const value = material[key];
    if (!value?.isTexture || seen.has(value.uuid)) continue;
    seen.add(value.uuid);
    capTexture(value, max);
  }
};
