// The chest of pickable substances, shown in the workspace left panel. Each
// button pours one unit of that substance into the vessel.
import FormulaText from "@/shared/lab/FormulaText";
import { SUBSTANCE_GROUPS } from "@/modules/chemistry/data/substances";

const SubstanceButton = ({ substance, onPick }) => (
  <button
    type="button"
    onClick={() => onPick(substance)}
    title={substance.name}
    className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-left transition-colors hover:bg-secondary"
  >
    <span
      className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
      style={{ backgroundColor: substance.color }}
    />
    <span className="min-w-0">
      <FormulaText formula={substance.formula} className="block text-xs font-semibold" />
      <span className="block truncate text-[10px] text-muted-foreground">
        {substance.name}
      </span>
    </span>
  </button>
);

const SubstanceChest = ({ onPick, groups = SUBSTANCE_GROUPS }) => (
  <div className="space-y-4">
    {groups.map((group) => (
      <div key={group.key}>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {group.label}
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {group.items.map((s) => (
            <SubstanceButton key={s.id} substance={s} onPick={onPick} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default SubstanceChest;
