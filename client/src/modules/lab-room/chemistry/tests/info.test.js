import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES } from "../rules/index.js";
import { REACTION_INFO } from "../reactionInfo.js";
import { WARNING_INFO } from "../warningInfo.js";

const FIELDS = ["title", "type", "observation", "safety", "danger"];
const DANGER = ["past", "o'rta", "yuqori"];

test("every rule has a unique id and a text for its info key", () => {
  const ids = new Set();
  for (const rule of RULES) {
    assert.ok(rule.id, "a rule without an id");
    assert.ok(!ids.has(rule.id), `duplicate rule id: ${rule.id}`);
    ids.add(rule.id);
    assert.equal(typeof rule.step, "function", `${rule.id} has no step`);
    if (!rule.info) continue;
    const info = REACTION_INFO[rule.info];
    assert.ok(info, `${rule.id}: missing reactionInfo entry "${rule.info}"`);
    for (const field of FIELDS) assert.ok(info[field], `${rule.info}: empty ${field}`);
    assert.ok(Array.isArray(info.equation) && info.equation.length, `${rule.info}: no equation`);
    assert.ok(DANGER.includes(info.danger), `${rule.info}: danger "${info.danger}"`);
    assert.ok(info.table === null || Number.isInteger(info.table), `${rule.info}: table`);
  }
});

test("no reaction text is left without a rule", () => {
  const used = new Set(RULES.map((rule) => rule.info).filter(Boolean));
  for (const key of Object.keys(REACTION_INFO)) assert.ok(used.has(key), `unused reactionInfo entry: ${key}`);
});

test("every warning id the rules can emit has a text", () => {
  const ids = [
    "water-into-acid",
    "toxic-outside-hood",
    "sodium-narrow",
    "dangerous-mix",
    "hydrogen-impure",
    "concentrated-acid-heat",
    "hot-glass",
    "open-flame",
  ];
  // Raised by the room itself (doc 16), not by a reaction rule.
  const roomIds = ["fire-alarm", "gas-alarm", "spill", "metal-fire"];
  for (const id of [...ids, ...roomIds]) {
    const entry = WARNING_INFO[id];
    assert.ok(entry, `missing warningInfo entry: ${id}`);
    assert.ok(entry.title && entry.text, `${id}: empty text`);
    assert.ok(DANGER.includes(entry.danger), `${id}: danger "${entry.danger}"`);
  }
  assert.equal(Object.keys(WARNING_INFO).length, ids.length + roomIds.length, "an unused warning text");
});

test("the rules of doc 14 § 3 cover every table number", () => {
  const tables = new Set(Object.values(REACTION_INFO).map((info) => info.table).filter(Boolean));
  const missing = [];
  for (let n = 1; n <= 45; n += 1) if (!tables.has(n)) missing.push(n);
  // 20, 21, 28 and 31 share a rule with 19, 27 and 30; 43 covers both of its halves.
  assert.deepEqual(missing, [20, 21, 28, 31], `uncovered table numbers: ${missing.join(", ")}`);
});
