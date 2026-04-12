import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk";
import { create } from "zustand";

type ConnectionMode = "local" | "cloud" | "disconnected";

interface OpenCodeConnection {
  mode: ConnectionMode;
  baseUrl: string;
  connected: boolean;
  client: OpencodeClient | null;
}

interface ConnectionStore {
  connection: OpenCodeConnection;
  connect: (baseUrl: string) => Promise<boolean>;
  disconnect: () => void;
  setMode: (mode: ConnectionMode) => void;
  checkHealth: () => Promise<boolean>;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connection: {
    mode: "disconnected",
    baseUrl: "http://localhost:4096",
    connected: false,
    client: null,
  },

  connect: async (baseUrl: string) => {
    try {
      const client = createOpencodeClient({ baseUrl });
      const result = await client.project.list();
      if (result.data) {
        set({
          connection: {
            mode: "local",
            baseUrl,
            connected: true,
            client,
          },
        });
        return true;
      }
    } catch {
      // connection failed
    }
    set((state) => ({
      connection: { ...state.connection, connected: false, client: null },
    }));
    return false;
  },

  disconnect: () => {
    set({
      connection: {
        mode: "disconnected",
        baseUrl: "http://localhost:4096",
        connected: false,
        client: null,
      },
    });
  },

  setMode: (mode) => {
    set((state) => ({
      connection: { ...state.connection, mode },
    }));
  },

  checkHealth: async () => {
    const { connection } = get();
    if (!connection.client) return false;
    try {
      const result = await connection.client.project.list();
      const healthy = !!result.data;
      set((state) => ({
        connection: { ...state.connection, connected: healthy },
      }));
      return healthy;
    } catch {
      set((state) => ({
        connection: { ...state.connection, connected: false },
      }));
      return false;
    }
  },
}));
