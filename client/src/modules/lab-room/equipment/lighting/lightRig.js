// Surfaces where equipment can stand; shadow catchers sit a hair above them.
export const catcherSurfaces = (anchors = {}) =>
  ["bench_1_top", "bench_2_top", "fumehood_work_surface"]
    .map((name) => anchors[name])
    .filter(Boolean)
    .map(({ position, size }) => ({ position: [position[0], position[1] + 0.0008, position[2]], size }));

export const attachTarget = (scene, light, target) => {
  light.target.position.set(...target);
  scene.add(light.target);
  light.target.updateMatrixWorld();
  return () => scene.remove(light.target);
};
