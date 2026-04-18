import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  SETTINGS_TAB_ITEMS,
  parseSettingsTab,
  type SettingsTabId,
} from "@/components/layout/settings-nav";
import { cn } from "@/lib/utils";
import {
  Add01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  Edit02Icon,
  FolderOpenIcon,
  Moon01Icon,
  Settings01Icon,
  Sun01Icon,
  Wifi01Icon,
  WifiDisconnected01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useConnectionStore } from "@/stores/connection";
import { useLabsStore, type Lab } from "@/stores/labs";
import { useTheme } from "@/hooks/use-theme";
import { OpenCodeConnectionGate } from "@/components/layout/opencode-connection-gate";
import { Hi } from "@/components/ui/hi";

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function LabRow({
  lab,
  isActive,
  onOpen,
  onDelete,
  onRename,
}: {
  lab: Lab;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lab.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(lab.name);
  }, [lab.name]);

  function startEdit(e?: React.MouseEvent) {
    e?.stopPropagation();
    e?.preventDefault();
    setDraft(lab.name);
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== lab.name) onRename(trimmed);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setDraft(lab.name);
    }
  }

  const shortDir = lab.directory
    ? lab.directory.split("/").slice(-2).join("/")
    : null;

  if (editing) {
    return (
      <Item variant="outline">
        <ItemContent className="min-w-0">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
          />
        </ItemContent>
      </Item>
    );
  }

  return (
    <Item
      variant={isActive ? "muted" : "default"}
      role="button"
      tabIndex={0}
      className="cursor-pointer border-transparent"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-slot=item-actions]"))
          return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full max-w-full text-[13px] text-sidebar-foreground">
          {lab.name}
        </ItemTitle>
        <ItemDescription className="!line-clamp-none flex flex-wrap items-center gap-1 text-[11px] text-sidebar-foreground/60">
          <span>{formatRelativeDate(lab.updatedAt)}</span>
          {shortDir && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex max-w-[100px] cursor-default items-center gap-0.5 truncate">
                  <Hi icon={FolderOpenIcon} size={10} className="shrink-0" />
                  <span className="truncate">{shortDir}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-xs break-all font-mono text-xs"
              >
                {lab.directory}
              </TooltipContent>
            </Tooltip>
          )}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="shrink-0 opacity-100 md:opacity-0 md:transition-opacity md:group-hover/item:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          title="Переименовать"
          onClick={(e) => {
            e.stopPropagation();
            startEdit(e);
          }}
        >
          <Hi icon={Edit02Icon} size={12} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-sidebar-foreground hover:bg-destructive/15 hover:text-destructive"
          title="Удалить"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Hi icon={Delete02Icon} size={12} />
        </Button>
      </ItemActions>
    </Item>
  );
}

function SettingsSidebarHeader() {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();

  function goBack() {
    navigate({ to: "/new" });
    if (isMobile) setOpenMobile(false);
  }

  return (
    <SidebarHeader className="border-b">
      <div className="flex items-center gap-2 px-1 py-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={goBack}
        >
          <Hi icon={ArrowLeft01Icon} size={16} />
        </Button>
        <span className="min-w-0 truncate text-sm font-semibold">
          Настройки
        </span>
      </div>
    </SidebarHeader>
  );
}

