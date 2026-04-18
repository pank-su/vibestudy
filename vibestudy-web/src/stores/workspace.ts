export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export interface Version {
  id: string;
  number: number;
  type: "ai" | "user";
  agent?: string;
  description: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agent?: string;
  isLoading?: boolean;
}

export interface WorkspaceState {
  labId: string;
  labName: string;
  files: FileNode[];
  activeFile: string | null;
  openTabPaths: string[];
  versions: Version[];
  currentVersion: number;
  chatMessages: ChatMessage[];
  isProcessing: boolean;
}

export interface WorkspaceActions {
  setLabId: (id: string) => void;
  setLabName: (name: string) => void;
  setFiles: (files: FileNode[]) => void;
  setActiveFile: (path: string | null) => void;
  openEditorFile: (path: string) => void;
  closeEditorTab: (path: string) => void;
  resetEditorTabs: () => void;
  setVersions: (versions: Version[]) => void;
  setCurrentVersion: (version: number) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateChatMessage: (id: string, content: string) => void;
  setProcessing: (processing: boolean) => void;
}

import { create } from "zustand";

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>(
  (set) => ({
    labId: "",
    labName: "",
    files: [],
    activeFile: null,
    openTabPaths: [],
    versions: [],
    currentVersion: 0,
    chatMessages: [],
    isProcessing: false,

    setLabId: (id) => set({ labId: id }),
    setLabName: (name) => set({ labName: name }),
    setFiles: (files) => set({ files }),
    setActiveFile: (path) => set({ activeFile: path }),
    openEditorFile: (path) =>
      set((s) => ({
        activeFile: path,
        openTabPaths: s.openTabPaths.includes(path)
          ? s.openTabPaths
          : [...s.openTabPaths, path],
      })),
    closeEditorTab: (path) =>
      set((s) => {
        const i = s.openTabPaths.indexOf(path);
        if (i === -1) return {};
        const tabs = s.openTabPaths.filter((p) => p !== path);
        let nextActive = s.activeFile;
        if (s.activeFile === path) {
          nextActive = tabs[i] ?? tabs[i - 1] ?? null;
        }
        return { openTabPaths: tabs, activeFile: nextActive };
      }),
    resetEditorTabs: () => set({ openTabPaths: [], activeFile: null }),
    setVersions: (versions) => set({ versions }),
    setCurrentVersion: (version) => set({ currentVersion: version }),
    addChatMessage: (message) =>
      set((state) => ({
        chatMessages: [...state.chatMessages, message],
      })),
    updateChatMessage: (id, content) =>
      set((state) => ({
        chatMessages: state.chatMessages.map((m) =>
          m.id === id ? { ...m, content, isLoading: false } : m,
        ),
      })),
    setProcessing: (processing) => set({ isProcessing: processing }),
  }),
);
