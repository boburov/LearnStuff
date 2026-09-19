import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BoxGeometry, CylinderGeometry, Vector3 } from "three";
import EquipmentModel from "../equipment/EquipmentModel";
import GlassVessel from "../equipment/kit/GlassVessel";
import Liquid from "../equipment/kit/Liquid";
import { useKit } from "../equipment/kit/kitContext";
import { arc, buildVessel, heightForVolume } from "../equipment/kit/vessel";
import { LabContext } from "../sim/labContext";
import { loadSettings } from "../labRoomSettings";
import Bubbles from "./Bubbles";
import Steam from "./Steam";
import Smoke from "./Smoke";
import Flame from "./Flame";
import Sparks from "./Sparks";
import Spatter from "./Spatter";
import SodiumBall from "./SodiumBall";
import PourStream from "./PourStream";
import GasTube from "./GasTube";
import FlashLight from "./FlashLight";
import LampFlame from "./LampFlame";

const TOP = 0.9;
const ROW_Z = -0.72;
const CENTER_X = 0.3;
const WICK_TIP = 0.0905;
const WATER = { color: "#0d2230", opacity: 0.08 };
const pulse = (t, period, on) => (t % period) < on;
const wave = (t, speed, lo, hi) => lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * speed));

let mocks = null;
// Mock glassware with real kit profiles so bubbles are judged inside actual glass and liquid.
const getMocks = () => {
  if (mocks) return mocks;
  const beaker = buildVessel({
    outline: [[0, 0], ...arc(0.0305, 0.0045, 0.0045, -Math.PI / 2, 0, 6), [0.035, 0.088], [0.0355, 0.095]],
    wall: 0.0014,
    bottom: 0.0022,
    segments: 64,
  });
  const tube = buildVessel({
    outline: [...arc(0, 0.009, 0.009, -Math.PI / 2, 0, 10), [0.009, 0.16]],
    wall: 0.0008,
    bottom: 0.0008,
    segments: 40,
  });
  mocks = {
    beaker,
    tube,
    level: (vessel, ml) => heightForVolume(vessel.innerProfile, ml),
    chip: new BoxGeometry(0.004, 0.003, 0.0035),
    ribbon: new BoxGeometry(0.003, 0.03, 0.0004),
    pipe: new CylinderGeometry(0.0028, 0.0028, 0.12, 16, 1, true),
  };
  return mocks;
};

const useClock = () => {
  const clock = useRef({ t: 0 });
  useFrame((_, dt) => {
    clock.current.t += Math.min(dt, 0.05);
  }, 0.65);
  return clock;
};

const MockVessel = ({ vessel, ml, liquid = WATER, children }) => {
  const level = heightForVolume(vessel.innerProfile, ml);
  return (
    <GlassVessel vessel={vessel}>
      <Liquid innerProfile={vessel.innerProfile} volumeMl={ml} color={liquid.color} opacity={liquid.opacity} />
      {children(level)}
    </GlassVessel>
  );
};

const Metal = ({ geometry, color = "#8e9296", ...props }) => (
  <mesh geometry={geometry} {...props}>
    <meshStandardMaterial color={color} metalness={1} roughness={0.35} />
  </mesh>
);

const GlassPipe = (props) => {
  const kit = useKit();
  return <mesh geometry={getMocks().pipe} material={kit.glass} renderOrder={3} {...props} />;
};

const flameItem = (kind, { model, props, origin = [0, 0.06, 0], radius = 0.02, extra = null, width = 0.075 } = {}) => ({
  width,
  models: model ? [{ id: model, props }] : [],
  render: (clock) => (
    <>
      {extra?.()}
      <Flame origin={origin} radius={radius} get={() => ({ kind, intensity: pulse(clock.current.t, 9, 7.5) ? 1 : 0 })} />
    </>
  ),
});

