import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Lab {
  id: string;
  name: string;
  importType: "pdf" | "folder" | "github" | "template";
  status: "in_progress" | "completed";
  updatedAt: Date;
  /** OpenCode session ID (set after session is created) */
  sessionId?: string;
  /** Working directory for this lab */
  directory?: string;
}

interface LabsStore {
  labs: Lab[];
  addLab: (lab: Omit<Lab, "updatedAt">) => void;
  updateLab: (
    id: string,
    updates: Partial<Omit<Lab, "id" | "updatedAt">>,
  ) => void;
  removeLab: (id: string) => void;
}

export const useLabsStore = create<LabsStore>()(
  persist(
    (set) => ({
      labs: [],

      addLab: (lab) =>
        set((state) => ({
          labs: [{ ...lab, updatedAt: new Date() }, ...state.labs],
        })),

      updateLab: (id, updates) =>
        set((state) => ({
          labs: state.labs.map((l) =>
            l.id === id ? { ...l, ...updates, updatedAt: new Date() } : l,
          ),
        })),

      removeLab: (id) =>
        set((state) => ({
          labs: state.labs.filter((l) => l.id !== id),
        })),
    }),
    {
      name: "vibestudy-labs",
      // Date objects need special handling when persisted
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.labs = state.labs.map((l) => ({
            ...l,
            updatedAt: new Date(l.updatedAt),
          }));
        }
      },
    },
  ),
);
