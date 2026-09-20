// theta ∈ [0, 4π), 0 = TDC before intake; crank turns clockwise seen from +z.

export const TAU = Math.PI * 2;
export const CYCLE = Math.PI * 4;
export const DEG = Math.PI / 180;

export const GEOM = {
  crankRadius: 0.36,
  rodLength: 1.25,
  boreRadius: 0.45,
  pinToCrown: 0.2,
  pistonHeight: 0.56,
  deckY: 1.91,
  linerBottomY: 0.62,
  cylinderOuterRadius: 0.62,
  valveTilt: 0.35,
  valveOffsetX: 0.2,
  valveHeadRadius: 0.15,
  valveStemLength: 0.9,
  valveMaxLift: 0.13,
  camBaseRadius: 0.13,
  camGap: 0.1,
  crankPulleyRadius: 0.18,
  camPulleyRadius: 0.36,
  beltZ: 0.95,
  flywheelZ: -1.08,
  rodZ: 0,
  sparkPlugBaseY: 1.93,
  sparkPlugTopY: 3.5,
  floorY: -0.9,
};

export const STROKES = ["intake", "compression", "power", "exhaust"];

export const GAS_COLORS = {
  mixture: "#3b82f6",
  flame: "#ff7a1a",
  exhaust: "#8b93a1",
};

export const normTheta = (t) => ((t % CYCLE) + CYCLE) % CYCLE;

export const crankPin = (theta) => ({
  x: GEOM.crankRadius * Math.sin(theta),
  y: GEOM.crankRadius * Math.cos(theta),
});

// Wrist-pin height above the crank axis (exact slider-crank).
export const pistonPinY = (theta) => {
  const { crankRadius: r, rodLength: l } = GEOM;
  const s = Math.sin(theta);
  return r * Math.cos(theta) + Math.sqrt(l * l - r * r * s * s);
};

export const PIN_Y_TDC = GEOM.crankRadius + GEOM.rodLength;
export const PIN_Y_BDC = GEOM.rodLength - GEOM.crankRadius;

export const pistonCrownY = (theta) => pistonPinY(theta) + GEOM.pinToCrown;

// 0 at TDC, 1 at BDC.
export const pistonTravel = (theta) =>
  (PIN_Y_TDC - pistonPinY(theta)) / (PIN_Y_TDC - PIN_Y_BDC);

// Rod sits at the crank pin; rotation.z that points its local +y at the wrist pin.
export const rodAngle = (theta) => {
  const p = crankPin(theta);
  return Math.atan2(p.x, pistonPinY(theta) - p.y);
};

export const strokeIndex = (theta) => Math.min(3, Math.floor(normTheta(theta) / Math.PI));
export const strokeProgress = (theta) => (normTheta(theta) % Math.PI) / Math.PI;

// Camshafts turn at half crank speed, clockwise like the crank.
export const camRotationZ = (theta) => -theta / 2;
export const crankRotationZ = (theta) => -theta;

const valveDef = (side, peakDeg) => {
  const { valveTilt, valveOffsetX, deckY, valveStemLength, camGap, camBaseRadius } = GEOM;
  const dir = { x: side * Math.sin(valveTilt), y: Math.cos(valveTilt) };
  const headClosed = { x: side * valveOffsetX, y: deckY };
  const stemTopClosed = {
    x: headClosed.x + dir.x * valveStemLength,
    y: headClosed.y + dir.y * valveStemLength,
  };
  const camCenter = {
    x: stemTopClosed.x + dir.x * (camGap + camBaseRadius),
    y: stemTopClosed.y + dir.y * (camGap + camBaseRadius),
  };
  const peak = peakDeg * DEG;
  // World angle from cam centre toward the valve; lobe local angle points there at peak.
  const towardValve = Math.atan2(-dir.y, -dir.x);
  return {
    side,
    peak,
    width: 170 * DEG,
    dir,
    tiltZ: -side * valveTilt,
    headClosed,
    stemTopClosed,
    camCenter,
    lobeAngle: towardValve + peak / 2,
  };
};

