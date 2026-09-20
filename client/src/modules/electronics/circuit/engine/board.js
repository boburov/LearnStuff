// The virtual Arduino board: the API the sketch calls, plus a snapshot of every
// output component's visual state derived from current pin values + the netlist.
import { getPart, pinKey } from "./parts";

const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v));
const numPin = (n) => (n >= 14 && n <= 19 ? `A${n - 14}` : `D${n}`);
const normPin = (p) => {
  if (typeof p === "string") {
    const s = p.toUpperCase();
    if (/^A\d$/.test(s)) return s;
    const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
    return Number.isNaN(n) ? s : numPin(n);
  }
  return numPin(Number(p));
};

export function createBoard(netlist, store) {
  const pinState = {}; // pinId -> { mode, digital, pwm, isPwm, tone }
  const servoByPin = {}; // arduino pin id -> angle (0..180)
  let virtualMs = 0;

  const st = (pid) => (pinState[pid] ||= { mode: 0, digital: 0, pwm: 0, isPwm: false, tone: 0 });
  const arduinoId = netlist.arduino?.id;

  // Constant / driven value of an arduino pin, for output components to read.
  const pinInfo = (pinId) => {
    const apart = getPart("arduino");
    const ap = apart.pins.find((p) => p.id === pinId);
    if (ap?.role === "power5v" || ap?.role === "power3v3") return { v: 255, digital: 1, pwm: false, tone: 0 };
    if (ap?.role === "gnd") return { v: 0, digital: 0, pwm: false, tone: 0 };
    const s = pinState[pinId];
    if (!s) return { v: 0, digital: 0, pwm: false, tone: 0 };
    if (s.tone) return { v: s.digital ? 255 : 0, digital: s.digital ? 1 : 0, pwm: false, tone: s.tone };
    if (s.isPwm) return { v: s.pwm, digital: s.pwm > 0 ? 1 : 0, pwm: true, tone: 0 };
    return { v: s.digital ? 255 : 0, digital: s.digital ? 1 : 0, pwm: false, tone: 0 };
  };

  const netReachesGnd = (compId, pinId) =>
    netlist.netReachesGnd(netlist.netOf(pinKey(compId, pinId)));

  const api = {
    // constants
    HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2,
    LED_BUILTIN: 13, PI: Math.PI, TWO_PI: Math.PI * 2, DEG_TO_RAD: Math.PI / 180,
    A0: "A0", A1: "A1", A2: "A2", A3: "A3", A4: "A4", A5: "A5",

    pinMode: (p, m) => {
      st(normPin(p)).mode = m;
    },
    digitalWrite: (p, v) => {
      const s = st(normPin(p));
      s.digital = v ? 1 : 0;
      s.isPwm = false;
    },
    analogWrite: (p, v) => {
      const s = st(normPin(p));
      s.pwm = clamp(0, 255, Math.round(Number(v) || 0));
      s.isPwm = true;
      s.digital = s.pwm > 0 ? 1 : 0;
    },
    digitalRead: (p) => {
      if (!arduinoId) return 0;
      const net = netlist.netOf(pinKey(arduinoId, normPin(p)));
      const btn = netlist.componentOnNet(net, "button");
      if (btn) {
        const other = btn.pin.id === "1" ? "2" : "1";
        const otherNet = netlist.netOf(pinKey(btn.comp.id, other));
        const pressed = !!store.getInput(btn.comp.id)?.pressed;
        if (netlist.netReachesGnd(otherNet)) return pressed ? 0 : 1;
        if (netlist.netReachesPower(otherNet)) return pressed ? 1 : 0;
        return pressed ? 1 : 0;
      }
      return netlist.netReachesPower(net) ? 1 : 0;
    },
    analogRead: (p) => {
      if (!arduinoId) return 0;
      const net = netlist.netOf(pinKey(arduinoId, normPin(p)));
      const pot = netlist.componentOnNet(net, "potentiometer");
      if (pot) return clamp(0, 1023, store.getInput(pot.comp.id)?.value ?? 512);
      const ph = netlist.componentOnNet(net, "photoresistor");
      if (ph) return clamp(0, 1023, store.getInput(ph.comp.id)?.light ?? 700);
      return 0;
    },
    tone: (p, f) => {
      st(normPin(p)).tone = Number(f) || 0;
    },
    noTone: (p) => {
      st(normPin(p)).tone = 0;
    },
    millis: () => Math.floor(virtualMs),
    micros: () => Math.floor(virtualMs * 1000),
    map: (x, il, ih, ol, oh) => Math.round(((x - il) * (oh - ol)) / (ih - il) + ol),
    constrain: (x, lo, hi) => clamp(lo, hi, x),
    min: Math.min, max: Math.max, abs: Math.abs, sqrt: Math.sqrt, pow: Math.pow,
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    random: (a, b) => {
      // Arduino random(): [0,a) or [a,b). Deterministic-ish via virtual clock, no Math.random needed here.
      const lo = b === undefined ? 0 : a;
      const hi = b === undefined ? a : b;
      const seed = (Math.floor(virtualMs) * 2654435761) % (hi - lo || 1);
      return lo + Math.abs(seed);
    },
    randomSeed: () => {},
    Serial: {
      begin: () => {}, print: () => {}, println: () => {}, write: () => {},
      available: () => 0, read: () => -1, end: () => {}, flush: () => {},
    },
    Servo() {
      const self = {
        _pin: null,
        angle: 0,
        attach(pin) {
          self._pin = normPin(pin);
          return 1;
        },
        detach() {
          self._pin = null;
        },
        write(a) {
          self.angle = clamp(0, 180, Math.round(Number(a) || 0));
          if (self._pin) servoByPin[self._pin] = self.angle;
        },
        writeMicroseconds(us) {
          self.write(Math.round(((us - 1000) / 1000) * 180));
        },
        read() {
          return self.angle;
        },
      };
      return self;
    },
  };

  // Read every output component's visual state for this frame.
  const readVisuals = (components) => {
    const out = {};
    for (const c of components) {
      const P = c.props || {};
      if (c.type === "led") {
        const ap = netlist.arduinoPinOf(c.id, "a");
        const info = ap ? pinInfo(ap.id) : { v: netReachesPowerPin(c, "a") ? 255 : 0, pwm: false };
        const gnd = netReachesGnd(c.id, "c");
        const brightness = gnd ? info.v / 255 : 0;
        out[c.id] = { on: brightness > 0.02, brightness, color: P.color || "#ef4444" };
      } else if (c.type === "rgb") {
        const gnd = netReachesGnd(c.id, "c");
        const ch = (pid) => {
          const ap = netlist.arduinoPinOf(c.id, pid);
          return ap && gnd ? pinInfo(ap.id).v : 0;
        };
        out[c.id] = { r: ch("r"), g: ch("g"), b: ch("b") };
      } else if (c.type === "buzzer") {
        const ap = netlist.arduinoPinOf(c.id, "sig");
        const info = ap ? pinInfo(ap.id) : { digital: 0, tone: 0 };
        const gnd = netReachesGnd(c.id, "gnd");
        const freq = info.tone || (info.digital ? 440 : 0);
        out[c.id] = { playing: gnd && freq > 0, freq };
      } else if (c.type === "servo") {
        const ap = netlist.arduinoPinOf(c.id, "sig");
        let angle = 0;
        if (ap) {
          if (servoByPin[ap.id] != null) angle = servoByPin[ap.id];
          else {
            const info = pinInfo(ap.id);
            if (info.pwm) angle = Math.round((info.v / 255) * 180);
          }
        }
        out[c.id] = { angle };
      } else if (c.type === "motor") {
        const ap = netlist.arduinoPinOf(c.id, "1");
        const info = ap ? pinInfo(ap.id) : { v: 0 };
        const gnd = netReachesGnd(c.id, "2");
        out[c.id] = { speed: gnd ? info.v / 255 : 0 };
      }
    }
    return out;
  };

  // Helper: does a component pin's net reach a 5V/power source?
  function netReachesPowerPin(c, pinId) {
    return netlist.netReachesPower(netlist.netOf(pinKey(c.id, pinId)));
  }

  return {
    api,
    readVisuals,
    setTime: (ms) => {
      virtualMs = ms;
    },
    getTime: () => virtualMs,
    pinState,
  };
}
