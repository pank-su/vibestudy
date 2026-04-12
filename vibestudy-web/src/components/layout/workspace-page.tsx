import { useState, useEffect } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import {
  Download,
  GitBranch as GithubIcon,
  Wifi,
  WifiOff,
  Cloud,
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

  const { activeFile } = useWorkspaceStore();
  const { connected }  = useConnectionStore((s) => s.connection);

  const lab = useLabsStore((s) => s.labs.find((l) => l.id === labId));
  const updateLab = useLabsStore((s) => s.updateLab);

  // Resolve sessionId & directory from search params OR from persisted lab
  const sessionId = search.sessionId ?? lab?.sessionId;
  const directory = search.directory ?? lab?.directory;

  // Persist session/directory to lab if they came from search
  useEffect(() => {
    if (search.sessionId && !lab?.sessionId) {
      updateLab(labId, { sessionId: search.sessionId });
    }
    if (search.directory && !lab?.directory) {
      updateLab(labId, { directory: search.directory });
    }
  }, [labId, search.sessionId, search.directory, lab?.sessionId, lab?.directory, updateLab]);

  const [activeTab, setActiveTab] = useState<"code" | "typst">("code");

  const labName = lab?.name ?? "Новая лабораторная";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <header className="flex h-9 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium truncate max-w-[260px]">{labName}</h1>
          <div className="flex items-center gap-1.5">
            {connected ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                <span className="text-xs text-muted-foreground">Local</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-muted-foreground" />
                <Cloud className="h-3 w-3 text-muted-foreground ml-0.5" />
                <span className="text-xs text-muted-foreground">Offline</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
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

      {/* Body */}
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="horizontal">

          {/* Left: file tree + versions */}
          <ResizablePanel defaultSize="20%" minSize="12%" maxSize="30%">
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1 overflow-hidden">
                <FileTree directory={directory} />
              </div>
              <Separator />
              <div className="h-44 shrink-0">
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
                      onClick={() => setActiveTab("code")}
                    >
                      {activeFile?.split("/").pop() ?? "Редактор"}
                    </button>
                    <button
                      className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                        activeTab === "typst"
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setActiveTab("typst")}
                    >
                      docs/index.typ
                    </button>
                  </div>
                  {/* Editor area */}
                  <div className="min-h-0 flex-1 bg-background overflow-hidden">
                    {activeTab === "code" ? (
                      activeFile && directory ? (
                        <CodeEditor filePath={activeFile} directory={directory} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                          Выберите файл в дереве
                        </div>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        Typst редактор (CodeMirror)
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize="40%" minSize="15%">
                <div className="flex h-full items-center justify-center border-t bg-muted/20 text-muted-foreground text-sm">
                  {activeTab === "typst"
                    ? "Typst Preview (WASM)"
                    : "Превью PDF / Вывод программы"}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: chat */}
          <ResizablePanel defaultSize="27%" minSize="20%" maxSize="40%">
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
