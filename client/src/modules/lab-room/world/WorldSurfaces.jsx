import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { GROUPS } from "./groups";

// Player blockers that are not usable surfaces: the hood and bench boxes include their upper parts.
const NOT_SURFACES = new Set(["fume_hood", "lab_coats", "bench_1", "bench_2"]);

const box = (name, center, half) => ({ name, center, half });

const surfacesFor = (boxes, anchors = {}) => {
  const list = boxes.filter((b) => !NOT_SURFACES.has(b.name));
  list.push(box("floor", [0, -0.05, 0], [5.5, 0.05, 4.5]));

  for (const name of ["bench_1", "bench_2"]) {
    const top = anchors[`${name}_top`];
    const blocker = boxes.find((b) => b.name === name);
    if (!top || !blocker) continue;
    const [x, y, z] = top.position;
    list.push(box(`${name}_worktop`, [blocker.center[0], y / 2, blocker.center[2]], [blocker.half[0], y / 2, blocker.half[2]]));
    list.push(box(`${name}_upstand`, [x, y + 0.175, z], [top.size[0] / 2 - 0.1, 0.175, 0.1]));
  }

  const hood = anchors.fumehood_work_surface;
  if (hood) {
    const [x, y, z] = hood.position;
    const [sx, sz] = hood.size;
    list.push(box("fumehood_top", [x, y / 2, z], [sx / 2, y / 2, sz / 2]));
    list.push(box("fumehood_side_a", [x, 1.2, z - sz / 2 - 0.02], [sx / 2, 1.2, 0.02]));
    list.push(box("fumehood_side_b", [x, 1.2, z + sz / 2 + 0.02], [sx / 2, 1.2, 0.02]));
  }

  const monitor = anchors.monitor_screen;
  if (monitor) {
    const [x, y, z] = monitor.position;
    list.push(box("monitor", [x, y - 0.05, z - 0.03], [0.3, 0.3, 0.08]));
  }
  return list;
};

const WorldSurfaces = ({ boxes, anchors }) => {
  const surfaces = useMemo(() => surfacesFor(boxes, anchors), [boxes, anchors]);
  return (
    <RigidBody type="fixed" colliders={false}>
      {surfaces.map((s) => (
        <CuboidCollider
          key={s.name}
          args={s.half}
          position={s.center}
          collisionGroups={GROUPS.surface}
          friction={0.9}
          restitution={0.05}
        />
      ))}
    </RigidBody>
  );
};

export default WorldSurfaces;
