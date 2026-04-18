import { useState, useEffect } from "react";
import {
  ArrowDown01Icon,
  BotIcon,
  FileDiffIcon,
  GitBranchIcon,
  Loading03Icon,
  Rotate01Icon,
  Rotate02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hi } from "@/components/ui/hi";
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

  const {
    data: vcs,
    isError: vcsError,
    isLoading: vcsLoading,
  } = useVcsInfo(directory);
  const gitReady = !!directory && !vcsError && !!vcs?.branch;
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  useEffect(() => {
    setSelectedMsgId(null);
  }, [sessionId, directory]);

  const { data: diffRows, isLoading: diffLoading } = useSessionDiff(
    sessionId,
    directory,
    selectedMsgId ?? undefined,
  );

  const versions = (messages ?? []).filter((m) => m.role === "assistant");
  const lastMsg = messages?.[messages.length - 1];
  const isReverted = lastMsg?.role === "user" && versions.length > 0;

  if (!sessionId) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Версии
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="font-sans text-xs text-muted-foreground">Нет сессии</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Версии
        </span>
        <div className="flex items-center gap-1">
          {isLoading && (
            <span className="inline-flex animate-spin text-muted-foreground">
              <Hi icon={Loading03Icon} size={14} />
            </span>
          )}
          {isReverted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Вернуть (unrevert)"
              disabled={unrevert.isPending}
              type="button"
              onClick={() => unrevert.mutate({ sessionId, directory })}
            >
              <Hi icon={Rotate02Icon} size={16} />
            </Button>
          )}
        </div>
      </div>

      {directory && (
        <div className="flex shrink-0 flex-col gap-1.5 border-b border-border px-4 py-2">
          <div className="flex items-center gap-2 font-sans text-[11px]">
            <Hi
              icon={GitBranchIcon}
              size={14}
              className="shrink-0 text-muted-foreground"
            />
            {vcsLoading ? (
              <span className="text-muted-foreground">Git…</span>
            ) : gitReady ? (
              <span
                className="truncate text-muted-foreground"
                title={vcs?.branch}
              >
                Ветка:{" "}
                <span className="font-mono text-foreground">{vcs?.branch}</span>
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">
                Репозиторий не инициализирован
              </span>
            )}
          </div>
          {!gitReady && !vcsLoading && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-full border-border bg-background font-sans text-xs text-foreground hover:bg-muted"
              disabled={gitInit.isPending || !sessionId}
              type="button"
              onClick={() => gitInit.mutate({ sessionId, directory })}
            >
              {gitInit.isPending ? (
                <span className="inline-flex animate-spin">
                  <Hi icon={Loading03Icon} size={14} />
                </span>
              ) : (
                "git init"
              )}
            </Button>
          )}
        </div>
      )}

      {selectedMsgId && directory && (
        <div className="shrink-0 border-b border-border px-4 py-2">
          <button
            type="button"
            className="flex w-full items-center gap-1 text-left font-sans text-[11px] font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedMsgId(null)}
          >
            <Hi icon={ArrowDown01Icon} size={14} />
            Изменения по версии
          </button>
          {diffLoading ? (
            <span className="mx-auto my-2 flex justify-center text-muted-foreground">
              <span className="inline-flex animate-spin">
                <Hi icon={Loading03Icon} size={18} />
              </span>
            </span>
          ) : diffRows && diffRows.length > 0 ? (
            <ScrollArea className="max-h-40">
              <div className="flex flex-col gap-2 pr-2 pt-1">
                {diffRows.map((d) => (
                  <div
                    key={d.file}
                    className="rounded-md border border-border bg-background p-2"
                  >
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Hi
                        icon={FileDiffIcon}
                        size={14}
                        className="shrink-0 text-muted-foreground"
                      />
                      <span className="truncate" title={d.file}>
                        {d.file}
                      </span>
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
            <p className="py-2 text-center font-sans text-[11px] text-muted-foreground">
              Нет diff для этой версии
            </p>
          )}
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-1 pb-2">
          {versions.length === 0 && !isLoading && (
            <p className="px-4 py-4 text-center font-sans text-xs text-muted-foreground">
              Нет версий
            </p>
          )}
          {versions.map((msg, i) => {
            const parts =
              (
                msg as unknown as {
                  parts?: Array<{ type: string; text?: string }>;
                }
              ).parts ?? [];
            const textPart = parts.find((p) => p.type === "text");
            const description =
              textPart?.text?.slice(0, 60).replace(/\n/g, " ") ??
              "Ответ агента";
            const meta = msg as unknown as {
              time?: { created?: number };
              modelID?: string;
              mode?: string;
            };
            const ts = meta.time?.created;
            const vNum = i + 1;
            const expanded = selectedMsgId === msg.id;

            return (
              <div key={msg.id}>
                <button
                  type="button"
                  className="group flex w-full items-start gap-2 px-4 py-2 text-left transition-colors hover:bg-muted/60"
                  onClick={() => {
                    if (!directory) return;
                    setSelectedMsgId((id) => (id === msg.id ? null : msg.id));
                  }}
                  disabled={revert.isPending}
                  title={
                    directory
                      ? "Показать изменения файлов (diff)"
                      : "Укажите директорию лабы для diff"
                  }
                >
                  <div className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center text-muted-foreground">
                    {expanded ? (
                      <Hi icon={ArrowDown01Icon} size={16} />
                    ) : (
                      <Hi icon={BotIcon} size={16} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-sans text-xs ${expanded ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}
                    >
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
                    <p className="truncate font-sans text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {ts && (
                      <span className="font-sans text-[10px] text-muted-foreground/80">
                        {formatTime(ts)}
                      </span>
                    )}
                  </div>
                </button>
                <div className="flex justify-end px-4 pb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 font-sans text-[10px] text-muted-foreground hover:text-foreground"
                    type="button"
                    disabled={revert.isPending}
                    onClick={() =>
                      revert.mutate({ sessionId, messageId: msg.id, directory })
                    }
                  >
                    <Hi icon={Rotate01Icon} size={14} />
                    Откат
                  </Button>
                </div>
              </div>
            );
          })}

          {(messages ?? [])
            .filter((m) => m.role === "user")
            .map((msg, i) => {
              const parts =
                (
                  msg as unknown as {
                    parts?: Array<{ type: string; text?: string }>;
                  }
                ).parts ?? [];
              const textPart = parts.find((p) => p.type === "text");
              const description =
                textPart?.text?.slice(0, 60).replace(/\n/g, " ") ?? "Запрос";
              const meta = msg as unknown as {
                time?: { created?: number };
                agent?: string;
              };
              const ts = meta.time?.created;

              return (
                <button
                  key={msg.id}
                  type="button"
                  className="group flex w-full items-start gap-2 px-4 py-2 text-left opacity-70 transition-colors hover:bg-muted/60 hover:opacity-100"
                  onClick={() =>
                    revert.mutate({ sessionId, messageId: msg.id, directory })
                  }
                  disabled={revert.isPending}
                  title="Откатиться к этому запросу"
                >
                  <div className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center text-muted-foreground">
                    <Hi icon={UserIcon} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-xs font-medium text-muted-foreground">
                      запрос {i + 1}
                      {meta.agent && (
                        <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                          @{meta.agent}
                        </span>
                      )}
                    </p>
                    <p className="truncate font-sans text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {ts && (
                      <span className="font-sans text-[10px] text-muted-foreground/70">
                        {formatTime(ts)}
                      </span>
                    )}
                    <Hi
                      icon={Rotate01Icon}
                      size={14}
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                </button>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
