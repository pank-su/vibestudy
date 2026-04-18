import { UserIcon, CpuIcon, CloudIcon } from "@hugeicons/core-free-icons";

export type SettingsTabId = "profile" | "local" | "cloud";

export const SETTINGS_TAB_ITEMS: {
  id: SettingsTabId;
  label: string;
  icon: typeof UserIcon;
}[] = [
  { id: "profile", label: "Профиль", icon: UserIcon },
  { id: "local", label: "Локальный", icon: CpuIcon },
  { id: "cloud", label: "Облако", icon: CloudIcon },
];

export function parseSettingsTab(value: unknown): SettingsTabId {
  if (value === "local" || value === "cloud" || value === "profile")
    return value;
  return "profile";
}
