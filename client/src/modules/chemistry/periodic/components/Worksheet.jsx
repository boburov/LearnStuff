import { Fragment } from "react";
import { FileText, Printer, Calendar, Sparkles, Check } from "lucide-react";
import useObjectState from "@/shared/hooks/useObjectState";
import {
  generateWorksheet,
  REACTION_TYPES,
  DIFFICULTIES,
  TYPE_SHORT,
} from "../utils/reactionTemplates";
import "./worksheet.css";

const COUNTS = [5, 10, 20, 30, 50];

// Render a formula, wrapping digit runs in <sub> (Zperiod formatFormula).
const Formula = ({ text }) => {
  const parts = text.split(/(\d+)/);
  return (
    <span className="formula">
      {parts.map((p, i) => (/^\d+$/.test(p) ? <sub key={i}>{p}</sub> : <Fragment key={i}>{p}</Fragment>))}
    </span>
  );
};

// One coefficient slot: blank line / filled answer / practice input.
const Coef = ({ mode, coef, qIndex, cIndex, userAnswers, onInput }) => {
  const answered = userAnswers[qIndex] !== undefined;
  const isCorrect = answered && userAnswers[qIndex][cIndex] === coef;
  if (mode === "answer") return <span className="coef filled">{coef}</span>;
  if (mode === "practice") {
    return (
      <input
        type="number"
        className={`coef-input ${answered ? (isCorrect ? "correct" : "incorrect") : ""}`}
        value={userAnswers[qIndex]?.[cIndex] ?? ""}
        min="1"
        max="99"
        onChange={(e) => onInput(qIndex, cIndex, e.target.value)}
      />
    );
  }
  return <span className="coef blank">__</span>;
};

const Equation = ({ q, index, mode, userAnswers, onInput }) => {
  let coefIndex = 0;
  const side = (formulas) =>
    formulas.map((f, i) => {
      const ci = coefIndex++;
      return (
        <Fragment key={`${f}-${i}`}>
          {i > 0 && <span className="plus">+</span>}
          <Coef mode={mode} coef={q.coefficients[ci]} qIndex={index} cIndex={ci} userAnswers={userAnswers} onInput={onInput} />
          <Formula text={f} />
        </Fragment>
      );
    });
  return (
    <div className="q-equation">
      {side(q.reactants)}
      <span className="arrow">→</span>
      {side(q.products)}
    </div>
  );
};

const isRowCorrect = (q, ans) =>
  ans && q.coefficients.every((c, i) => ans[i] === c);

