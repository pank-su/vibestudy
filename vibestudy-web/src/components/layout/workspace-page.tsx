import {
  useState,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Add01Icon,
  AlertCircleIcon,
  BookOpen01Icon,
  Chat01Icon,
  Clock01Icon,
  Download01Icon,
  Folder01Icon,
  GitBranchIcon,
  LayoutBottomIcon,
  SidebarLeft01Icon,
  Wifi01Icon,
  WifiDisconnected01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileTree } from "@/components/file-tree/file-tree";
import { ChatPanel } from "@/components/chat/chat-panel";
import { VersionList } from "@/components/version-list/version-list";
import { useWorkspaceStore } from "@/stores/workspace";
import { useConnectionStore } from "@/stores/connection";
import { useLabsStore } from "@/stores/labs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  usePanelRef,
} from "@/components/ui/resizable";
import type { PanelImperativeHandle } from "react-resizable-panels";
import type { RefObject } from "react";
import { Hi } from "@/components/ui/hi";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WorkspaceEditorShell } from "@/components/layout/workspace-editor-shell";

type MobileOverlay = null | "project" | "preview" | "chat";

function togglePanel(ref: RefObject<PanelImperativeHandle | null>) {
  const p = ref.current;
  if (!p) return;
  if (p.isCollapsed()) p.expand();
  else p.collapse();
}

function toggleMobileOverlay(
  set: Dispatch<SetStateAction<MobileOverlay>>,
  key: MobileOverlay,
) {
  set((cur) => (cur === key ? null : key));
}

function toggleDesktopFilesPanel(
  sidebarRef: RefObject<PanelImperativeHandle | null>,
  filesRef: RefObject<PanelImperativeHandle | null>,
) {
  const sidebar = sidebarRef.current;
  const files = filesRef.current;
  if (!files) return;
  if (sidebar?.isCollapsed()) {
    sidebar.expand();
    if (files.isCollapsed()) files.expand();
    return;
  }
  togglePanel(filesRef);
}

function toggleDesktopVersionsPanel(
  sidebarRef: RefObject<PanelImperativeHandle | null>,
  versionsRef: RefObject<PanelImperativeHandle | null>,
) {
  const sidebar = sidebarRef.current;
  const versions = versionsRef.current;
  if (!versions) return;
  if (sidebar?.isCollapsed()) {
    sidebar.expand();
    if (versions.isCollapsed()) versions.expand();
    return;
  }
  togglePanel(versionsRef);
}

