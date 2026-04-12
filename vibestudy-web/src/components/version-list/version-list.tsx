import { useState, useEffect } from "react";
import {
  Bot,
  User,
  RotateCcw,
  RotateCw,
  Loader2,
  GitBranch,
  FileDiff,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useMessages,
  useRevertSession,
  useUnrevertSession,
  useSessionDiff,
  useVcsInfo,
  useGitInit,
} from "@/lib/opencode-client";

interface VersionListProps {
  sessionId?: string;
  directory?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function DiffSnippet({ before, after }: { before: string; after: string }) {
  const lines = [
    ...before.split("\n").map((l) => ({ kind: "del" as const, t: l })),
    ...after.split("\n").map((l) => ({ kind: "add" as const, t: l })),
  ].slice(0, 24);
  return (
    <pre className="mt-1 max-h-36 overflow-auto rounded border bg-background/60 p-2 font-mono text-[10px] leading-tight">
      {lines.map((row, i) => (
        <div
          key={i}
          className={
            row.kind === "del"
              ? "bg-red-500/10 text-red-700 dark:text-red-300"
              : "bg-green-500/10 text-green-700 dark:text-green-300"
          }
        >
          {row.kind === "del" ? "-" : "+"}
          {row.t || " "}
        </div>
      ))}
    </pre>
  );
}

export function VersionList({ sessionId, directory }: VersionListProps) {
  const { data: messages, isLoading } = useMessages(sessionId ?? "", directory);
  const revert = useRevertSession();
  const unrevert = useUnrevertSession();
  const gitInit = useGitInit();

  const { data: vcs, isError: vcsError, isLoading: vcsLoading } = useVcsInfo(directory);
  const gitReady = !!directory && !vcsError && !!vcs?.branch;
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  useEffect(() => {
    setSelectedMsgId(null);
  }, [sessionId, directory]);

  const { data: diffRows, isLoading: diffLoading } = useSessionDiff(
    sessionId,
    directory,
    selectedMsgId ?? undefined
  );

  const versions = (messages ?? []).filter((m) => m.role === "assistant");
  const lastMsg = messages?.[messages.length - 1];
  const isReverted = lastMsg?.role === "user" && versions.length > 0;

  if (!sessionId) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-9 shrink-0 items-center border-b px-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Версии
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground">Нет сессии</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Версии
        </span>
        <div className="flex items-center gap-1">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {isReverted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Вернуть (unrevert)"
              disabled={unrevert.isPending}
              type="button"
              onClick={() => unrevert.mutate({ sessionId, directory })}
            >
              <RotateCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {directory && (
        <div className="shrink-0 space-y-1.5 border-b px-3 py-2">
          <div className="flex items-center gap-2 text-[11px]">
            <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground" />
            {vcsLoading ? (
              <span className="text-muted-foreground">Git…</span>
            ) : gitReady ? (
              <span className="truncate text-muted-foreground" title={vcs?.branch}>
                Ветка: <span className="font-mono text-foreground">{vcs?.branch}</span>
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">Репозиторий не инициализирован</span>
            )}
          </div>
          {!gitReady && !vcsLoading && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-full text-xs"
              disabled={gitInit.isPending || !sessionId}
              type="button"
              onClick={() => gitInit.mutate({ sessionId, directory })}
            >
              {gitInit.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "git init"}
            </Button>
          )}
        </div>
      )}

      {selectedMsgId && directory && (
        <div className="shrink-0 border-b px-3 py-2">
          <button
            type="button"
            className="flex w-full items-center gap-1 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedMsgId(null)}
          >
            <ChevronDown className="h-3 w-3" />
            Изменения по версии
          </button>
          {diffLoading ? (
            <Loader2 className="mx-auto my-2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : diffRows && diffRows.length > 0 ? (
            <ScrollArea className="max-h-40">
              <div className="space-y-2 pr-2 pt-1">
                {diffRows.map((d) => (
                  <div key={d.file} className="rounded-md border bg-muted/20 p-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <FileDiff className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate" title={d.file}>{d.file}</span>
                      <span className="ml-auto shrink-0 text-green-600 tabular-nums dark:text-green-400">
                        +{d.additions}
                      </span>
                      <span className="shrink-0 text-red-600 tabular-nums dark:text-red-400">
                        −{d.deletions}
                      </span>
                    </div>
                    <DiffSnippet before={d.before} after={d.after} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="py-2 text-center text-[11px] text-muted-foreground">Нет diff для этой версии</p>
          )}
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-1">
          {versions.length === 0 && !isLoading && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Нет версий</p>
          )}
          {versions.map((msg, i) => {
            const parts = (msg as unknown as { parts?: Array<{ type: string; text?: string }> }).parts ?? [];
            const textPart = parts.find((p) => p.type === "text");
            const description = textPart?.text?.slice(0, 60).replace(/\n/g, " ") ?? "Ответ агента";
            const meta = msg as unknown as {
              time?: { created?: number };
              modelID?: string;
              mode?: string;
            };
            const ts = meta.time?.created;
            const vNum = i + 1;
            const expanded = selectedMsgId === msg.id;

            return (
              <div key={msg.id} className="rounded-sm">
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-2 py-1.5 text-left transition-colors hover:bg-accent group"
                  onClick={() => {
                    if (!directory) return;
                    setSelectedMsgId((id) => (id === msg.id ? null : msg.id));
                  }}
                  disabled={revert.isPending}
                  title={directory ? "Показать изменения файлов (diff)" : "Укажите директорию лабы для diff"}
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">
                      v{vNum}
                      {meta.mode && (
                        <span className="ml-1.5 rounded bg-muted px-1 py-0.5 font-mono text-[10px] font-normal text-muted-foreground">
                          {meta.mode}
                        </span>
                      )}
                      {meta.modelID && (
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          {meta.modelID.split("/").pop()}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {ts && (
                      <span className="text-[10px] text-muted-foreground/60">{formatTime(ts)}</span>
                    )}
                  </div>
                </button>
                <div className="flex justify-end px-2 pb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 text-[10px] text-muted-foreground"
                    type="button"
                    disabled={revert.isPending}
                    onClick={() => revert.mutate({ sessionId, messageId: msg.id, directory })}
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Откат
                  </Button>
                </div>
              </div>
            );
          })}

          {(messages ?? []).filter((m) => m.role === "user").map((msg, i) => {
            const parts = (msg as unknown as { parts?: Array<{ type: string; text?: string }> }).parts ?? [];
            const textPart = parts.find((p) => p.type === "text");
            const description = textPart?.text?.slice(0, 60).replace(/\n/g, " ") ?? "Запрос";
            const meta = msg as unknown as { time?: { created?: number }; agent?: string };
            const ts = meta.time?.created;

            return (
              <button
                key={msg.id}
                type="button"
                className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent group opacity-60 hover:opacity-100"
                onClick={() => revert.mutate({ sessionId, messageId: msg.id, directory })}
                disabled={revert.isPending}
                title="Откатиться к этому запросу"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                  <User className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">
                    запрос {i + 1}
                    {meta.agent && (
                      <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">@{meta.agent}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {ts && (
                    <span className="text-[10px] text-muted-foreground/60">{formatTime(ts)}</span>
                  )}
                  <RotateCcw className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
