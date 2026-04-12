import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  tryAutoConnect: () => Promise<boolean>;
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
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
              connection: { mode: "local", baseUrl, connected: true, client },
            });
            return true;
          }
        } catch {
          // connection failed
        }
        set((state) => ({
          connection: { ...state.connection, baseUrl, connected: false, client: null },
        }));
        return false;
      },

      disconnect: () => {
        set((state) => ({
          connection: {
            mode: "disconnected",
            baseUrl: state.connection.baseUrl,
            connected: false,
            client: null,
          },
        }));
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

      tryAutoConnect: async () => {
        const { connection, connect } = get();
        // Don't reconnect if already connected
        if (connection.connected && connection.client) return true;
        // Try to reconnect using the saved baseUrl
        if (connection.baseUrl) {
          return connect(connection.baseUrl);
        }
        return false;
      },
    }),
    {
      name: "vibestudy-connection",
      // Only persist baseUrl — client is not serialisable
      partialize: (state) => ({
        connection: {
          mode: state.connection.mode,
          baseUrl: state.connection.baseUrl,
          connected: false,   // always start disconnected
          client: null,
        },
      }),
    }
  )
);
