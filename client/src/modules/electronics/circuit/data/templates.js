// Ready-made circuits: each ships components + wires + a matching sketch so the
// student sees a working example immediately, then can edit or build their own.
// UI text in Uzbek, ids/pins in English.

export const TEMPLATES = [
  {
    id: "blink",
    name: "LED miltillashi",
    description: "13-pindagi LEDni bir soniyada yoqib-o'chiramiz. Eng birinchi loyiha.",
    components: [
      { id: "uno", type: "arduino", x: 40, y: 200, props: {} },
      { id: "r1", type: "resistor", x: 520, y: 120, props: { ohms: 220 } },
      { id: "led1", type: "led", x: 660, y: 160, props: { color: "#ef4444" } },
    ],
    wires: [
      { id: "w1", a: "uno:D13", b: "r1:1", color: "#22c55e" },
      { id: "w2", a: "r1:2", b: "led1:a", color: "#22c55e" },
      { id: "w3", a: "led1:c", b: "uno:GND", color: "#0f172a" },
    ],
    code: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`,
  },

  {
    id: "fade",
    name: "Yorug'likni sozlash (PWM)",
    description: "analogWrite bilan LED ravshanligini 0 dan 255 gacha silliq o'zgartiramiz.",
    components: [
      { id: "uno", type: "arduino", x: 40, y: 200, props: {} },
      { id: "r1", type: "resistor", x: 520, y: 120, props: { ohms: 220 } },
      { id: "led1", type: "led", x: 660, y: 160, props: { color: "#3b82f6" } },
    ],
    wires: [
      { id: "w1", a: "uno:D9", b: "r1:1", color: "#22c55e" },
      { id: "w2", a: "r1:2", b: "led1:a", color: "#22c55e" },
      { id: "w3", a: "led1:c", b: "uno:GND", color: "#0f172a" },
    ],
    code: `int led = 9;

void setup() {
  pinMode(led, OUTPUT);
}

void loop() {
  for (int v = 0; v <= 255; v++) {
    analogWrite(led, v);
    delay(6);
  }
  for (int v = 255; v >= 0; v--) {
    analogWrite(led, v);
    delay(6);
  }
}`,
  },

  {
    id: "button",
    name: "Tugma va LED",
    description: "Tugma bosilganda LED yonadi. INPUT_PULLUP ichki rezistorni yoqadi.",
    components: [
      { id: "uno", type: "arduino", x: 40, y: 200, props: {} },
      { id: "btn", type: "button", x: 520, y: 60, props: {} },
      { id: "r1", type: "resistor", x: 520, y: 150, props: { ohms: 220 } },
      { id: "led1", type: "led", x: 660, y: 190, props: { color: "#eab308" } },
    ],
    wires: [
      { id: "w1", a: "uno:D2", b: "btn:1", color: "#22c55e" },
      { id: "w2", a: "btn:2", b: "uno:GND", color: "#0f172a" },
      { id: "w3", a: "uno:D13", b: "r1:1", color: "#22c55e" },
      { id: "w4", a: "r1:2", b: "led1:a", color: "#22c55e" },
      { id: "w5", a: "led1:c", b: "uno:GND2", color: "#0f172a" },
    ],
    code: `void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(13, OUTPUT);
}

void loop() {
  bool pressed = digitalRead(2) == LOW;
  digitalWrite(13, pressed);
}`,
  },

  {
    id: "rgb",
    name: "RGB LED",
    description: "Uch kanalni aralashtirib rang hosil qilamiz (PWM pinlari).",
    components: [
      { id: "uno", type: "arduino", x: 40, y: 200, props: {} },
      { id: "rgb1", type: "rgb", x: 620, y: 150, props: {} },
    ],
    wires: [
      { id: "w1", a: "uno:D9", b: "rgb1:r", color: "#ef4444" },
      { id: "w2", a: "uno:D10", b: "rgb1:g", color: "#22c55e" },
      { id: "w3", a: "uno:D11", b: "rgb1:b", color: "#3b82f6" },
      { id: "w4", a: "rgb1:c", b: "uno:GND", color: "#0f172a" },
    ],
    code: `int R = 9, G = 10, B = 11;

void setup() {
  pinMode(R, OUTPUT);
  pinMode(G, OUTPUT);
  pinMode(B, OUTPUT);
}

void loop() {
  analogWrite(R, 255); analogWrite(G, 0);   analogWrite(B, 0);
  delay(500);
  analogWrite(R, 0);   analogWrite(G, 255); analogWrite(B, 0);
  delay(500);
  analogWrite(R, 0);   analogWrite(G, 0);   analogWrite(B, 255);
  delay(500);
}`,
  },

  {
    id: "servo",
    name: "Servo motor",
    description: "Servo burchagini 0° dan 180° gacha aylantiramiz.",
    components: [
      { id: "uno", type: "arduino", x: 40, y: 200, props: {} },
      { id: "servo1", type: "servo", x: 600, y: 150, props: {} },
    ],
    wires: [
      { id: "w1", a: "uno:D9", b: "servo1:sig", color: "#eab308" },
      { id: "w2", a: "uno:5V", b: "servo1:vcc", color: "#ef4444" },
      { id: "w3", a: "uno:GND", b: "servo1:gnd", color: "#0f172a" },
    ],
    code: `#include <Servo.h>
Servo s;

void setup() {
  s.attach(9);
}

void loop() {
  for (int a = 0; a <= 180; a++) {
    s.write(a);
    delay(12);
  }
  for (int a = 180; a >= 0; a--) {
    s.write(a);
    delay(12);
  }
}`,
  },

  {
    id: "buzzer",
    name: "Buzzer (ovoz)",
    description: "tone() bilan turli chastotalarda ovoz chiqaramiz.",
    components: [
      { id: "uno", type: "arduino", x: 40, y: 200, props: {} },
      { id: "bz", type: "buzzer", x: 620, y: 160, props: {} },
    ],
    wires: [
      { id: "w1", a: "uno:D8", b: "bz:sig", color: "#22c55e" },
      { id: "w2", a: "bz:gnd", b: "uno:GND", color: "#0f172a" },
    ],
    code: `int notes[] = { 262, 330, 392, 523 };

void setup() {}

void loop() {
  for (int i = 0; i < 4; i++) {
    tone(8, notes[i]);
    delay(300);
  }
  noTone(8);
  delay(500);
}`,
  },
];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
