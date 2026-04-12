/**
 * Thin wrapper around @opencode-ai/sdk + TanStack Query hooks
 * for the VibeStudy local mode.
 */
import type { OpencodeClient } from "@opencode-ai/sdk";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/stores/connection";

export type { OpencodeClient };
export { useQueryClient };

// These match the SDK's types.gen shapes used in the app
export interface TextPart {
  type: "text";
  text: string;
  messageID: string;
}
export interface ToolPart {
  type: "tool";
  tool: string;
  messageID: string;
  state: unknown;
}
export type Part = TextPart | ToolPart | Record<string, unknown>;

export interface SDKMessage {
  id: string;
  role: "user" | "assistant";
  parts: Part[];
  metadata?: Record<string, unknown>;
}

export interface SDKSession {
  id: string;
  title?: string;
  created?: number;
  updated?: number;
}

// ── helpers ────────────────────────────────────────────────────────────────

function getClient(): OpencodeClient | null {
  return useConnectionStore.getState().connection.client;
}

// ── query keys ────────────────────────────────────────────────────────────

export const qk = {
  sessions:    ()                    => ["sessions"]              as const,
  session:     (id: string)          => ["session", id]           as const,
  messages:    (sessionId: string)   => ["messages", sessionId]   as const,
  files:       (dir: string, p: string) => ["files", dir, p]     as const,
  fileContent: (dir: string, p: string) => ["file", dir, p]      as const,
};

// ── sessions ───────────────────────────────────────────────────────────────

export function useSessions() {
  const client = useConnectionStore((s) => s.connection.client);
  return useQuery({
    queryKey: qk.sessions(),
    enabled: !!client,
    queryFn: async () => {
      const res = await client!.session.list();
      return (res.data ?? []) as SDKSession[];
    },
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      directory,
    }: {
      title?: string;
      directory: string;
    }) => {
      const client = getClient();
      if (!client) throw new Error("OpenCode not connected");
      const res = await client.session.create({
        body: { title },
        query: { directory },
      });
      if (!res.data) throw new Error("Failed to create session");
      return res.data as SDKSession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sessions() }),
  });
}

// ── messages ───────────────────────────────────────────────────────────────

export function useMessages(sessionId: string) {
  const client = useConnectionStore((s) => s.connection.client);
  return useQuery({
    queryKey: qk.messages(sessionId),
    enabled: !!client && !!sessionId,
    queryFn: async () => {
      const res = await client!.session.messages({
        path: { id: sessionId },
      });
      return (res.data ?? []) as unknown as SDKMessage[];
    },
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      text,
      fileUrl,
      fileMime,
      system,
    }: {
      sessionId: string;
      text: string;
      fileUrl?: string;
      fileMime?: string;
      system?: string;
    }) => {
      const client = getClient();
      if (!client) throw new Error("OpenCode not connected");

      type PartInput = { type: "text"; text: string } | { type: "file"; url: string; mime: string };
      const parts: PartInput[] = [{ type: "text", text }];
      if (fileUrl && fileMime) {
        parts.push({ type: "file", url: fileUrl, mime: fileMime });
      }

      // promptAsync returns 204 void — fire and forget
      await client.session.promptAsync({
        path: { id: sessionId },
        body: { parts, system },
      });
    },
  });
}

export function useAbortSession() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const client = getClient();
      if (!client) throw new Error("OpenCode not connected");
      await client.session.abort({ path: { id: sessionId } });
    },
  });
}

// ── files ──────────────────────────────────────────────────────────────────

export function useFileList(directory: string, path: string = ".") {
  const client = useConnectionStore((s) => s.connection.client);
  return useQuery({
    queryKey: qk.files(directory, path),
    enabled: !!client && !!directory,
    queryFn: async () => {
      const res = await client!.file.list({ query: { directory, path } });
      return (res.data ?? []) as Array<{
        name: string;
        path: string;
        absolute: string;
        type: "file" | "directory";
        ignored: boolean;
      }>;
    },
  });
}

export function useFileContent(directory: string, path: string) {
  const client = useConnectionStore((s) => s.connection.client);
  return useQuery({
    queryKey: qk.fileContent(directory, path),
    enabled: !!client && !!directory && !!path,
    queryFn: async () => {
      const res = await client!.file.read({ query: { directory, path } });
      return res.data as string | undefined;
    },
  });
}

// ── SSE events ─────────────────────────────────────────────────────────────

/**
 * Subscribe to OpenCode SSE event stream.
 * Returns an async cleanup function.
 *
 * The SDK's `event.subscribe()` returns `Promise<{ stream: AsyncGenerator<Event> }>`.
 * We iterate the stream in a background task and call `onEvent` per event.
 * To stop, call the returned cleanup.
 */
export async function subscribeEvents(
  client: OpencodeClient,
  onEvent: (event: Record<string, unknown>) => void,
  onError?: (err: unknown) => void
): Promise<() => void> {
  let cancelled = false;

  try {
    const result = await client.event.subscribe();
    // result: { stream: AsyncGenerator }
    const stream = (result as unknown as { stream: AsyncGenerator<Record<string, unknown>> }).stream;
    if (!stream) return () => {};

    (async () => {
      try {
        for await (const event of stream) {
          if (cancelled) break;
          onEvent(event);
        }
      } catch (err) {
        if (!cancelled) onError?.(err);
      }
    })();

    return () => {
      cancelled = true;
      // best-effort: try to return the generator
      stream.return?.(undefined);
    };
  } catch (err) {
    onError?.(err);
    return () => {};
  }
}

// ── providers & agents ─────────────────────────────────────────────────────

export interface SDKProvider {
  id: string;
  name: string;
  models: Record<string, { id: string; name: string; [key: string]: unknown }>;
}

export interface SDKAgent {
  name: string;
  description?: string;
  mode: "subagent" | "primary" | "all";
  builtIn: boolean;
  model?: { modelID: string; providerID: string };
}

export function useProviders() {
  const client = useConnectionStore((s) => s.connection.client);
  return useQuery({
    queryKey: ["providers"] as const,
    enabled: !!client,
    queryFn: async () => {
      const res = await client!.provider.list();
      const data = res.data as { all: SDKProvider[]; connected: string[]; default: Record<string, string> } | undefined;
      return data ?? { all: [] as SDKProvider[], connected: [] as string[], default: {} as Record<string, string> };
    },
  });
}

export function useAgents(directory?: string) {
  const client = useConnectionStore((s) => s.connection.client);
  return useQuery({
    queryKey: ["agents", directory] as const,
    enabled: !!client,
    queryFn: async () => {
      const res = await client!.app.agents({ query: { directory } });
      return (res.data ?? []) as SDKAgent[];
    },
  });
}

// ── revert ─────────────────────────────────────────────────────────────────

export function useRevertSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      messageId,
    }: {
      sessionId: string;
      messageId: string;
    }) => {
      const client = getClient();
      if (!client) throw new Error("OpenCode not connected");
      await client.session.revert({
        path: { id: sessionId },
        body: { messageID: messageId },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.messages(vars.sessionId) });
      qc.invalidateQueries({ queryKey: qk.sessions() });
    },
  });
}

export function useUnrevertSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const client = getClient();
      if (!client) throw new Error("OpenCode not connected");
      await client.session.unrevert({ path: { id: sessionId } });
    },
    onSuccess: (_d, sessionId) => {
      qc.invalidateQueries({ queryKey: qk.messages(sessionId) });
    },
  });
}