function SettingsSidebarTabs({ activeTab }: { activeTab: SettingsTabId }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="px-1.5 pt-2">
        <ItemGroup className="gap-1" role="list">
          {SETTINGS_TAB_ITEMS.map(({ id, label, icon }) => (
            <Link
              key={id}
              to="/settings"
              search={{ tab: id }}
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                activeTab === id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Hi
                icon={icon}
                size={16}
                className="shrink-0 text-sidebar-foreground/70"
              />
              {label}
            </Link>
          ))}
        </ItemGroup>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const isSettings = path === "/settings";
  const settingsTab: SettingsTabId | null = isSettings
    ? parseSettingsTab((location.search as { tab?: unknown }).tab)
    : null;
  const currentLabId = path.startsWith("/workspace/")
    ? path.split("/workspace/")[1]
    : null;

  const { connected } = useConnectionStore((s) => s.connection);
  const { theme, toggleTheme } = useTheme();

  const labs = useLabsStore((s) => s.labs);
  const removeLab = useLabsStore((s) => s.removeLab);
  const updateLab = useLabsStore((s) => s.updateLab);

  const [pendingDelete, setPendingDelete] = useState<Lab | null>(null);

  const inProgress = labs.filter((l) => l.status === "in_progress");
  const completed = labs.filter((l) => l.status === "completed");

  function openLab(lab: Lab) {
    navigate({
      to: "/workspace/$labId",
      params: { labId: lab.id },
      search: {
        sessionId: lab.sessionId,
        directory: lab.directory,
        initialPrompt: undefined,
        system: undefined,
      },
    });
  }

  return (
    <TooltipProvider>
      <SidebarProvider
        className="h-svh min-h-0 w-full [--sidebar-width:15rem]"
        style={{ "--sidebar-width-icon": "3rem" } as React.CSSProperties}
      >
        <Sidebar collapsible="offcanvas">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className={cn(
                "flex min-h-0 min-w-[200%] flex-1 will-change-transform transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0",
                isSettings ? "-translate-x-1/2" : "translate-x-0",
              )}
            >
              <div
                className={cn(
                  "flex min-h-0 w-1/2 shrink-0 flex-col",
                  isSettings && "pointer-events-none select-none",
                )}
                aria-hidden={isSettings}
              >
                <SidebarHeader className="border-b">
                  <div className="flex items-center gap-2 px-1">
                    <Link
                      to="/new"
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-0.5"
                    >
                      <div className="flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                        V
                      </div>
                      <span className="truncate text-sm font-semibold">
                        VibeStudy
                      </span>
                    </Link>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          onClick={() => navigate({ to: "/new" })}
                        >
                          <Hi icon={Add01Icon} size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Новая лаба</TooltipContent>
                    </Tooltip>
                  </div>
                </SidebarHeader>

                <SidebarContent>
                  {labs.length === 0 ? (
                    <SidebarGroup>
                      <SidebarGroupContent className="px-2 py-4 text-center">
                        <p className="text-[13px] text-sidebar-foreground/70">
                          Нет лабораторных
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 gap-1.5 text-xs"
                          onClick={() => navigate({ to: "/new" })}
                        >
                          <Hi icon={Add01Icon} size={14} />
                          Создать первую
                        </Button>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  ) : (
                    <>
                      {inProgress.length > 0 && (
                        <SidebarGroup>
                          <SidebarGroupLabel>В процессе</SidebarGroupLabel>
                          <SidebarGroupContent className="px-1.5">
                            <ItemGroup className="gap-1" role="list">
                              {inProgress.map((lab) => (
                                <LabRow
                                  key={lab.id}
                                  lab={lab}
                                  isActive={currentLabId === lab.id}
                                  onOpen={() => openLab(lab)}
                                  onDelete={() => setPendingDelete(lab)}
                                  onRename={(name) =>
                                    updateLab(lab.id, { name })
                                  }
                                />
                              ))}
                            </ItemGroup>
                          </SidebarGroupContent>
                        </SidebarGroup>
                      )}
                      {completed.length > 0 && (
                        <SidebarGroup>
                          {inProgress.length > 0 && (
                            <SidebarSeparator className="my-1" />
                          )}
                          <SidebarGroupLabel>Выполненные</SidebarGroupLabel>
                          <SidebarGroupContent className="px-1.5">
                            <ItemGroup className="gap-1" role="list">
                              {completed.map((lab) => (
                                <LabRow
                                  key={lab.id}
                                  lab={lab}
                                  isActive={currentLabId === lab.id}
                                  onOpen={() => openLab(lab)}
                                  onDelete={() => setPendingDelete(lab)}
                                  onRename={(name) =>
                                    updateLab(lab.id, { name })
                                  }
                                />
                              ))}
                            </ItemGroup>
                          </SidebarGroupContent>
                        </SidebarGroup>
                      )}
                    </>
                  )}
                </SidebarContent>

                <SidebarFooter className="border-t">
                  <div className="flex items-center justify-between gap-1 px-1">
                    <div className="flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={toggleTheme}
                          >
                            {theme === "dark" ? (
                              <Hi icon={Sun01Icon} size={14} />
                            ) : (
                              <Hi icon={Moon01Icon} size={14} />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {theme === "dark" ? "Светлая" : "Тёмная"} тема
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to="/settings" search={{ tab: "profile" }}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            >
                              <Hi icon={Settings01Icon} size={14} />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top">Настройки</TooltipContent>
                      </Tooltip>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex size-8 items-center justify-center">
                          {connected ? (
                            <Hi
                              icon={Wifi01Icon}
                              size={14}
                              className="text-primary"
                            />
                          ) : (
                            <Hi
                              icon={WifiDisconnected01Icon}
                              size={14}
                              className="text-sidebar-foreground/40"
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {connected
                          ? "OpenCode подключён"
                          : "OpenCode не подключён"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </SidebarFooter>
              </div>

              <div
                className={cn(
                  "flex min-h-0 w-1/2 shrink-0 flex-col",
                  !isSettings && "pointer-events-none select-none",
                )}
                aria-hidden={!isSettings}
              >
                <SettingsSidebarHeader />
                <SidebarContent>
                  <SettingsSidebarTabs activeTab={settingsTab ?? "profile"} />
                </SidebarContent>
                <SidebarFooter className="border-t">
                  <div className="flex items-center justify-between gap-1 px-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={toggleTheme}
                        >
                          {theme === "dark" ? (
                            <Hi icon={Sun01Icon} size={14} />
                          ) : (
                            <Hi icon={Moon01Icon} size={14} />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {theme === "dark" ? "Светлая" : "Тёмная"} тема
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex size-8 items-center justify-center">
                          {connected ? (
                            <Hi
                              icon={Wifi01Icon}
                              size={14}
                              className="text-primary"
                            />
                          ) : (
                            <Hi
                              icon={WifiDisconnected01Icon}
                              size={14}
                              className="text-sidebar-foreground/40"
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {connected
                          ? "OpenCode подключён"
                          : "OpenCode не подключён"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </SidebarFooter>
              </div>
            </div>
          </div>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b px-2 md:hidden">
            <SidebarTrigger className="size-8 shrink-0" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <OpenCodeConnectionGate />
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить лабораторную?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left">
                <p>
                  <span className="font-medium text-foreground">
                    {pendingDelete?.name}
                  </span>{" "}
                  будет удалена из списка. Файлы на диске останутся.
                </p>
                {pendingDelete?.directory && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5">
                    <Hi
                      icon={FolderOpenIcon}
                      size={12}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span
                      className="truncate font-mono text-[11px] text-muted-foreground"
                      title={pendingDelete.directory}
                    >
                      {pendingDelete.directory}
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!pendingDelete) return;
                removeLab(pendingDelete.id);
                if (currentLabId === pendingDelete.id) navigate({ to: "/new" });
                setPendingDelete(null);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
