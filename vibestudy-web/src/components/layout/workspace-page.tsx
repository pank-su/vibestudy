import { useState, useEffect } from "react";
import { useParams, useSearch, useNavigate } from "@tanstack/react-router";
import {
  Download,
  GitBranch as GithubIcon,
  Wifi,
  WifiOff,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/ui/resizable";

export function WorkspacePage() {
  const { labId } = useParams({ from: "/app/workspace/$labId" });
  const search    = useSearch({ from: "/app/workspace/$labId" });
  const navigate  = useNavigate();

  const { activeFile, setActiveFile } = useWorkspaceStore();
  const { connected }  = useConnectionStore((s) => s.connection);

  const lab       = useLabsStore((s) => s.labs.find((l) => l.id === labId));
  const updateLab = useLabsStore((s) => s.updateLab);

  // Resolve sessionId & directory from search params OR from persisted lab
  const sessionId = search.sessionId ?? lab?.sessionId;
  const directory = search.directory ?? lab?.directory;

  // Persist session/directory to lab if they came from search
  useEffect(() => {
    if (search.sessionId && !lab?.sessionId) updateLab(labId, { sessionId: search.sessionId });
    if (search.directory && !lab?.directory)  updateLab(labId, { directory: search.directory });
  }, [labId, search.sessionId, search.directory, lab?.sessionId, lab?.directory, updateLab]);

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

        <div className="flex items-center gap-1 shrink-0">
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

          {/* Left: file tree + versions */}
          <ResizablePanel defaultSize="20%" minSize="12%" maxSize="30%">
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1 overflow-hidden">
                <FileTree directory={directory} sessionId={sessionId} />
              </div>
              <Separator />
              <div className="h-44 shrink-0 overflow-hidden">
                <VersionList sessionId={sessionId} />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center: editor + preview */}
          <ResizablePanel defaultSize="53%" minSize="30%">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize="60%" minSize="20%">
                <div className="flex h-full flex-col">
                  {/* Tab bar */}
                  <div className="flex h-9 shrink-0 items-center border-b px-2 gap-1">
                    <button
                      className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                        activeTab === "code"
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => { setActiveTab("code"); }}
                    >
                      {activeFile && activeTab === "code"
                        ? activeFile.split("/").pop()
                        : "Редактор"}
                    </button>
                    <button
                      className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                        activeTab === "typst"
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => {
                        setActiveTab("typst");
                        // When switching to typst tab, select the typst file
                        if (!activeFile?.endsWith(".typ")) setActiveFile(typstFile);
                      }}
                    >
                      docs/index.typ
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

              <ResizablePanel defaultSize="40%" minSize="15%">
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
          <ResizablePanel defaultSize="27%" minSize="20%" maxSize="45%">
            <ChatPanel
              sessionId={sessionId}
              directory={directory}
              initialPrompt={search.initialPrompt}
              systemPrompt={search.system}
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
