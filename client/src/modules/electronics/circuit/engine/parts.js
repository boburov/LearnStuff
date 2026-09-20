// Part catalog: geometry + pins (local SVG coords) + defaults for every component.
// This is the single source of truth: SVG bodies and the wiring layer both read pins from here.
// UI labels in Uzbek, pin ids / roles in English (code values).

// Build a horizontal row of pins with even spacing.
const row = (ids, { x0, dx, y, role }) =>
  ids.map((id, i) => ({
    id: typeof id === "object" ? id.id : id,
    label: typeof id === "object" ? id.label : id,
    x: x0 + i * dx,
    y,
    role: (typeof id === "object" && id.role) || role,
    pwm: typeof id === "object" ? !!id.pwm : false,
  }));

// PWM-capable digital pins on the Uno.
const PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);

// Arduino Uno R3 – simplified but pin-accurate for teaching.
const ARDUINO_W = 400;
const ARDUINO_H = 260;
const digital = row(
  [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((n) => ({
    id: `D${n}`,
    label: `${n}`,
    role: "digital",
    pwm: PWM_PINS.has(n),
  })),
  { x0: 150, dx: 20, y: 8, role: "digital" },
);
const power = row(
  [
    { id: "5V", label: "5V", role: "power5v" },
    { id: "3V3", label: "3V3", role: "power3v3" },
    { id: "GND", label: "GND", role: "gnd" },
    { id: "GND2", label: "GND", role: "gnd" },
    { id: "VIN", label: "Vin", role: "power5v" },
  ],
  { x0: 110, dx: 22, y: ARDUINO_H - 8 },
);
const analog = row(
  ["A0", "A1", "A2", "A3", "A4", "A5"].map((id) => ({
    id,
    label: id,
    role: "analog",
  })),
  { x0: 230, dx: 22, y: ARDUINO_H - 8 },
);

export const PARTS = {
  arduino: {
    type: "arduino",
    label: "Arduino Uno",
    category: "board",
    w: ARDUINO_W,
    h: ARDUINO_H,
    pins: [...digital, ...power, ...analog],
    props: {},
  },

  breadboard: {
    type: "breadboard",
    label: "Breadboard",
    category: "board",
    w: 420,
    h: 150,
    // Breadboard columns are electrically joined (each column = 1 net) via a virtual bus.
    pins: (() => {
      const p = [];
      const cols = 24;
      for (let c = 0; c < cols; c++) {
        const x = 24 + c * 16;
        p.push({ id: `T${c}`, x, y: 40, role: "bus", bus: `col${c}` });
        p.push({ id: `B${c}`, x, y: 110, role: "bus", bus: `col${c}` });
      }
      return p;
    })(),
    props: {},
  },

  led: {
    type: "led",
    label: "LED",
    category: "output",
    w: 44,
    h: 70,
    pins: [
      { id: "a", x: 12, y: 66, role: "anode", label: "+" },
      { id: "c", x: 32, y: 66, role: "cathode", label: "-" },
    ],
    props: { color: "#ef4444" },
  },

  rgb: {
    type: "rgb",
    label: "RGB LED",
    category: "output",
    w: 56,
    h: 74,
    pins: [
      { id: "r", x: 10, y: 70, role: "anode", label: "R" },
      { id: "g", x: 24, y: 70, role: "anode", label: "G" },
      { id: "b", x: 38, y: 70, role: "anode", label: "B" },
      { id: "c", x: 52, y: 70, role: "cathode", label: "-" },
    ],
    props: {},
  },

  resistor: {
    type: "resistor",
    label: "Rezistor",
    category: "passive",
    w: 90,
    h: 24,
    // Two-terminal passive: sim treats both pins as one net (pass-through).
    pins: [
      { id: "1", x: 4, y: 12, role: "passive" },
      { id: "2", x: 86, y: 12, role: "passive" },
    ],
    props: { ohms: 220 },
  },

  button: {
    type: "button",
    label: "Tugma",
    category: "input",
    w: 60,
    h: 60,
    pins: [
      { id: "1", x: 6, y: 54, role: "switch" },
      { id: "2", x: 54, y: 54, role: "switch" },
    ],
    props: {},
  },

  potentiometer: {
    type: "potentiometer",
    label: "Potentsiometr",
    category: "input",
    w: 70,
    h: 70,
    pins: [
      { id: "1", x: 12, y: 66, role: "power5v", label: "+" },
      { id: "w", x: 35, y: 66, role: "wiper", label: "S" },
      { id: "3", x: 58, y: 66, role: "gnd", label: "-" },
    ],
    props: { value: 512 },
  },

  photoresistor: {
    type: "photoresistor",
    label: "Fotorezistor",
    category: "input",
    w: 60,
    h: 70,
    pins: [
      { id: "1", x: 14, y: 66, role: "power5v", label: "+" },
      { id: "w", x: 46, y: 66, role: "wiper", label: "S" },
    ],
    props: { light: 700 },
  },

  servo: {
    type: "servo",
    label: "Servo motor",
    category: "motion",
    w: 90,
    h: 70,
    pins: [
      { id: "sig", x: 8, y: 20, role: "signal", label: "S" },
      { id: "vcc", x: 8, y: 35, role: "power5v", label: "+" },
      { id: "gnd", x: 8, y: 50, role: "gnd", label: "-" },
    ],
    props: {},
  },

  motor: {
    type: "motor",
    label: "DC motor",
    category: "motion",
    w: 80,
    h: 80,
    pins: [
      { id: "1", x: 24, y: 76, role: "signal", label: "+" },
      { id: "2", x: 52, y: 76, role: "gnd", label: "-" },
    ],
    props: {},
  },

  buzzer: {
    type: "buzzer",
    label: "Buzzer",
    category: "output",
    w: 64,
    h: 64,
    pins: [
      { id: "sig", x: 22, y: 60, role: "signal", label: "+" },
      { id: "gnd", x: 42, y: 60, role: "gnd", label: "-" },
    ],
    props: {},
  },

  battery: {
    type: "battery",
    label: "Batareya (9V)",
    category: "power",
    w: 70,
    h: 90,
    pins: [
      { id: "pos", x: 22, y: 86, role: "power5v", label: "+" },
      { id: "neg", x: 48, y: 86, role: "gnd", label: "-" },
    ],
    props: {},
  },
};

// Palette groups shown on the left, in order. Labels in Uzbek.
export const PALETTE_GROUPS = [
  { id: "board", label: "Platalar", types: ["arduino", "breadboard"] },
  { id: "output", label: "Chiqish", types: ["led", "rgb", "buzzer"] },
  { id: "input", label: "Kirish", types: ["button", "potentiometer", "photoresistor"] },
  { id: "motion", label: "Harakat", types: ["servo", "motor"] },
  { id: "passive", label: "Passiv / quvvat", types: ["resistor", "battery"] },
];

export const getPart = (type) => PARTS[type] || null;

// Global key for one pin of one placed component instance.
export const pinKey = (compId, pinId) => `${compId}:${pinId}`;
export const parsePinKey = (key) => {
  const i = key.indexOf(":");
  return { compId: key.slice(0, i), pinId: key.slice(i + 1) };
};
