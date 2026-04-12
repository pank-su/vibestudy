import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Square, Wrench, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useSendMessage,
  useAbortSession,
  subscribeEvents,
  useQueryClient,
  useMessages,
  qk,
  type SDKMessage,
} from "@/lib/opencode-client";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { useConnectionStore } from "@/stores/connection";

// ── types ──────────────────────────────────────────────────────────────────

interface TextBubble {
  id: string;
  kind: "text";
  role: "user" | "assistant";
  messageId: string;
  text: string;
  agent?: string;
}

interface ToolBubble {
  id: string;
  kind: "tool";
  messageId: string;
  tool: string;
  agent?: string;
  status: "pending" | "running" | "completed" | "error";
  title?: string;
  input?: Record<string, unknown>;
  output?: string;
}

interface StatusBubble {
  id: string;
  kind: "status";
  text: string;
}

type Bubble = TextBubble | ToolBubble | StatusBubble;

// ── props ──────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  sessionId?: string;
  directory?: string;
  initialPrompt?: string;
  systemPrompt?: string;
}

function labCwdSystemHint(directory: string | undefined, base?: string): string | undefined {
  const parts: string[] = [];
  if (directory) {
    parts.push(
      `[VibeStudy] Рабочая директория этой лабораторной на машине пользователя:\n${directory}\n` +
        "Используй её как корень проекта для обзора файлов и инструментов. Не путай с кодом веб-приложения VibeStudy."
    );
  }
  if (base?.trim()) parts.push(base.trim());
  if (parts.length === 0) return undefined;
  return parts.join("\n\n");
}

// ── sub-components ─────────────────────────────────────────────────────────

function firstMentionAgent(text: string): string | undefined {
  const m = text.match(/@([a-zA-Z0-9_-]+)/);
  return m?.[1];
}

