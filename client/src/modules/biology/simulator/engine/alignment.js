const measuredSkinBounds = { min: { x: -1.33905, y: -3.534865, z: -0.187946 }, max: { x: 1.33396, y: 3.183290, z: 0.971386 } };
function deepFreeze(value) { Object.values(value).forEach(child => child && typeof child === 'object' && deepFreeze(child)); return Object.freeze(value); }

// Single registration contract: BodyParts3D skin and organs retain their shared
// source frame. The skeleton alone is scaled to the measured scanned-skin height.
export const DETAILED_BODY_REGISTRATION = deepFreeze({
  sourceBounds: measuredSkinBounds,
  runtime: { floorY: -3.48, topY: measuredSkinBounds.max.y + (-3.48 - measuredSkinBounds.min.y), height: measuredSkinBounds.max.y - measuredSkinBounds.min.y, depthReference: .4 },
  sourceToRuntime: { x: 0, y: -3.48 - measuredSkinBounds.min.y, z: 0 },
});
export const BODY_PARTS_DEPTH_REFERENCE = DETAILED_BODY_REGISTRATION.runtime.depthReference;
export const PROCEDURAL_VESSEL_DEPTH_ORIGIN = .05;
export function boundsCenter(bounds, axis) { return (bounds.min[axis] + bounds.max[axis]) * .5; }
export function depthOffset(sourceDepth, targetDepth = BODY_PARTS_DEPTH_REFERENCE) { return targetDepth - sourceDepth; }
export function mirroredBounds(bounds) { return { min: { x: Math.min(bounds.min.x, -bounds.max.x), y: bounds.min.y, z: bounds.min.z }, max: { x: Math.max(bounds.max.x, -bounds.min.x), y: bounds.max.y, z: bounds.max.z } }; }
export function detailedSkeletonTransform(bounds, { mirrorX = true } = {}) {
  const complete = mirrorX ? mirroredBounds(bounds) : bounds;
  const scale = DETAILED_BODY_REGISTRATION.runtime.height / (complete.max.y - complete.min.y);
  return { scale, position: { x: -boundsCenter(complete, 'x') * scale, y: DETAILED_BODY_REGISTRATION.runtime.floorY - complete.min.y * scale, z: depthOffset(boundsCenter(complete, 'z') * scale) }, bounds: complete };
}
export function detailedSourceTranslation() { return { ...DETAILED_BODY_REGISTRATION.sourceToRuntime }; }
