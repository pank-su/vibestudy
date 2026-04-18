import { useState, useRef, useEffect, useCallback } from "react";
import {
  Add01Icon,
  ArrowDown01Icon,
  Attachment01Icon,
  Loading03Icon,
  SentIcon,
  SparklesIcon,
  StopIcon,
  UserIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { Hi } from "@/components/ui/hi";
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
import { SheetDescription, SheetTitle } from "@/components/ui/sheet";

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
  surface?: "default" | "overlay";
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
    running:   "text-primary",
    completed: "text-emerald-700 dark:text-emerald-400",
    error:     "text-destructive",
  }[bubble.status];

  const statusLabel = {
    pending:   "Ожидание",
    running:   "Выполняется",
    completed: "Готово",
    error:     "Ошибка",
  }[bubble.status];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background text-xs shadow-xs">
      {bubble.agent && (
        <div className="border-b border-border bg-muted px-3 py-1.5 font-sans text-[10px] font-medium text-muted-foreground">
          Агент: <span className="font-mono text-foreground">@{bubble.agent}</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted"
      >
        <Hi icon={Wrench01Icon} size={16} className="text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono font-medium text-foreground">{bubble.tool}</span>
        {bubble.status === "running" && (
          <span className="inline-flex shrink-0 animate-spin text-primary">
            <Hi icon={Loading03Icon} size={14} />
          </span>
        )}
        <span className={`shrink-0 font-sans text-[11px] font-medium ${statusColor}`}>{statusLabel}</span>
        <Hi
          icon={ArrowDown01Icon}
          size={14}
          className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
          {bubble.title && (
            <p className="text-muted-foreground">{bubble.title}</p>
          )}
          {bubble.input && (
            <pre className="max-h-32 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-[#f7f6f3] p-2 font-mono text-[10px] text-foreground">
              {JSON.stringify(bubble.input, null, 2)}
            </pre>
          )}
          {bubble.output && (
            <pre className="max-h-32 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-[#f7f6f3] p-2 font-mono text-[10px] text-foreground">
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
        <span className="rounded-full border border-dashed border-border px-2 py-0.5 font-sans text-[10px] text-muted-foreground">
          {bubble.text}
        </span>
      </div>
    );
  }

  if (bubble.kind === "tool") {
    return (
      <div className="px-0.5">
        <ToolCard bubble={bubble} />
      </div>
    );
  }

  const isUser = bubble.role === "user";
  const userMention = isUser ? firstMentionAgent(bubble.text) : undefined;

  return (
    <div className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] ${
          isUser
            ? "bg-muted text-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {isUser ? <Hi icon={UserIcon} size={16} /> : <Hi icon={SparklesIcon} size={16} />}
      </div>
      <div
        className={`max-w-[min(100%,min(320px,88vw))] rounded-2xl border px-3.5 py-2.5 font-sans shadow-xs sm:max-w-[min(100%,248px)] ${
          isUser
            ? "rounded-br-sm border-foreground bg-foreground text-background"
            : "rounded-bl-sm border-border bg-background text-foreground"
        }`}
      >
        {bubble.agent && !isUser && (
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              @{bubble.agent}
            </span>
          </div>
        )}
        {userMention && (
          <div className="mb-2 flex flex-wrap gap-1">
            <span className="rounded-md bg-white/12 px-1.5 py-0.5 font-sans text-[10px] font-medium text-background">
              → @{userMention}
            </span>
          </div>
        )}
        {bubble.text
          ? isUser
            ? <ChatMarkdown text={bubble.text} variant="workspace" role="user" />
            : <ChatMarkdown text={bubble.text} variant="workspace" role="assistant" />
          : (
            <span className="inline-flex animate-spin opacity-50">
              <Hi icon={Loading03Icon} size={18} className="text-muted-foreground" />
            </span>
          )}
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
  surface = "default",
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

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
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
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-background",
        surface === "default" && "border-l border-border",
      )}
    >
      <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4">
        {surface === "overlay" ? (
          <div className="min-w-0 flex-1">
            <SheetTitle className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Агенты
            </SheetTitle>
            <SheetDescription className="sr-only">
              Чат с агентами OpenCode
            </SheetDescription>
          </div>
        ) : (
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Агенты
          </span>
        )}
        {isBusy && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex min-w-0 items-center gap-1.5 font-sans text-xs text-primary">
              <span className="inline-flex shrink-0 animate-spin">
                <Hi icon={Loading03Icon} size={14} />
              </span>
              <span className="truncate text-foreground">
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
              className="size-7 text-muted-foreground hover:bg-muted hover:text-destructive"
              onClick={handleAbort}
              title="Остановить"
            >
              <Hi icon={StopIcon} size={16} />
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1" ref={scrollRef}>
        <div className="flex flex-col gap-3 px-2.5 py-3 sm:gap-3.5 sm:px-3.5 sm:py-4">
          {bubbles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Hi icon={SparklesIcon} size={40} className="mb-3 text-muted-foreground opacity-40" />
              <p className="font-sans text-sm font-medium text-foreground">OpenCode</p>
              <p className="mt-1 max-w-[160px] font-sans text-xs text-muted-foreground">
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

      <div className="shrink-0 border-t border-border bg-background px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-3.5 sm:pb-3.5 sm:pt-3">
        <InputGroup
          className={cn(
            "min-h-11 rounded-2xl border border-border bg-muted/40 px-0.5 shadow-xs",
            (!sessionId || isBusy) && "pointer-events-none opacity-60",
          )}
        >
          <InputGroupAddon
            align="inline-start"
            className="gap-0.5 border-0 bg-transparent py-1.5 pl-1 text-muted-foreground"
          >
            <InputGroupButton
              size="icon-sm"
              variant="ghost"
              className="size-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Прикрепить (скоро)"
              disabled
            >
              <Hi icon={Attachment01Icon} size={18} />
            </InputGroupButton>
            <InputGroupButton
              size="icon-sm"
              variant="ghost"
              className="size-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Добавить в контекст (скоро)"
              disabled
            >
              <Hi icon={Add01Icon} size={18} />
            </InputGroupButton>
          </InputGroupAddon>
          <InputGroupInput
            placeholder={
              !sessionId
                ? "Нет активной сессии"
                : isBusy
                  ? "Ожидание ответа…"
                  : "Сообщение агентам…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            disabled={!sessionId || isBusy}
            className="h-11 min-w-0 px-1 font-sans text-[13px] text-foreground placeholder:text-muted-foreground"
            enterKeyHint="send"
            autoComplete="off"
          />
          <InputGroupAddon
            align="inline-end"
            className="border-0 bg-transparent py-1.5 pr-1"
          >
            <InputGroupButton
              size="icon-sm"
              variant="default"
              title="Отправить"
              disabled={!canSend}
              onClick={handleSend}
              className="size-9 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 [&>svg]:text-background"
            >
              <Hi icon={SentIcon} size={18} />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {!sessionId && (
          <p className="mt-2 text-center font-sans text-[11px] text-muted-foreground">
            Создайте новую лабораторную чтобы начать
          </p>
        )}
        {sessionId && !directory && (
          <p className="mt-2 text-center font-sans text-[11px] text-amber-700/90 dark:text-amber-400/90">
            Нет директории лабы — запросы идут без привязки к проекту. Создайте лабу заново или откройте из списка.
          </p>
        )}
      </div>
    </div>
  );
}
