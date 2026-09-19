import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { Euler, Quaternion, Raycaster, Vector2, Vector3 } from "three";
import { GROUPS } from "./groups";
import { bodyBounds, objectType } from "./objectTypes";
import { poseBounds, restPose } from "./poses";
import { PROMPTS } from "./prompts";
import { snapCandidates } from "./snapping";
import { panelAt, runPanel } from "./wallPanels";
import { pushSound } from "../sound/queue";
import { endHold, noteActivity, partAt, resolveAction, runClick, runHold, warnIfHot } from "../tools/actions";
import { describeObject, formatNumber } from "../tools/describe";

const REACH = 2.1;
const MENU_REACH = 4.5;
const MIN_UP = 0.85;

const tmpDir = new Vector3();
const tmpEye = new Vector3();
const tmpRight = new Vector3();
const tmpLocal = new Vector3();
const tmpQuat = new Quaternion();
const tmpEuler = new Euler();
const raycaster = new Raycaster();
const ndc = new Vector2();

const footprintRadius = (body) => {
  const { half } = bodyBounds(body);
  return Math.max(half[0], half[2]);
};

const toLocal = (object, point) => {
  tmpLocal.set(point.x - object.position[0], point.y - object.position[1], point.z - object.position[2]);
  tmpQuat.setFromEuler(tmpEuler.set(...object.rotation)).invert();
  tmpLocal.applyQuaternion(tmpQuat);
  return [tmpLocal.x, tmpLocal.y, tmpLocal.z];
};

const sameAction = (a, b) => Boolean(a && b && a.id === b.id && a.targetId === b.targetId);

const pourTitle = (lab, activity) => {
  const into = lab.mixture(activity.intoId);
  if (!into) return null;
  return {
    title: `Quyilmoqda: +${formatNumber(Math.round(activity.addedMl * 2) / 2)} ml`,
    subtitle: `${formatNumber(Math.round(into.volumeMl))} / ${into.capacityMl} ml`,
  };
};

