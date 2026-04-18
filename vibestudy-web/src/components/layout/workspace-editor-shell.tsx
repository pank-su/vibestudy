import { useEffect, useMemo } from "react";
import { BookOpen01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/editor/code-editor";
import { useWorkspaceStore } from "@/stores/workspace";
import { Hi } from "@/components/ui/hi";
import { cn } from "@/lib/utils";

const EMPTY_TAB = "__ws_empty__";

function tabValue(path: string) {
  return `f:${encodeURIComponent(path)}`;
}

function pathFromTabValue(v: string): string | null {
  if (!v.startsWith("f:")) return null;
  return decodeURIComponent(v.slice(2));
}

export function WorkspaceEditorShell({
  directory,
  onOpenPreview,
}: {
  directory?: string;
  onOpenPreview: () => void;
}) {
  const { activeFile, setActiveFile, openTabPaths, closeEditorTab } =
    useWorkspaceStore();

  const tabModel = useMemo(() => {
    if (openTabPaths.length === 0) {
      return { value: EMPTY_TAB as string, paths: [] as string[] };
    }
    const fallback = openTabPaths[0];
    const current =
      activeFile && openTabPaths.includes(activeFile) ? activeFile : fallback;
    return { value: tabValue(current), paths: openTabPaths };
  }, [openTabPaths, activeFile]);

  useEffect(() => {
    if (openTabPaths.length === 0) return;
    if (!activeFile || !openTabPaths.includes(activeFile)) {
      setActiveFile(openTabPaths[0]);
    }
  }, [openTabPaths, activeFile, setActiveFile]);

  function onTabChange(next: string) {
    if (next === EMPTY_TAB) return;
    const path = pathFromTabValue(next);
    if (path) setActiveFile(path);
  }

  return (
    <Tabs
      value={tabModel.value}
      onValueChange={onTabChange}
      className="flex h-full min-h-0 flex-1 flex-col bg-background"
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted px-2 py-1.5 sm:px-3">
        <div
          className={cn(
            "min-w-0 flex-1 overflow-x-auto overflow-y-hidden",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          <TabsList
            variant="line"
            className={cn(
              "inline-flex h-auto min-h-9 w-max max-w-none flex-nowrap items-stretch justify-start gap-1.5 rounded-none border-0 p-0",
              "data-[variant=line]:rounded-none",
            )}
          >
            {tabModel.paths.length === 0 ? (
              <TabsTrigger value={EMPTY_TAB} disabled>
                Редактор
              </TabsTrigger>
            ) : (
              tabModel.paths.map((path) => {
                const label = path.split("/").pop() ?? path;
                const v = tabValue(path);
                return (
                  <div className="bg-sidebar rounded-lg border-1 hover:border-primary items-center active:border-primary flex flex-row pr-2">
                    <TabsTrigger
                      value={v}
                      title={path}
                      className="items-center flex flex-row"
                    >
                      {label}
                    </TabsTrigger>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 text-muted-foreground hover:bg-red-500/10 hover:text-destructive"
                      title="Закрыть вкладку"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeEditorTab(path);
                      }}
                    >
                      <Hi icon={Cancel01Icon} size={14} />
                    </Button>
                  </div>
                );
              })
            )}
          </TabsList>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled
          className="size-9 shrink-0 rounded-xl text-muted-foreground opacity-40"
          title="Новый файл"
        >
          +
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onOpenPreview}
            >
              <Hi icon={BookOpen01Icon} size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Панель превью</TooltipContent>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tabModel.paths.length === 0 ? (
          <TabsContent
            value={EMPTY_TAB}
            className="m-0 flex h-full min-h-0 flex-1 flex-col outline-none"
          >
            <EmptyState text="Выберите файл в дереве" />
          </TabsContent>
        ) : (
          tabModel.paths.map((path) => (
            <TabsContent
              key={path}
              value={tabValue(path)}
              className="m-0 flex h-full min-h-0 flex-1 flex-col outline-none"
            >
              {directory ? (
                <CodeEditor filePath={path} directory={directory} />
              ) : (
                <EmptyState text="Нет директории проекта" />
              )}
            </TabsContent>
          ))
        )}
      </div>
    </Tabs>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-background px-4 font-sans text-sm text-muted-foreground sm:px-6">
      {text}
    </div>
  );
}
