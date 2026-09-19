import { useEffect, useRef, useState } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { HalfFloatType, PerspectiveCamera, Scene, WebGLRenderTarget } from "three";
import { useSnap } from "@/shared/utils/snapStore";
import EquipmentModel from "../equipment/EquipmentModel";
import { BlobVisibleContext } from "../equipment/kit/blobContext";
import { frameCamera, renderStudio } from "./thumbnailPixels";

const SIZE = 192;
const STABLE_FRAMES = 3;
const GIVE_UP_FRAMES = 240;

const createStudio = () => {
  const scene = new Scene();
  const camera = new PerspectiveCamera(24, 1, 0.01, 10);
  const target = new WebGLRenderTarget(SIZE, SIZE, { type: HalfFloatType, samples: 4 });
  return { scene, camera, target, size: SIZE, pixels: new Uint16Array(SIZE * SIZE * 4) };
};

// Renders the current queue item into its own scene with the room's environment lighting.
const ThumbnailRenderer = ({ thumbs }) => {
  const { current } = useSnap(thumbs.store);
  const gl = useThree((s) => s.gl);
  const roomScene = useThree((s) => s.scene);
  const [studio] = useState(createStudio);
  const holderRef = useRef(null);
  const progress = useRef({ id: null, key: null, stable: 0, frames: 0 });

  useEffect(() => () => studio.target.dispose(), [studio]);

  useFrame(() => {
    const holder = holderRef.current;
    const p = progress.current;
    if (!current || !holder) return;
    if (p.id !== current) Object.assign(p, { id: current, key: null, stable: 0, frames: 0 });
    p.frames += 1;

    const key = frameCamera(studio.camera, holder);
    p.stable = key && key === p.key ? p.stable + 1 : 0;
    p.key = key;
    if (p.frames > GIVE_UP_FRAMES) {
      thumbs.skip();
      return;
    }
    if (p.stable < STABLE_FRAMES) return;

    thumbs.done(current, renderStudio(gl, studio, roomScene.environment));
  }, 0.7);

  if (!current) return null;
  return createPortal(
    <>
      <directionalLight position={[1.5, 3, 2]} intensity={1.3} />
      <group ref={holderRef}>
        <BlobVisibleContext.Provider value={false}>
          <EquipmentModel key={current} id={current} />
        </BlobVisibleContext.Provider>
      </group>
    </>,
    studio.scene,
  );
};

export default ThumbnailRenderer;
