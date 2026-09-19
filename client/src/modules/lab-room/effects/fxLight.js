import { PointLight } from "three";

const pools = new WeakMap();

// One shared point light per scene (High only): adding and removing lights recompiles every lit shader,
// so it stays mounted while any effect might need it and follows the brightest offer each frame.
export const acquireLight = (scene) => {
  let pool = pools.get(scene);
  if (!pool) {
    const light = new PointLight("#ffffff", 0, 2, 2);
    light.name = "fx-light";
    scene.add(light);
    pool = { light, users: 0, stamp: -1, best: 0 };
    pools.set(scene, pool);
  }
  pool.users += 1;
  let released = false;

  return {
    // Every holder calls this each frame (intensity 0 when idle) so a stale light never lingers.
    offer: (stamp, position, color, intensity, distance = 2) => {
      if (pool.stamp !== stamp) {
        pool.stamp = stamp;
        pool.best = 0;
        pool.light.intensity = 0;
      }
      if (intensity <= pool.best) return;
      pool.best = intensity;
      pool.light.position.copy(position);
      pool.light.color.copy(color);
      pool.light.intensity = intensity;
      pool.light.distance = distance;
    },
    release: () => {
      if (released) return;
      released = true;
      pool.users -= 1;
      if (pool.users > 0) return;
      scene.remove(pool.light);
      pool.light.dispose();
      pools.delete(scene);
    },
  };
};
