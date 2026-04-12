import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspaceStore } from "@/stores/workspace";
import { useFileList, subscribeEvents, qk } from "@/lib/opencode-client";
import { useConnectionStore } from "@/stores/connection";
import { useQueryClient } from "@tanstack/react-query";

interface FileTreeProps {
  directory?: string;
  sessionId?: string;
}

interface SDKFileNode {
  name: string;
  path: string;
  absolute: string;
  type: "file" | "directory";
  ignored: boolean;
}

// ── Mock fallback ──────────────────────────────────────────────────────────
const MOCK_FILES: SDKFileNode[] = [
  { name: "src",           path: "src",            absolute: "", type: "directory", ignored: false },
  { name: "main.cpp",      path: "src/main.cpp",   absolute: "", type: "file",      ignored: false },
  { name: "utils.hpp",     path: "src/utils.hpp",  absolute: "", type: "file",      ignored: false },
  { name: "docs",          path: "docs",           absolute: "", type: "directory", ignored: false },
  { name: "index.typ",     path: "docs/index.typ", absolute: "", type: "file",      ignored: false },
  { name: "TASK.md",       path: "TASK.md",        absolute: "", type: "file",      ignored: false },
  { name: "Makefile",      path: "Makefile",       absolute: "", type: "file",      ignored: false },
  { name: "opencode.json", path: "opencode.json",  absolute: "", type: "file",      ignored: false },
];

// ── Tree builder ───────────────────────────────────────────────────────────
interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children: TreeNode[];
}

function buildTree(nodes: SDKFileNode[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const node of sorted) {
    const treeNode: TreeNode = { name: node.name, path: node.path, type: node.type, children: [] };
    map.set(node.path, treeNode);

    const parts = node.path.split("/");
    if (parts.length === 1) {
      root.push(treeNode);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = map.get(parentPath);
      if (parent) parent.children.push(treeNode);
      else root.push(treeNode);
    }
  }
  return root;
}

// ── TreeNodeItem ───────────────────────────────────────────────────────────
function TreeNodeItem({
  node, depth, activeFile, onSelect,
}: {
  node: TreeNode;
  depth: number;
  activeFile: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2); // auto-expand first 2 levels
  const isDir    = node.type === "directory";
  const isActive = activeFile === node.path;

  return (
    <div>
      <button
        className={`flex w-full items-center gap-1.5 rounded-sm py-[3px] text-sm transition-colors hover:bg-accent ${
          isActive ? "bg-accent text-accent-foreground" : "text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => isDir ? setOpen((v) => !v) : onSelect(node.path)}
      >
        {isDir ? (
          <>
            {open
              ? <ChevronDown  className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            {open
              ? <FolderOpen className="h-4 w-4 shrink-0 text-primary/70" />
              : <Folder     className="h-4 w-4 shrink-0 text-primary/70" />}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isDir && open && node.children.map((child) => (
        <TreeNodeItem
          key={child.path} node={child} depth={depth + 1}
          activeFile={activeFile} onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ── FileTree ───────────────────────────────────────────────────────────────
export function FileTree({ directory, sessionId }: FileTreeProps) {
  const connected = useConnectionStore((s) => s.connection.connected);
  const { activeFile, setActiveFile } = useWorkspaceStore();
  const qc = useQueryClient();

  const { data: flatFiles, isLoading } = useFileList(directory ?? "", ".");

  // Subscribe to file.edited SSE events → invalidate file list
  useEffect(() => {
    if (!directory) return;
    const cleanup = subscribeEvents(
      null,
      (ev) => {
        const event = ev as Record<string, unknown>;
        if (event.type === "file.edited") {
          qc.invalidateQueries({ queryKey: qk.files(directory, ".") });
          if (activeFile) {
            qc.invalidateQueries({ queryKey: qk.fileContent(directory, activeFile) });
          }
        }
      }
    );
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directory, sessionId]);

  const files = connected && flatFiles
    ? buildTree(flatFiles.filter((f) => !f.ignored))
    : buildTree(MOCK_FILES);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Файлы
        </span>
        {connected && isLoading && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {!connected && (
            <p className="px-2 py-1 text-[11px] text-muted-foreground/60">
              Нет подключения — mock данные
            </p>
          )}
          {files.map((node) => (
            <TreeNodeItem
              key={node.path} node={node} depth={0}
              activeFile={activeFile} onSelect={setActiveFile}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
