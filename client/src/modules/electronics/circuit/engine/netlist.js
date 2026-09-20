// Netlist: joins pins into electrical "nets" so the simulator knows what is wired together.
// Union-find over wires + pass-through for two-terminal passives and breadboard columns.
import { getPart, pinKey } from "./parts";

export function buildNetlist(components, wires) {
  const parent = new Map();
  const find = (k) => {
    if (!parent.has(k)) parent.set(k, k);
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r);
    while (parent.get(k) !== r) {
      const n = parent.get(k);
      parent.set(k, r);
      k = n;
    }
    return r;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  // register every pin
  for (const c of components) {
    const part = getPart(c.type);
    if (!part) continue;
    for (const p of part.pins) find(pinKey(c.id, p.id));
  }

  // wires connect endpoints
  for (const w of wires) union(w.a, w.b);

  // pass-through: resistors short both terminals; breadboard columns share a bus
  for (const c of components) {
    const part = getPart(c.type);
    if (!part) continue;
    if (c.type === "resistor") union(pinKey(c.id, "1"), pinKey(c.id, "2"));
    if (c.type === "breadboard") {
      const byBus = {};
      for (const p of part.pins) {
        if (!p.bus) continue;
        (byBus[p.bus] ||= []).push(pinKey(c.id, p.id));
      }
      for (const keys of Object.values(byBus))
        for (let i = 1; i < keys.length; i++) union(keys[0], keys[i]);
    }
  }

  const arduino = components.find((c) => c.type === "arduino") || null;

  // Every pin that carries a given role, grouped by its net root. Used for lookups.
  const netHasRole = (net, roleTest) => {
    for (const c of components) {
      const part = getPart(c.type);
      if (!part) continue;
      for (const p of part.pins) {
        if (find(pinKey(c.id, p.id)) === net && roleTest(c, p)) return true;
      }
    }
    return false;
  };

  return {
    arduino,
    netOf: (key) => find(key),
    // Arduino pin id sharing a net with the given component pin (or null).
    arduinoPinOf(compId, pinId) {
      if (!arduino) return null;
      const net = find(pinKey(compId, pinId));
      const apart = getPart("arduino");
      for (const ap of apart.pins) {
        if (find(pinKey(arduino.id, ap.id)) === net) return ap;
      }
      return null;
    },
    netReachesGnd: (net) =>
      netHasRole(net, (c, p) => p.role === "gnd"),
    netReachesPower: (net) =>
      netHasRole(net, (c, p) => p.role === "power5v" || p.role === "power3v3"),
    // First component of a type that has a pin on this net (+ which pin).
    componentOnNet(net, type) {
      for (const c of components) {
        if (c.type !== type) continue;
        const part = getPart(c.type);
        for (const p of part.pins) {
          if (find(pinKey(c.id, p.id)) === net) return { comp: c, pin: p };
        }
      }
      return null;
    },
  };
}
