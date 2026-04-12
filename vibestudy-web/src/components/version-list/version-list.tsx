import { Bot, User, RotateCcw, RotateCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessages, useRevertSession, useUnrevertSession } from "@/lib/opencode-client";

interface VersionListProps {
  sessionId?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function VersionList({ sessionId }: VersionListProps) {
  const { data: messages, isLoading } = useMessages(sessionId ?? "");
  const revert = useRevertSession();
  const unrevert = useUnrevertSession();

  // Only show assistant messages (each = a version checkpoint)
  const versions = (messages ?? []).filter((m) => m.role === "assistant");

  // Determine if currently reverted: last message is user but has no following assistant
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
    <div className="flex flex-col h-full">
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
              onClick={() => unrevert.mutate(sessionId)}
            >
              <RotateCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1">
          {versions.length === 0 && !isLoading && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Нет версий
            </p>
          )}
          {versions.map((msg, i) => {
            // Extract a short description from first text part
            const parts = (msg as unknown as { parts?: Array<{ type: string; text?: string }> }).parts ?? [];
            const textPart = parts.find((p) => p.type === "text");
            const description = textPart?.text?.slice(0, 60).replace(/\n/g, " ") ?? "Ответ агента";
            const meta = msg as unknown as {
              time?: { created?: number };
              providerID?: string;
              modelID?: string;
            };
            const ts = meta.time?.created;
            const vNum = i + 1;

            return (
              <button
                key={msg.id}
                className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent transition-colors group"
                onClick={() => {
                  // Revert to this message
                  revert.mutate({ sessionId, messageId: msg.id });
                }}
                disabled={revert.isPending}
                title="Откатиться к этой версии"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">
                    v{vNum}
                    {meta.modelID && (
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        {meta.modelID.split("/").pop()}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  {ts && (
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatTime(ts)}
                    </span>
                  )}
                  <RotateCcw className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}

          {/* User messages as minor versions */}
          {(messages ?? []).filter((m) => m.role === "user").map((msg, i) => {
            const parts = (msg as unknown as { parts?: Array<{ type: string; text?: string }> }).parts ?? [];
            const textPart = parts.find((p) => p.type === "text");
            const description = textPart?.text?.slice(0, 60).replace(/\n/g, " ") ?? "Запрос";
            const meta = msg as unknown as { time?: { created?: number } };
            const ts = meta.time?.created;

            return (
              <button
                key={msg.id}
                className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent transition-colors group opacity-60 hover:opacity-100"
                onClick={() => revert.mutate({ sessionId, messageId: msg.id })}
                disabled={revert.isPending}
                title="Откатиться к этому запросу"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                  <User className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">запрос {i + 1}</p>
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  {ts && (
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatTime(ts)}
                    </span>
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
