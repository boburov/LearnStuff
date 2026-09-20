// Lightweight zero-dependency code editor: textarea + synced line gutter + run/stop.
import { useRef } from "react";
import { Play, Square } from "lucide-react";

const CodeEditor = ({ code, onChange, running, onToggleRun, error }) => {
  const taRef = useRef(null);
  const gutRef = useRef(null);
  const lines = code.split("\n").length;

  const onKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.target;
      const s = el.selectionStart;
      const val = `${code.slice(0, s)}  ${code.slice(el.selectionEnd)}`;
      onChange(val);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = s + 2;
      });
    }
  };

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <span className="text-sm font-medium">Kod (sketch)</span>
        <button
          onClick={onToggleRun}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors ${
            running ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {running ? <Square size={14} /> : <Play size={14} />}
          {running ? "To'xtatish" : "Simulyatsiya"}
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden font-mono text-xs leading-5">
        <div ref={gutRef} className="select-none overflow-hidden bg-secondary py-3 pl-2 pr-2 text-right text-muted-foreground">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={taRef}
          value={code}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={(e) => {
            if (gutRef.current) gutRef.current.scrollTop = e.target.scrollTop;
          }}
          className="flex-1 resize-none bg-background p-3 text-foreground outline-none"
        />
      </div>

      {error ? (
        <div className="border-t border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">{error}</div>
      ) : (
        <div className="border-t border-border p-3 text-[11px] text-muted-foreground">
          Komponentlarni chapdan tortib qo'ying, pinlarni bosib sim ulang, so'ng «Simulyatsiya».
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
