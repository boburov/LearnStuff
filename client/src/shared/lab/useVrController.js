// Bluetooth VR remote (SHINECON-style) input for VR box mode.
// These remotes enumerate either as an HID gamepad (Gamepad API) or as a
// Bluetooth keyboard (arrow keys / Enter...). We read BOTH so it works whichever
// mode the remote is in.
//
// Perf: there is NO separate rAF loop here (a second loop + per-frame array
// allocation caused GC-driven judder in stereo VR). Keyboard is event-driven;
// the gamepad is polled once per frame from the R3F render loop via poll(),
// allocating nothing.
import { useCallback, useEffect, useRef, useState } from "react";

// Katta deadzone: arzon stiklarning tinch holatdagi drifti "zilzila" qilib
// aylantirmasligi uchun.
const DEADZONE = 0.28;
const dz = (v) => (Math.abs(v) < DEADZONE ? 0 : v);

// Emulyatsiya qilingan WebXR kontrollerlari (IWER "xr-standard") tinch holatda
// ham nol bo'lmagan/shovqinli o'qlar beradi - ularni haqiqiy remote deb olmaymiz.
const isRealPad = (p) => p && p.mapping !== "xr-standard";

// Standard gamepad face buttons: 0=A, 1=B, 2=X, 3=Y.
const GP_ACTION = { 0: "select", 1: "back", 2: "zoomIn", 3: "zoomOut" };

// Keyboard fallback (remote in keyboard mode). Escape is left out - it already
// exits VR box mode.
const KEY_ACTION = {
  Enter: "select",
  NumpadEnter: "select",
  Space: "select",
  Backspace: "back",
  Equal: "zoomIn",
  NumpadAdd: "zoomIn",
  BracketRight: "zoomIn",
  Minus: "zoomOut",
  NumpadSubtract: "zoomOut",
  BracketLeft: "zoomOut",
};

export default function useVrController({ enabled = true } = {}) {
  const [connected, setConnected] = useState(false);
  const connRef = useRef(false);
  // Biror gamepad ulangan bo'lsagina getGamepads() chaqiramiz - aks holda (faqat
  // gyro VR box) har kadr bekorga so'ramaymiz.
  const padSeen = useRef(false);
  // Live analog state, mutated in place (no re-render, no per-frame allocation).
  const axes = useRef({ x: 0, y: 0 });
  const keys = useRef({ left: false, right: false, up: false, down: false });
  const prevButtons = useRef([]);
  // action -> Set<fn>
  const listeners = useRef(new Map());

  const on = useCallback((action, fn) => {
    const map = listeners.current;
    if (!map.has(action)) map.set(action, new Set());
    map.get(action).add(fn);
    return () => map.get(action)?.delete(fn);
  }, []);

  const fire = useCallback((action) => {
    listeners.current.get(action)?.forEach((fn) => fn());
  }, []);

  // Called once per frame from the consumer's useFrame (single R3F loop).
  const poll = useCallback(() => {
    let pad = null;
    if (padSeen.current && navigator.getGamepads) {
      const list = navigator.getGamepads();
      for (let i = 0; i < list.length; i++) {
        if (isRealPad(list[i])) {
          pad = list[i];
          break;
        }
      }
    }
    if (!!pad !== connRef.current) {
      connRef.current = !!pad;
      setConnected(!!pad);
    }

    let x = 0;
    let y = 0;
    if (pad) {
      // Faqat asosiy stik (axes[0]/[1]). Boshqa o'qlar (trigger/hat) tinch
      // holatda nol bo'lmasligi mumkin, shuning uchun ularni o'qimaymiz.
      x = dz(pad.axes[0] || 0);
      y = dz(pad.axes[1] || 0);
      const prev = prevButtons.current;
      for (let i = 0; i < pad.buttons.length; i++) {
        const pressed = pad.buttons[i].pressed;
        if (pressed && !prev[i]) {
          const a = GP_ACTION[i];
          if (a) fire(a);
        }
        prev[i] = pressed;
      }
    }
    // Keyboard axes override the stick when a key is held.
    const k = keys.current;
    if (k.left) x = -1;
    else if (k.right) x = 1;
    if (k.up) y = -1;
    else if (k.down) y = 1;
    axes.current.x = x;
    axes.current.y = y;
  }, [fire]);

  // Keyboard listeners + connection events (event-driven, no loop).
  useEffect(() => {
    if (!enabled) {
      axes.current.x = 0;
      axes.current.y = 0;
      return;
    }
    // Sahifaga kirishdan oldin ulangan gamepad bo'lsa (event o'tib ketgan) - bir
    // marta tekshiramiz (setState emas, faqat ref).
    if (navigator.getGamepads) {
      const list = navigator.getGamepads();
      for (let i = 0; i < list.length; i++) {
        if (isRealPad(list[i])) {
          padSeen.current = true;
          break;
        }
      }
    }
    const k = keys.current;
    const a = axes.current;
    const isTyping = (t) =>
      t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
    const onKeyDown = (e) => {
      if (isTyping(e.target)) return;
      switch (e.code) {
        case "ArrowLeft": k.left = true; break;
        case "ArrowRight": k.right = true; break;
        case "ArrowUp": k.up = true; break;
        case "ArrowDown": k.down = true; break;
        default: {
          const a = KEY_ACTION[e.code];
          if (a && !e.repeat) fire(a);
        }
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "ArrowLeft") k.left = false;
      else if (e.code === "ArrowRight") k.right = false;
      else if (e.code === "ArrowUp") k.up = false;
      else if (e.code === "ArrowDown") k.down = false;
    };
    // Ulanish/uzilishda faqat padSeen bayrog'ini yangilaymiz; connected holati
    // poll() ichida (haqiqiy pad topilganda) o'rnatiladi.
    const onConn = () => {
      padSeen.current = true;
    };
    const onDisc = () => {
      let any = false;
      if (navigator.getGamepads) {
        const list = navigator.getGamepads();
        for (let i = 0; i < list.length; i++) {
          if (list[i]) {
            any = true;
            break;
          }
        }
      }
      padSeen.current = any;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("gamepadconnected", onConn);
    window.addEventListener("gamepaddisconnected", onDisc);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("gamepadconnected", onConn);
      window.removeEventListener("gamepaddisconnected", onDisc);
      k.left = k.right = k.up = k.down = false;
      a.x = 0;
      a.y = 0;
    };
  }, [enabled, fire]);

  return { axes, connected, on, poll };
}
