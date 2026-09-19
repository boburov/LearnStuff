import { Color, Euler, Group, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from "three";
import { profileTable } from "./profileTable";
import { columnGeometry, crystalGeometry, discGeometry, fluidGeometry, layerGeometry } from "./contentsGeometry";
import { createFluidAbsorbMaterial, createFluidScatterMaterial, createFluidUniforms } from "./liquidShading";
import {
  createColumnMaterial,
  createCrystalMaterial,
  createLayerMaterial,
  createLayerUniforms,
  createPieceUniforms,
  patchPieceMaterial,
} from "./solidShading";
import { bedLook, crystalRoots, pieceAsset, pieceMaterialFor, pieceSpec } from "./pieceAssets";

// Path lengths at which the appearance colours read at their nominal strength.
const TINT_REF = 0.015;
// Clear water's "tint" is mostly interface loss, so it darkens once per ray instead of growing with depth.
const SURFACE_LOSS = 0.083;
const TURBID_REF = 0.005;
const GAS_REF = 0.04;
const COLOR_TAU = 0.3;
const LEVEL_TAU = 0.08;
const MAX_PIECE_SLOTS = 3;
const MAX_PIECES = 6;
const CRYSTAL_FULL = 0.4;
// Sugar darkening from doc 14 № 39.
const CHAR_STOPS = ["#f7f6f2", "#d9b44a", "#6b3e1e", "#111111"].map((hex) => new Color(hex));
const POINT_FLAMES = ["magnesium", "sodium", "hydrogen", "sodium-water"];
const FLASH_COLORS = { magnesium: "#ffffff", sodium: "#ffc400", hydrogen: "#bcd4ff", permanganate: "#d98cff" };
const WHITE = new Color(1, 1, 1);

const matrix = new Matrix4();
const scratchPos = new Vector3();
const scratchScale = new Vector3();
const scratchQuat = new Quaternion();
const scratchEuler = new Euler(0, 0, 0, "YXZ");
const worldQuat = new Quaternion();
const worldUp = new Vector3();
const charColor = new Color();

const ease = (dt, tau) => 1 - Math.exp(-dt / Math.max(tau, 1e-4));
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Smooths a hex colour in linear space; the string is parsed only when it changes.
const colorTrack = (initial) => {
  const target = new Color(initial);
  return { hex: initial, target, current: target.clone() };
};

const trackColor = (track, hex, k) => {
  if (typeof hex === "string" && hex !== track.hex) {
    track.hex = hex;
    track.target.set(hex);
  }
  track.current.lerp(track.target, k);
  return track.current;
};

// Beer–Lambert: `opacity` sets the luminance absorbance at the reference path, the hue sets the per-channel ratio.
const extinction = (out, color, opacity, reference, loss = 0) => {
  const a = Math.min(0.999, Math.max(0, opacity));
  const lum = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  const total = -Math.log(Math.max(0.002, 1 - a * (1 - lum)));
  const bulk = Math.max(0, total - loss);
  const pr = -Math.log(Math.max(0.002, color.r)) + 0.05;
  const pg = -Math.log(Math.max(0.002, color.g)) + 0.05;
  const pb = -Math.log(Math.max(0.002, color.b)) + 0.05;
  const scale = bulk / (0.2126 * pr + 0.7152 * pg + 0.0722 * pb) / reference;
  out.set(pr * scale, pg * scale, pb * scale);
  return Math.min(total, loss);
};

const applyChar = (out, char) => {
  if (char <= 0.001) return;
  const t = clamp(char, 0, 1) * 3;
  const i = Math.min(2, Math.floor(t));
  charColor.copy(CHAR_STOPS[i]).lerp(CHAR_STOPS[i + 1], t - i);
  out.lerp(charColor, clamp(char * 1.6, 0, 1));
};

export const staticVisual = ({ volumeMl = 0, color = "#0d2230", opacity = 0.08 } = {}) => ({
  volumeMl,
  tempC: 22,
  ph: 7,
  liquid: { color, opacity, turbidity: 0, turbidColor: color, viscous: false },
  bed: { ml: 0, color },
  floating: { ml: 0, color },
  pieces: [],
  crystals: 0,
  headspace: { color, opacity: 0 },
  fx: {},
});

const hidden = (mesh) => {
  mesh.visible = false;
  mesh.frustumCulled = false;
  return mesh;
};

export const createLiveContents = ({ innerProfile, mouthY, mouthR, meniscus = 0.0015, quality = "high", seed = 1 }) => {
  const table = profileTable(innerProfile, mouthY);
  const mouthRadius = mouthR ?? table.radiusAtY(mouthY);
  const high = quality !== "low";
  const group = new Group();

  const uniforms = createFluidUniforms(table);
  const fluid = fluidGeometry(innerProfile, mouthY);
  const absorbMaterial = createFluidAbsorbMaterial(uniforms, quality);
  const scatterMaterial = createFluidScatterMaterial(uniforms, quality);
  const absorb = hidden(new Mesh(fluid, absorbMaterial));
  const scatter = hidden(new Mesh(fluid, scatterMaterial));
  absorb.renderOrder = 2;
  scatter.renderOrder = 2.05;

  // Layers share the fluid's absorption and level uniforms so their own tint always matches the liquid.
  const shareFluid = (layer) => Object.assign(layer, { uSigmaT: uniforms.uSigmaT, uUp: uniforms.uUp, uPlane: uniforms.uPlane });
  const bedUniforms = shareFluid(createLayerUniforms());
  const bedMaterial = createLayerMaterial(bedUniforms, "bed", quality);
  const bed = hidden(new Mesh(layerGeometry(innerProfile, mouthY, 0.00025), bedMaterial));

  const floatUniforms = shareFluid(createLayerUniforms());
  const floatMaterial = createLayerMaterial(floatUniforms, "float", quality);
  const floating = hidden(new Mesh(discGeometry(innerProfile, mouthY), floatMaterial));

  const foamUniforms = shareFluid(createLayerUniforms());
  const foamMaterial = createLayerMaterial(foamUniforms, "foam", quality);
  const foam = hidden(new Mesh(layerGeometry(innerProfile, mouthY, 0.0006), foamMaterial));

  const columnUniforms = {
    uRadii: uniforms.uRadii,
    uFloor: uniforms.uFloor,
    uTop: uniforms.uTop,
    uColumnTop: { value: table.floor },
    uMouthR: { value: mouthRadius },
    uSeed: { value: (seed % 17) * 3.3 },
  };
  const columnMaterial = createColumnMaterial(columnUniforms, quality);
  const column = hidden(new Mesh(columnGeometry(innerProfile, mouthY), columnMaterial));

  const crystalUniforms = { uGrowth: { value: 0 } };
  const crystalMaterial = createCrystalMaterial(crystalUniforms);
  const crystals = hidden(new Mesh(crystalGeometry(crystalRoots()), crystalMaterial));

  // Anchors are attached by the component so effects can be its children; the controller only moves them.
  // Contents draw between the fluid's absorption pass (2) and its scattering pass (2.05).
  [bed, floating, foam, column, crystals].forEach((mesh) => { mesh.renderOrder = 2.02; });
  // Tags make each part countable in the dev draw-call probe.
  const tag = (mesh, name) => { mesh.userData.contents = name; };
  tag(absorb, "fluid-absorb");
  tag(scatter, "fluid-scatter");
  tag(bed, "bed");
  tag(floating, "floating");
  tag(foam, "foam");
  tag(column, "column");
  tag(crystals, "crystals");

  const anchors = { vent: new Group(), pool: new Group(), point: new Group() };
  anchors.vent.position.y = mouthY;
  group.add(absorb, scatter, bed, floating, foam, column, crystals);

  const slots = Array.from({ length: MAX_PIECE_SLOTS }, (_, i) => ({
    species: null,
    shape: null,
    color: null,
    mesh: null,
    material: null,
    uniforms: null,
    spec: null,
    anchor: null,
    spin: ((seed * (i + 3)) % 628) / 100,
    y: new Float32Array(MAX_PIECES),
  }));

  const params = {
    bubbles: { level: table.floor, rate: 0, site: "bottom", gas: "H2", size: 1, color: "#0d2230", sources: [] },
    boil: { level: table.floor, rate: 0, site: "bottom", gas: "H2O", size: 3, color: "#0d2230", sources: [] },
    steam: { intensity: 0 },
    smoke: { rate: 0, color: "#e6e6e6", toxic: false },
    pool: { kind: "lamp", intensity: 0 },
    point: { kind: "magnesium", intensity: 0 },
    sparks: { intensity: 0 },
    spatter: { intensity: 0, color: "#0d2230" },
    sodium: { level: table.floor, size: 0, burning: false },
    flash: { color: "#ffffff", strength: 0 },
  };

  const s = {
    first: true,
    volume: 0,
    level: table.floor,
    bedTop: table.floor,
    tint: colorTrack("#0d2230"),
    tintOpacity: 0,
    turbid: colorTrack("#ffffff"),
    turbidity: 0,
    turbidPeak: 0,
    gas: colorTrack("#ffffff"),
    gasOpacity: 0,
    bedColor: colorTrack("#f2f2f2"),
    look: bedLook("#f2f2f2", false),
    lookHex: "#f2f2f2",
    lookWet: false,
    lookName: null,
    floatColor: colorTrack("#e8d23a"),
    glowColor: colorTrack("#ff5a1f"),
    up: new Vector3(0, 1, 0),
    upVelocity: new Vector3(),
    tintDepth: 0,
    boil: 0,
    ripple: 0,
    plume: 0,
    schlieren: 0,
    viscous: 0,
    foam: 0,
    columnGrow: 0,
    char: 0,
    glow: 0,
    steam: 0,
    smoke: 0,
    sparks: 0,
    spatter: 0,
    flame: 0,
    flameKind: "lamp",
    flash: 0,
    growth: 0,
  };

  const updateUp = (dt) => {
    group.getWorldQuaternion(worldQuat);
    worldUp.set(0, 1, 0).applyQuaternion(worldQuat.invert());
    if (s.first) {
      s.up.copy(worldUp);
      return;
    }
    // A damped spring lets the surface lag and settle a little when the vessel is moved.
    s.upVelocity.addScaledVector(worldUp.sub(s.up), 90 * dt).multiplyScalar(Math.exp(-7 * dt));
    s.up.addScaledVector(s.upVelocity, dt).normalize();
  };

  const releaseSlot = (slot) => {
    if (!slot.mesh) return;
    group.remove(slot.mesh);
    slot.material.dispose();
    slot.mesh.dispose();
    slot.mesh = null;
    slot.material = null;
    slot.anchor = null;
    slot.species = null;
  };

  const fillSlot = (slot, piece) => {
    if (slot.species === piece.species && slot.shape === piece.shape && slot.color === piece.color) return;
    releaseSlot(slot);
    const spec = pieceSpec(piece.species, piece.shape);
    slot.uniforms = slot.uniforms ?? Object.assign(createPieceUniforms(), { uSigmaT: uniforms.uSigmaT, uUp: uniforms.uUp, uPlane: uniforms.uPlane });
    slot.material = patchPieceMaterial(pieceMaterialFor(spec, piece.color).clone(), slot.uniforms, quality);
    slot.asset = pieceAsset(spec.shape, seed);
    slot.mesh = new InstancedMesh(slot.asset.geometry, slot.material, MAX_PIECES);
    slot.mesh.frustumCulled = false;
    slot.mesh.renderOrder = 2.02;
    slot.mesh.userData.contents = "pieces";
    slot.mesh.count = 0;
    slot.spec = spec;
    slot.species = piece.species;
    slot.shape = piece.shape;
    slot.color = piece.color;
    group.add(slot.mesh);
  };

  // Pieces rest on the bed (or the vessel floor), rise to the surface while they fizz, and shrink as they dissolve.
  const layoutPieces = (slot, piece, dt, time, withSources) => {
    const spec = slot.spec;
    const count = Math.max(1, Math.min(MAX_PIECES, piece.count || 1));
    const grams = Math.max(1e-5, piece.grams / count);
    const volume = grams / spec.density / 1e6;
    const size = Math.cbrt(volume / spec.unitVolume);
    // A dissolving ribbon mostly gets shorter and thinner; its width barely changes.
    if (spec.stretch) {
      const wear = clamp(size / spec.nominal, 0.15, 1);
      spec.stretch.set(wear ** 0.6, wear ** -0.25, wear ** -0.35);
    }
    const floats = piece.state?.floating ? 1 : 0;
    slot.mesh.count = count;
    for (let i = 0; i < count; i += 1) {
      const angle = (i * 2.39996 + slot.spin) % (Math.PI * 2);
      const spread = count > 1 ? Math.sqrt((i + 0.5) / count) : 0;
      const asset = slot.asset;
      const room = Math.max(0, table.radiusAtY(s.bedTop + size * 0.5) - size * asset.radius * 1.2);
      const r = spread * room;
      // A ribbon longer than the vessel is wide has to lean against the wall.
      const span = table.radiusAtY(Math.max(s.bedTop, table.floor) + size * 0.3) * 1.8;
      const lean = spec.shape === "ribbon" ? Math.acos(clamp(span / Math.max(size * asset.length, 1e-5), 0, 1)) : 0;
      const tipped = !(spec.upright && room < 0.014);
      const half = size * (lean > 0.05 ? asset.lowest * Math.cos(lean) + 0.5 * asset.length * Math.sin(lean) : tipped ? Math.max(asset.lowest, asset.radius) : asset.lowest);
      const restY = Math.max(s.bedTop, table.floorAtRadius(r + size * asset.radius * 0.6)) + half;
      const target = floats ? Math.max(restY, s.level - half * 0.55) : restY;
      slot.y[i] = s.first ? target : slot.y[i] + (target - slot.y[i]) * ease(dt, 0.7);
      const bob = floats ? Math.sin(time * 2.2 + i * 1.7) * half * 0.15 : 0;
      scratchPos.set(Math.sin(angle) * r, slot.y[i] + bob, Math.cos(angle) * r);
      scratchEuler.set(tipped ? spec.tipOver : 0, angle, floats ? lean * 0.3 : lean);
      scratchQuat.setFromEuler(scratchEuler);
      if (spec.stretch) scratchScale.set(size * spec.stretch.x, size * spec.stretch.y, size * spec.stretch.z);
      else scratchScale.setScalar(size);
      matrix.compose(scratchPos, scratchQuat, scratchScale);
      slot.mesh.setMatrixAt(i, matrix);
      if (i === 0) slot.anchor = { x: scratchPos.x, y: scratchPos.y, z: scratchPos.z, size };
      if (withSources) {
        const source = params.bubbles.sources[i] ?? (params.bubbles.sources[i] = [0, 0, 0]);
        source[0] = scratchPos.x;
        source[1] = scratchPos.y + half * 0.3;
        source[2] = scratchPos.z;
      }
    }
    if (withSources) params.bubbles.sources.length = count;
    slot.mesh.instanceMatrix.needsUpdate = true;
  };

  const updatePieces = (visual, dt, time) => {
    const pieces = visual.pieces ?? [];
    const glow = visual.fx?.glow;
    let sourced = false;
    for (let i = 0; i < MAX_PIECE_SLOTS; i += 1) {
      const slot = slots[i];
      const piece = pieces[i];
      if (!piece || piece.grams <= 0) {
        if (slot.mesh) slot.mesh.count = 0;
        slot.anchor = null;
        continue;
      }
      fillSlot(slot, piece);
      layoutPieces(slot, piece, dt, time, !sourced);
      sourced = true;
      const u = slot.uniforms;
      const state = piece.state ?? {};
      u.uCoat.value += ((piece.coat?.amount ?? 0) - u.uCoat.value) * ease(dt, 0.6);
      if (piece.coat?.color) u.uCoatColor.value.set(piece.coat.color);
      const heat = state.burning ? 1 : state.molten ? 0.7 : state.hot ? 0.45 : (piece.glow ?? 0);
      u.uGlow.value += (heat * (state.burning ? 3 : 2.2) - u.uGlow.value) * ease(dt, 0.25);
      u.uGlowColor.value.set(state.burning ? "#fff3d8" : (glow?.color ?? "#ff5a1f"));
      u.uMolten.value += ((state.molten ? 1 : 0) - u.uMolten.value) * ease(dt, 0.5);
      u.uTintDepth.value = s.tintDepth;
      u.uTime.value = time;
    }
    if (!sourced) params.bubbles.sources.length = 0;
  };

  const updateCrystals = (visual, dt) => {
    s.growth += (clamp(Math.sqrt((visual.crystals?.mmol ?? 0) / CRYSTAL_FULL), 0, 1) - s.growth) * ease(dt, 1.6);
    crystals.visible = s.growth > 0.01;
    if (!crystals.visible) return;
    crystalUniforms.uGrowth.value = s.growth;
    const wire = slots.find((slot) => slot.anchor && slot.spec?.shape === "wire");
    const host = wire?.anchor ?? slots.find((slot) => slot.anchor)?.anchor;
    if (host) {
      crystals.position.set(host.x, host.y, host.z);
      crystals.scale.setScalar(host.size);
    } else {
      crystals.position.set(0, s.bedTop, 0);
      crystals.scale.setScalar(Math.min(0.012, table.radiusAtY(s.bedTop) * 0.6));
    }
  };

  const updateFluid = (visual, step, k, _fx) => {
    const tint = trackColor(s.tint, visual.liquid.color, k);
    s.tintOpacity += (visual.liquid.opacity - s.tintOpacity) * k;
    uniforms.uSurfaceLoss.value = extinction(uniforms.uSigmaT.value, tint, s.tintOpacity, TINT_REF, SURFACE_LOSS);

    const liquid = s.volume > 0.01;
    const turbidity = liquid ? visual.liquid.turbidity : 0;
    s.turbidity += (turbidity - s.turbidity) * (s.first ? 1 : ease(step, 0.15));
    s.turbidPeak = Math.max(s.turbidity, s.turbidPeak * Math.exp(-step / 40));
    uniforms.uTurbid.value.copy(trackColor(s.turbid, visual.liquid.turbidColor, k));
    // As a suspension settles the cloud top drops and what is left below packs denser.
    const settled = s.turbidPeak > 0.02 ? clamp(1 - s.turbidity / s.turbidPeak, 0, 1) : 0;
    const cloud = Math.max(0.08, 1 - settled ** 0.8);
    const depth = Math.max(0.0005, s.level - s.bedTop);
    uniforms.uCloudTop.value = s.bedTop + depth * cloud + 0.0002;
    uniforms.uSigmaS.value = -Math.log(1 - Math.min(0.995, s.turbidity)) / TURBID_REF / cloud;

    const gas = trackColor(s.gas, visual.headspace.color, k);
    s.gasOpacity += (visual.headspace.opacity - s.gasOpacity) * k;
    extinction(uniforms.uSigmaG.value, gas, s.gasOpacity, GAS_REF);
    uniforms.uGasColor.value.copy(gas);

    updateUp(step);
    uniforms.uUp.value.copy(s.up);
    uniforms.uPlane.value = s.level * s.up.y;
    uniforms.uLiquid.value = liquid ? 1 : 0;
    uniforms.uSolidFloor.value = s.bedTop;
    // Looking down into a vessel, the liquid path over a submerged solid is longer than its depth.
    s.tintDepth = liquid ? 2 : 0;

    s.viscous += ((visual.liquid.viscous ? 1 : 0) - s.viscous) * k;
    const surfaceRadius = table.radiusAtY(s.level);
    const rise = Math.min(meniscus * (1 + 0.7 * s.viscous), surfaceRadius * 0.3);
    uniforms.uMeniscus.value = Math.max(0.0002, rise);
    uniforms.uMeniscusWidth.value = Math.max(0.0008, rise * (1.66 + 0.6 * s.viscous));
    uniforms.uPlumeSource.value.set(0, s.bedTop, 0);
    uniforms.uWisps.value = s.gasOpacity > 0.02 ? 1 : 0;
    uniforms.uBoil.value = s.boil;
    uniforms.uRipple.value = s.ripple;
    uniforms.uPlume.value = s.plume;
    uniforms.uSchlieren.value = high ? s.schlieren : 0;
    return { liquid, surfaceRadius };
  };

  const updateLayers = (visual, liquid, surfaceRadius, k, time) => {
    const bedMl = visual.bed?.ml ?? 0;
    const thickness = s.bedTop - table.floor;
    bed.visible = bedMl > 0.0004;
    if (bed.visible) {
      if (visual.bed?.color !== s.lookHex || liquid !== s.lookWet || visual.bed?.look !== s.lookName) {
        s.lookHex = visual.bed?.color;
        s.lookWet = liquid;
        s.lookName = visual.bed?.look ?? null;
        s.look = bedLook(s.lookHex, liquid, s.lookName);
      }
      const look = s.look;
      const top = Math.max(s.bedTop, table.floor + 0.00014);
      bedUniforms.uTopY.value = top;
      bedUniforms.uRadius.value = Math.max(0.0008, table.radiusAtY(top) - 0.00025);
      bedUniforms.uMound.value = liquid ? Math.min(0.0006, thickness * 0.25) : Math.min(0.005, thickness * 0.9);
      bedUniforms.uRelief.value = look.relief;
      bedUniforms.uCoverage.value = clamp(thickness / 0.0004, 0.15, 1);
      bedUniforms.uGrain.value = look.grain;
      bedUniforms.uLump.value = look.lump;
      bedUniforms.uRough.value = look.rough;
      bedUniforms.uSparkle.value = look.sparkle;
      bedUniforms.uMetal.value = look.metal;
      bedUniforms.uWet.value = liquid && s.bedTop < s.level ? 1 : 0;
      bedUniforms.uTint.value.copy(trackColor(s.bedColor, visual.bed?.color, k));
      applyChar(bedUniforms.uTint.value, s.char);
      bedUniforms.uGlow.value = s.glow;
      bedUniforms.uGlowColor.value.copy(trackColor(s.glowColor, visual.fx?.glow?.color ?? "#ff5a1f", k));
      bedUniforms.uTintDepth.value = s.tintDepth;
      bedUniforms.uTime.value = time;
    }

    const floatMl = visual.floating?.ml ?? 0;
    floating.visible = liquid && floatMl > 0.0008;
    if (floating.visible) {
      const spread = (floatMl * 1e-6) / Math.max(Math.PI * surfaceRadius * surfaceRadius, 1e-6);
      floatUniforms.uUp.value.copy(s.up);
      floatUniforms.uPlane.value = uniforms.uPlane.value;
      floatUniforms.uRadius.value = Math.max(0.0008, surfaceRadius - 0.0004);
      floatUniforms.uMeniscus.value = uniforms.uMeniscus.value;
      floatUniforms.uMeniscusWidth.value = uniforms.uMeniscusWidth.value;
      floatUniforms.uRelief.value = clamp(spread, 0.00025, 0.003);
      floatUniforms.uCoverage.value = clamp(spread / 0.0004, 0.2, 1);
      floatUniforms.uTint.value.copy(trackColor(s.floatColor, visual.floating?.color, k));
      floatUniforms.uGrain.value = 2400;
      floatUniforms.uLump.value = 0.8;
      floatUniforms.uRough.value = 0.95;
      floatUniforms.uTintDepth.value = 0;
      floatUniforms.uTime.value = time;
    }

    const foamTop = Math.min(mouthY, s.level + s.foam * (mouthY - s.level));
    foam.visible = s.foam > 0.012;
    if (foam.visible) {
      const over = clamp((s.foam - 0.9) / 0.1, 0, 1);
      foamUniforms.uTopY.value = foamTop;
      foamUniforms.uBottomY.value = s.level - 0.0015;
      foamUniforms.uRadius.value = Math.max(0.001, (over > 0 ? mouthRadius * (1 + 0.06 * over) : table.radiusAtY(foamTop)) - 0.0006);
      foamUniforms.uMound.value = mouthRadius * (0.12 + 0.45 * over);
      foamUniforms.uRelief.value = 0.0012;
      foamUniforms.uGrain.value = clamp(0.9 / Math.max(mouthRadius, 0.006), 120, 700);
      foamUniforms.uRough.value = 0.2;
      foamUniforms.uTint.value.copy(s.tint.current).lerp(WHITE, 1 - 0.4 * s.tintOpacity);
      foamUniforms.uTintDepth.value = 0;
      foamUniforms.uTime.value = time;
    }

    const columnTop = table.floor + s.columnGrow * 2 * (mouthY - table.floor);
    column.visible = s.columnGrow > 0.015;
    if (column.visible) columnUniforms.uColumnTop.value = columnTop;

    // Foam and the carbon column are opaque, so the fluid trace has to stop where they start.
    if (column.visible) uniforms.uBlock.value.set(table.floor, Math.min(columnTop, mouthY), 0);
    else if (foam.visible) uniforms.uBlock.value.set(s.level - 0.0015, foamTop, 0);
    else uniforms.uBlock.value.set(1, 0, 0);
    return columnTop;
  };

  const updateEffects = (visual, liquid, columnTop, step, fx) => {
    const ventY = Math.max(mouthY, column.visible ? columnTop : 0);
    anchors.vent.position.y = ventY;
    const surfaceY = liquid ? s.level : Math.max(s.bedTop, table.floor);
    anchors.pool.position.set(0, surfaceY, 0);
    const host = slots.find((slot) => slot.anchor)?.anchor;
    if (s.flameKind === "hydrogen") anchors.point.position.set(0, mouthY, 0);
    else if (host) anchors.point.position.set(host.x, host.y, host.z);
    else anchors.point.position.set(0, surfaceY + 0.002, 0);

    params.bubbles.level = s.level;
    params.bubbles.rate = liquid ? (fx.bubbles?.rate ?? 0) : 0;
    params.bubbles.site = fx.bubbles?.site ?? "bottom";
    params.bubbles.gas = fx.bubbles?.gas ?? "H2";
    params.bubbles.color = visual.liquid.color;
    params.boil.level = s.level;
    params.boil.rate = liquid ? s.boil * 2.5 : 0;
    params.boil.color = visual.liquid.color;

    s.steam += ((fx.steam ?? 0) - s.steam) * ease(step, 0.3);
    params.steam.intensity = s.steam;
    s.smoke += ((fx.smoke?.rate ?? 0) - s.smoke) * ease(step, 0.3);
    params.smoke.rate = s.smoke;
    if (fx.smoke?.color) params.smoke.color = fx.smoke.color;
    params.smoke.toxic = Boolean(fx.smoke?.toxic);

    s.flame += ((fx.flame?.intensity ?? 0) - s.flame) * ease(step, 0.15);
    if (fx.flame?.kind) s.flameKind = fx.flame.kind;
    const point = POINT_FLAMES.includes(s.flameKind);
    params.point.kind = s.flameKind;
    params.point.intensity = point ? s.flame : 0;
    params.pool.kind = s.flameKind;
    params.pool.intensity = point ? 0 : s.flame;

    s.sparks += ((fx.sparks ?? 0) - s.sparks) * ease(step, 0.2);
    params.sparks.intensity = s.sparks;
    s.spatter += ((fx.spatter ?? 0) - s.spatter) * ease(step, 0.2);
    params.spatter.intensity = s.spatter;
    params.spatter.color = visual.liquid.color;
    params.sodium.level = s.level;
    params.sodium.size = fx.sodiumBall?.size ?? 0;
    params.sodium.burning = Boolean(fx.sodiumBall?.burning);
    s.flash = Math.max(fx.flash ?? 0, s.flash * Math.exp(-step / 0.12));
    params.flash.strength = s.flash;
    params.flash.color = FLASH_COLORS[s.flameKind] ?? "#ffffff";
  };

  const update = (visual, dt, time) => {
    const step = Math.min(dt, 0.1);
    const k = s.first ? 1 : ease(step, COLOR_TAU);
    const fx = visual.fx ?? {};

    const bedMl = visual.bed?.ml ?? 0;
    s.bedTop = table.levelForMl(bedMl);
    s.volume = s.first ? visual.volumeMl : s.volume + (visual.volumeMl - s.volume) * ease(step, LEVEL_TAU);
    s.level = Math.min(table.top - 0.0004, table.levelForMl(Math.max(0, s.volume) + bedMl));

    s.boil += ((fx.boiling ?? 0) - s.boil) * ease(step, 0.25);
    s.ripple += (Math.min(1, (fx.bubbles?.rate ?? 0) * 0.8) - s.ripple) * ease(step, 0.3);
    s.plume += ((fx.plume ?? 0) - s.plume) * ease(step, 0.5);
    s.schlieren += ((fx.schlieren ?? 0) - s.schlieren) * ease(step, 0.3);
    s.char += ((fx.char ?? 0) - s.char) * ease(step, 0.5);
    s.glow += ((fx.glow?.amount ?? 0) - s.glow) * ease(step, 0.4);
    s.foam += ((fx.foam ?? 0) - s.foam) * ease(step, 0.3);
    s.columnGrow += ((fx.column ?? 0) - s.columnGrow) * ease(step, 0.6);

    const { liquid, surfaceRadius } = updateFluid(visual, step, k, fx);
    uniforms.uTime.value = time;
    const columnTop = updateLayers(visual, liquid, surfaceRadius, k, time);
    updatePieces(visual, step, time);
    updateCrystals(visual, step);
    updateEffects(visual, liquid, columnTop, step, fx);

    const showFluid = liquid || s.gasOpacity > 0.003;
    absorb.visible = showFluid;
    scatter.visible = showFluid;
    s.first = false;
  };

  const get = {
    bubbles: () => (params.bubbles.rate > 0.0002 ? params.bubbles : null),
    boil: () => (params.boil.rate > 0.02 ? params.boil : null),
    steam: () => (params.steam.intensity > 0.004 ? params.steam : null),
    smoke: () => (params.smoke.rate > 0.004 ? params.smoke : null),
    pool: () => (params.pool.intensity > 0.004 ? params.pool : null),
    point: () => (params.point.intensity > 0.004 ? params.point : null),
    sparks: () => (params.sparks.intensity > 0.004 ? params.sparks : null),
    spatter: () => (params.spatter.intensity > 0.004 ? params.spatter : null),
    sodium: () => (params.sodium.size > 0.01 ? params.sodium : null),
    flash: () => (params.flash.strength > 0.004 ? params.flash : null),
  };

  const dispose = () => {
    [absorbMaterial, scatterMaterial, bedMaterial, floatMaterial, foamMaterial, columnMaterial, crystalMaterial].forEach((m) => m.dispose());
    slots.forEach(releaseSlot);
  };

  return { group, anchors, table, mouthRadius, update, get, dispose };
};
