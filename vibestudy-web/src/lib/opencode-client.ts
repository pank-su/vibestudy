/**
 * Thin wrapper around @opencode-ai/sdk + TanStack Query hooks
 * for the VibeStudy local mode.
 */
import type { OpencodeClient } from "@opencode-ai/sdk/client";
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

/** Returns the base URL for direct fetch calls (no SDK class involved) */
function getBaseUrl(): string {
  return useConnectionStore.getState().connection.baseUrl.replace(/\/$/, "");
}

/** Direct fetch wrapper — throws on non-ok responses */
async function apiFetch<T>(
  path: string,
  options?: RequestInit & { query?: Record<string, string | undefined> }
): Promise<T> {
  const base = getBaseUrl();
  let url = `${base}${path}`;
  if (options?.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined) params.set(k, v);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  const { query: _q, ...fetchOpts } = options ?? {};
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(fetchOpts.headers ?? {}) },
    ...fetchOpts,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── query keys ────────────────────────────────────────────────────────────

export const qk = {
  sessions:    ()                    => ["sessions"]              as const,
  session:     (id: string)          => ["session", id]           as const,
  messages:    (sessionId: string, directory = "") =>
    ["messages", sessionId, directory] as const,
  files:       (dir: string, p: string) => ["files", dir, p]     as const,
  fileContent: (dir: string, p: string) => ["file", dir, p]      as const,
  sessionDiff: (sessionId: string, messageId: string | undefined, directory: string) =>
    ["session-diff", sessionId, messageId ?? "", directory] as const,
  vcs:         (directory: string)   => ["vcs", directory]       as const,
};

// ── sessions ───────────────────────────────────────────────────────────────

export function useSessions() {
  const connected = useConnectionStore((s) => s.connection.connected);
  return useQuery({
    queryKey: qk.sessions(),
    enabled: connected,
    queryFn: () => apiFetch<SDKSession[]>("/session"),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, directory }: { title?: string; directory: string }) => {
      const session = await apiFetch<SDKSession>("/session", {
        method: "POST",
        query: { directory },
        body: JSON.stringify({ title }),
      });
      return session;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sessions() }),
  });
}

// ── messages ───────────────────────────────────────────────────────────────

export function useMessages(sessionId: string, directory?: string) {
  const connected = useConnectionStore((s) => s.connection.connected);
  const dir = directory ?? "";
  return useQuery({
    queryKey: qk.messages(sessionId, dir),
    enabled: connected && !!sessionId,
    queryFn: () =>
      apiFetch<SDKMessage[]>(`/session/${sessionId}/message`, {
        query: dir ? { directory: dir } : undefined,
      }),
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
      directory,
    }: {
      sessionId: string;
      text: string;
      fileUrl?: string;
      fileMime?: string;
      system?: string;
      directory?: string;
    }) => {
      type PartInput = { type: "text"; text: string } | { type: "file"; url: string; mime: string };
      const parts: PartInput[] = [{ type: "text", text }];
      if (fileUrl && fileMime) parts.push({ type: "file", url: fileUrl, mime: fileMime });
      await apiFetch<void>(`/session/${sessionId}/prompt_async`, {
        method: "POST",
        query: directory ? { directory } : undefined,
        body: JSON.stringify({ parts, system }),
      });
    },
  });
}

export function useAbortSession() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<void>(`/session/${sessionId}/abort`, { method: "POST", body: JSON.stringify({}) }),
  });
}

// ── files ──────────────────────────────────────────────────────────────────

export type SDKFileEntry = {
  name: string;
  path: string;
  absolute: string;
  type: "file" | "directory";
  ignored: boolean;
};

export async function fetchFileList(directory: string, path: string) {
  return apiFetch<SDKFileEntry[]>("/file", { query: { directory, path } });
}

export function useFileList(directory: string, path: string = ".") {
  const connected = useConnectionStore((s) => s.connection.connected);
  return useQuery({
    queryKey: qk.files(directory, path),
    enabled: connected && !!directory,
    staleTime: 5_000,
    queryFn: () => fetchFileList(directory, path),
  });
}

export function useFileContent(directory: string, path: string) {
  const connected = useConnectionStore((s) => s.connection.connected);
  return useQuery({
    queryKey: qk.fileContent(directory, path),
    enabled: connected && !!directory && !!path,
    staleTime: 10_000,
    queryFn: async () => {
      const res = await apiFetch<{ type: string; content: string }>(
        "/file/content",
        { query: { directory, path } }
      );
      return res?.content ?? "";
    },
  });
}

