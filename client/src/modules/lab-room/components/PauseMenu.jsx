import { ArrowLeft, Gauge, Keyboard, LogOut, Play, RotateCcw } from "lucide-react";
import Button from "@/shared/components/ui/button/Button";
import Slider from "@/shared/components/ui/slider/Slider";
import Switch from "@/shared/components/ui/switch/Switch";
import { cn } from "@/shared/utils/cn";
import { CONTROLS, TEXT } from "../data/labRoomContent";
import KeyCap from "./KeyCap";
import QualityPicker from "./QualityPicker";

const MenuButton = ({ icon: Icon, children, primary, className, ...props }) => (
  <Button
    variant={primary ? "default" : "ghost"}
    className={cn(
      "h-11 w-full justify-start gap-3 rounded-lg px-4 text-sm font-semibold",
      primary ? "text-white" : "bg-white/5 text-white hover:bg-white/10 hover:text-white",
      className,
    )}
    {...props}
  >
    <Icon className="size-4" />
    {children}
  </Button>
);

const BackHeader = ({ title, onBack }) => (
  <div className="mb-5 flex items-center gap-2">
    <Button
      variant="ghost"
      size="icon"
      onClick={onBack}
      aria-label={TEXT.back}
      className="size-9 rounded-lg text-white hover:bg-white/10 hover:text-white"
    >
      <ArrowLeft />
    </Button>
    <h2 className="text-lg font-semibold">{title}</h2>
  </div>
);

const SettingRow = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-4 rounded-lg bg-white/5 px-4 py-3 text-sm">
    <span>{label}</span>
    <Switch checked={checked} onChange={onChange} />
  </label>
);

const PauseMenu = ({
  view,
  tier,
  recommended,
  settings,
  notice,
  lockHint,
  onView,
  onResume,
  onReset,
  onExit,
  onQuality,
  onSetting,
}) => (
  <div
    className="dark absolute inset-0 z-30 grid place-items-center bg-[#05070d]/65 p-4 text-white"
    onClick={lockHint ? onResume : undefined}
  >
    <div
      className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1220]/95 p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {view === "main" && (
        <>
          <h2 className="mb-5 text-center text-xl font-bold">{TEXT.pauseTitle}</h2>
          <div className="grid gap-2">
            <MenuButton icon={Play} primary onClick={onResume}>
              {TEXT.resume}
            </MenuButton>
            <MenuButton icon={Keyboard} onClick={() => onView("controls")}>
              {TEXT.controls}
            </MenuButton>
            <MenuButton icon={Gauge} onClick={() => onView("quality")}>
              {TEXT.qualityMenu}
            </MenuButton>
            <MenuButton icon={RotateCcw} onClick={onReset}>
              {TEXT.reset}
            </MenuButton>
            <MenuButton icon={LogOut} onClick={onExit} className="text-red-300 hover:text-red-200">
              {TEXT.exit}
            </MenuButton>
          </div>
          {lockHint && <p className="mt-4 text-center text-sm text-amber-300">{TEXT.lockHint}</p>}
          {!lockHint && notice && <p className="mt-4 text-center text-sm text-emerald-300">{notice}</p>}
        </>
      )}

      {view === "controls" && (
        <>
          <BackHeader title={TEXT.controls} onBack={() => onView("main")} />
          <ul className="grid gap-2.5">
            {CONTROLS.map((control) => (
              <li key={control.label} className="flex items-center justify-between gap-4">
                <span className="flex flex-wrap gap-1.5">
                  {control.keys.map((key) => (
                    <KeyCap key={key}>{key}</KeyCap>
                  ))}
                </span>
                <span className="text-sm text-white/80">{control.label}</span>
              </li>
            ))}
          </ul>
          <Slider
            className="mt-6"
            label={TEXT.sensitivity}
            value={settings.sensitivity}
            min={0.3}
            max={2.5}
            step={0.1}
            display={settings.sensitivity.toFixed(1)}
            unit="×"
            onChange={(value) => onSetting("sensitivity", value)}
          />
          <Slider
            className="mt-4"
            label={TEXT.volume}
            value={settings.sound}
            min={0}
            max={1}
            step={0.05}
            display={settings.sound > 0 ? Math.round(settings.sound * 100) : TEXT.volumeOff}
            unit={settings.sound > 0 ? "%" : ""}
            onChange={(value) => onSetting("sound", value)}
          />
        </>
      )}

      {view === "quality" && (
        <>
          <BackHeader title={TEXT.qualityMenu} onBack={() => onView("main")} />
          <QualityPicker tier={tier} recommended={recommended} onChange={onQuality} />
          <div className="mt-4 grid gap-2">
            <SettingRow
              label={TEXT.showFps}
              checked={settings.showFps}
              onChange={(value) => onSetting("showFps", value)}
            />
            <SettingRow
              label={TEXT.reduceMotion}
              checked={settings.reduceMotion}
              onChange={(value) => onSetting("reduceMotion", value)}
            />
          </div>
        </>
      )}
    </div>
  </div>
);

export default PauseMenu;
