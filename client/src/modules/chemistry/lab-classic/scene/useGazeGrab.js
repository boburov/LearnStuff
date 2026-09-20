// Cardboard/telefon-VR uchun "gaze + bitta qo'l" bilan olish-quyish tizimi.
// Apparat: bu WebXR emas, StereoEffect + giroskop - qo'l tracking yo'q. Yagona
// kirish = markazga qarash (gaze) + tap/tugma. Shu sabab bu yerda ekran markazidan
// nur otib (raycast) qaralayotgan obyektni topamiz, tap YOKI 1.5s qarab turish
// (dwell) shishani "oladi", keyingi tap/dwell probirkaga "quyadi".
//
// Holat mashinasi: idle -> holding(reagent) -> (pour) -> idle.
// Target'lar `registerTarget` orqali ro'yxatga olinadi: shishalar (kind:"bottle")
// va probirka (kind:"tube"). Har biri o'z markaz-pozitsiyasi + radiusini beradi.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const DWELL_MS = 1500; // shu qadar qarab tursa - tapsiz ishga tushadi
const RAY_MAX = 12; // nur uzunligi (dunyo birligida)

// Modul darajasidagi vaqtinchalik vektorlar - har kadrda yangi obyekt yaratmaslik uchun.
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _center = new THREE.Vector3();
const _toCenter = new THREE.Vector3();
const _forward = new THREE.Vector3(0, 0, -1);

// Nurni (kamera markazidan) target sferalariga tekshirib, eng yaqin urilganini
// qaytaradi. Sfera-nur kesishuvi: markazning nurga proyeksiyasi + radius farqi.
const pickTarget = (camera, targets) => {
  _origin.setFromMatrixPosition(camera.matrixWorld);
  _dir.copy(_forward).applyQuaternion(camera.quaternion).normalize();

  let best = null;
  let bestT = RAY_MAX;
  for (const t of targets.values()) {
    if (!t.active) continue;
    _center.copy(t.position);
    _toCenter.copy(_center).sub(_origin);
    const proj = _toCenter.dot(_dir); // nur bo'ylab masofa
    if (proj < 0 || proj > RAY_MAX) continue;
    const perp2 = _toCenter.lengthSq() - proj * proj; // nurdan markazgacha^2
    const r = t.radius;
    if (perp2 <= r * r && proj < bestT) {
      bestT = proj;
      best = t;
    }
  }
  return best;
};