function ToolCard({ bubble }: { bubble: ToolBubble }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = {
    pending:   "text-muted-foreground",
    running:   "text-blue-500",
    completed: "text-green-600 dark:text-green-400",
    error:     "text-destructive",
  }[bubble.status];

  const statusLabel = {
    pending:   "Ожидание",
    running:   "Выполняется",
    completed: "Готово",
    error:     "Ошибка",
  }[bubble.status];

  return (
    <div className="rounded-lg border bg-muted/40 text-xs overflow-hidden">
      {bubble.agent && (
        <div className="border-b border-border/60 bg-muted/30 px-3 py-1 text-[10px] font-medium text-muted-foreground">
          Агент: <span className="font-mono text-foreground">@{bubble.agent}</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted/60 transition-colors"
      >
        <Wrench className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="font-mono font-medium flex-1 text-left truncate">{bubble.tool}</span>
        {bubble.status === "running" && (
          <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />
        )}
        <span className={`shrink-0 ${statusColor}`}>{statusLabel}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="border-t px-3 py-2 space-y-1.5">
          {bubble.title && (
            <p className="text-muted-foreground">{bubble.title}</p>
          )}
          {bubble.input && (
            <pre className="rounded bg-background/80 p-2 text-[10px] overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(bubble.input, null, 2)}
            </pre>
          )}
          {bubble.output && (
            <pre className="rounded bg-background/80 p-2 text-[10px] overflow-x-auto whitespace-pre-wrap break-all max-h-32">
              {bubble.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ bubble }: { bubble: Bubble }) {
  if (bubble.kind === "status") {
    return (
      <div className="flex justify-center">
        <span className="text-[10px] text-muted-foreground/60 px-2 py-0.5 rounded-full border border-dashed">
          {bubble.text}
        </span>
      </div>
    );
  }

  if (bubble.kind === "tool") {
    return (
      <div className="px-1">
        <ToolCard bubble={bubble} />
      </div>
    );
  }

  const isUser = bubble.role === "user";
  const userMention = isUser ? firstMentionAgent(bubble.text) : undefined;

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5 ${
        isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}>
        {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
      </div>
      <div className={`max-w-[82%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      }`}>
        {bubble.agent && !isUser && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1">
            <span className="rounded-md bg-background/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
              @{bubble.agent}
            </span>
          </div>
        )}
        {userMention && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            <span className="rounded-md bg-primary-foreground/15 px-1.5 py-0.5 text-[10px] font-medium">
              → @{userMention}
            </span>
          </div>
        )}
        {bubble.text
          ? isUser
            ? <span className="whitespace-pre-wrap break-words">{bubble.text}</span>
            : <ChatMarkdown text={bubble.text} />
          : <Loader2 className="h-3.5 w-3.5 animate-spin opacity-50" />
        }
      </div>
    </div>
  );
}

// ── main ───────────────────────────────────────────────────────────────────

export function ChatPanel({
  sessionId,
  directory,
  initialPrompt,
  systemPrompt,
}: ChatPanelProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [autoScrolled, setAutoScrolled] = useState(false);
  const [activeAgentLabel, setActiveAgentLabel] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const sendMessage = useSendMessage();
  const abortSession = useAbortSession();
  const qc = useQueryClient();
  const connected = useConnectionStore((s) => s.connection.connected);
  const { data: serverMessages } = useMessages(sessionId ?? "", directory);

  const messageRolesRef = useRef(new Map<string, "user" | "assistant">());

  useEffect(() => {
    const m = new Map<string, "user" | "assistant">();
    if (serverMessages) {
      for (const msg of serverMessages) {
        m.set(msg.id, msg.role);
      }
    }
    messageRolesRef.current = m;
  }, [serverMessages]);

  // ── auto-scroll ──────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [bubbles, scrollToBottom]);

  // ── helpers ──────────────────────────────────────────────────────────────

  const upsertTextBubble = useCallback((messageId: string, delta: string, agent?: string) => {
    setBubbles((prev) => {
      const idx = prev.findIndex(
        (b) => b.kind === "text" && b.messageId === messageId && b.role === "assistant"
      );
      if (idx === -1) {
        const newBubble: TextBubble = {
          id: messageId,
          kind: "text",
          role: "assistant",
          messageId,
          text: delta,
          agent,
        };
        return [...prev, newBubble];
      }
      const updated = [...prev];
      const b = updated[idx] as TextBubble;
      updated[idx] = { ...b, text: b.text + delta, agent: agent ?? b.agent };
      return updated;
    });
  }, []);

  const upsertToolBubble = useCallback((
    partId: string,
    messageId: string,
    tool: string,
    status: ToolBubble["status"],
    title?: string,
    input?: Record<string, unknown>,
    output?: string,
    agent?: string,
  ) => {
    setBubbles((prev) => {
      const idx = prev.findIndex((b) => b.kind === "tool" && b.id === partId);
      if (idx === -1) {
        const newBubble: ToolBubble = {
          id: partId, kind: "tool", messageId, tool, agent, status, title, input, output,
        };
        return [...prev, newBubble];
      }
      const updated = [...prev];
      const cur = updated[idx] as ToolBubble;
      updated[idx] = {
        ...cur,
        status,
        title: title ?? cur.title,
        input: input ?? cur.input,
        output: output ?? cur.output,
        agent: agent ?? cur.agent,
      };
      return updated;
    });
  }, []);

  // ── SSE subscription ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId || !connected) return;
    const sid = sessionId;

    function roleForMessage(messageId: string): "user" | "assistant" | undefined {
      const fromRef = messageRolesRef.current.get(messageId);
      if (fromRef) return fromRef;
      const dir = directory ?? "";
      const list = qc.getQueryData<SDKMessage[]>(qk.messages(sid, dir));
      return list?.find((x) => x.id === messageId)?.role;
    }

    const cleanup = subscribeEvents(
      null,
      (ev) => {
        const raw = ev as Record<string, unknown>;
        const payload = raw.payload as Record<string, unknown> | undefined;
        const useInnerPayload =
          payload &&
          typeof payload.type === "string" &&
          payload.properties !== undefined &&
          typeof payload.properties === "object";
        const event = useInnerPayload ? payload : raw;
        let type = event.type as string;
        let props = event.properties as Record<string, unknown> | undefined;
        if (
          !props &&
          useInnerPayload === false &&
          payload &&
          typeof payload === "object" &&
          typeof payload.type === "string" &&
          "part" in payload
        ) {
          props = payload as Record<string, unknown>;
          type = payload.type as string;
        }
        if (!props) return;

        const evSessionId = (props.sessionID ?? props.sessionId) as string | undefined;
        if (evSessionId && evSessionId !== sessionId) return;

        if (type === "message.updated") {
          const info = props.info as {
            id?: string;
            role?: string;
            sessionID?: string;
            sessionId?: string;
          } | undefined;
          const msgSession =
            (info?.sessionID ?? info?.sessionId ?? evSessionId) as string | undefined;
          if (msgSession && msgSession !== sessionId) return;
          if (info?.id && (info.role === "user" || info.role === "assistant")) {
            messageRolesRef.current.set(info.id, info.role);
          }
          return;
        }

        if (type === "message.removed") {
          const mid = props.messageID as string | undefined;
          if (mid) messageRolesRef.current.delete(mid);
          return;
        }

        if (type === "message.part.updated") {
          const part = props.part as Record<string, unknown>;
          const partSession = (part.sessionID ?? part.sessionId) as string | undefined;
          if (partSession && partSession !== sessionId) return;
          const partType = part.type as string;
          const messageId = part.messageID as string;
          const partId = part.id as string;
          const delta = props.delta as string | undefined;

          if (partType === "text") {
            const role = roleForMessage(messageId);
            if (role === "user") return;
            if (part.synthetic || part.ignored) return;
            const text = delta ?? (part.text as string) ?? "";
            const meta = part.metadata as { agent?: string } | undefined;
            if (text) upsertTextBubble(messageId, text, meta?.agent);
          } else if (partType === "reasoning") {
            const role = roleForMessage(messageId);
            if (role === "user") return;
            const text = delta ?? (part.text as string) ?? "";
            const meta = part.metadata as { agent?: string } | undefined;
            if (text) upsertTextBubble(messageId, text, meta?.agent);
          } else if (partType === "tool") {
            const state = part.state as Record<string, unknown>;
            const status = (state?.status as ToolBubble["status"]) ?? "pending";
            const title = (state?.title as string | undefined) ?? (part.tool as string);
            const input = state?.input as Record<string, unknown> | undefined;
            const output = state?.output as string | undefined;
            const meta = part.metadata as { agent?: string } | undefined;
            upsertToolBubble(partId, messageId, part.tool as string, status, title, input, output, meta?.agent);
          } else if (partType === "agent") {
            const name = part.name as string | undefined;
            if (name) setActiveAgentLabel(name);
          }
        } else if (type === "session.status") {
          const status = props.status as { type: string } | undefined;
          if (status?.type === "busy") {
            setIsBusy(true);
            setActiveAgentLabel(null);
          } else if (status?.type === "idle") {
            setIsBusy(false);
            setActiveAgentLabel(null);
            qc.invalidateQueries({ queryKey: ["messages", sessionId] });
            if (directory) qc.invalidateQueries({ queryKey: qk.files(directory, ".") });
          }
        } else if (type === "session.idle") {
          setIsBusy(false);
          setActiveAgentLabel(null);
          qc.invalidateQueries({ queryKey: ["messages", sessionId] });
          if (directory) qc.invalidateQueries({ queryKey: qk.files(directory, ".") });
        }
      },
      undefined
    );

    cleanupRef.current = cleanup;
    return () => {
      cleanup();
      cleanupRef.current = null;
    };
  }, [sessionId, directory, connected, upsertTextBubble, upsertToolBubble, qc]);

  // ── send initial prompt ──────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId || !initialPrompt || autoScrolled) return;
    setAutoScrolled(true);

    const userBubble: TextBubble = {
      id: crypto.randomUUID(),
      kind: "text",
      role: "user",
      messageId: crypto.randomUUID(),
      text: initialPrompt,
    };
    setBubbles([userBubble]);
    setIsBusy(true);

    sendMessage.mutate(
      {
        sessionId,
        text: initialPrompt,
        system: labCwdSystemHint(directory, systemPrompt),
        directory,
      },
      { onError: () => setIsBusy(false) }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, initialPrompt, directory]);

  // ── send user message ────────────────────────────────────────────────────

  function handleSend() {
    if (!input.trim() || isBusy || !sessionId) return;

    const text = input.trim();
    setInput("");

    const userBubble: TextBubble = {
      id: crypto.randomUUID(),
      kind: "text",
      role: "user",
      messageId: crypto.randomUUID(),
      text,
    };
    setBubbles((prev) => [...prev, userBubble]);
    setIsBusy(true);

    sendMessage.mutate(
      {
        sessionId,
        text,
        directory,
        system: labCwdSystemHint(directory),
      },
      { onError: () => setIsBusy(false) }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleAbort() {
    if (!sessionId) return;
    abortSession.mutate(sessionId, {
      onSuccess: () => setIsBusy(false),
    });
  }

  const canSend = !!sessionId && !!input.trim() && !isBusy;

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col border-l">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Чат
        </span>
        {isBusy && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-primary">
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              <span className="truncate">
                Работает
                {activeAgentLabel && (
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                    @{activeAgentLabel}
                  </span>
                )}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={handleAbort}
              title="Остановить"
            >
              <Square className="h-3 w-3 fill-current" />
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-3 p-3">
          {bubbles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">OpenCode</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[160px]">
                {sessionId
                  ? "Отправьте сообщение или методичку"
                  : "Нет активной сессии"}
              </p>
            </div>
          )}
          {bubbles.map((b) => (
            <MessageBubble key={b.id} bubble={b} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <Separator />

      {/* Input */}
      <div className="p-3">
        <div className="flex gap-2">
          <Textarea
            placeholder={
              !sessionId
                ? "Нет активной сессии"
                : isBusy
                ? "Ожидание ответа..."
                : "Сообщение..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!sessionId || isBusy}
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {!sessionId && (
          <p className="mt-1.5 text-[11px] text-muted-foreground/60 text-center">
            Создайте новую лабораторную чтобы начать
          </p>
        )}
        {sessionId && !directory && (
          <p className="mt-1.5 text-[11px] text-amber-600/90 dark:text-amber-400/90 text-center">
            Нет директории лабы — запросы идут без привязки к проекту. Создайте лабу заново или откройте из списка.
          </p>
        )}
      </div>
    </div>
  );
}
