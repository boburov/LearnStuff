import { useEffect, useMemo } from "react";
import { MeshPhysicalMaterial } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useSnap } from "@/shared/utils/snapStore";
import { useKit } from "../equipment/kit/kitContext";
import { GROUPS } from "./groups";
import { objectType } from "./objectTypes";
import { seededRandom, shardBase, shardPool } from "./shardGeometry";
import { applySpecularAlpha } from "../equipment/kit/glassShading";

const pieceCount = (body) => {
  const size = body.shape === "cylinder" ? Math.max(body.radius * 2, body.height) : Math.max(...body.size);
  return size < 0.08 ? 7 : 16;
};

// Amber bottles and jars leave brown pieces; everything else breaks into clear glass.
const glassTint = (type) => {
  const container = type.substance?.container;
  return container?.bottle === "amber" || container?.jar === "amber" ? "amber" : "clear";
};

const buildPieces = (burst) => {
  const type = objectType(burst.typeId);
  const body = type.body;
  const kind = body.breaks === "porcelain" ? "porcelain" : "glass";
  const tint = glassTint(type);
  const pool = shardPool(kind);
  const random = seededRandom(burst.id);
  const radius = body.shape === "cylinder" ? body.radius : Math.max(...body.size) / 2;
  // Pools are sized for a beaker; bigger vessels break into bigger pieces, thin rods into smaller ones.
  const scale = body.shape === "cylinder" ? Math.min(1.6, Math.max(0.8, body.radius / 0.036)) : 0.7;
  const height = body.shape === "cylinder" ? body.height : 0.02;
  const [bx, by, bz] = burst.position;
  const [vx, vy, vz] = burst.velocity;

  return Array.from({ length: pieceCount(body) }, (_, i) => {
    const angle = random() * Math.PI * 2;
    const r = i === 0 ? 0 : radius * (0.4 + random() * 0.6);
    const geometry = i === 0 && body.shape === "cylinder" ? shardBase(kind) : pool[Math.floor(random() * pool.length)];
    const { min, max } = geometry.boundingBox;
    const outward = 0.3 + random() * 0.9;
    return {
      key: `${burst.id}-${i}`,
      kind,
      tint,
      scale,
      geometry,
      half: [((max.x - min.x) / 2) * scale, Math.max(0.001, ((max.y - min.y) / 2) * scale), ((max.z - min.z) / 2) * scale],
      position: [bx + Math.cos(angle) * r, by + 0.01 + random() * height, bz + Math.sin(angle) * r],
      rotation: [random() * Math.PI, random() * Math.PI, random() * Math.PI],
      velocity: [vx * 0.25 + Math.cos(angle) * outward, Math.abs(vy) * 0.15 + 0.4 + random() * 0.8, vz * 0.25 + Math.sin(angle) * outward],
      spin: [(random() - 0.5) * 20, (random() - 0.5) * 20, (random() - 0.5) * 20],
    };
  });
};

// Broken edges catch more light than intact walls, so shards get a slightly stronger glass.
const SHARD_GLASS = {
  clear: { color: "#7f9a92", opacity: 0.32 },
  amber: { color: "#6a3208", opacity: 0.62 },
};

const createShardGlass = ({ color, opacity }) =>
  applySpecularAlpha(
    new MeshPhysicalMaterial({ color, roughness: 0.04, metalness: 0, ior: 1.5, opacity, envMapIntensity: 1.6 }),
    0.85,
  );

const Burst = ({ burst, shardGlass }) => {
  const kit = useKit();
  const pieces = useMemo(() => buildPieces(burst), [burst]);
  return pieces.map((p) => (
    <RigidBody
      key={p.key}
      position={p.position}
      rotation={p.rotation}
      linearVelocity={p.velocity}
      angularVelocity={p.spin}
      colliders={false}
      canSleep
    >
      <CuboidCollider args={p.half} collisionGroups={GROUPS.shard} friction={0.9} restitution={0.15} />
      {p.kind === "glass" ? (
        <mesh geometry={p.geometry} material={shardGlass[p.tint]} scale={p.scale} renderOrder={3} />
      ) : (
        <mesh geometry={p.geometry} material={kit.porcelainGlazed} scale={p.scale} castShadow receiveShadow />
      )}
    </RigidBody>
  ));
};

const Shards = ({ world }) => {
  const { bursts } = useSnap(world.store);
  const shardGlass = useMemo(
    () => ({ clear: createShardGlass(SHARD_GLASS.clear), amber: createShardGlass(SHARD_GLASS.amber) }),
    [],
  );
  useEffect(() => () => Object.values(shardGlass).forEach((m) => m.dispose()), [shardGlass]);
  return bursts.map((burst) => <Burst key={burst.id} burst={burst} shardGlass={shardGlass} />);
};

export default Shards;
