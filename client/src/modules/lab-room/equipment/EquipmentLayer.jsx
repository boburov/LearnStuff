import { useMemo } from "react";
import EquipmentModel from "./EquipmentModel";
import { BENCH_LAYOUT, showcaseLayout } from "./layout";

const EquipmentLayer = ({ showcase, spacing }) => {
  const items = useMemo(
    () => (showcase ? showcaseLayout(showcase, spacing ?? undefined) : BENCH_LAYOUT),
    [showcase, spacing],
  );
  return items.map(({ key, ...item }) => <EquipmentModel key={key} {...item} />);
};

export default EquipmentLayer;