export const useGazeGrab = ({ enabled, onPour }) => {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const xr = useThree((s) => s.gl.xr);

  // Ro'yxatga olingan target'lar: Map<id, {kind, position, radius, active}>.
  const targets = useRef(new Map());
  // Qaralayotgan target (highlight uchun) va ushlab turilgan reagent.
  const [hoverId, setHoverId] = useState(null);
  const [held, setHeld] = useState(null); // {id, reagent} yoki null
  const hoverIdRef = useRef(null);
  const heldRef = useRef(null);
  const dwellStart = useRef(0); // qarab turish boshlangan vaqt (ms)
  const [dwellProgress, setDwellProgress] = useState(0);
  // Tap/select "so'rovi" - hodisa kelganda true, useFrame uni iste'mol qiladi.
  const triggerPending = useRef(false);

  const registerTarget = useCallback((id, data) => {
    // `id`ni target ichiga ham yozamiz - pickTarget qaytargan obyektdan
    // hoverId'ni o'qiymiz (aks holda id faqat Map kaliti bo'lib, hit.id undefined).
    targets.current.set(id, { active: true, id, ...data });
    return () => targets.current.delete(id);
  }, []);

  // Target pozitsiyasi/holatini kadrlar orasida yangilash (masalan ushlangan
  // shisha vaqtincha o'chiriladi - active:false, javondagi joyi nishonga chiqmaydi).
  const updateTarget = useCallback((id, patch) => {
    const t = targets.current.get(id);
    if (t) Object.assign(t, patch);
  }, []);

  // Bitta "trigger" (tap yoki dwell yoki XR select) - grab yoki pour qiladi.
  const fire = useCallback(() => {
    const hovered = hoverIdRef.current
      ? targets.current.get(hoverIdRef.current)
      : null;
    if (!heldRef.current) {
      // Bo'sh qo'l: shishaga qaragan bo'lsa - olamiz.
      if (hovered?.kind === "bottle" && hovered.reagent) {
        const next = { id: hoverIdRef.current, reagent: hovered.reagent };
        heldRef.current = next;
        setHeld(next);
        updateTarget(next.id, { active: false }); // javondagi shisha nishondan chiqadi
      }
      return;
    }
    // Qo'lda shisha bor: probirkaga qaragan bo'lsa - quyamiz.
    if (hovered?.kind === "tube") {
      const poured = heldRef.current;
      // Quyish animatsiyasi VrHand'da; reaksiya mantig'i shu yerda.
      onPour?.(poured.reagent);
      updateTarget(poured.id, { active: true }); // shisha javonga qaytadi
      heldRef.current = null;
      setHeld(null);
    }
    // Aks holda: bo'sh joyga qaragan - hech narsa (shishani tashlab yubormaymiz).
  }, [onPour, updateTarget]);

  // Tap/click (cardboard magnit tugma telefonda tap sifatida keladi) +
  // WebXR "select" (haqiqiy shlem/kontroller) - ikkalasi ham fire()ni chaqiradi.
  useEffect(() => {
    if (!enabled) return;
    const onTap = () => {
      triggerPending.current = true;
    };
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", onTap);
    // WebXR sessiyasidagi kontroller/shlem select hodisasi.
    const session = xr?.getSession?.();
    session?.addEventListener?.("select", onTap);
    return () => {
      canvas.removeEventListener("pointerdown", onTap);
      session?.removeEventListener?.("select", onTap);
    };
  }, [enabled, gl, xr]);

  // Har kadr: nurni yangilaymiz, hover'ni topamiz, dwell taymerini yuritamiz,
  // kutilayotgan trigger'ni bajaramiz. performance.now() - render loop ichida.
  useFrame(() => {
    if (!enabled) {
      if (hoverIdRef.current) {
        hoverIdRef.current = null;
        setHoverId(null);
      }
      return;
    }
    const now = performance.now();
    const hit = pickTarget(camera, targets.current);
    const hitId = hit?.id ?? null;

    if (hitId !== hoverIdRef.current) {
      hoverIdRef.current = hitId;
      setHoverId(hitId);
      dwellStart.current = hitId ? now : 0; // yangi obyektga qarasa dwell qayta boshlanadi
      setDwellProgress(0);
    }

    // Dwell: shu obyektga uzluksiz qarab turish. Faqat "amal qilinadigan" target
    // ustida sanaydi (bo'sh qo'lda shisha, qo'lda shisha bo'lsa probirka).
    const actionable =
      hit &&
      ((!heldRef.current && hit.kind === "bottle") ||
        (heldRef.current && hit.kind === "tube"));
    if (actionable && dwellStart.current) {
      const p = Math.min(1, (now - dwellStart.current) / DWELL_MS);
      setDwellProgress(p);
      if (p >= 1) {
        triggerPending.current = true;
        dwellStart.current = now; // qayta ishga tushmasligi uchun reset
      }
    } else if (dwellProgress !== 0) {
      setDwellProgress(0);
    }

    if (triggerPending.current) {
      triggerPending.current = false;
      dwellStart.current = now;
      setDwellProgress(0);
      fire();
    }
  });

  return useMemo(
    () => ({ hoverId, held, dwellProgress, registerTarget, updateTarget }),
    [hoverId, held, dwellProgress, registerTarget, updateTarget],
  );
};

export default useGazeGrab;
