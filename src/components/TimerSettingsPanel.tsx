import { Bell, Check, Play, Volume2, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { birdPresets, pixelPresets, presets } from "../data/presets";
import type { AppState, SoundId, TimerPreset, WorkProfile } from "../types";
import { notificationPermission, requestNotificationPermission } from "../utils/notifications";
import { playSound } from "../utils/sound";

type Props = {
  appState: AppState;
  onClose: () => void;
  setAppState: Dispatch<SetStateAction<AppState>>;
};

const soundOptions: Array<{ id: SoundId; label: string; detail: string }> = [
  { id: "soft", label: "Soft", detail: "sine / lamp" },
  { id: "wood", label: "Wood", detail: "tap / table" },
  { id: "glass", label: "Glass", detail: "small bell" },
  { id: "tape", label: "Tape", detail: "noise / click" },
];

export function TimerSettingsPanel({ appState, onClose, setAppState }: Props) {
  const focusMode = appState.settings.focusMode ?? "bird";
  const activePresets = useMemo(() => {
    const customPresets = Array.isArray(appState.customPresets) ? appState.customPresets : [];
    const custom = customPresets.filter((preset) => preset.mode === focusMode);
    return [...(focusMode === "pixel" ? pixelPresets : birdPresets), ...custom];
  }, [appState.customPresets, focusMode]);
  const [draftMode, setDraftMode] = useState<WorkProfile>(focusMode);
  const [workMinutes, setWorkMinutes] = useState(draftMode === "pixel" ? 45 : 5);
  const [restValue, setRestValue] = useState(draftMode === "pixel" ? 10 : 45);
  const [restUnit, setRestUnit] = useState<"sec" | "min">(draftMode === "pixel" ? "min" : "sec");
  const [permission, setPermission] = useState(() => notificationPermission());

  async function toggleNotifications() {
    if (appState.settings.notificationsEnabled) {
      setAppState((state) => ({ ...state, settings: { ...state.settings, notificationsEnabled: false } }));
      return;
    }
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      setAppState((state) => ({ ...state, settings: { ...state.settings, notificationsEnabled: true } }));
    }
  }

  function setPreset(preset: TimerPreset) {
    setAppState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        activePresetId: preset.id,
        focusMode: preset.mode,
      },
    }));
    playSound(appState.settings.soundId, "click", appState.settings.soundEnabled);
  }

  function saveCustomPreset() {
    const safeWork = Math.max(1, Math.min(180, Math.round(workMinutes)));
    const safeRest = Math.max(5, Math.min(60 * 30, Math.round(restUnit === "min" ? restValue * 60 : restValue)));
    const preset: TimerPreset = {
      id: `custom-${Date.now()}`,
      label: `${safeWork} / ${restUnit === "min" ? Math.round(safeRest / 60) : safeRest}`,
      workSeconds: safeWork * 60,
      restSeconds: safeRest,
      mode: draftMode,
    };
    setAppState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        activePresetId: preset.id,
        focusMode: draftMode,
      },
      customPresets: [...(Array.isArray(state.customPresets) ? state.customPresets : []), preset],
    }));
    playSound(appState.settings.soundId, "phase", appState.settings.soundEnabled);
  }

  function setSound(soundId: SoundId) {
    setAppState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        soundId,
        soundEnabled: true,
      },
    }));
    playSound(soundId, "preview", true);
  }

  function switchDraftMode(mode: WorkProfile) {
    setDraftMode(mode);
    setWorkMinutes(mode === "pixel" ? 45 : 5);
    setRestValue(mode === "pixel" ? 10 : 45);
    setRestUnit(mode === "pixel" ? "min" : "sec");
  }

  return (
    <div className="settings-scrim" role="dialog" aria-modal="true" aria-label="Timer settings">
      <section className="settings-panel">
        <header className="settings-header">
          <button className="icon-button" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
          <div>
            <p className="section-title">Control Panel</p>
            <p className="subtle">Timer / sound / mode</p>
          </div>
          <button className="icon-button confirm" onClick={onClose} aria-label="Done">
            <Check size={20} />
          </button>
        </header>

        <div className="mode-switch" role="group" aria-label="Timer mode">
          {(["bird", "pixel"] as WorkProfile[]).map((mode) => (
            <button
              key={mode}
              className={draftMode === mode ? "active" : ""}
              onClick={() => switchDraftMode(mode)}
            >
              {mode === "bird" ? "Bird View" : "Pixel View"}
            </button>
          ))}
        </div>

        <section className="settings-section">
          <p className="settings-label">Presets</p>
          <div className="preset-grid">
            {activePresets.map((preset) => (
              <button
                key={preset.id}
                className={preset.id === appState.settings.activePresetId ? "preset active" : "preset"}
                onClick={() => setPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <p className="settings-label">Custom interval</p>
          <div className="interval-editor">
            <label>
              <span>Work min</span>
              <input value={workMinutes} min={1} max={180} type="number" onChange={(event) => setWorkMinutes(Number(event.target.value))} />
            </label>
            <label>
              <span>Rest</span>
              <input value={restValue} min={1} type="number" onChange={(event) => setRestValue(Number(event.target.value))} />
            </label>
            <label>
              <span>Unit</span>
              <select value={restUnit} onChange={(event) => setRestUnit(event.target.value as "sec" | "min")}>
                <option value="sec">sec</option>
                <option value="min">min</option>
              </select>
            </label>
          </div>
          <button className="save-combo" onClick={saveCustomPreset}>Save combination</button>
        </section>

        <section className="settings-section">
          <div className="sound-head">
            <p className="settings-label">Sound</p>
            <button
              className={appState.settings.soundEnabled ? "sound-toggle on" : "sound-toggle"}
              onClick={() =>
                setAppState((state) => ({
                  ...state,
                  settings: { ...state.settings, soundEnabled: !state.settings.soundEnabled },
                }))
              }
            >
              <Volume2 size={16} />
              {appState.settings.soundEnabled ? "On" : "Off"}
            </button>
          </div>
          <div className="sound-grid">
            {soundOptions.map((sound) => (
              <button
                key={sound.id}
                className={sound.id === appState.settings.soundId ? "sound-option active" : "sound-option"}
                onClick={() => setSound(sound.id)}
              >
                <span>{sound.label}</span>
                <small>{sound.detail}</small>
                <Play size={14} />
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <div className="sound-head">
            <p className="settings-label">Notifications</p>
            <button
              className={appState.settings.notificationsEnabled ? "sound-toggle on" : "sound-toggle"}
              onClick={() => void toggleNotifications()}
            >
              <Bell size={16} />
              {appState.settings.notificationsEnabled ? "On" : "Off"}
            </button>
          </div>
          <p className="subtle">
            {permission === "denied"
              ? "Blocked in browser settings — allow notifications for this site to use it."
              : permission === "unsupported"
                ? "Not supported in this browser."
                : "Alerts you when a pulse or empty space finishes, even after you switch away."}
          </p>
        </section>
      </section>
    </div>
  );
}
