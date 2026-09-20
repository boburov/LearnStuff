// Tiny Arduino-sketch interpreter: transpiles a C-like subset to a JS generator
// and runs it against a `board` API. delay() suspends via `yield` so the UI never blocks.
// This is educational — it covers the common beginner sketch, not the full AVR toolchain.

// delay()/delayMicroseconds() become cooperative yields carrying virtual milliseconds.
function* _delay(ms) {
  yield { type: "delay", ms: Number(ms) || 0 };
}
function* _delayUs(us) {
  yield { type: "delay", ms: (Number(us) || 0) / 1000 };
}

const TYPE = "unsigned|signed|const|static|volatile|int|long|short|byte|char|float|double|bool|boolean|word|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t";

// From `int add(int a, int b)` params -> `a, b` (drop the C types, keep identifiers).
const cleanParams = (params) =>
  params
    .split(",")
    .map((p) => {
      const t = p.trim();
      if (!t) return "";
      const parts = t.replace(/[*&]/g, " ").split(/\s+/).filter(Boolean);
      return parts[parts.length - 1];
    })
    .filter(Boolean)
    .join(", ");

// Transpile the sketch source into a generator-function body string.
function transpile(src) {
  let s = src;

  // 1. strip comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  // 2. preprocessor: #define -> var, drop #include and the rest
  const defines = [];
  s = s.replace(/^[ \t]*#[ \t]*define[ \t]+(\w+)[ \t]+(.+)$/gm, (_, n, v) => {
    defines.push(`var ${n} = ${v.trim()};`);
    return "";
  });
  s = s.replace(/^[ \t]*#.*$/gm, "");

  // 3. Servo objects
  s = s.replace(/\bServo\s+(\w+)\s*;/g, "var $1 = _api.Servo();");

  // 4. drop C casts like (int) / (unsigned long)
  s = s.replace(
    /\(\s*(?:unsigned\s+|signed\s+)?(?:int|long|short|byte|char|float|double|word)\s*\)/g,
    "",
  );

  // 5. function definitions: `retType name(params){` -> `function name(params){`
  const funcs = new Set();
  s = s.replace(
    new RegExp(
      `\\b(?:unsigned\\s+|signed\\s+|const\\s+|static\\s+)*(?:void|${TYPE})\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`,
      "g",
    ),
    (m, name, params) => {
      funcs.add(name);
      return `function ${name}(${cleanParams(params)}) {`;
    },
  );

  // 6. setup/loop become generators so they may use delay()
  const hasSetup = funcs.has("setup");
  const hasLoop = funcs.has("loop");
  s = s.replace(/\bfunction\s+setup\s*\(/, "function* _setup(");
  s = s.replace(/\bfunction\s+loop\s*\(/, "function* _loop(");

  // 6b. C arrays: `int a[] = {1,2}` -> `let a = [1,2]`; `int a[N];` -> zero-filled array
  s = s.replace(
    new RegExp(`\\b(?:${TYPE})(?:\\s+(?:${TYPE}))*\\s+(\\w+)\\s*\\[[^\\]]*\\]\\s*=\\s*\\{([^}]*)\\}`, "g"),
    "let $1 = [$2]",
  );
  s = s.replace(
    new RegExp(`\\b(?:${TYPE})(?:\\s+(?:${TYPE}))*\\s+(\\w+)\\s*\\[(\\d+)\\]\\s*;`, "g"),
    "let $1 = new Array($2).fill(0);",
  );

  // 7. remaining C declarations -> let (handles `int a=0`, `float x`, `int a, b;`)
  s = s.replace(
    new RegExp(
      `\\b(?:${TYPE})(?:\\s+(?:${TYPE}))*\\s+(?=[A-Za-z_]\\w*\\s*[-=;,\\[)])`,
      "g",
    ),
    "let ",
  );

  // 8. delay -> cooperative yield
  s = s.replace(/\bdelayMicroseconds\s*\(/g, "yield* _delayUs(");
  s = s.replace(/\bdelay\s*\(/g, "yield* _delay(");

  const calls = `${hasSetup ? "yield* _setup();\n" : ""}while (true) {\n${
    hasLoop ? "  yield* _loop();\n" : ""
  }  yield { type: 'loopEnd' };\n}`;

  return `return (function*(){\n with (_api) {\n${defines.join("\n")}\n${s}\n${calls}\n }\n})();`;
}

// Build a runnable generator from source. Throws a friendly (Uzbek) error on bad code.
export function createRunner(src, board) {
  // Guard against a pure infinite loop with no delay (would freeze the tab).
  const flat = src.replace(/\s+/g, "");
  if ((/for\(;;\)/.test(flat) || /while\((true|1)\)/.test(flat)) && !/delay\(/.test(flat))
    throw new Error("Cheksiz sikl aniqlandi — ichiga delay() qo'shing.");

  let body;
  try {
    body = transpile(src);
  } catch {
    throw new Error("Kodni o'qib bo'lmadi. Sintaksisni tekshiring.");
  }

  let factory;
  try {
    factory = new Function("_api", "_delay", "_delayUs", body);
  } catch (e) {
    throw new Error(`Kodda sintaktik xato: ${e.message}`);
  }

  try {
    return factory(board, _delay, _delayUs);
  } catch (e) {
    throw new Error(`Ishga tushirishda xato: ${e.message}`);
  }
}