export const VALVES = {
  intake: valveDef(-1, 90),
  exhaust: valveDef(1, 630),
};

const wrapCycle = (d) => {
  let x = ((d + CYCLE / 2) % CYCLE + CYCLE) % CYCLE;
  return x - CYCLE / 2;
};

export const valveLift = (theta, which) => {
  const v = VALVES[which];
  const d = wrapCycle(normTheta(theta) - v.peak);
  if (Math.abs(d) >= v.width / 2) return 0;
  const c = Math.cos((Math.PI * d) / v.width);
  return GEOM.valveMaxLift * c * c;
};

export const isValveOpen = (theta, which) =>
  valveLift(theta, which) > GEOM.valveMaxLift * 0.15;

// Contact offset from the lobe is (theta - peak) / 2, so this matches valveLift for a point follower.
export const camProfileRadius = (a, which) => {
  const v = VALVES[which];
  let delta = (((a - v.lobeAngle) % TAU) + TAU) % TAU;
  if (delta > Math.PI) delta -= TAU;
  const d = delta * 2;
  let lift = 0;
  if (Math.abs(d) < v.width / 2) {
    const c = Math.cos((Math.PI * d) / v.width);
    lift = GEOM.valveMaxLift * c * c;
  }
  return GEOM.camBaseRadius + lift;
};

export const SPARK_ANGLE = TAU - 3 * DEG;

export const sparkIntensity = (theta) => {
  const d = wrapCycle(normTheta(theta) - SPARK_ANGLE) / (4 * DEG);
  return Math.abs(d) > 4 ? 0 : Math.exp(-d * d);
};

const setGas = (out, fill, kind, heat) => {
  out.fill = fill;
  out.kind = kind;
  out.heat = heat;
  return out;
};

// fill 0..1 (visibility), kind 0 mixture / 1 flame / 2 exhaust, heat 0..1; writes into `out` so frame loops don't allocate.
export const gasStateInto = (theta, out) => {
  const t = normTheta(theta);
  const i = strokeIndex(t);
  const p = strokeProgress(t);
  if (t >= SPARK_ANGLE && i === 1) return setGas(out, 1, 1, 1);
  if (i === 0) return setGas(out, 0.25 + 0.5 * p, 0, 0);
  if (i === 1) return setGas(out, 0.75 + 0.2 * p, 0, 0.2 * p);
  if (i === 2) return setGas(out, 1, 1, 1 - 0.65 * p);
  return setGas(out, 0.8 - 0.65 * p, 2, 0.3 * (1 - p));
};

export const gasState = (theta) => gasStateInto(theta, { fill: 0, kind: 0, heat: 0 });

// True when angle (mod 4π) is passed while moving prev -> next (next >= prev, unwrapped).
export const crossed = (prev, next, angle) => {
  const k = Math.ceil((prev - angle) / CYCLE);
  const a = angle + k * CYCLE;
  return a > prev && a <= next;
};

export const rpmToRadPerSec = (rpm) => (rpm / 60) * TAU;

// Gas pipes in the xy-plane (z = 0), from outside toward the port / from port outward.
export const INTAKE_PATH = [
  [-2.15, 2.62, 0],
  [-1.6, 2.55, 0],
  [-1.05, 2.4, 0],
  [-0.62, 2.2, 0],
  [-0.3, 2.02, 0],
];
export const EXHAUST_PATH = [
  [0.3, 2.02, 0],
  [0.65, 2.2, 0],
  [1.1, 2.3, 0],
  [1.6, 2.05, 0],
  [1.95, 1.3, 0],
  [2.05, 0.2, 0],
  [2.05, -0.45, 0],
];
export const INTAKE_PIPE_RADIUS = 0.14;
export const EXHAUST_PIPE_RADIUS = 0.13;

// Assembled engine spans roughly y ∈ [-0.9, 3.5]; shift it so the orbit target is its middle.
export const ENGINE_CENTER_Y = 1.3;
