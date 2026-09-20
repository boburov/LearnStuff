/* eslint-disable */
// Minimal i18n shim for the vendored Zperiod chemistry tools.
// Backed by the (Uzbek-translated) UI dictionary; resolves dotted keys like Zperiod's t().
import { enUI } from "./locales/ui/en.js";

export function t(key, fallback, _targetLang) {
  const parts = String(key).split(".");
  let val = enUI;
  for (const p of parts) {
    if (val == null) break;
    val = val[p];
  }
  if (val != null) return val;
  return fallback !== undefined ? fallback : key;
}

export function getLang() {
  return "en";
}

export function onLangChange() {}
export function setLang() {}
export const elementLocales = {};
export const ionLocales = {};
