// Renders an ASCII formula with digit runs as subscripts, e.g. H2O -> H₂O.
import { Fragment } from "react";

const FormulaText = ({ formula, className }) => {
  const parts = String(formula).match(/[A-Za-z]+|\d+|[^A-Za-z\d]+/g) ?? [formula];
  return (
    <span className={className}>
      {parts.map((part, i) =>
        /^\d+$/.test(part) ? <sub key={i}>{part}</sub> : <Fragment key={i}>{part}</Fragment>,
      )}
    </span>
  );
};

export default FormulaText;