// Frame-driven aiming, tool actions, placement checks and the discrete actions (take, put down, drop, slots).
const WorldInteraction = ({ world, lab, inputRef, activeRef, anchors, onMonitor }) => {
  const { world: physics, rapier } = useRapier();
  const camera = useThree((s) => s.camera);
  const markerRef = useRef(null);
  const holdRef = useRef({ action: null, state: null, armed: false });

  const queries = useMemo(() => {
    const objectIdOf = (collider) => collider?.parent()?.userData?.objectId ?? null;
    // One overlap-test shape per item type; building Rapier shapes every frame churns WASM memory.
    const shapes = new Map();
    const overlapShape = (typeId, half) => {
      if (!shapes.has(typeId)) shapes.set(typeId, new rapier.Cuboid(half[0] * 0.94, half[1] * 0.9, half[2] * 0.94));
      return shapes.get(typeId);
    };

    const isFree = (typeId, body, pose, supportBody) => {
      const { half, center, quaternion } = poseBounds(body, pose);
      let blocked = false;
      physics.intersectionsWithShape(
        { x: center.x, y: center.y + 0.003, z: center.z },
        { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
        overlapShape(typeId, half),
        () => {
          blocked = true;
          return false;
        },
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        GROUPS.querySolids,
        undefined,
        supportBody ?? undefined,
      );
      return !blocked;
    };

    const placementAlong = (origin, direction, typeId, yaw, reach) => {
      const ray = new rapier.Ray(origin, direction);
      const hit = physics.castRayAndGetNormal(ray, reach, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, GROUPS.querySolids);
      if (!hit) return null;
      const point = ray.pointAt(hit.timeOfImpact);
      if (hit.normal.y < MIN_UP) return { valid: false, reason: "surface", point };
      const supportId = objectIdOf(hit.collider);
      const support = supportId ? world.get(supportId) : null;
      if (support && !objectType(support.typeId)?.body.support) return { valid: false, reason: "support", point };
      const body = objectType(typeId).body;
      // Supports with fixed resting spots (plate, pan, ring, rack holes, vessel mouths) snap the item there.
      const candidates = snapCandidates(support, typeId, point);
      if (!candidates.length) return { valid: false, reason: "support", point };
      for (const { point: base, upright, mouth } of candidates) {
        const pose = restPose(body, base, yaw, { upright });
        const taken = mouth && world.store.get().objects.some((o) => o.supportId === supportId && o.state === "placed");
        if (mouth ? !taken : isFree(typeId, body, pose, support ? hit.collider.parent() : null)) {
          return { valid: true, reason: null, point: base, pose, supportId };
        }
      }
      return { valid: false, reason: "blocked", point };
    };

    const objectAlong = (origin, direction) => {
      const ray = new rapier.Ray(origin, direction);
      const hit = physics.castRay(ray, REACH, true, rapier.QueryFilterFlags.EXCLUDE_SOLIDS, GROUPS.querySensors);
      if (!hit) return null;
      const objectId = objectIdOf(hit.collider);
      const object = objectId ? world.get(objectId) : null;
      if (!object) return null;
      const point = ray.pointAt(hit.timeOfImpact);
      return { objectId, distance: hit.timeOfImpact, part: partAt(object.typeId, toLocal(object, point)) };
    };

    return { placementAlong, objectAlong };
  }, [physics, rapier, world]);

  // The cabinet menu drops items onto what is under the cursor.
  useEffect(() => {
    world.setQuery({
      placementFromScreen: (x, y, typeId) => {
        ndc.set(x, y);
        raycaster.setFromCamera(ndc, camera);
        const yaw = Math.atan2(-raycaster.ray.direction.x, -raycaster.ray.direction.z);
        return queries.placementAlong(raycaster.ray.origin, raycaster.ray.direction, typeId, yaw, MENU_REACH);
      },
    });
    return () => world.setQuery(null);
  }, [world, queries, camera]);

  useFrame((_, delta) => {
    const input = inputRef.current;
    const marker = markerRef.current;
    const holding = holdRef.current;
    camera.getWorldDirection(tmpDir);
    const yaw = Math.atan2(-tmpDir.x, -tmpDir.z);
    // Rotating an item by the camera yaw turns its front (+Z) toward the player.
    const facePlayer = yaw;
    const held = world.activeObject();
    const drag = world.dragPreview;
    const active = activeRef.current && !drag;

    let focus = null;
    let panel = null;
    let action = null;
    if (active) {
      focus = queries.objectAlong(camera.position, tmpDir);
      const hit = panelAt({ anchors, lab, world, held, origin: camera.position, direction: tmpDir, limit: REACH + 0.4 });
      panel = hit && (!focus || hit.distance < focus.distance) ? hit : null;
      if (panel) focus = null;
      action = panel ? null : resolveAction({ lab, world, held, focus });
    }

    let placement = null;
    if (drag) {
      placement = world.query?.placementFromScreen(drag.x, drag.y, drag.typeId) ?? null;
      world.setDragResult(placement);
    } else if (active && held && !action) {
      placement = queries.placementAlong(camera.position, tmpDir, held.typeId, facePlayer, REACH);
    }

    const env = { lab, world, held };
    const events = input.events.splice(0);
    if (active) {
      for (const event of events) {
        if (event.type === "primary") {
          if (panel) {
            if (runPanel(panel, env) === "monitor") onMonitor?.();
          } else if (action?.mode === "click") runClick(action, env);
          else if (action?.mode === "hold") {
            holding.armed = action.valid;
            if (!action.valid) world.flash(action.label);
          } else if (held && placement?.valid) world.placeHeld(held.id, placement.pose, placement.supportId);
          else if (held) world.flash(PROMPTS.reasons[placement?.reason ?? "far"]);
          else if (focus?.objectId) {
            const result = world.take(focus.objectId);
            if (!result.ok && result.reason) world.flash(PROMPTS.reasons[result.reason]);
            if (result.ok) warnIfHot(lab, focus.objectId);
          }
        } else if (event.type === "drop" && held) {
          tmpRight.set(-tmpDir.z, 0, tmpDir.x).normalize();
          const from = camera.position.clone().addScaledVector(tmpDir, 0.4).addScaledVector(tmpRight, 0.12);
          from.y -= 0.22;
          const body = objectType(held.typeId).body;
          world.dropHeld(
            held.id,
            { position: from.toArray(), rotation: body.lying ? [0, facePlayer, Math.PI / 2] : [0, facePlayer, 0] },
            [tmpDir.x * 1.1, tmpDir.y * 1.1 + 0.4, tmpDir.z * 1.1],
          );
        } else if (event.type === "slot") {
          world.selectSlot(event.slot);
          pushSound(lab, { type: "click", soft: true });
        } else if (event.type === "wheel") {
          world.cycleSlot(event.direction);
          pushSound(lab, { type: "click", soft: true });
        }
      }
    }

    // Held actions run while the button stays down on the same target.
    const pressed = active && input.primaryDown;
    if (!pressed) holding.armed = false;
    if (holding.action && (!pressed || !sameAction(holding.action, action) || world.activeObject()?.id !== holding.heldId)) {
      endHold(holding.action, { lab, world, held: world.get(holding.heldId) });
      holding.action = null;
    }
    if (!holding.action && pressed && holding.armed && action?.mode === "hold" && action.valid) {
      holding.action = action;
      holding.state = {};
      holding.heldId = held?.id ?? null;
    }
    if (holding.action) runHold(holding.action, env, Math.min(delta, 0.1), holding.state);
    noteActivity(lab, holding.action, action, camera.getWorldPosition(tmpEye), tmpDir);

    const target = held ?? (drag ? { typeId: drag.typeId } : null);
    if (marker) {
      marker.visible = Boolean(target && placement?.point);
      if (marker.visible) {
        const radius = footprintRadius(objectType(target.typeId).body);
        marker.position.set(placement.point.x, placement.point.y + 0.002, placement.point.z);
        marker.scale.setScalar(radius + 0.01);
        marker.material.color.set(placement.valid ? "#34d399" : "#f87171");
      }
    }

    if (!active) {
      world.setPrompt(null);
      return;
    }
    const focusObject = focus?.objectId ? world.get(focus.objectId) : null;
    const subtitle = describeObject(lab, focusObject);
    if (holding.action?.id === "pour" && lab.activity.pour) {
      world.setPrompt(PROMPTS.progress(pourTitle(lab, lab.activity.pour)));
    } else if (panel) {
      world.setPrompt(PROMPTS.panel(panel));
    } else if (action) {
      world.setPrompt(PROMPTS.action(action, focusObject, subtitle, held));
    } else if (held) {
      world.setPrompt(PROMPTS.holding(held, placement, describeObject(lab, held)));
    } else if (focusObject) {
      world.setPrompt(PROMPTS.focus(focusObject, subtitle));
    } else {
      world.setPrompt(null);
    }
  }, 0.5);

  return (
    <mesh ref={markerRef} rotation-x={-Math.PI / 2} visible={false} renderOrder={6}>
      <ringGeometry args={[0.86, 1, 48]} />
      <meshBasicMaterial transparent opacity={0.75} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

export default WorldInteraction;
