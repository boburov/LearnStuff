import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Object3D } from "three";
import { SPRITES, getSpriteRuns } from "@/shared/components/ui/pixel";

// Extrudes a 2D pixel sprite into voxels - one instanced mesh per sprite.
const VoxelSprite = ({ name, voxel = 0.12, depth = 2, ...props }) => {
  const mesh = useRef(null);

  const cells = useMemo(() => {
    const data = getSpriteRuns(name);
    const palette = SPRITES[name].colors;
    const list = [];
    data.runs.forEach(({ x, y, w, key }) => {
      for (let i = 0; i < w; i++) {
        list.push({
          x: (x + i - (data.width - 1) / 2) * voxel,
          y: ((data.height - 1) / 2 - y) * voxel,
          color: palette[key],
        });
      }
    });
    return list;
  }, [name, voxel]);

  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    const dummy = new Object3D();
    const color = new Color();
    cells.forEach((c, i) => {
      dummy.position.set(c.x, c.y, 0);
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
      node.setColorAt(i, color.set(c.color));
    });
    node.instanceMatrix.needsUpdate = true;
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
  }, [cells]);

  return (
    <group {...props}>
      <instancedMesh key={cells.length} ref={mesh} args={[null, null, cells.length]}>
        <boxGeometry args={[voxel, voxel, voxel * depth]} />
        <meshStandardMaterial roughness={0.65} flatShading />
      </instancedMesh>
    </group>
  );
};

export default VoxelSprite;
