import { useState, useRef, useEffect } from "react";
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
  Pencil,
  FolderOpen,
  AlertTriangle,
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
  onRename,
}: {
  lab: Lab;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onRename: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(lab.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(lab.name); }, [lab.name]);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(lab.name);
    setEditing(true);
    setTimeout(() => { inputRef.current?.select(); }, 0);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== lab.name) onRename(trimmed);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { setEditing(false); setDraft(lab.name); }
  }

  // Shorten directory for display: show only last 2 segments
  const shortDir = lab.directory
    ? lab.directory.split("/").slice(-2).join("/")
    : null;

  return (
    <div
      className={`group relative w-full rounded-md px-3 py-2 text-left transition-colors cursor-pointer ${
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/60 text-foreground"
      }`}
      onClick={editing ? undefined : onClick}
    >
      <div className="flex items-start gap-2">
        <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 pr-6">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded border border-primary bg-background px-1 py-0 text-[13px] font-medium outline-none ring-1 ring-primary"
            />
          ) : (
            <p className="truncate text-[13px] font-medium leading-snug">{lab.name}</p>
          )}
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <span>{formatRelativeDate(lab.updatedAt)}</span>
            {lab.status === "in_progress" && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            )}
            {shortDir && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-0.5 cursor-default truncate max-w-[100px]">
                    <FolderOpen className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{shortDir}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-mono text-xs max-w-xs break-all">
                  {lab.directory}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons — shown on hover */}
      {!editing && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 group-hover:flex">
          <button
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={startEdit}
            title="Переименовать"
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
          <button
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            title="Удалить"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Confirmation dialog for lab deletion */
function DeleteLabDialog({
  lab,
  onConfirm,
  onCancel,
}: {
  lab: Lab;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[360px] rounded-xl border bg-background p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">Удалить лабораторную?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{lab.name}</span> будет удалена из списка.
              Файлы на диске останутся.
            </p>
            {lab.directory && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5">
                <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="font-mono text-[11px] text-muted-foreground truncate" title={lab.directory}>
                  {lab.directory}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onConfirm}>
            Удалить
          </Button>
        </div>
      </div>
    </div>
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

  const labs      = useLabsStore((s) => s.labs);
  const removeLab = useLabsStore((s) => s.removeLab);
  const updateLab = useLabsStore((s) => s.updateLab);

  const [pendingDelete, setPendingDelete] = useState<Lab | null>(null);

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
                                onDelete={(e) => { e.stopPropagation(); setPendingDelete(lab); }}
                                onRename={(name) => updateLab(lab.id, { name })}
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
                                onDelete={(e) => { e.stopPropagation(); setPendingDelete(lab); }}
                                onRename={(name) => updateLab(lab.id, { name })}
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

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <DeleteLabDialog
          lab={pendingDelete}
          onConfirm={() => {
            removeLab(pendingDelete.id);
            // If we were viewing this lab, navigate away
            if (currentLabId === pendingDelete.id) navigate({ to: "/new" });
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </TooltipProvider>
  );
}
