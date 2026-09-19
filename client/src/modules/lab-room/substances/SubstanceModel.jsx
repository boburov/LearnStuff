import { Suspense, lazy } from "react";
import { SUBSTANCE_BY_ID } from "./catalog";

const TEMPLATE_FILES = import.meta.glob("./templates/*.jsx");
const load = (file) => (TEMPLATE_FILES[file] ? lazy(TEMPLATE_FILES[file]) : null);

// One container template per physical state; each substance only changes its parameters.
const TEMPLATES = {
  liquid: load("./templates/ReagentBottle.jsx"),
  powder: load("./templates/PowderJar.jsx"),
  solid: load("./templates/SolidJar.jsx"),
  gas: load("./templates/GasCylinder.jsx"),
};

const SubstanceModel = ({ substanceId, ...props }) => {
  const substance = SUBSTANCE_BY_ID[substanceId];
  const Template = substance ? TEMPLATES[substance.state] : null;
  if (!Template) return null;
  return (
    <Suspense fallback={null}>
      <Template substance={substance} {...props} />
    </Suspense>
  );
};

export default SubstanceModel;
