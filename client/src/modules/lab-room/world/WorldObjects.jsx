import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { Quaternion, Vector3 } from "three";
import { useSnap } from "@/shared/utils/snapStore";
import EquipmentModel from "../equipment/EquipmentModel";
import BodyColliders from "./BodyColliders";
import { objectType } from "./objectTypes";
import { spillMixture } from "../sim/spills";

const BREAK_SPEED = { glass: 2.4, porcelain: 3.2 };
// Below this the mouth points sideways enough for the contents to run out.
const TIP_UP = 0.55;

const up = new Vector3();
const tmpQuat = new Quaternion();

const WorldObject = ({ object, world, lab }) => {
  const bodyRef = useRef(null);
  const lastSpeed = useRef(0);
  const type = objectType(object.typeId);
  const dynamic = object.state === "dynamic";
  const breaks = type.body.breaks;

  // Collision callbacks run after the solver changed the velocity, so keep the pre-impact speed.
  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!dynamic || !body) return;
    const v = body.linvel();
    lastSpeed.current = Math.hypot(v.x, v.y, v.z);
    // A knocked-over container empties itself onto whatever is below.
    if (!lab?.mixture(object.id)) return;
    const r = body.rotation();
    up.set(0, 1, 0).applyQuaternion(tmpQuat.set(r.x, r.y, r.z, r.w));
    if (up.y > TIP_UP) return;
    const t = body.translation();
    spillMixture(lab, object.id, [t.x, t.y, t.z], { fraction: Math.min(1, delta / 0.6) });
  });

  const onImpact = () => {
    const body = bodyRef.current;
    if (!body || !breaks || lastSpeed.current < BREAK_SPEED[breaks]) return;
    const t = body.translation();
    const r = body.rotation();
    const v = body.linvel();
    // Whatever was inside lands where the glass broke.
    if (lab) spillMixture(lab, object.id, [t.x, t.y, t.z]);
    queueMicrotask(() => world.shatter(object.id, [t.x, t.y, t.z], [r.x, r.y, r.z, r.w], [v.x, v.y, v.z]));
  };

  return (
    <RigidBody
      ref={bodyRef}
      type={dynamic ? "dynamic" : "fixed"}
      position={object.position}
      rotation={object.rotation}
      {...(dynamic ? { linearVelocity: object.velocity } : {})}
      colliders={false}
      ccd={dynamic}
      userData={{ objectId: object.id }}
      {...(dynamic && breaks ? { onCollisionEnter: onImpact } : {})}
    >
      <BodyColliders body={type.body} />
      <EquipmentModel id={object.typeId} simId={object.id} {...object.props} />
    </RigidBody>
  );
};

const WorldObjects = ({ world, lab }) => {
  const { objects } = useSnap(world.store);
  return objects
    .filter((o) => o.state !== "held")
    .map((o) => <WorldObject key={`${o.id}:${o.state}:${o.rev}`} object={o} world={world} lab={lab} />);
};

export default WorldObjects;
