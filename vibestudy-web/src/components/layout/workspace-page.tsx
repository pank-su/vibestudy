import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import {
  Download,
  GitBranch as GithubIcon,
  Wifi,
  WifiOff,
  AlertCircle,
  Plus,
  X,
  FolderTree,
  History,
  PanelBottom,
  MessagesSquare,
  Columns2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileTree } from "@/components/file-tree/file-tree";
import { ChatPanel } from "@/components/chat/chat-panel";
import { VersionList } from "@/components/version-list/version-list";
import { CodeEditor } from "@/components/editor/code-editor";
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

function togglePanel(ref: RefObject<PanelImperativeHandle | null>) {
  const p = ref.current;
  if (!p) return;
  if (p.isCollapsed()) p.expand();
  else p.collapse();
}

export function WorkspacePage() {
  const { labId } = useParams({ strict: false });
  const search    = useSearch({ strict: false });
  const navigate  = useNavigate();

  const sidebarPanelRef  = usePanelRef();
  const filesPanelRef    = usePanelRef();
  const versionsPanelRef = usePanelRef();
  const previewPanelRef  = usePanelRef();
  const chatPanelRef     = usePanelRef();

  const {
    activeFile,
    setActiveFile,
    openTabPaths,
    closeEditorTab,
    resetEditorTabs,
  } = useWorkspaceStore();
  const { connected }  = useConnectionStore((s) => s.connection);

  const lab       = useLabsStore((s) => s.labs.find((l) => l.id === labId));
  const updateLab = useLabsStore((s) => s.updateLab);

  const sessionId = lab?.sessionId ?? search.sessionId;
  const directory = lab?.directory ?? search.directory;
  const searchSessionMatches =
    !search.sessionId || search.sessionId === sessionId;
  const initialPrompt = searchSessionMatches ? search.initialPrompt : undefined;
  const systemFromSearch = searchSessionMatches ? search.system : undefined;

  useEffect(() => {
    if (!labId) return;
    if (search.sessionId && !lab?.sessionId) updateLab(labId, { sessionId: search.sessionId });
    if (search.directory && !lab?.directory)  updateLab(labId, { directory: search.directory });
  }, [labId, search.sessionId, search.directory, lab?.sessionId, lab?.directory, updateLab]);

  useEffect(() => {
    resetEditorTabs();
  }, [labId, resetEditorTabs]);

  // Tab: "code" | "typst". Auto-switch to typst when .typ file selected
  const [activeTab, setActiveTab] = useState<"code" | "typst">("code");
  useEffect(() => {
    if (activeFile?.endsWith(".typ")) setActiveTab("typst");
    else if (activeFile)              setActiveTab("code");
  }, [activeFile]);

  const labName = lab?.name ?? "Новая лабораторная";

  // Typst file: prefer docs/index.typ, else any .typ in tree
  const typstFile = "docs/index.typ";

  const showNoSession = !sessionId && connected;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <header className="flex h-9 shrink-0 items-center justify-between border-b px-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-sm font-medium truncate max-w-[220px]">{labName}</h1>

          {/* Connection + session status */}
          <div className="flex items-center gap-1.5">
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-green-500 shrink-0" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
            {connected && (
              <span className="text-xs text-muted-foreground">
                {sessionId ? sessionId.slice(0, 8) + "…" : "нет сессии"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => togglePanel(sidebarPanelRef)}
                type="button"
              >
                <Columns2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Левая колонка</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => togglePanel(filesPanelRef)}
                type="button"
              >
                <FolderTree className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Файлы</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => togglePanel(versionsPanelRef)}
                type="button"
              >
                <History className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Версии</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => togglePanel(previewPanelRef)}
                type="button"
              >
                <PanelBottom className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Превью</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => togglePanel(chatPanelRef)}
                type="button"
              >
                <MessagesSquare className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Чат</TooltipContent>
          </Tooltip>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
            <Download className="h-3 w-3" />
            Скачать
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
            <GithubIcon className="h-3 w-3" />
            GitHub
          </Button>
        </div>
      </header>

      {/* No-session banner */}
      {showNoSession && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-amber-500/5 px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              OpenCode подключён, но сессия не создана — файлы и чат недоступны
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1.5 text-xs shrink-0"
            onClick={() => navigate({ to: "/new" })}
          >
            <Plus className="h-3 w-3" />
            Новая лаба
          </Button>
        </div>
      )}

      {/* Body */}
      <div className="min-h-0 flex-1">
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
            <ResizablePanelGroup orientation="vertical" className="h-full">
              <ResizablePanel
                id="ws-files"
                panelRef={filesPanelRef}
                defaultSize="62%"
                minSize="12%"
                collapsible
                collapsedSize={0}
                className="min-h-0"
              >
                <FileTree key={labId} directory={directory} sessionId={sessionId} />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                id="ws-versions"
                panelRef={versionsPanelRef}
                defaultSize="38%"
                minSize="10%"
                maxSize="55%"
                collapsible
                collapsedSize={0}
                className="min-h-0"
              >
                <VersionList key={labId} sessionId={sessionId} directory={directory} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center: editor + preview */}
          <ResizablePanel id="ws-center" defaultSize="53%" minSize="25%">
            <ResizablePanelGroup orientation="vertical" className="h-full">
              <ResizablePanel id="ws-editor" defaultSize="60%" minSize="20%" className="min-h-0">
                <div className="flex h-full flex-col">
                  {/* Tab bar */}
                  <div className="flex h-9 shrink-0 min-w-0 items-center border-b gap-0">
                    <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
                      {openTabPaths.length === 0 ? (
                        <button
                          type="button"
                          className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                            activeTab === "code"
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => setActiveTab("code")}
                        >
                          Редактор
                        </button>
                      ) : (
                        openTabPaths.map((path) => {
                          const label = path.split("/").pop() ?? path;
                          const isActive = activeTab === "code" && activeFile === path;
                          return (
                            <div
                              key={path}
                              className={`flex shrink-0 items-stretch border-r border-border/60 ${
                                isActive ? "bg-muted" : "bg-transparent"
                              }`}
                            >
                              <button
                                type="button"
                                className={`max-w-[140px] truncate px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                }`}
                                title={path}
                                onClick={() => {
                                  setActiveTab("code");
                                  setActiveFile(path);
                                }}
                              >
                                {label}
                              </button>
                              <button
                                type="button"
                                className="flex w-7 items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title="Закрыть вкладку"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeEditorTab(path);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <button
                      type="button"
                      className={`shrink-0 border-l border-border/60 px-3 py-1.5 text-xs font-medium transition-colors ${
                        activeTab === "typst"
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => {
                        setActiveTab("typst");
                        if (!activeFile?.endsWith(".typ")) setActiveFile(typstFile);
                      }}
                    >
                      Typst
                    </button>
                  </div>

                  {/* Editor */}
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {activeTab === "typst" ? (
                      directory ? (
                        <CodeEditor
                          filePath={activeFile?.endsWith(".typ") ? activeFile : typstFile}
                          directory={directory}
                        />
                      ) : (
                        <EmptyState text="Нет директории проекта" />
                      )
                    ) : activeFile && directory ? (
                      <CodeEditor filePath={activeFile} directory={directory} />
                    ) : (
                      <EmptyState text="Выберите файл в дереве" />
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                id="ws-preview"
                panelRef={previewPanelRef}
                defaultSize="40%"
                minSize="12%"
                collapsible
                collapsedSize={0}
                className="min-h-0"
              >
                <div className="flex h-full items-center justify-center border-t bg-muted/20 text-muted-foreground text-sm">
                  {activeTab === "typst"
                    ? "Typst Preview (WASM)"
                    : "Вывод / Превью"}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: chat */}
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
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
      {text}
    </div>
  );
}
