// Responsive workspace side panel.
// Desktop (lg+): a normal in-flow column. Mobile: an off-canvas drawer that
// slides over the 3D scene with a tap-to-close backdrop.
import { cn } from "@/shared/utils/cn";

const SidePanel = ({
  side = "left",
  open = false,
  onClose,
  desktopHidden = false,
  widthClass = "lg:w-72",
  className,
  children,
}) => (
  <>
    {/* Mobile backdrop - tap to close */}
    <div
      onClick={onClose}
      aria-hidden
      className={cn(
        "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    />
    <aside
      className={cn(
        "fixed inset-y-0 z-50 flex h-full w-[86%] max-w-xs flex-col bg-card shadow-2xl transition-transform duration-300",
        "lg:static lg:z-10 lg:max-w-none lg:translate-x-0 lg:shadow-none lg:transition-none",
        widthClass,
        side === "left"
          ? ["left-0 border-r border-border", open ? "translate-x-0" : "-translate-x-full"]
          : ["right-0 border-l border-border", open ? "translate-x-0" : "translate-x-full"],
        desktopHidden && "lg:hidden",
        className,
      )}
    >
      {children}
    </aside>
  </>
);

export default SidePanel;
