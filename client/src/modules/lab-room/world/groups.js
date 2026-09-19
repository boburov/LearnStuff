import { interactionGroups } from "@react-three/rapier";

const PLAYER = 0;
const BLOCKER = 1;
const SURFACE = 2;
const OBJECT = 3;
const SENSOR = 4;
const SHARD = 5;
const QUERY = 6;

// The player only touches walls/furniture; objects, shards and rays use the finer surface colliders.
export const GROUPS = {
  player: interactionGroups([PLAYER], [BLOCKER]),
  blocker: interactionGroups([BLOCKER], [PLAYER]),
  surface: interactionGroups([SURFACE], [OBJECT, SHARD, QUERY]),
  object: interactionGroups([OBJECT], [SURFACE, OBJECT, SHARD, QUERY]),
  sensor: interactionGroups([SENSOR], [QUERY]),
  shard: interactionGroups([SHARD], [SURFACE, OBJECT]),
  querySensors: interactionGroups([QUERY], [SENSOR]),
  querySolids: interactionGroups([QUERY], [SURFACE, OBJECT]),
};
