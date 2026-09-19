import { useEffect, useMemo } from "react";
import { buildLiquid, heightForVolume } from "./vessel";
import { createLiquidMaterial } from "./materials";

// renderOrder 2 sits between the vessel's inner (1) and outer (3) glass skins.
const Liquid = ({ innerProfile, volumeMl, color, opacity, meniscus }) => {
  const geometry = useMemo(
    () => buildLiquid(innerProfile, heightForVolume(innerProfile, volumeMl), { meniscus }),
    [innerProfile, volumeMl, meniscus],
  );
  const material = useMemo(() => createLiquidMaterial({ color, opacity }), [color, opacity]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  if (volumeMl <= 0) return null;
  return <mesh geometry={geometry} material={material} renderOrder={2} />;
};

export default Liquid;
