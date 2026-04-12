import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConnectionStore } from "@/stores/connection";

const RETRIES = 45;
const DELAY_MS = 600;

export function OpenCodeConnectionGate() {
  const router = useRouter();
  const path = router.state.location.pathname;
  const connected = useConnectionStore((s) => s.connection.connected);
  const baseUrl = useConnectionStore((s) => s.connection.baseUrl);
  const connect = useConnectionStore((s) => s.connect);

  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (path === "/settings" || connected) {
      setFailed(false);
      return;
    }
    let cancelled = false;
    setFailed(false);

    (async () => {
      for (let i = 0; i < RETRIES && !cancelled; i++) {
        if (useConnectionStore.getState().connection.connected) return;
        const ok = await connect(baseUrl);
        if (ok) return;
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
      if (!cancelled) setFailed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [path, connected, baseUrl, connect, attempt]);

  if (path === "/settings" || connected) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/92 px-6 text-center backdrop-blur-[2px]">
      {!failed && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium">Подключение к OpenCode</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ожидаем сервер на{" "}
              <span className="font-mono text-foreground/80">{baseUrl}</span>.
              Команда <span className="font-mono">pnpm dev</span> поднимает Vite и OpenCode вместе.
            </p>
          </div>
        </>
      )}
      {failed && (
        <>
          <WifiOff className="h-10 w-10 text-muted-foreground" />
          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium">OpenCode недоступен</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Запустите приложение из папки <span className="font-mono">vibestudy-web</span>:
            </p>
            <code className="block rounded-lg border bg-muted/50 px-3 py-2 text-left text-[11px] font-mono">
              pnpm dev
            </code>
            <p className="text-xs text-muted-foreground">
              Либо в отдельном терминале:{" "}
              <span className="font-mono text-[11px] text-foreground/80 break-all">
                pnpm exec opencode serve --port 4096 --cors http://localhost:5173
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" onClick={() => setAttempt((a) => a + 1)}>
              Повторить
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/settings">Настройки подключения</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