export function WorkspacePage() {
  const { labId } = useParams({ strict: false });
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileOverlay, setMobileOverlay] = useState<MobileOverlay>(null);
  const openedChatForPromptRef = useRef(false);

  const sidebarPanelRef = usePanelRef();
  const filesPanelRef = usePanelRef();
  const versionsPanelRef = usePanelRef();
  const previewPanelRef = usePanelRef();
  const chatPanelRef = usePanelRef();

  const { activeFile, resetEditorTabs } = useWorkspaceStore();
  const { connected } = useConnectionStore((s) => s.connection);

  const lab = useLabsStore((s) => s.labs.find((l) => l.id === labId));
  const updateLab = useLabsStore((s) => s.updateLab);

  const sessionId = lab?.sessionId ?? search.sessionId;
  const directory = lab?.directory ?? search.directory;
  const searchSessionMatches =
    !search.sessionId || search.sessionId === sessionId;
  const initialPrompt = searchSessionMatches ? search.initialPrompt : undefined;
  const systemFromSearch = searchSessionMatches ? search.system : undefined;

  useEffect(() => {
    if (!labId) return;
    if (search.sessionId && !lab?.sessionId)
      updateLab(labId, { sessionId: search.sessionId });
    if (search.directory && !lab?.directory)
      updateLab(labId, { directory: search.directory });
  }, [
    labId,
    search.sessionId,
    search.directory,
    lab?.sessionId,
    lab?.directory,
    updateLab,
  ]);

  useEffect(() => {
    resetEditorTabs();
  }, [labId, resetEditorTabs]);

  useEffect(() => {
    openedChatForPromptRef.current = false;
  }, [labId]);

  useEffect(() => {
    if (!isMobile || !initialPrompt || openedChatForPromptRef.current) return;
    openedChatForPromptRef.current = true;
    setMobileOverlay("chat");
  }, [isMobile, initialPrompt]);

  const labName = lab?.name ?? "Новая лабораторная";

  const showNoSession = !sessionId && connected;

  const sessionShort = sessionId ? `${sessionId.slice(0, 8)}…` : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
          <h1 className="max-w-[min(100%,min(320px,72vw))] truncate font-serif text-[14px] font-semibold tracking-[-0.02em] text-foreground sm:text-[15px]">
            {labName}
          </h1>
          {connected && (
            <div className="flex min-w-0 max-w-[min(100%,200px)] items-center gap-1.5 truncate rounded-lg bg-muted px-2 py-1.5 font-sans text-[11px] text-foreground sm:max-w-none sm:gap-2.5 sm:px-3 sm:py-2 sm:text-[13px]">
              <Hi
                icon={Wifi01Icon}
                size={16}
                className="shrink-0 text-primary"
              />
              {sessionShort ? (
                <>
                  <span className="tabular-nums">{sessionShort}</span>
                  <span className="text-[12px] text-muted-foreground">
                    сессия
                  </span>
                </>
              ) : (
                <span className="text-[12px] text-muted-foreground">
                  нет сессии
                </span>
              )}
              <span
                className="px-1.5 text-[13px] text-muted-foreground/40"
                aria-hidden
              >
                ◀
              </span>
              <span
                className="px-1.5 text-[13px] text-muted-foreground/40"
                aria-hidden
              >
                ▶
              </span>
            </div>
          )}
          {!connected && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Hi icon={WifiDisconnected01Icon} size={16} />
              <span className="font-sans text-xs">офлайн</span>
            </div>
          )}
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:justify-start sm:gap-2.5">
          <div className="flex flex-1 items-center justify-end gap-0.5 sm:flex-initial sm:justify-start">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() =>
                    isMobile
                      ? toggleMobileOverlay(setMobileOverlay, "project")
                      : togglePanel(sidebarPanelRef)
                  }
                  type="button"
                >
                  <Hi icon={SidebarLeft01Icon} size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Левая колонка</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() =>
                    isMobile
                      ? toggleMobileOverlay(setMobileOverlay, "project")
                      : toggleDesktopFilesPanel(sidebarPanelRef, filesPanelRef)
                  }
                  type="button"
                >
                  <Hi icon={Folder01Icon} size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Файлы</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() =>
                    isMobile
                      ? toggleMobileOverlay(setMobileOverlay, "project")
                      : toggleDesktopVersionsPanel(
                          sidebarPanelRef,
                          versionsPanelRef,
                        )
                  }
                  type="button"
                >
                  <Hi icon={Clock01Icon} size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Версии</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() =>
                    isMobile
                      ? toggleMobileOverlay(setMobileOverlay, "preview")
                      : togglePanel(previewPanelRef)
                  }
                  type="button"
                >
                  <Hi icon={LayoutBottomIcon} size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Превью</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() =>
                    isMobile
                      ? toggleMobileOverlay(setMobileOverlay, "chat")
                      : togglePanel(chatPanelRef)
                  }
                  type="button"
                >
                  <Hi icon={Chat01Icon} size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Чат</TooltipContent>
            </Tooltip>
          </div>
          <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 rounded-lg border border-border bg-transparent px-2 font-sans text-[12px] font-medium text-foreground hover:bg-muted sm:gap-1.5 sm:px-3"
          >
            <Hi icon={Download01Icon} size={16} />
            <span className="hidden sm:inline">Скачать</span>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 rounded-lg bg-foreground px-2.5 font-sans text-[12px] font-semibold text-background hover:bg-foreground/90 sm:gap-1.5 sm:px-4"
          >
            <Hi icon={GitBranchIcon} size={16} className="text-background" />
            <span className="hidden sm:inline">GitHub</span>
          </Button>
        </div>
      </header>

      {showNoSession && (
        <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-amber-500/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-2 sm:items-center">
            <Hi
              icon={AlertCircleIcon}
              size={16}
              className="mt-0.5 shrink-0 text-amber-600 sm:mt-0"
            />
            <p className="font-sans text-[11px] leading-snug text-amber-800 sm:text-xs dark:text-amber-400">
              OpenCode подключён, но сессия не создана — файлы и чат недоступны
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 gap-1.5 self-start border-border font-sans text-xs sm:self-auto"
            onClick={() => navigate({ to: "/new" })}
          >
            <Hi icon={Add01Icon} size={14} />
            Новая лаба
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {isMobile ? (
          <WorkspaceEditorShell
            directory={directory}
            onOpenPreview={() => setMobileOverlay("preview")}
          />
        ) : (
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel
              id="ws-sidebar"
              panelRef={sidebarPanelRef}
              defaultSize="20%"
              minSize="8%"
              maxSize="40%"
              collapsible
              collapsedSize={0}
            >
              <ResizablePanelGroup
                orientation="vertical"
                className="h-full bg-muted/40"
              >
                <ResizablePanel
                  id="ws-files"
                  panelRef={filesPanelRef}
                  defaultSize="62%"
                  minSize={0}
                  collapsible
                  collapsedSize={0}
                  className="min-h-0"
                >
                  <FileTree
                    key={labId}
                    directory={directory}
                    sessionId={sessionId}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel
                  id="ws-versions"
                  panelRef={versionsPanelRef}
                  defaultSize="38%"
                  minSize={0}
                  maxSize="55%"
                  collapsible
                  collapsedSize={0}
                  className="min-h-0"
                >
                  <VersionList
                    key={labId}
                    sessionId={sessionId}
                    directory={directory}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel
              id="ws-center"
              defaultSize="53%"
              minSize="25%"
              className="min-h-0 bg-background"
            >
              <ResizablePanelGroup orientation="vertical" className="h-full">
                <ResizablePanel
                  id="ws-editor"
                  defaultSize="60%"
                  minSize="20%"
                  className="min-h-0"
                >
                  <WorkspaceEditorShell
                    directory={directory}
                    onOpenPreview={() => togglePanel(previewPanelRef)}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel
                  id="ws-preview"
                  panelRef={previewPanelRef}
                  defaultSize="40%"
                  minSize="12%"
                  collapsible
                  collapsedSize={0}
                  className="min-h-0 border-t border-border bg-muted/30"
                >
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-8 py-10 text-center font-heading text-sm text-muted-foreground">
                    <Hi
                      icon={BookOpen01Icon}
                      size={28}
                      className="opacity-40"
                    />
                    <p>
                      {activeFile?.endsWith(".typ")
                        ? "Превью"
                        : "Вывод / Превью"}
                    </p>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel
              id="ws-chat"
              panelRef={chatPanelRef}
              defaultSize="27%"
              minSize="12%"
              maxSize="50%"
              collapsible
              collapsedSize={0}
              className="min-h-0"
            >
              <ChatPanel
                key={labId}
                sessionId={sessionId}
                directory={directory}
                initialPrompt={initialPrompt}
                systemPrompt={systemFromSearch}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {isMobile && (
        <>
          <Sheet
            open={mobileOverlay === "project"}
            onOpenChange={(open) => {
              if (!open)
                setMobileOverlay((cur) => (cur === "project" ? null : cur));
            }}
          >
            <SheetContent
              side="left"
              showCloseButton
              className="flex h-full w-[min(100%,22rem)] max-w-[min(100vw,22rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-sm"
            >
              <SheetHeader className="shrink-0 border-b px-4 py-3 text-left">
                <SheetTitle className="font-sans text-sm font-semibold">
                  Проект
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Дерево файлов и список версий лабораторной
                </SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
                <div className="flex min-h-[36dvh] min-w-0 flex-1 flex-col border-b">
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <FileTree
                      key={labId}
                      directory={directory}
                      sessionId={sessionId}
                    />
                  </div>
                </div>
                <div className="flex min-h-[28dvh] min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <VersionList
                      key={labId}
                      sessionId={sessionId}
                      directory={directory}
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet
            open={mobileOverlay === "preview"}
            onOpenChange={(open) => {
              if (!open)
                setMobileOverlay((cur) => (cur === "preview" ? null : cur));
            }}
          >
            <SheetContent
              side="bottom"
              showCloseButton
              className="max-h-[min(88dvh,640px)] gap-0 rounded-t-2xl border-t p-0"
            >
              <SheetHeader className="shrink-0 border-b px-4 py-3 text-left">
                <SheetTitle className="font-sans text-sm font-semibold">
                  Превью
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Область предпросмотра вывода и Typst
                </SheetDescription>
              </SheetHeader>
              <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-2 bg-background px-6 py-12 text-center font-sans text-sm text-muted-foreground">
                <Hi icon={BookOpen01Icon} size={32} className="opacity-40" />
                <p>
                  {activeFile?.endsWith(".typ") ? "Превью" : "Вывод / Превью"}
                </p>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet
            open={mobileOverlay === "chat"}
            onOpenChange={(open) => {
              if (!open)
                setMobileOverlay((cur) => (cur === "chat" ? null : cur));
            }}
          >
            <SheetContent
              side="right"
              showCloseButton
              className="h-full w-full max-w-full gap-0 p-0 sm:max-w-md"
            >
              <ChatPanel
                key={labId}
                sessionId={sessionId}
                directory={directory}
                initialPrompt={initialPrompt}
                systemPrompt={systemFromSearch}
                surface="overlay"
              />
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