// Worksheet generator: build balanced-equation practice sheets (print / practice / answer key).
const Worksheet = () => {
  const s = useObjectState({
    count: 10,
    selectedTypes: ["synthesis", "decomposition"],
    difficulty: "medium",
    worksheet: null,
    mode: "student",
    userAnswers: {},
    date: "",
  });

  const toggleType = (value) => {
    const next = s.selectedTypes.includes(value)
      ? s.selectedTypes.filter((t) => t !== value)
      : [...s.selectedTypes, value];
    s.setField("selectedTypes", next);
  };

  const handleGenerate = () => {
    if (!s.selectedTypes.length) return;
    const worksheet = generateWorksheet({
      count: s.count,
      selectedTypes: s.selectedTypes,
      difficulty: s.difficulty,
    });
    s.setFields({ worksheet, userAnswers: {}, date: "" });
  };

  const handleInput = (qIndex, cIndex, value) => {
    const prev = s.userAnswers[qIndex] ? [...s.userAnswers[qIndex]] : [];
    prev[cIndex] = parseInt(value, 10) || 0;
    s.setField("userAnswers", { ...s.userAnswers, [qIndex]: prev });
  };

  const fillToday = () => {
    const d = new Date();
    s.setField("date", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };

  const ws = s.worksheet;
  const isAnswer = s.mode === "answer";
  const isPractice = s.mode === "practice";
  const title = isAnswer ? "Javoblar kaliti" : isPractice ? "Onlayn mashq" : "Kimyoviy tenglamalarni tenglashtirish";
  const instructions = isPractice
    ? "Koeffitsientlarni kiriting va Tekshirish tugmasini bosing."
    : "Koeffitsientlarni bo'sh joylarga yozib tenglamalarni tenglashtiring.";
  const typesLabel = ws?.types.map((t) => TYPE_SHORT[t] || t).join(", ");
  const diffLabel = DIFFICULTIES.find((d) => d.value === ws?.difficulty)?.label;

  const answeredCount = Object.keys(s.userAnswers).length;
  const correctCount = ws ? ws.questions.filter((q, i) => isRowCorrect(q, s.userAnswers[i])).length : 0;

  return (
    <div className="zperiod-worksheet">
      {/* Controls */}
      <div className="worksheet-controls">
        <div className="controls-header">
          <h2>Ishchi varaq generatori</h2>
          <p>Sinf uchun tenglama tenglashtirish varaqlarini yarating</p>
        </div>

        <div className="control-group">
          <label>Savollar soni</label>
          <div className="button-group">
            {COUNTS.map((c) => (
              <button key={c} className={`option-btn ${s.count === c ? "active" : ""}`} onClick={() => s.setField("count", c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label>Reaksiya turlari</label>
          <div className="checkbox-group">
            {REACTION_TYPES.map((rt) => (
              <label key={rt.value} className="checkbox-option">
                <input type="checkbox" checked={s.selectedTypes.includes(rt.value)} onChange={() => toggleType(rt.value)} />
                <span className="checkbox-text-wrapper">
                  <span>{rt.label}</span>
                  <span className="checkbox-subtitle">{rt.formula}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label>Qiyinlik</label>
          <div className="button-group">
            {DIFFICULTIES.map((d) => (
              <button key={d.value} className={`option-btn ${s.difficulty === d.value ? "active" : ""}`} onClick={() => s.setField("difficulty", d.value)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button className="generate-btn" onClick={handleGenerate} disabled={!s.selectedTypes.length}>
          <Sparkles size={18} /> Varaq yaratish
        </button>
        <p className="trust-text">Savollar haqiqiy, keng o'qitiladigan reaksiyalardan tuziladi.</p>
      </div>

      {/* Preview */}
      <div className="worksheet-preview">
        <div className="preview-header">
          <div className="preview-tabs">
            <button className={`preview-tab ${s.mode === "student" ? "active" : ""}`} onClick={() => s.setField("mode", "student")}>Chop etish</button>
            <button className={`preview-tab ${isPractice ? "active" : ""}`} onClick={() => s.setField("mode", "practice")}>Mashq</button>
            <button className={`preview-tab ${isAnswer ? "active" : ""}`} onClick={() => s.setField("mode", "answer")}>Javoblar</button>
          </div>
          <div className="export-buttons">
            <button className="export-btn" onClick={() => window.print()} disabled={!ws}>
              <Printer size={14} /> Chop etish
            </button>
            <button className="export-btn" onClick={fillToday} disabled={!ws}>
              <Calendar size={14} /> Bugun
            </button>
          </div>
        </div>

        <div className="preview-content">
          {!ws ? (
            <div className="preview-placeholder">
              <FileText size={44} strokeWidth={1.5} />
              <p>Mashq masalalarini yaratish uchun "Varaq yaratish" tugmasini bosing</p>
            </div>
          ) : (
            <div className={`worksheet-paper ${isAnswer ? "answer-key" : ""} ${isPractice ? "practice-mode" : ""}`}>
              <div className="preview-summary-bar">
                <span>{ws.questions.length} savol</span>
                <span style={{ opacity: 0.6 }}>•</span>
                <span>{diffLabel}</span>
                <span style={{ opacity: 0.6 }}>•</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>{typesLabel}</span>
              </div>

              <div className="worksheet-header">
                <div className="header-top">
                  <h1>{title}</h1>
                  <span className="worksheet-id-badge">#{ws.id}</span>
                </div>
                {!isPractice && (
                  <div className="header-fields">
                    <div className="field-group">
                      <span className="field-label">Ism:</span>
                      <span className="field-line" />
                    </div>
                    <div className="field-group">
                      <span className="field-label">Sana:</span>
                      {s.date ? <span className="field-value">{s.date}</span> : <span className="field-line" />}
                    </div>
                    <div className="field-group">
                      <span className="field-label">Ball:</span>
                      <span className="field-line short" />
                      <span className="score-total">/{ws.questions.length}</span>
                    </div>
                  </div>
                )}
                <p className="instructions">{instructions}</p>
              </div>

              <div className="questions-grid">
                {ws.questions.map((q, index) => {
                  const answered = isPractice && s.userAnswers[index] !== undefined;
                  const rowClass = answered ? (isRowCorrect(q, s.userAnswers[index]) ? "correct" : "incorrect") : "";
                  return (
                    <div key={index} className={`question-row ${rowClass}`}>
                      <span className="q-num">{index + 1}.</span>
                      <Equation q={q} index={index} mode={s.mode} userAnswers={s.userAnswers} onInput={handleInput} />
                      {answered && <span className="result-icon">{isRowCorrect(q, s.userAnswers[index]) ? "✓" : "✗"}</span>}
                    </div>
                  );
                })}
              </div>

              {isPractice && (
                <div className="practice-actions">
                  {answeredCount > 0 && (
                    <div className="score-display">
                      <span className={`score-value ${correctCount === ws.questions.length ? "perfect" : ""}`}>
                        {correctCount}/{ws.questions.length}
                      </span>
                    </div>
                  )}
                  <span style={{ fontSize: "0.8rem", opacity: 0.7, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Check size={16} /> Har bir katakni to'ldiring
                  </span>
                </div>
              )}

              <div className="worksheet-footer">
                <span>LearnStuff tomonidan yaratildi</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Worksheet;