const SPECS = {
  "flame-lamp": flameItem("lamp", { model: "spirit-lamp", props: { capOn: false }, origin: [0, WICK_TIP - 0.003, 0], radius: 0.0024 }),
  "flame-ethanol": flameItem("ethanol", {
    model: "evaporating-dish",
    props: { volumeMl: 6, liquidColor: "#121a1e", liquidOpacity: 0.07 },
    origin: [0, 0.009, 0],
    radius: 0.036,
  }),
  "flame-magnesium": flameItem("magnesium", {
    model: "evaporating-dish",
    origin: [0, 0.075, 0],
    radius: 0.004,
    extra: () => <Metal geometry={getMocks().ribbon} position={[0, 0.093, 0]} rotation={[0, 0, 0.3]} color="#b9bcc0" />,
  }),
  "flame-sulfur": flameItem("sulfur", { model: "crucible", props: { lidOpen: true }, origin: [0, 0.03, 0], radius: 0.017, width: 0.05 }),
  "flame-sulfur-oxygen": flameItem("sulfur-oxygen", { model: "crucible", props: { lidOpen: true }, origin: [0, 0.03, 0], radius: 0.017, width: 0.06 }),
  "flame-permanganate": flameItem("permanganate", { model: "evaporating-dish", origin: [0, 0.008, 0], radius: 0.03 }),
  "flame-sodium": flameItem("sodium", { model: "gas-jar", props: { coverOn: false }, origin: [0, 0.07, 0], radius: 0.01, width: 0.06 }),
  "flame-hydrogen": flameItem("hydrogen", {
    origin: [0, 0.12, 0],
    radius: 0.0022,
    extra: () => <GlassPipe position={[0, 0.06, 0]} />,
    width: 0.03,
  }),
  "flame-sodium-water": flameItem("sodium-water", {
    model: "crystallizing-dish",
    props: { volumeMl: 300, liquidColor: WATER.color, liquidOpacity: WATER.opacity },
    origin: [0.02, 0.022, 0],
    radius: 0.003,
    width: 0.1,
  }),

  bubbles: {
    width: 0.1,
    render: (clock) => (
      <MockVessel vessel={getMocks().beaker} ml={150}>
        {(level) => (
          <Bubbles
            innerProfile={getMocks().beaker.innerProfile}
            get={() => ({ level, rate: wave(clock.current.t, 0.7, 0.4, 2.2), site: "bottom", size: "fine" })}
          />
        )}
      </MockVessel>
    ),
  },
  "bubbles-pieces": {
    width: 0.07,
    render: (clock) => (
      <MockVessel vessel={getMocks().tube} ml={9}>
        {(level) => (
          <>
            <Metal geometry={getMocks().chip} position={[0.002, 0.0038, 0.001]} rotation={[0.4, 0.8, 0.2]} color="#9a9ea3" />
            <Bubbles
              innerProfile={getMocks().tube.innerProfile}
              get={() => ({ level, rate: wave(clock.current.t, 0.5, 0.3, 1.1), site: "pieces", sources: [[0.002, 0.0045, 0.001]], size: "medium" })}
            />
          </>
        )}
      </MockVessel>
    ),
  },
  "bubbles-boil": {
    width: 0.1,
    render: (clock) => (
      <MockVessel vessel={getMocks().beaker} ml={120}>
        {(level) => (
          <Bubbles
            innerProfile={getMocks().beaker.innerProfile}
            get={() => ({ level, rate: wave(clock.current.t, 0.4, 1.5, 4), site: "bottom", size: "large" })}
          />
        )}
      </MockVessel>
    ),
  },
  "bubbles-froth": {
    width: 0.1,
    render: (clock) => (
      <MockVessel vessel={getMocks().beaker} ml={100} liquid={{ color: "#1f6fd1", opacity: 0.45 }}>
        {(level) => (
          <Bubbles
            innerProfile={getMocks().beaker.innerProfile}
            get={() => ({ level, rate: wave(clock.current.t, 0.3, 4, 9), site: "bottom", size: "medium", color: "#8fc0ff" })}
          />
        )}
      </MockVessel>
    ),
  },
  "bubbles-tube": {
    width: 0.07,
    render: (clock) => (
      <MockVessel vessel={getMocks().tube} ml={12}>
        {(level) => (
          <>
            <GlassPipe position={[0.003, 0.075, 0]} scale={[0.5, 1.15, 0.5]} />
            <Bubbles
              innerProfile={getMocks().tube.innerProfile}
              get={() => ({ level, rate: pulse(clock.current.t, 6, 4.5) ? 0.35 : 0, site: "tube", sources: [[0.003, 0.008, 0]], size: "large" })}
            />
          </>
        )}
      </MockVessel>
    ),
  },
  steam: {
    width: 0.1,
    render: (clock) => (
      <>
        <MockVessel vessel={getMocks().beaker} ml={140}>
          {(level) => (
            <Bubbles innerProfile={getMocks().beaker.innerProfile} get={() => ({ level, rate: 3, site: "bottom", size: "large" })} />
          )}
        </MockVessel>
        <Steam origin={[0, 0.093, 0]} radius={0.033} get={() => ({ intensity: wave(clock.current.t, 0.5, 0.55, 1) })} />
      </>
    ),
  },
  "steam-tube": {
    width: 0.06,
    render: (clock) => (
      <>
        <MockVessel vessel={getMocks().tube} ml={8}>{() => null}</MockVessel>
        <Steam origin={[0, 0.16, 0]} radius={0.0082} get={() => ({ intensity: wave(clock.current.t, 0.8, 0.4, 1) })} />
      </>
    ),
  },
  smoke: {
    width: 0.1,
    models: [{ id: "crucible" }],
    render: () => <Smoke origin={[0, 0.036, 0]} radius={0.018} get={() => ({ rate: 1, color: "#d0d0d0", toxic: false })} />,
  },
  "smoke-toxic": {
    width: 0.1,
    models: [{ id: "crucible" }],
    render: () => <Smoke origin={[0, 0.036, 0]} radius={0.018} get={() => ({ rate: 0.8, color: "#e6e6e6", toxic: true })} />,
  },
  "smoke-brown": {
    width: 0.07,
    render: () => (
      <>
        <MockVessel vessel={getMocks().tube} ml={4} liquid={{ color: "#2e8b6a", opacity: 0.5 }}>{() => null}</MockVessel>
        <Smoke origin={[0, 0.16, 0]} radius={0.0082} get={() => ({ rate: 0.9, color: "#a0461e", toxic: true })} />
      </>
    ),
  },
  sparks: {
    width: 0.1,
    models: [{ id: "evaporating-dish" }],
    render: (clock) => <Sparks origin={[0, 0.06, 0]} get={() => ({ intensity: wave(clock.current.t, 1.1, 0.2, 1) })} />,
  },
  spatter: {
    width: 0.08,
    render: (clock) => (
      <>
        <MockVessel vessel={getMocks().tube} ml={6} liquid={{ color: "#141a1c", opacity: 0.1 }}>{() => null}</MockVessel>
        <Spatter origin={[0, 0.16, 0]} radius={0.0082} get={() => (pulse(clock.current.t, 4, 1.6) ? { intensity: 1, color: "#dfe6ea" } : null)} />
        <Steam origin={[0, 0.16, 0]} radius={0.0082} get={() => (pulse(clock.current.t, 4, 2.2) ? { intensity: 1 } : null)} />
      </>
    ),
  },
  "spatter-colored": {
    width: 0.1,
    render: (clock) => (
      <>
        <MockVessel vessel={getMocks().beaker} ml={60} liquid={{ color: "#6a0dad", opacity: 0.75 }}>{() => null}</MockVessel>
        <Spatter origin={[0, 0.095, 0]} radius={0.033} get={() => ({ intensity: wave(clock.current.t, 1.3, 0.3, 1), color: "#6a0dad" })} />
      </>
    ),
  },
  "sodium-ball": {
    width: 0.17,
    models: [{ id: "crystallizing-dish", props: { volumeMl: 300, liquidColor: WATER.color, liquidOpacity: WATER.opacity } }],
    render: (clock) => (
      <SodiumBall
        surfaceRadius={0.07}
        get={() => {
          const t = clock.current.t % 16;
          return t < 14 ? { level: 0.0223, size: 1 - t / 15, burning: false } : null;
        }}
      />
    ),
  },
  "sodium-ball-burning": {
    width: 0.17,
    models: [{ id: "crystallizing-dish", props: { volumeMl: 300, liquidColor: WATER.color, liquidOpacity: WATER.opacity } }],
    render: () => <SodiumBall surfaceRadius={0.07} get={() => ({ level: 0.0223, size: 1, burning: true })} />,
  },
  pour: {
    width: 0.16,
    world: true,
    models: [{ id: "beaker", position: [0.035, 0, 0], props: { volumeMl: 40, liquidColor: WATER.color, liquidOpacity: WATER.opacity } }],
    render: (clock, base) => <PourDemo clock={clock} base={base} color="#1f6fd1" opacity={0.55} />,
  },
  "pour-water": {
    width: 0.16,
    world: true,
    models: [{ id: "beaker", position: [0.035, 0, 0], props: { volumeMl: 80, liquidColor: WATER.color, liquidOpacity: WATER.opacity } }],
    render: (clock, base) => <PourDemo clock={clock} base={base} color={WATER.color} opacity={WATER.opacity} />,
  },
  "gas-tube": {
    width: 0.2,
    world: true,
    models: [{ id: "sub:co2", position: [-0.07, 0, 0.02] }],
    render: (clock, base) => <GasTubeDemo clock={clock} base={base} />,
  },
  flash: {
    width: 0.1,
    models: [{ id: "test-tube", position: [0, 0, 0] }],
    render: (clock) => (
      <FlashLight
        origin={[0, 0.19, 0]}
        get={() => {
          const t = clock.current.t % 2.4;
          if (t < 0.12) return { color: "#bcd4ff", strength: 0.4 };
          if (t > 1.2 && t < 1.3) return { color: "#ffffff", strength: 1 };
          return null;
        }}
      />
    ),
  },
  // Asks for five flashes a second; the photosensitivity gate should let at most three through.
  "flash-storm": {
    width: 0.08,
    models: [{ id: "test-tube" }],
    render: (clock) => (
      <FlashLight
        origin={[0, 0.19, 0]}
        get={() => (Math.floor(clock.current.t * 10) % 2 === 0 ? { color: "#ffffff", strength: 0.8 } : null)}
      />
    ),
  },
  lamp: lampItem(() => ({ intensity: 1, boost: 0, dousing: 0 })),
  "lamp-boost": lampItem((t) => ({ intensity: 1, boost: wave(t, 0.6, 0, 2), dousing: 0 })),
  "lamp-douse": lampItem((t) => {
    const k = t % 6;
    return k < 4.5 ? { intensity: 1, boost: 0, dousing: Math.min(1, Math.max(0, (k - 1) / 3)) } : null;
  }),
};

