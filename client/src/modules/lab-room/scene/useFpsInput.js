import { useEffect, useRef } from "react";

// Some systems report a huge jump on the first event after the mouse gets locked.
const MAX_MOUSE_STEP = 250;
// In drag-to-look mode a click that moved less than this is an interaction, not a look.
const CLICK_SLOP = 5;
// In drag-to-look mode a press that stays put this long becomes a held interaction (pouring, stirring).
const HOLD_AFTER_MS = 180;
const SLOT_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 };

// Physical key codes keep WASD working on Cyrillic layouts; modeRef is "pointer" (locked) or "drag".
export const useFpsInput = (modeRef) => {
  const inputRef = useRef({ keys: new Set(), lookX: 0, lookY: 0, events: [], primaryDown: false });

  useEffect(() => {
    const input = inputRef.current;
    let press = null;
    const clear = () => {
      input.keys.clear();
      input.lookX = 0;
      input.lookY = 0;
      input.events.length = 0;
      input.primaryDown = false;
      if (press) clearTimeout(press.timer);
      press = null;
    };
    const onKeyDown = (e) => {
      input.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === "KeyG") input.events.push({ type: "drop" });
      if (e.code in SLOT_KEYS) input.events.push({ type: "slot", slot: SLOT_KEYS[e.code] });
    };
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (document.pointerLockElement) {
        input.events.push({ type: "primary" });
        input.primaryDown = true;
      } else if (modeRef.current === "drag" && e.target instanceof HTMLCanvasElement) {
        press = { x: e.clientX, y: e.clientY, moved: false, held: false };
        press.timer = setTimeout(() => {
          if (!press || press.moved) return;
          press.held = true;
          input.events.push({ type: "primary" });
          input.primaryDown = true;
        }, HOLD_AFTER_MS);
      }
    };
    const onMouseUp = (e) => {
      if (e.button !== 0) return;
      input.primaryDown = false;
      if (!press) return;
      clearTimeout(press.timer);
      const still = Math.hypot(e.clientX - press.x, e.clientY - press.y) < CLICK_SLOP;
      if (!press.held && still && e.target instanceof HTMLCanvasElement) input.events.push({ type: "primary" });
      press = null;
    };
    const onWheel = (e) => {
      if (!document.pointerLockElement && modeRef.current !== "drag") return;
      if (Math.abs(e.deltaY) < 1) return;
      input.events.push({ type: "wheel", direction: Math.sign(e.deltaY) });
    };
    const onKeyUp = (e) => input.keys.delete(e.code);
    const onMouseMove = (e) => {
      if (press && !press.held && Math.hypot(e.clientX - press.x, e.clientY - press.y) >= CLICK_SLOP) press.moved = true;
      const dragging = modeRef.current === "drag" && (e.buttons & 1) === 1 && !press?.held;
      if (!document.pointerLockElement && !dragging) return;
      if (Math.abs(e.movementX) > MAX_MOUSE_STEP || Math.abs(e.movementY) > MAX_MOUSE_STEP) return;
      input.lookX += e.movementX;
      input.lookY += e.movementY;
    };
    const onLockChange = () => {
      if (!document.pointerLockElement && modeRef.current !== "drag") clear();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("blur", clear);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("blur", clear);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, [modeRef]);

  return inputRef;
};