// ── SSE events ─────────────────────────────────────────────────────────────

/**
 * Subscribe to OpenCode SSE event stream via native EventSource.
 * No dependency on SDK class methods.
 * Returns a cleanup function.
 */
export function subscribeEvents(
  _clientOrBaseUrl: OpencodeClient | string | null,
  onEvent: (event: Record<string, unknown>) => void,
  onError?: (err: unknown) => void
): () => void {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/global/event`;

  let es: EventSource | null = null;
  let closed = false;

  try {
    es = new EventSource(url);

    es.onmessage = (e) => {
      if (closed) return;
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>;
        onEvent(data);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = (e) => {
      if (closed) return;
      onError?.(e);
    };
  } catch (err) {
    onError?.(err);
    return () => {};
  }

  return () => {
    closed = true;
    es?.close();
  };
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
  const connected = useConnectionStore((s) => s.connection.connected);
  return useQuery({
    queryKey: ["providers"] as const,
    enabled: connected,
    queryFn: async () => {
      const data = await apiFetch<{ all: SDKProvider[]; connected: string[]; default: Record<string, string> }>("/provider");
      return data ?? { all: [] as SDKProvider[], connected: [] as string[], default: {} as Record<string, string> };
    },
  });
}

export function useAgents(directory?: string) {
  const connected = useConnectionStore((s) => s.connection.connected);
  return useQuery({
    queryKey: ["agents", directory] as const,
    enabled: connected,
    queryFn: () => apiFetch<SDKAgent[]>("/agent", { query: directory ? { directory } : undefined }),
  });
}

// ── revert ─────────────────────────────────────────────────────────────────

export function useRevertSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      messageId,
      directory,
    }: {
      sessionId: string;
      messageId: string;
      directory?: string;
    }) => {
      await apiFetch<void>(`/session/${sessionId}/revert`, {
        method: "POST",
        query: directory ? { directory } : undefined,
        body: JSON.stringify({ messageID: messageId }),
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.sessionId] });
      qc.invalidateQueries({ queryKey: qk.sessions() });
    },
  });
}

export function useUnrevertSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      directory,
    }: {
      sessionId: string;
      directory?: string;
    }) => {
      await apiFetch<void>(`/session/${sessionId}/unrevert`, {
        method: "POST",
        query: directory ? { directory } : undefined,
        body: JSON.stringify({}),
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.sessionId] });
    },
  });
}

export type FileDiffRow = {
  file: string;
  before: string;
  after: string;
  additions: number;
  deletions: number;
};

export async function fetchSessionDiff(
  sessionId: string,
  directory: string,
  messageID?: string
) {
  return apiFetch<FileDiffRow[]>(`/session/${sessionId}/diff`, {
    query: {
      directory,
      ...(messageID ? { messageID } : {}),
    },
  });
}

export function useSessionDiff(
  sessionId: string | undefined,
  directory: string | undefined,
  messageID: string | undefined
) {
  const connected = useConnectionStore((s) => s.connection.connected);
  return useQuery({
    queryKey: qk.sessionDiff(sessionId ?? "", messageID, directory ?? ""),
    enabled: connected && !!sessionId && !!directory && !!messageID,
    queryFn: () => fetchSessionDiff(sessionId!, directory!, messageID),
  });
}

export type VcsInfo = { branch: string };

export async function fetchVcsInfo(directory: string) {
  return apiFetch<VcsInfo>("/vcs", { query: { directory } });
}

export function useVcsInfo(directory: string | undefined) {
  const connected = useConnectionStore((s) => s.connection.connected);
  return useQuery({
    queryKey: qk.vcs(directory ?? ""),
    enabled: connected && !!directory,
    queryFn: () => fetchVcsInfo(directory!),
    retry: false,
  });
}

export function useGitInit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      directory,
    }: {
      sessionId: string;
      directory: string;
    }) => {
      await apiFetch(`/session/${sessionId}/shell`, {
        method: "POST",
        query: { directory },
        body: JSON.stringify({ agent: "general", command: "git init" }),
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.vcs(vars.directory) });
      qc.invalidateQueries({ queryKey: ["files", vars.directory] });
    },
  });
}
