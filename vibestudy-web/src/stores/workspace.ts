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
    versions: [],
    currentVersion: 0,
    chatMessages: [],
    isProcessing: false,

    setLabId: (id) => set({ labId: id }),
    setLabName: (name) => set({ labName: name }),
    setFiles: (files) => set({ files }),
    setActiveFile: (path) => set({ activeFile: path }),
    setVersions: (versions) => set({ versions }),
    setCurrentVersion: (version) => set({ currentVersion: version }),
    addChatMessage: (message) =>
      set((state) => ({
        chatMessages: [...state.chatMessages, message],
      })),
    updateChatMessage: (id, content) =>
      set((state) => ({
        chatMessages: state.chatMessages.map((m) =>
          m.id === id ? { ...m, content, isLoading: false } : m
        ),
      })),
    setProcessing: (processing) => set({ isProcessing: processing }),
  })
);