function lampItem(params) {
  return {
    width: 0.1,
    models: [{ id: "spirit-lamp", props: { capOn: false } }],
    render: (clock) => <LampFlame origin={[0, WICK_TIP, 0]} get={() => params(clock.current.t)} />,
  };
}

// World-space stream from a tilted beaker's lip into a beaker on the bench.
const PourDemo = ({ clock, base, color, opacity }) => {
  const from = useMemo(() => new Vector3(base[0] - 0.029, base[1] + 0.142, base[2]), [base]);
  const to = useMemo(() => new Vector3(base[0] + 0.022, base[1] + 0.02, base[2]), [base]);
  return (
    <>
      <group position={[base[0] - 0.13, base[1] + 0.15, base[2]]} rotation={[0, 0, -1.25]}>
        <EquipmentModel id="beaker" volumeMl={30} liquidColor={color} liquidOpacity={opacity} />
      </group>
      <PourStream get={() => ({ from, to, rate: wave(clock.current.t, 0.8, 0.15, 1), color, opacity })} />
    </>
  );
};

const GasTubeDemo = ({ clock, base }) => {
  const from = useMemo(() => new Vector3(base[0] - 0.07 + 0.0245, base[1] + 0.408, base[2] + 0.02), [base]);
  const to = useMemo(() => new Vector3(base[0] + 0.06, base[1] + 0.19, base[2]), [base]);
  const { tube } = getMocks();
  const level = heightForVolume(tube.innerProfile, 12);
  return (
    <>
      <group position={[base[0] + 0.06, base[1], base[2]]}>
        <MockVessel vessel={tube} ml={12}>
          {() => (
            <Bubbles
              innerProfile={tube.innerProfile}
              get={() => ({ level, rate: pulse(clock.current.t, 5, 3.5) ? 0.4 : 0, site: "tube", sources: [[0, 0.012, 0]], size: "large" })}
            />
          )}
        </MockVessel>
        <GlassPipe position={[0, 0.1, 0]} scale={[1, 1.5, 1]} />
      </group>
      <GasTube get={() => ({ from, to, bubbling: pulse(clock.current.t, 5, 3.5) })} />
    </>
  );
};

