import { useState } from "react";
import { Link, useRouter, useNavigate } from "@tanstack/react-router";
import {
  Settings,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Plus,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useConnectionStore } from "@/stores/connection";
import { useLabsStore, type Lab } from "@/stores/labs";
import { useTheme } from "@/hooks/use-theme";

const PANEL_WIDTH = 240;

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function LabItem({
  lab,
  isActive,
  onClick,
  onDelete,
}: {
  lab: Lab;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className={`group relative w-full rounded-md px-3 py-2 text-left transition-colors ${
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/60 text-foreground"
      }`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-2">
        <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-snug">{lab.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatRelativeDate(lab.updatedAt)}
            {lab.status === "in_progress" && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle" />
            )}
          </p>
        </div>
      </div>
      {hovered && (
        <button
          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </button>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const navigate = useNavigate();
  const path = router.state.location.pathname;
  const currentLabId = path.startsWith("/workspace/") ? path.split("/workspace/")[1] : null;

  const { connected } = useConnectionStore((s) => s.connection);
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const labs = useLabsStore((s) => s.labs);
  const removeLab = useLabsStore((s) => s.removeLab);

  const inProgress = labs.filter((l) => l.status === "in_progress");
  const completed  = labs.filter((l) => l.status === "completed");

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden">

        {/* Left sidebar: labs list */}
        <aside
          className="relative flex shrink-0 flex-col border-r bg-sidebar-background transition-all duration-200"
          style={{ width: collapsed ? 0 : PANEL_WIDTH }}
        >
          {!collapsed && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Header */}
              <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
                <Link to="/new">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold select-none">
                      V
                    </div>
                    <span className="text-sm font-semibold">VibeStudy</span>
                  </div>
                </Link>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => navigate({ to: "/new" })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Новая лаба</TooltipContent>
                </Tooltip>
              </div>

              {/* Labs list */}
              <ScrollArea className="flex-1">
                <div className="py-2">
                  {labs.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-[13px] text-muted-foreground">Нет лабораторных</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-1.5 text-xs"
                        onClick={() => navigate({ to: "/new" })}
                      >
                        <Plus className="h-3 w-3" />
                        Создать первую
                      </Button>
                    </div>
                  ) : (
                    <>
                      {inProgress.length > 0 && (
                        <section className="mb-2">
                          <div className="px-3 pb-1 pt-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                              В процессе
                            </span>
                          </div>
                          <div className="px-1.5 space-y-0.5">
                            {inProgress.map((lab) => (
                              <LabItem
                                key={lab.id}
                                lab={lab}
                                isActive={currentLabId === lab.id}
                                onClick={() => navigate({ to: "/workspace/$labId", params: { labId: lab.id }, search: { sessionId: undefined, directory: undefined, initialPrompt: undefined, system: undefined } })}
                                onDelete={(e) => { e.stopPropagation(); removeLab(lab.id); }}
                              />
                            ))}
                          </div>
                        </section>
                      )}

                      {completed.length > 0 && (
                        <section>
                          {inProgress.length > 0 && (
                            <div className="mx-3 mb-2 border-t" />
                          )}
                          <div className="px-3 pb-1 pt-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                              Выполненные
                            </span>
                          </div>
                          <div className="px-1.5 space-y-0.5">
                            {completed.map((lab) => (
                              <LabItem
                                key={lab.id}
                                lab={lab}
                                isActive={currentLabId === lab.id}
                                onClick={() => navigate({ to: "/workspace/$labId", params: { labId: lab.id }, search: { sessionId: undefined, directory: undefined, initialPrompt: undefined, system: undefined } })}
                                onDelete={(e) => { e.stopPropagation(); removeLab(lab.id); }}
                              />
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-between border-t px-3 py-2">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme}>
                        {theme === "dark"
                          ? <Sun className="h-3.5 w-3.5" />
                          : <Moon className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{theme === "dark" ? "Светлая" : "Тёмная"} тема</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to="/settings">
                        <Button
                          variant={path === "/settings" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-7 w-7"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top">Настройки</TooltipContent>
                  </Tooltip>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-7 w-7 items-center justify-center">
                      {connected
                        ? <Wifi className="h-3.5 w-3.5 text-green-500" />
                        : <WifiOff className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {connected ? "OpenCode подключён" : "OpenCode не подключён"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Collapse toggle — attached to right edge */}
          <button
            className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground hover:bg-accent"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed
              ? <ChevronRight className="h-3 w-3" />
              : <ChevronLeft className="h-3 w-3" />}
          </button>
        </aside>

        {/* Main content */}
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>

      </div>
    </TooltipProvider>
  );
}
