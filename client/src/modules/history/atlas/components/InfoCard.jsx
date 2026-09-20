import { X } from "lucide-react";
import { formatYear } from "../data/atlasYears";

// Davlat bosilganda o'ngda chiqadigan ma'lumot kartasi.
export default function InfoCard({ props, year, onClose }) {
  if (!props) return null;
  const name = props.NAME || "Noma'lum hudud";
  const partOf = props.PARTOF && props.PARTOF !== name ? props.PARTOF : null;
  const subjectTo = props.SUBJECTO && props.SUBJECTO !== name ? props.SUBJECTO : null;

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-10 w-72 rounded-xl border border-white/10 bg-background/95 p-4 shadow-xl backdrop-blur">
      <button
        onClick={onClose}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        aria-label="Yopish"
      >
        <X size={18} />
      </button>

      <p className="text-xs text-muted-foreground">{formatYear(year)} holatiga ko'ra</p>
      <h3 className="mt-0.5 pr-6 text-lg font-bold leading-tight">{name}</h3>

      <dl className="mt-3 space-y-2 text-sm">
        {partOf && (
          <div>
            <dt className="text-muted-foreground">Tarkibida</dt>
            <dd className="font-medium">{partOf}</dd>
          </div>
        )}
        {subjectTo && (
          <div>
            <dt className="text-muted-foreground">Qaramligida</dt>
            <dd className="font-medium">{subjectTo}</dd>
          </div>
        )}
        {props.ABBREVN && props.ABBREVN !== name && (
          <div>
            <dt className="text-muted-foreground">Qisqacha</dt>
            <dd className="font-medium">{props.ABBREVN}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
