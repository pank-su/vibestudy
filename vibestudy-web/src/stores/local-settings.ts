/**
 * Local mode settings:
 *  - labsDirectory: where new labs are created on disk
 *  - modelMode: "simple" (light/heavy) or "advanced" (per-agent)
 *  - lightModel / heavyModel: used in simple mode
 *  - agentModels: per-agent overrides, used in advanced mode
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ModelMode = "simple" | "advanced";

export interface LocalSettingsState {
  labsDirectory: string;
  modelMode: ModelMode;
  /** Simple mode — lightweight model (verificator, writer, qa, study-material) */
  lightModel: string;
  /** Simple mode — heavyweight model (report, coder, math) */
  heavyModel: string;
  /** Advanced mode — agent name → "providerID/modelID" */
  agentModels: Record<string, string>;
}

export interface LocalSettingsActions {
  setLabsDirectory: (dir: string) => void;
  setModelMode: (mode: ModelMode) => void;
  setLightModel: (model: string) => void;
  setHeavyModel: (model: string) => void;
  setAgentModel: (agent: string, model: string) => void;
  clearAgentModel: (agent: string) => void;
}

// Agents that are "light" by default in the template
export const LIGHT_AGENTS = ["verificator", "writer", "qa", "study-material"];
// Agents that are "heavy" by default
export const HEAVY_AGENTS = ["report", "coder", "math"];
// All template agents in display order
export const TEMPLATE_AGENTS = [
  {
    name: "report",
    label: "Report",
    desc: "Оркестратор: управляет всем процессом",
    weight: "heavy",
  },
  { name: "coder", label: "Coder", desc: "Пишет код решения", weight: "heavy" },
  {
    name: "math",
    label: "Math",
    desc: "Математические задачи через Jupyter",
    weight: "heavy",
  },
  {
    name: "verificator",
    label: "Verificator",
    desc: "Проверяет методичку, задаёт вопросы",
    weight: "light",
  },
  { name: "qa", label: "QA", desc: "Тестирует код", weight: "light" },
  {
    name: "writer",
    label: "Writer",
    desc: "Пишет отчёт в Typst",
    weight: "light",
  },
  {
    name: "study-material",
    label: "Study Material",
    desc: "Генерирует учебные материалы",
    weight: "light",
  },
] as const;

export const useLocalSettingsStore = create<
  LocalSettingsState & LocalSettingsActions
>()(
  persist(
    (set) => ({
      labsDirectory: "~/vibestudy",
      modelMode: "simple",
      lightModel: "",
      heavyModel: "",
      agentModels: {},

      setLabsDirectory: (dir) => set({ labsDirectory: dir }),
      setModelMode: (mode) => set({ modelMode: mode }),
      setLightModel: (model) => set({ lightModel: model }),
      setHeavyModel: (model) => set({ heavyModel: model }),
      setAgentModel: (agent, model) =>
        set((s) => ({ agentModels: { ...s.agentModels, [agent]: model } })),
      clearAgentModel: (agent) =>
        set((s) => {
          const next = { ...s.agentModels };
          delete next[agent];
          return { agentModels: next };
        }),
    }),
    { name: "vibestudy-local-settings" },
  ),
);
