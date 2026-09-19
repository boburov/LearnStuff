import { Component, Suspense, lazy } from "react";
import SubstanceModel from "../substances/SubstanceModel";

// models/ConicalFlask.jsx ↔ id "conical-flask"; loaded on demand so a broken model can't take down the room.
const toId = (path) =>
  path
    .replace(/^.*\/(\w+)\.jsx$/, "$1")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

const MODELS = Object.fromEntries(
  Object.entries(import.meta.glob("./models/*.jsx")).map(([path, load]) => [toId(path), lazy(load)]),
);

class ModelBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(`[lab-room] equipment model "${this.props.id}" failed`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const SUBSTANCE_PREFIX = "sub:";

// "sub:<substanceId>" renders a substance container; anything else is an equipment id.
const EquipmentModel = ({ id, ...props }) => {
  if (id.startsWith(SUBSTANCE_PREFIX)) {
    return (
      <ModelBoundary id={id}>
        <SubstanceModel substanceId={id.slice(SUBSTANCE_PREFIX.length)} {...props} />
      </ModelBoundary>
    );
  }
  const Model = MODELS[id];
  if (!Model) return null;
  return (
    <ModelBoundary id={id}>
      <Suspense fallback={null}>
        <Model {...props} />
      </Suspense>
    </ModelBoundary>
  );
};

export default EquipmentModel;