const GROUPS = {
  "all-flames": Object.keys(SPECS).filter((name) => name.startsWith("flame-")),
  all: Object.keys(SPECS),
};

const readOverrides = () => {
  const params = new URLSearchParams(window.location.search);
  const spacing = Number(params.get("spacing"));
  return { spacing: Number.isFinite(spacing) && spacing > 0 ? spacing : null, bare: params.get("bare") === "1" };
};

const BenchItem = ({ spec, position, bare }) => {
  const clock = useClock();
  return (
    <group position={position}>
      {(bare ? [] : spec.models ?? []).map((model, i) => (
        <EquipmentModel key={i} id={model.id} position={model.position ?? [0, 0, 0]} {...model.props} />
      ))}
      {!spec.world && spec.render(clock, position)}
    </group>
  );
};

const WorldItem = ({ spec, position }) => {
  const clock = useClock();
  return spec.render(clock, position);
};

// Dev-only gallery: ?effects=flame-magnesium,steam (or all-flames / all) lays the effects along bench 1.
const EffectsBench = ({ spec }) => {
  const scene = useThree((s) => s.scene);
  const [lab] = useState(() => ({ prefs: { reduceMotion: Boolean(loadSettings().reduceMotion) } }));
  const [overrides] = useState(readOverrides);
  const items = useMemo(() => {
    const names = spec
      .split(",")
      .map((name) => name.trim())
      .flatMap((name) => GROUPS[name] ?? [name])
      .filter((name) => SPECS[name]);
    const widths = names.map((name) => SPECS[name].width);
    const gap = overrides.spacing ?? 0.012;
    const total = widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, names.length - 1);
    const start = CENTER_X - total / 2;
    return names.map((name, i) => {
      const before = widths.slice(0, i).reduce((sum, w) => sum + w + gap, 0);
      // Alternate rows let wide dishes overlap in x without colliding.
      const z = names.length > 4 ? ROW_Z + (i % 2 === 0 ? -0.045 : 0.045) : ROW_Z;
      return { name, spec: SPECS[name], position: [start + before + widths[i] / 2, TOP, z] };
    });
  }, [spec, overrides]);

  useEffect(() => {
    if (import.meta.env.DEV) window.__labEffects = { items: items.map(({ name, position }) => ({ name, position })), scene };
  }, [items, scene]);

  return (
    <LabContext.Provider value={lab}>
      {items.map(({ name, spec: item, position }) =>
        item.world ? (
          <group key={name}>
            <BenchItem spec={item} position={position} bare={overrides.bare} />
            <WorldItem spec={item} position={position} />
          </group>
        ) : (
          <BenchItem key={name} spec={item} position={position} bare={overrides.bare} />
        ),
      )}
    </LabContext.Provider>
  );
};

export default EffectsBench;
